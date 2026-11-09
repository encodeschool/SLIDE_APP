package com.slideforge.api.users;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserAccount {
    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(nullable = false, length = 5)
    private String locale;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Set<UserRole> roles = new HashSet<>();

    protected UserAccount() {
    }

    public UserAccount(String email, String passwordHash, String displayName, String locale, Instant now) {
        this.id = UUID.randomUUID();
        this.email = email;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.locale = locale;
        this.emailVerified = false;
        this.status = UserStatus.ACTIVE;
        this.createdAt = now;
        this.updatedAt = now;
        this.roles.add(UserRole.USER);
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void verifyEmail(Instant now) {
        this.emailVerified = true;
        this.updatedAt = now;
    }

    public void updatePasswordHash(String passwordHash, Instant now) {
        this.passwordHash = passwordHash;
        this.updatedAt = now;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void updateProfile(String displayName, String locale, Instant now) {
        this.displayName = displayName;
        this.locale = locale;
        this.updatedAt = now;
    }

    public String getLocale() {
        return locale;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public UserStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void updateStatus(UserStatus status, Instant now) {
        this.status = status;
        this.updatedAt = now;
    }

    public Set<UserRole> getRoles() {
        return Set.copyOf(roles);
    }

    public void addRole(UserRole role) {
        roles.add(role);
    }
}