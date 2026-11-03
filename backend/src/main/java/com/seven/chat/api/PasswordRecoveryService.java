package com.seven.chat.api;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordRecoveryService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long CODE_BOUND = 10_000_000_000L;
    private final PasswordRecoveryRepository recovery;
    private final AccountStore accounts;
    private final PasswordEncoder passwords;
    private final ObjectProvider<JavaMailSender> senders;
    private final String from;
    private final String pepper;

    public PasswordRecoveryService(PasswordRecoveryRepository recovery,
            AccountStore accounts, PasswordEncoder passwords,
            ObjectProvider<JavaMailSender> senders, Environment environment) {
        this.recovery = recovery;
        this.accounts = accounts;
        this.passwords = passwords;
        this.senders = senders;
        this.from = environment.getProperty("seven.mail.from", "");
        this.pepper = environment.getProperty("seven.mail.code-pepper", "");
    }

    @Transactional
    public void request(String rawEmail) {
        // Same HTTP status for unknown/unverified addresses. SMTP failure is not masked.
        JavaMailSender sender = senders.getIfAvailable();
        if (sender == null || from.isBlank() || pepper.length() < 32) {
            throw new ApiExceptions.EmailUnavailable();
        }
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        Optional<PasswordRecoveryRepository.VerifiedAccount> found =
                recovery.verifiedByEmailLocked(email);
        if (found.isEmpty()) return;

        PasswordRecoveryRepository.VerifiedAccount account = found.get();
        String code = "%010d".formatted(RANDOM.nextLong(CODE_BOUND));
        recovery.replaceCode(account.id(), digest(account.id(), code),
                Instant.now().plusSeconds(900));

        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(from);
        mail.setTo(account.email());
        mail.setSubject("Seven Chat - recuperação de senha");
        mail.setText("Seu código para redefinir a senha é: " + code
                + "\n\nO código expira em 15 minutos e pode ser usado uma única vez."
                + "\nSe não solicitou esta alteração, ignore esta mensagem.");
        try {
            sender.send(mail);
        } catch (MailException ex) {
            // Roll back the code, keeping the previously valid code unchanged.
            throw new ApiExceptions.EmailUnavailable();
        }
    }

    @Transactional
    public boolean confirm(String rawEmail, String code, String replacement) {
        int length = replacement.getBytes(StandardCharsets.UTF_8).length;
        if (replacement.isBlank() || length < 12 || length > 72) {
            throw new ApiExceptions.InvalidInput("A nova senha deve ter de 12 a 72 bytes.");
        }

        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        Optional<PasswordRecoveryRepository.VerifiedAccount> found =
                recovery.verifiedByEmailLocked(email);
        if (found.isEmpty()) return false;
        PasswordRecoveryRepository.VerifiedAccount account = found.get();
        Optional<PasswordRecoveryRepository.PendingCode> pending = recovery.lockedCode(account.id());
        if (pending.isEmpty()) return false;

        PasswordRecoveryRepository.PendingCode saved = pending.get();
        if (saved.failures() >= 5 || !saved.expiresAt().isAfter(Instant.now())) return false;
        byte[] supplied = HexFormat.of().parseHex(digest(account.id(), code));
        byte[] expected = HexFormat.of().parseHex(saved.hash());
        if (!MessageDigest.isEqual(supplied, expected)) {
            // Commit invalid attempts: controller returns the HTTP error after service returns.
            recovery.failedAttempt(account.id());
            return false;
        }
        if (passwords.matches(replacement, account.passwordHash())) {
            throw new ApiExceptions.InvalidInput("Escolha uma senha diferente da atual.");
        }
        accounts.replacePasswordAndRevokeSessions(account.id(),
                passwords.encode(replacement));
        recovery.consume(account.id());
        return true;
    }

    private String digest(UUID accountId, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String value = "seven-password-recovery:" + accountId + ":" + code;
            return HexFormat.of().formatHex(mac.doFinal(
                    value.getBytes(StandardCharsets.US_ASCII)));
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("HMAC indisponível.", ex);
        }
    }
}
