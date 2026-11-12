package com.slideforge.api.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.filter.OncePerRequestFilter;

public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final Set<String> LIMITED_ENDPOINTS = Set.of(
            "/api/v1/auth/register",
            "/api/v1/auth/admin-invitation/request",
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/verify",
            "/api/v1/auth/verify/request",
            "/api/v1/auth/password/forgot",
            "/api/v1/auth/password/reset");
    private static final int CLEANUP_INTERVAL = 256;

    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final int maximumRequests;
    private final Duration window;
    private final ConcurrentHashMap<String, WindowCounter> counters = new ConcurrentHashMap<>();
    private final AtomicLong requestCount = new AtomicLong();

    public AuthRateLimitFilter(
            ObjectMapper objectMapper,
            Clock clock,
            int maximumRequests,
            Duration window) {
        if (maximumRequests < 1 || window.isZero() || window.isNegative()) {
            throw new IllegalArgumentException("Rate limit and window must be positive");
        }
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.maximumRequests = maximumRequests;
        this.window = window;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (!"POST".equals(request.getMethod()) || !LIMITED_ENDPOINTS.contains(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        Instant now = clock.instant();
        if ((requestCount.incrementAndGet() & (CLEANUP_INTERVAL - 1)) == 0) {
            counters.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().startedAt().plus(window)));
        }

        AtomicReference<WindowCounter> result = new AtomicReference<>();
        AtomicBoolean limited = new AtomicBoolean();
        counters.compute(request.getRemoteAddr(), (address, current) -> {
            if (current == null || !now.isBefore(current.startedAt().plus(window))) {
                WindowCounter fresh = new WindowCounter(now, 1);
                result.set(fresh);
                return fresh;
            }
            if (current.count() >= maximumRequests) {
                limited.set(true);
                result.set(current);
                return current;
            }
            WindowCounter updated = new WindowCounter(current.startedAt(), current.count() + 1);
            result.set(updated);
            return updated;
        });

        WindowCounter counter = result.get();
        if (limited.get()) {
            writeRateLimitProblem(response, now, counter.startedAt().plus(window));
            return;
        }
        filterChain.doFilter(request, response);
    }

    private void writeRateLimitProblem(HttpServletResponse response, Instant now, Instant resetAt) throws IOException {
        long retryAfterSeconds = Math.max(1, (Duration.between(now, resetAt).toMillis() + 999) / 1000);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.TOO_MANY_REQUESTS, "Too many authentication requests; try again later");
        problem.setTitle(HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase());
        problem.setProperty("code", "RATE_LIMITED");

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", Long.toString(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), problem);
    }

    private record WindowCounter(Instant startedAt, int count) {
    }
}
