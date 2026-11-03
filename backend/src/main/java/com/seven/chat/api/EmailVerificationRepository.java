package com.seven.chat.api;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public final class EmailVerificationRepository {
    private final NamedParameterJdbcTemplate sql;

    public record EmailAccount(String email, boolean verified) {}
    public record CodeEntry(String hash, Instant expiresAt, int failedAttempts) {}

    public EmailVerificationRepository(NamedParameterJdbcTemplate sql) {
        this.sql = sql;
    }

    public Optional<EmailAccount> account(UUID accountId, boolean lock) {
        String query = "SELECT email, email_verified_at FROM accounts WHERE id=:id"
                + (lock ? " FOR UPDATE" : "");
        List<EmailAccount> rows = sql.query(query, Map.of("id", accountId),
                (row, i) -> new EmailAccount(row.getString("email"),
                        row.getTimestamp("email_verified_at") != null));
        return rows.stream().findFirst();
    }

    public void saveCode(UUID accountId, String hash, Instant expiresAt) {
        sql.update("""
                INSERT INTO email_verification_codes
                    (account_id, code_hash, issued_at, expires_at, failed_attempts)
                VALUES (:id, :hash, CURRENT_TIMESTAMP, :expires, 0)
                ON CONFLICT (account_id) DO UPDATE SET
                    code_hash=EXCLUDED.code_hash,
                    issued_at=CURRENT_TIMESTAMP,
                    expires_at=EXCLUDED.expires_at,
                    failed_attempts=0
                """, Map.of("id", accountId, "hash", hash,
                        "expires", java.sql.Timestamp.from(expiresAt)));
    }

    public Optional<CodeEntry> lockedCode(UUID accountId) {
        List<CodeEntry> rows = sql.query("""
                        SELECT code_hash, expires_at, failed_attempts
                        FROM email_verification_codes WHERE account_id=:id FOR UPDATE
                        """, Map.of("id", accountId),
                (row, i) -> new CodeEntry(row.getString("code_hash").trim(),
                        row.getTimestamp("expires_at").toInstant(),
                        row.getInt("failed_attempts")));
        return rows.stream().findFirst();
    }

    public void failedAttempt(UUID accountId) {
        sql.update("""
                UPDATE email_verification_codes
                SET failed_attempts=LEAST(failed_attempts+1, 5)
                WHERE account_id=:id
                """, Map.of("id", accountId));
    }

    public void markVerified(UUID accountId) {
        sql.update("""
                UPDATE accounts SET email_verified_at=CURRENT_TIMESTAMP
                WHERE id=:id AND email_verified_at IS NULL
                """, Map.of("id", accountId));
        sql.update("DELETE FROM email_verification_codes WHERE account_id=:id",
                Map.of("id", accountId));
    }
}
