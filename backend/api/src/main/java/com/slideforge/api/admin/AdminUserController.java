package com.slideforge.api.admin;

import com.slideforge.api.users.UserStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {
    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public AdminUserPageResponse listUsers(
            @RequestParam(required = false) @Size(max = 120) String search,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        var result = adminUserService.search(search, status, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return new AdminUserPageResponse(result.getContent(), result.getNumber(), result.getSize(), result.getTotalElements());
    }

    @PostMapping("/invitations")
    public ResponseEntity<Void> inviteAdmin(@Valid @RequestBody AdminInvitationRequest request) {
        adminUserService.inviteAdmin(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }

    @PostMapping("/{userId}/disable")
    public AdminUserResponse disable(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId) {
        return adminUserService.disable(UUID.fromString(jwt.getSubject()), userId);
    }

    @PostMapping("/{userId}/enable")
    public AdminUserResponse enable(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId) {
        return adminUserService.enable(UUID.fromString(jwt.getSubject()), userId);
    }
}
