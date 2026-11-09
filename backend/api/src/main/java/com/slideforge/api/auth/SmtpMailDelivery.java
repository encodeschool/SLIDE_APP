package com.slideforge.api.auth;

import java.net.URI;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
public class SmtpMailDelivery implements MailDelivery {
    private final JavaMailSender mailSender;
    private final String sender;
    private final URI publicBaseUri;
    private final URI adminBaseUri;

    public SmtpMailDelivery(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String sender,
            @Value("${app.mail.public-base-url}") URI publicBaseUri,
            @Value("${app.mail.admin-base-url}") URI adminBaseUri) {
        String scheme = publicBaseUri.getScheme();
        String host = publicBaseUri.getHost();
        boolean localHost = "localhost".equalsIgnoreCase(host)
                || "127.0.0.1".equals(host)
                || "::1".equals(host)
                || "[::1]".equals(host);
        if (!("https".equalsIgnoreCase(scheme)
                || ("http".equalsIgnoreCase(scheme) && localHost))
                || publicBaseUri.getHost() == null
                || publicBaseUri.getUserInfo() != null
                || publicBaseUri.getQuery() != null
                || publicBaseUri.getFragment() != null) {
            throw new IllegalArgumentException("Mail public base URL must use HTTPS except for a local loopback host");
        }
        validateBaseUri(adminBaseUri);
        this.mailSender = mailSender;
        this.sender = Objects.requireNonNull(sender);
        this.publicBaseUri = URI.create(publicBaseUri.toString().replaceAll("/+$", ""));
        this.adminBaseUri = URI.create(adminBaseUri.toString().replaceAll("/+$", ""));
    }

    @Override
    public void sendVerification(String recipient, String rawToken) {
        send(recipient, "Verify your Slideforge email", "/verify-email", rawToken,
                "Use this link to verify your Slideforge email address:");
    }

    @Override
    public void sendPasswordRecovery(String recipient, String rawToken) {
        send(recipient, "Reset your Slideforge password", "/reset-password", rawToken,
                "Use this link to reset your Slideforge password:");
    }

    @Override
    public void sendAdminInvitation(String recipient, String rawToken) {
        String link = UriComponentsBuilder.fromUri(adminBaseUri)
                .queryParam("admin-invite", rawToken)
                .build()
                .encode()
                .toUriString();
        sendMessage(recipient, "You're invited to Slideforge Admin",
                "Use this one-time link to create your Slideforge administrator password:\n\n" + link);
    }

    private void send(String recipient, String subject, String path, String token, String introduction) {
        String link = UriComponentsBuilder.fromUri(publicBaseUri).path(path)
                .queryParam("token", token)
                .build()
                .encode()
                .toUriString();
        sendMessage(recipient, subject, introduction + "\n\n" + link);
    }

    private void sendMessage(String recipient, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(sender);
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    private void validateBaseUri(URI baseUri) {
        String scheme = baseUri.getScheme();
        String host = baseUri.getHost();
        boolean localHost = "localhost".equalsIgnoreCase(host)
                || "127.0.0.1".equals(host)
                || "::1".equals(host)
                || "[::1]".equals(host);
        if (!("https".equalsIgnoreCase(scheme)
                || ("http".equalsIgnoreCase(scheme) && localHost))
                || host == null
                || baseUri.getUserInfo() != null
                || baseUri.getQuery() != null
                || baseUri.getFragment() != null) {
            throw new IllegalArgumentException("Mail admin base URL must use HTTPS except for a local loopback host");
        }
    }
}
