package com.seven.chat.api;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Cluster-safe login and registration throttling using a PostgreSQL atomic upsert.
 * Each attempt commits independently of a failed login/registration transaction.
 */
@Service
public class AuthThrottle {
    private static final String UPSERT = """
            INSERT INTO auth_throttles(scope_key, attempts, window_started_at, blocked_until)
            VALUES (:key, 1, CURRENT_TIMESTAMP, NULL)
            ON CONFLICT(scope_key) DO UPDATE SET
              attempts = CASE
                  WHEN auth_throttles.window_started_at < CURRENT_TIMESTAMP -
                       (CAST(:minutes AS integer) * INTERVAL '1 minute')
                  THEN 1 ELSE auth_throttles.attempts + 1 END,
              window_started_at = CASE
                  WHEN auth_throttles.window_started_at < CURRENT_TIMESTAMP -
                       (CAST(:minutes AS integer) * INTERVAL '1 minute')
                  THEN CURRENT_TIMESTAMP ELSE auth_throttles.window_started_at END,
              blocked_until = CASE
                  WHEN auth_throttles.window_started_at < CURRENT_TIMESTAMP -
                       (CAST(:minutes AS integer) * INTERVAL '1 minute')
                  THEN NULL
                  WHEN auth_throttles.blocked_until > CURRENT_TIMESTAMP
                  THEN auth_throttles.blocked_until
                  WHEN auth_throttles.attempts + 1 >= :maxAttempts
                  THEN CURRENT_TIMESTAMP + (CAST(:minutes AS integer) * INTERVAL '1 minute')
                  ELSE NULL END
            RETURNING blocked_until
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate transaction;

    public AuthThrottle(NamedParameterJdbcTemplate jdbc,
                        PlatformTransactionManager transactionManager) {
        this.jdbc = jdbc;
        this.transaction = new TransactionTemplate(transactionManager);
        this.transaction.setPropagationBehavior(
                org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void loginAttempt(String email, String remoteAddress) {
        check("login-address", remoteAddress, 120, 15);
        check("login-account", email.trim().toLowerCase(Locale.ROOT), 8, 15);
    }

    public void emailVerificationSendAttempt(String accountId) {
        check("email-verification-account", accountId, 3, 60);
    }

    public void passwordRecoveryRequestAttempt(String email, String remoteAddress) {
        // Both buckets apply even when the email does not correspond to an account.
        check("recovery-request-ip", remoteAddress, 60, 60);
        check("recovery-request-email", email.trim().toLowerCase(Locale.ROOT), 4, 60);
    }

    public void passwordRecoveryConfirmAttempt(String email, String remoteAddress) {
        check("recovery-confirm-ip", remoteAddress, 120, 15);
        check("recovery-confirm-email", email.trim().toLowerCase(Locale.ROOT), 12, 15);
    }

    public void passwordChangeAttempt(String accountId) {
        check("change-password-account", accountId, 8, 15);
    }

    public void clearSuccessfulPasswordChange(String accountId) {
        jdbc.update("DELETE FROM auth_throttles WHERE scope_key=:key",
                Map.of("key", hash("change-password-account:" + accountId)));
    }

    public void registrationAttempt(String remoteAddress) {
        check("register-address", remoteAddress, 15, 60);
    }

    public void clearSuccessfulLogin(String email) {
        jdbc.update("DELETE FROM auth_throttles WHERE scope_key=:key",
                Map.of("key", hash("login-account:" + email.trim().toLowerCase(Locale.ROOT))));
    }

    private void check(String scope, String identity, int maxAttempts, int minutes) {
        String key = hash(scope + ":" + identity);
        // Commit the throttle event first, including requests that will return 429.
        // Throwing inside the transaction would undo the counter and allow brute force.
        Timestamp blockedUntil = transaction.execute(status ->
                jdbc.queryForObject(UPSERT,
                        Map.of("key", key, "minutes", minutes, "maxAttempts", maxAttempts),
                        (rs, rowNum) -> rs.getTimestamp("blocked_until")));
        if (blockedUntil != null && blockedUntil.toInstant().isAfter(Instant.now())) {
            throw new ApiExceptions.TooManyRequests();
        }
    }

    static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponível", exception);
        }
    }
}
