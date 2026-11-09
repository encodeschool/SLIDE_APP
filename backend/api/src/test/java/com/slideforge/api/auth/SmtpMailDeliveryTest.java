package com.slideforge.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.net.URI;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpMailDeliveryTest {
    @Test
    void buildsLinksOnlyFromConfiguredPublicBaseUrl() {
        JavaMailSender sender = mock(JavaMailSender.class);
        SmtpMailDelivery delivery = new SmtpMailDelivery(
                sender,
                "no-reply@example.test",
                URI.create("https://slides.example.test/app/"),
                URI.create("https://admin.example.test/"));

        delivery.sendVerification("recipient@example.test", "opaque-token");

        ArgumentCaptor<SimpleMailMessage> message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(message.capture());
        assertEquals("recipient@example.test", message.getValue().getTo()[0]);
        org.junit.jupiter.api.Assertions.assertTrue(message.getValue().getText().contains(
                "https://slides.example.test/app/verify-email?token=opaque-token"));
    }

    @Test
    void sendsAdministratorInvitationsToConfiguredAdminOrigin() {
        JavaMailSender sender = mock(JavaMailSender.class);
        SmtpMailDelivery delivery = new SmtpMailDelivery(
                sender,
                "no-reply@example.test",
                URI.create("https://slides.example.test"),
                URI.create("https://admin.example.test"));

        delivery.sendAdminInvitation("new-admin@example.test", "invite-token");

        ArgumentCaptor<SimpleMailMessage> message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(message.capture());
        assertEquals("new-admin@example.test", message.getValue().getTo()[0]);
        org.junit.jupiter.api.Assertions.assertTrue(message.getValue().getText().contains(
                "https://admin.example.test?admin-invite=invite-token"));
    }

    @Test
    void rejectsNonTlsPublicUrlsOutsideLoopback() {
        assertThrows(IllegalArgumentException.class, () -> new SmtpMailDelivery(
                mock(JavaMailSender.class),
                "no-reply@example.test",
                URI.create("http://slides.example.test"),
                URI.create("https://admin.example.test")));
    }
}
