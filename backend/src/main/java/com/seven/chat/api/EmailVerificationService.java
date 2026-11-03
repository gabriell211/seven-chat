package com.seven.chat.api;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailVerificationService {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationRepository repository;
    private final ObjectProvider<JavaMailSender> mailers;
    private final String senderAddress;
    private final String pepper;

    public EmailVerificationService(EmailVerificationRepository repository,
            ObjectProvider<JavaMailSender> mailers, Environment environment) {
        this.repository = repository;
        this.mailers = mailers;
        this.senderAddress = environment.getProperty("seven.mail.from", "");
        this.pepper = environment.getProperty("seven.mail.code-pepper", "");
    }

    @Transactional(readOnly = true)
    public ApiDto.EmailStatus status(UUID accountId) {
        EmailVerificationRepository.EmailAccount account = repository.account(accountId, false)
                .orElseThrow(ApiExceptions.Unauthorized::new);
        String[] split = account.email().split("@", 2);
        String maskedEmail = split[0].substring(0, 1) + "***@" + split[1];
        return new ApiDto.EmailStatus(maskedEmail, account.verified());
    }

    @Transactional
    public void send(UUID accountId) {
        // No fake delivery, debug codes or fallback provider in runtime.
        JavaMailSender mailer = mailers.getIfAvailable();
        if (mailer == null || senderAddress.isBlank() || pepper.length() < 32) {
            throw new ApiExceptions.EmailUnavailable();
        }
        EmailVerificationRepository.EmailAccount account = repository.account(accountId, true)
                .orElseThrow(ApiExceptions.Unauthorized::new);
        if (account.verified()) {
            throw new ApiExceptions.InvalidInput("Este e-mail já foi verificado.");
        }
        String code = "%08d".formatted(RANDOM.nextInt(100_000_000));
        repository.saveCode(accountId, digest(accountId, code), Instant.now().plusSeconds(900));
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderAddress);
        message.setTo(account.email());
        message.setSubject("Seven Chat - verifique seu e-mail");
        message.setText("Seu código Seven Chat é: " + code
                + "\n\nEle expira em 15 minutos. Não compartilhe este código."
                + "\nSe você não solicitou a verificação, ignore esta mensagem.");
        try {
            mailer.send(message);
        } catch (MailException exception) {
            // Any failure rolls back this transaction and its code.
            throw new ApiExceptions.EmailUnavailable();
        }
    }

    @Transactional
    public boolean confirm(UUID accountId, String code) {
        EmailVerificationRepository.EmailAccount account = repository.account(accountId, true)
                .orElseThrow(ApiExceptions.Unauthorized::new);
        if (account.verified()) return true; // Idempotent retry after success.
        EmailVerificationRepository.CodeEntry stored = repository.lockedCode(accountId)
                .orElse(null);
        if (stored == null || stored.failedAttempts() >= 5
                || !stored.expiresAt().isAfter(Instant.now())) return false;
        boolean matches = MessageDigest.isEqual(
                HexFormat.of().parseHex(stored.hash()),
                HexFormat.of().parseHex(digest(accountId, code)));
        if (!matches) {
            // Return false so invalid-attempt counters COMMIT instead of rolling back.
            repository.failedAttempt(accountId);
            return false;
        }
        repository.markVerified(accountId);
        return true;
    }

    private String digest(UUID accountId, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(
                    (accountId + ":" + code).getBytes(StandardCharsets.US_ASCII)));
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("HMAC indisponível", ex);
        }
    }
}
