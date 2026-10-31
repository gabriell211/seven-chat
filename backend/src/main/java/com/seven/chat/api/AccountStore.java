package com.seven.chat.api;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccountStore {
    private final NamedParameterJdbcTemplate jdbc;

    public record StoredAccount(UUID id, String email, String handle, String displayName,
                                String passwordHash) {
        ApiDto.Account publicView() { return new ApiDto.Account(id, handle, displayName); }
    }

    public AccountStore(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private StoredAccount map(ResultSet row, int index) throws SQLException {
        return new StoredAccount(
                row.getObject("id", UUID.class), row.getString("email"), row.getString("handle"),
                row.getString("display_name"), row.getString("password_hash"));
    }

    public Optional<StoredAccount> byEmail(String email) {
        List<StoredAccount> matches = jdbc.query(
                "SELECT id, email, handle, display_name, password_hash FROM accounts WHERE email=:email",
                java.util.Map.of("email", email), this::map);
        return matches.stream().findFirst();
    }

    public Optional<StoredAccount> byId(UUID id) {
        List<StoredAccount> matches = jdbc.query(
                "SELECT id, email, handle, display_name, password_hash FROM accounts WHERE id=:id",
                java.util.Map.of("id", id), this::map);
        return matches.stream().findFirst();
    }

    public StoredAccount create(ApiDto.Register input, String passwordHash) {
        UUID id = UUID.randomUUID();
        String email = input.email().trim().toLowerCase(Locale.ROOT);
        String handle = input.handle().trim().toLowerCase(Locale.ROOT);
        jdbc.update(
                "INSERT INTO accounts (id, email, handle, display_name, password_hash) " +
                "VALUES (:id, :email, :handle, :name, :hash)",
                java.util.Map.of("id", id, "email", email, "handle", handle,
                        "name", input.displayName().trim(), "hash", passwordHash));
        return new StoredAccount(id, email, handle, input.displayName().trim(), passwordHash);
    }

    public void putSession(UUID accountId, String hash, Instant expiresAt) {
        jdbc.update(
                "INSERT INTO auth_sessions (token_hash, account_id, expires_at) " +
                "VALUES (:hash, :account, :expires)",
                java.util.Map.of("hash", hash, "account", accountId, "expires",
                        java.sql.Timestamp.from(expiresAt)));
    }

    public Optional<StoredAccount> findSession(String tokenHash) {
        List<StoredAccount> matches = jdbc.query(
                "SELECT a.id, a.email, a.handle, a.display_name, a.password_hash " +
                "FROM auth_sessions s JOIN accounts a ON a.id=s.account_id " +
                "WHERE s.token_hash=:hash AND s.expires_at>CURRENT_TIMESTAMP",
                java.util.Map.of("hash", tokenHash), this::map);
        return matches.stream().findFirst();
    }

    public void revokeSession(String tokenHash) {
        jdbc.update("DELETE FROM auth_sessions WHERE token_hash=:hash",
                java.util.Map.of("hash", tokenHash));
    }
}
