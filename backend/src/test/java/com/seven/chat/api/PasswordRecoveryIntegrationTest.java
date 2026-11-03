package com.seven.chat.api;

import com.icegreen.greenmail.util.GreenMail;
import com.icegreen.greenmail.util.ServerSetup;
import jakarta.mail.internet.MimeMessage;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real SMTP protocol, real Spring HTTP security and real PostgreSQL, no mocked transports. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
final class PasswordRecoveryIntegrationTest {
    private static final GreenMail SMTP =
            new GreenMail(new ServerSetup(0, "127.0.0.1", ServerSetup.PROTOCOL_SMTP));
    static {
        SMTP.start();
    }

    @DynamicPropertySource
    static void smtpProperties(DynamicPropertyRegistry properties) {
        properties.add("spring.mail.host", () -> "127.0.0.1");
        properties.add("spring.mail.port", () -> SMTP.getSmtp().getPort());
        properties.add("spring.mail.properties.mail.smtp.auth", () -> "false");
        properties.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "false");
        properties.add("spring.mail.properties.mail.smtp.starttls.required", () -> "false");
        properties.add("seven.mail.from", () -> "no-reply@seven.test");
        properties.add("seven.mail.code-pepper",
                () -> "LOCAL_CI_PASSWORD_RECOVERY_HMAC_PEPPER_NOT_PRODUCTION_2026");
    }

    @AfterAll
    static void stopSmtp() {
        SMTP.stop();
    }

    @Autowired MockMvc mvc;
    @Autowired AuthService auth;
    @Autowired JdbcTemplate jdbc;

    private final List<UUID> accounts = new ArrayList<>();
    private static final String ORIGINAL = "senha-original-bem-segura-2026";
    private static final String CHANGED = "senha-recuperada-bem-segura-2026";

    private record Person(UUID id, String email, String token) {}

    @AfterEach
    void cleanup() {
        for (UUID id : accounts) {
            jdbc.update("DELETE FROM accounts WHERE id=?", id);
        }
        accounts.clear();
    }

    private Person create(boolean verified) {
        String handle = "recover_" + UUID.randomUUID().toString().substring(0, 8);
        String email = handle + "@seven.test";
        ApiDto.Session result = auth.register(new ApiDto.Register(
                email, handle, "Recuperação CI", ORIGINAL));
        UUID id = result.user().id();
        accounts.add(id);
        if (verified) {
            jdbc.update("UPDATE accounts SET email_verified_at=CURRENT_TIMESTAMP WHERE id=?", id);
        }
        return new Person(id, email, result.accessToken());
    }

    private void send(String email, int status) throws Exception {
        mvc.perform(post("/api/v1/auth/recovery/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().is(status))
                .andExpect(header().string("Cache-Control",
                        org.hamcrest.Matchers.containsString("no-store")));
    }

    private void confirm(String email, String code, String password, int status) throws Exception {
        mvc.perform(post("/api/v1/auth/recovery/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"code\":\"" + code
                        + "\",\"newPassword\":\"" + password + "\"}"))
                .andExpect(status().is(status));
    }

    private static String codeAt(int index) throws Exception {
        MimeMessage mail = SMTP.getReceivedMessages()[index];
        assertEquals("Seven Chat - recuperação de senha", mail.getSubject());
        Matcher match = Pattern.compile("\\b[0-9]{10}\\b")
                .matcher(mail.getContent().toString());
        assertTrue(match.find(), "O código de recuperação precisa chegar pelo SMTP real.");
        return match.group();
    }

    @Test
    void onlyVerifiedAccountGetsCodeAndAllSessionsAreRevokedOnSuccessfulRecovery()
            throws Exception {
        Person verified = create(true);
        Person unverified = create(false);
        String second = auth.login(new ApiDto.Login(verified.email(), ORIGINAL)).accessToken();

        int before = SMTP.getReceivedMessages().length;
        send(unverified.email(), 202);
        send("does_not_exist_" + UUID.randomUUID().toString().substring(0, 8)
                + "@seven.test", 202);
        assertEquals(before, SMTP.getReceivedMessages().length,
                "Unknown and unverified accounts must have indistinguishable responses.");

        send(verified.email(), 202);
        assertEquals(before + 1, SMTP.getReceivedMessages().length);
        String code = codeAt(before);
        String digest = jdbc.queryForObject(
                "SELECT code_hash FROM password_recovery_codes WHERE account_id=?",
                String.class, verified.id());
        assertNotNull(digest);
        assertFalse(digest.contains(code), "Never persist the plaintext recovery code.");

        String wrong = code.equals("0000000000") ? "9999999999" : "0000000000";
        confirm(verified.email(), wrong, CHANGED, 422);
        assertEquals(1, jdbc.queryForObject(
                "SELECT failed_attempts FROM password_recovery_codes WHERE account_id=?",
                Integer.class, verified.id()));

        confirm(verified.email(), code, CHANGED, 204);
        assertEquals(0, jdbc.queryForObject(
                "SELECT COUNT(*) FROM password_recovery_codes WHERE account_id=?",
                Integer.class, verified.id()));
        mvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + verified.token()))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + second))
                .andExpect(status().isUnauthorized());

        assertThrows(ApiExceptions.Unauthorized.class,
                () -> auth.login(new ApiDto.Login(verified.email(), ORIGINAL)));
        String newToken = auth.login(new ApiDto.Login(verified.email(), CHANGED)).accessToken();
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + newToken))
                .andExpect(status().isOk());

        confirm(verified.email(), code, "senha-diferente-segura-2026", 422);
        assertThrows(ApiExceptions.Unauthorized.class,
                () -> auth.login(new ApiDto.Login(unverified.email(), CHANGED)));
    }

    @Test
    void expiredOrLockedCodeCannotResetAndNewestRequestInvalidatesPreviousCode()
            throws Exception {
        Person expired = create(true);
        int before = SMTP.getReceivedMessages().length;
        send(expired.email(), 202);
        String oldCode = codeAt(before);
        jdbc.update("UPDATE password_recovery_codes SET expires_at="
                + "CURRENT_TIMESTAMP-INTERVAL '1 minute' WHERE account_id=?", expired.id());
        confirm(expired.email(), oldCode, CHANGED, 422);

        Person locked = create(true);
        before = SMTP.getReceivedMessages().length;
        send(locked.email(), 202);
        String correct = codeAt(before);
        String incorrect = correct.equals("0000000000") ? "9999999999" : "0000000000";
        for (int i = 0; i < 5; i++) {
            confirm(locked.email(), incorrect, CHANGED, 422);
        }
        assertEquals(5, jdbc.queryForObject(
                "SELECT failed_attempts FROM password_recovery_codes WHERE account_id=?",
                Integer.class, locked.id()));
        confirm(locked.email(), correct, CHANGED, 422);
        assertNotNull(auth.login(new ApiDto.Login(locked.email(), ORIGINAL)).accessToken());

        Person replacement = create(true);
        before = SMTP.getReceivedMessages().length;
        send(replacement.email(), 202);
        String first = codeAt(before);
        String hashBefore = jdbc.queryForObject(
                "SELECT code_hash FROM password_recovery_codes WHERE account_id=?",
                String.class, replacement.id());
        send(replacement.email(), 202);
        String second = codeAt(before + 1);
        String hashAfter = jdbc.queryForObject(
                "SELECT code_hash FROM password_recovery_codes WHERE account_id=?",
                String.class, replacement.id());
        assertNotEquals(hashBefore, hashAfter);
        confirm(replacement.email(), first, CHANGED, 422);
        confirm(replacement.email(), second, CHANGED, 204);
    }

    @Test
    void invalidPayloadAndSamePasswordCannotReset() throws Exception {
        Person verified = create(true);
        int index = SMTP.getReceivedMessages().length;
        send(verified.email(), 202);
        String code = codeAt(index);
        confirm(verified.email(), code, ORIGINAL, 422);
        confirm(verified.email(), code, "á".repeat(40), 422);
        confirm(verified.email(), code, CHANGED, 204);

        mvc.perform(post("/api/v1/auth/recovery/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"no\",\"code\":\"1\",\"newPassword\":\"123\"}"))
                .andExpect(status().isUnprocessableContent());
    }
}
