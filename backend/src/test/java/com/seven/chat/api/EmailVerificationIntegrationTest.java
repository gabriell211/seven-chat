package com.seven.chat.api;

import com.icegreen.greenmail.util.GreenMail;
import com.icegreen.greenmail.util.ServerSetup;
import jakarta.mail.internet.MimeMessage;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.AfterAll;
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

/**
 * Uses a real in-process SMTP protocol server and PostgreSQL 17 from CI;
 * never leaks test messages to the internet or treats a fake send as delivery.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
final class EmailVerificationIntegrationTest {
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
                () -> "CI_EMAIL_PEPPER_FOR_LOCAL_SMTP_ONLY_NOT_PRODUCTION_2026");
    }

    @AfterAll
    static void stopSmtp() {
        SMTP.stop();
    }

    @Autowired MockMvc mvc;
    @Autowired AuthService auth;
    @Autowired JdbcTemplate jdbc;

    private record User(UUID id, String token) {}

    private User register() {
        String handle = "verify_" + UUID.randomUUID().toString().substring(0, 8);
        ApiDto.Session account = auth.register(new ApiDto.Register(
                handle + "@seven.test", handle, "Teste de verificação",
                "senha-segura-para-teste-2026"));
        return new User(account.user().id(), account.accessToken());
    }

    private static String receivedCode(int index) throws Exception {
        MimeMessage message = SMTP.getReceivedMessages()[index];
        assertEquals("Seven Chat - verifique seu e-mail", message.getSubject());
        Matcher match = Pattern.compile("\\b[0-9]{8}\\b")
                .matcher(message.getContent().toString());
        assertTrue(match.find(), "O SMTP deve receber o código real.");
        return match.group();
    }

    @Test
    void authenticatedRequestSendsRealSmtpCodeAndConfirmsOnce() throws Exception {
        User account = register();
        int before = SMTP.getReceivedMessages().length;
        mvc.perform(get("/api/v1/auth/email-verification")
                .header("Authorization", "Bearer " + account.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified").value(false))
                .andExpect(jsonPath("$.maskedEmail").exists());

        mvc.perform(post("/api/v1/auth/email-verification/send"))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/v1/auth/email-verification/send")
                .header("Authorization", "Bearer " + account.token()))
                .andExpect(status().isAccepted())
                .andExpect(header().string("Cache-Control",
                        org.hamcrest.Matchers.containsString("no-store")));
        assertEquals(before + 1, SMTP.getReceivedMessages().length);
        String code = receivedCode(before);
        String wrongCode = code.equals("00000000") ? "99999999" : "00000000";

        mvc.perform(post("/api/v1/auth/email-verification/confirm")
                .header("Authorization", "Bearer " + account.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"" + wrongCode + "\"}"))
                .andExpect(status().isUnprocessableContent());
        Integer failed = jdbc.queryForObject(
                "SELECT failed_attempts FROM email_verification_codes WHERE account_id=?",
                Integer.class, account.id());
        assertEquals(1, failed);

        mvc.perform(post("/api/v1/auth/email-verification/confirm")
                .header("Authorization", "Bearer " + account.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified").value(true));

        // Retries must succeed after server commit, even if original HTTP reply was lost.
        mvc.perform(post("/api/v1/auth/email-verification/confirm")
                .header("Authorization", "Bearer " + account.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verified").value(true));
        assertEquals(0, jdbc.queryForObject(
                "SELECT COUNT(*) FROM email_verification_codes WHERE account_id=?",
                Integer.class, account.id()));
        mvc.perform(post("/api/v1/auth/email-verification/send")
                .header("Authorization", "Bearer " + account.token()))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void expiredCodeCannotVerifyAndFiveWrongAttemptsArePersistent() throws Exception {
        User expired = register();
        int index = SMTP.getReceivedMessages().length;
        mvc.perform(post("/api/v1/auth/email-verification/send")
                .header("Authorization", "Bearer " + expired.token()))
                .andExpect(status().isAccepted());
        String expiredCode = receivedCode(index);
        jdbc.update("UPDATE email_verification_codes SET expires_at=CURRENT_TIMESTAMP " +
                "- INTERVAL '1 minute' WHERE account_id=?", expired.id());
        mvc.perform(post("/api/v1/auth/email-verification/confirm")
                .header("Authorization", "Bearer " + expired.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"" + expiredCode + "\"}"))
                .andExpect(status().isUnprocessableContent());

        User locked = register();
        index = SMTP.getReceivedMessages().length;
        mvc.perform(post("/api/v1/auth/email-verification/send")
                .header("Authorization", "Bearer " + locked.token()))
                .andExpect(status().isAccepted());
        String correct = receivedCode(index);
        String wrong = correct.equals("00000000") ? "99999999" : "00000000";
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/email-verification/confirm")
                    .header("Authorization", "Bearer " + locked.token())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"code\":\"" + wrong + "\"}"))
                    .andExpect(status().isUnprocessableContent());
        }
        assertEquals(5, jdbc.queryForObject(
                "SELECT failed_attempts FROM email_verification_codes WHERE account_id=?",
                Integer.class, locked.id()));

        mvc.perform(post("/api/v1/auth/email-verification/confirm")
                .header("Authorization", "Bearer " + locked.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"" + correct + "\"}"))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(get("/api/v1/auth/email-verification")
                .header("Authorization", "Bearer " + locked.token()))
                .andExpect(jsonPath("$.verified").value(false));
    }
}
