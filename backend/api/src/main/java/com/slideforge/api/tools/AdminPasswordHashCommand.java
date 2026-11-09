package com.slideforge.api.tools;

import java.io.Console;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

public final class AdminPasswordHashCommand {
    private AdminPasswordHashCommand() {
    }

    public static void main(String[] args) {
        Console console = System.console();
        if (console == null) {
            throw new IllegalStateException("Run this command from an interactive terminal");
        }

        char[] password = console.readPassword("Bootstrap admin password (minimum 12 characters): ");
        try {
            if (password == null || password.length < 12
                    || new String(password).getBytes(StandardCharsets.UTF_8).length > 72) {
                throw new IllegalArgumentException("Password must be at least 12 characters and at most 72 UTF-8 bytes");
            }
            PasswordEncoder encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
            String encodedHash = encoder.encode(new String(password));
            String base64Hash = Base64.getEncoder().encodeToString(encodedHash.getBytes(StandardCharsets.UTF_8));
            console.printf("BOOTSTRAP_ADMIN_PASSWORD_HASH_BASE64=%s%n", base64Hash);
        } finally {
            if (password != null) {
                Arrays.fill(password, '\0');
            }
        }
    }
}
