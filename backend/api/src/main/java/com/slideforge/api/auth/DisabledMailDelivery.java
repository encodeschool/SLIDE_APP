package com.slideforge.api.auth;

import com.slideforge.api.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnMissingBean(MailDelivery.class)
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
