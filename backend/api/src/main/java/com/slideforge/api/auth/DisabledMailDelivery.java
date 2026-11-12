package com.slideforge.api.auth;

import com.slideforge.api.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "false", matchIfMissing = true)
public class DisabledMailDelivery implements MailDelivery {
    @Override
    public void sendVerification(String recipient, String rawToken) {
        // Intentionally disabled in local development; never expose tokens in logs or responses.
    }

    @Override
    public void sendPasswordRecovery(String recipient, String rawToken) {
        // Intentionally disabled in local development; never expose tokens in logs or responses.
    }

    @Override
    public void sendAdminInvitation(String recipient, String rawToken) {
        throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "MAIL_DELIVERY_DISABLED",
                "Administrator invitations require configured email delivery");
    }
}
