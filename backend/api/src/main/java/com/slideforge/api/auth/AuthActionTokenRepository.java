package com.slideforge.api.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthActionTokenRepository extends JpaRepository<AuthActionToken, UUID> {
    Optional<AuthActionToken> findByTokenHashAndPurpose(String tokenHash, AuthActionToken.Purpose purpose);

    @Modifying
    @Query("update AuthActionToken token set token.consumedAt = :now "
            + "where token.tokenHash = :tokenHash and token.consumedAt is null "
            + "and token.revokedAt is null and token.expiresAt > :now")
    int consume(@Param("tokenHash") String tokenHash, @Param("now") Instant now);

    @Modifying
    @Query("update AuthActionToken token set token.revokedAt = :now "
            + "where token.user.id = :userId and token.purpose = :purpose "
            + "and token.consumedAt is null and token.revokedAt is null")
    int revokeActiveForUser(
            @Param("userId") UUID userId,
            @Param("purpose") AuthActionToken.Purpose purpose,
            @Param("now") Instant now);
}
