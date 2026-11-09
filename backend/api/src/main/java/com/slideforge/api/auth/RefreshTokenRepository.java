package com.slideforge.api.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken token set token.revokedAt = :now "
            + "where token.tokenHash = :tokenHash and token.revokedAt is null and token.expiresAt > :now")
    int revokeActive(@Param("tokenHash") String tokenHash, @Param("now") Instant now);

    @Modifying
    @Query("update RefreshToken token set token.revokedAt = :now "
            + "where token.tokenHash = :tokenHash and token.revokedAt is null")
    int revokeIfPresent(@Param("tokenHash") String tokenHash, @Param("now") Instant now);

    @Modifying
    @Query("update RefreshToken token set token.revokedAt = :now "
            + "where token.user.id = :userId and token.revokedAt is null")
    int revokeAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}