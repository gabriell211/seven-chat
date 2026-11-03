package com.seven.chat.api;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PasswordRecoveryRepository {
    private final NamedParameterJdbcTemplate sql;

    public record VerifiedAccount(UUID id, String email, String passwordHash) {}
    public record PendingCode(String hash, Instant expiresAt, int failures) {}

    public PasswordRecoveryRepository(NamedParameterJdbcTemplate sql) {
        this.sql = sql;
    }

    public Optional<VerifiedAccount> verifiedByEmailLocked(String email) {
        List<VerifiedAccount> result = sql.query("""
                SELECT id, email, password_hash
                FROM accounts
                WHERE email=:email AND email_verified_at IS NOT NULL
                FOR UPDATE
                """, Map.of("email", email),
                (row, i) -> new VerifiedAccount(row.getObject("id", UUID.class),
                        row.getString("email"), row.getString("password_hash")));
        return result.stream().findFirst();
    }

    public void replaceCode(UUID accountId, String digest, Instant expiresAt) {
        sql.update("""
                INSERT INTO password_recovery_codes
                    (account_id, code_hash, issued_at, expires_at, failed_attempts)
                VALUES (:id, :hash, CURRENT_TIMESTAMP, :expires, 0)
                ON CONFLICT(account_id) DO UPDATE SET
                    code_hash=EXCLUDED.code_hash,
                    issued_at=CURRENT_TIMESTAMP,
                    expires_at=EXCLUDED.expires_at,
                    failed_attempts=0
                """, Map.of("id", accountId, "hash", digest,
                        "expires", java.sql.Timestamp.from(expiresAt)));
    }

    public Optional<PendingCode> lockedCode(UUID accountId) {
        List<PendingCode> codes = sql.query("""
                SELECT code_hash, expires_at, failed_attempts
                FROM password_recovery_codes
                WHERE account_id=:id FOR UPDATE
                """, Map.of("id", accountId),
                (row, i) -> new PendingCode(row.getString("code_hash").trim(),
                        row.getTimestamp("expires_at").toInstant(),
                        row.getInt("failed_attempts")));
        return codes.stream().findFirst();
    }

    public void failedAttempt(UUID accountId) {
        sql.update("""
                UPDATE password_recovery_codes
                SET failed_attempts=LEAST(failed_attempts+1, 5)
                WHERE account_id=:id
                """, Map.of("id", accountId));
    }

    public void consume(UUID accountId) {
        sql.update("DELETE FROM password_recovery_codes WHERE account_id=:id",
                Map.of("id", accountId));
    }
}
