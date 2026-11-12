package com.slideforge.api.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.slideforge.api.users.repository.UserRepository;
import com.slideforge.api.users.model.UserStatus;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

public class AccountStatusFilter extends OncePerRequestFilter {
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AccountStatusFilter(UserRepository userRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            boolean active = userRepository.findById(UUID.fromString(jwtAuthentication.getToken().getSubject()))
                    .map(user -> user.getStatus() == UserStatus.ACTIVE && user.isEmailVerified())
                    .orElse(false);
            if (!active) {
                SecurityContextHolder.clearContext();
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
                ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                        HttpStatus.UNAUTHORIZED, "This account is not available");
                problem.setTitle(HttpStatus.UNAUTHORIZED.getReasonPhrase());
                problem.setProperty("code", "ACCOUNT_UNAVAILABLE");
                objectMapper.writeValue(response.getOutputStream(), problem);
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
