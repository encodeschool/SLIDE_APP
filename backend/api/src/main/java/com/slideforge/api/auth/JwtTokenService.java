package com.slideforge.api.auth;

import com.slideforge.api.users.model.UserAccount;
import com.slideforge.api.users.model.UserRole;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {
    private final JwtEncoder jwtEncoder;
    private final Clock clock;
    private final Duration accessTokenTtl;

    public JwtTokenService(
            JwtEncoder jwtEncoder,
            Clock clock,
            @Value("${app.auth.access-token-ttl-minutes}") long accessTokenTtlMinutes) {
        this.jwtEncoder = jwtEncoder;
        this.clock = clock;
        this.accessTokenTtl = Duration.ofMinutes(accessTokenTtlMinutes);
    }

    public String createAccessToken(UserAccount user) {
        Instant now = clock.instant();
        List<String> roles = user.getRoles().stream().map(UserRole::name).sorted().toList();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("slideforge-api")
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(accessTokenTtl))
                .claim("roles", roles)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public long accessTokenTtlSeconds() {
        return accessTokenTtl.toSeconds();
    }
}