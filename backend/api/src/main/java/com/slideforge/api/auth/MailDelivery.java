package com.slideforge.api.auth;

public interface MailDelivery {
    void sendVerification(String recipient, String rawToken);

    void sendPasswordRecovery(String recipient, String rawToken);

    void sendAdminInvitation(String recipient, String rawToken);
}
