package com.slideforge.api.common;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthRateLimitFilterTest {
    @Test
    void limitsAuthenticationRequestsPerPeerAndAllowsOtherEndpointsAndPeers() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(
                new ObjectMapper(),
                Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC),
                2,
                Duration.ofMinutes(1));
        AtomicInteger passedThrough = new AtomicInteger();

        MockHttpServletResponse first = send(filter, "/api/v1/auth/login", "192.0.2.1", passedThrough);
        MockHttpServletResponse second = send(filter, "/api/v1/auth/register", "192.0.2.1", passedThrough);
        MockHttpServletResponse limited = send(filter, "/api/v1/auth/refresh", "192.0.2.1", passedThrough);
        MockHttpServletResponse otherPeer = send(filter, "/api/v1/auth/login", "192.0.2.2", passedThrough);
        MockHttpServletResponse unrelated = send(filter, "/api/v1/users/me", "192.0.2.1", passedThrough);

        assertEquals(200, first.getStatus());
        assertEquals(200, second.getStatus());
        assertEquals(429, limited.getStatus());
        assertEquals("RATE_LIMITED", new ObjectMapper().readTree(limited.getContentAsString()).findValue("code").asText());
        assertEquals("60", limited.getHeader("Retry-After"));
        assertEquals(200, otherPeer.getStatus());
        assertEquals(200, unrelated.getStatus());
        assertEquals(4, passedThrough.get());
    }

    @Test
    void allowsRequestsAgainAfterTheWindowExpires() throws Exception {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        AuthRateLimitFilter filter = new AuthRateLimitFilter(new ObjectMapper(), clock, 1, Duration.ofSeconds(30));
        AtomicInteger passedThrough = new AtomicInteger();

        assertEquals(200, send(filter, "/api/v1/auth/login", "192.0.2.3", passedThrough).getStatus());
        assertEquals(429, send(filter, "/api/v1/auth/login", "192.0.2.3", passedThrough).getStatus());
        clock.advance(Duration.ofSeconds(30));
        assertEquals(200, send(filter, "/api/v1/auth/login", "192.0.2.3", passedThrough).getStatus());
        assertEquals(2, passedThrough.get());
    }

    private MockHttpServletResponse send(
            AuthRateLimitFilter filter,
            String path,
            String remoteAddress,
            AtomicInteger passedThrough) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr(remoteAddress);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            passedThrough.incrementAndGet();
            ((MockHttpServletResponse) servletResponse).setStatus(200);
        });
        return response;
    }

    private static final class MutableClock extends Clock {
        private final AtomicReference<Instant> instant;

        private MutableClock(Instant instant) {
            this.instant = new AtomicReference<>(instant);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return Clock.fixed(instant(), zone);
        }

        @Override
        public Instant instant() {
            return instant.get();
        }

        private void advance(Duration duration) {
            instant.updateAndGet(current -> current.plus(duration));
        }
    }
}
