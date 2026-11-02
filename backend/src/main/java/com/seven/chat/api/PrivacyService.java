package com.seven.chat.api;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PrivacyService {
    private final NamedParameterJdbcTemplate sql;
    private final AccountStore accounts;
    private final PasswordEncoder encoder;

    public PrivacyService(NamedParameterJdbcTemplate sql,
                          AccountStore accounts, PasswordEncoder encoder) {
        this.sql = sql;
        this.accounts = accounts;
        this.encoder = encoder;
    }

    private SafetyDto.Consent consentRow(ResultSet r, int index) throws SQLException {
        return new SafetyDto.Consent(r.getString("consent_type"),
                r.getString("document_version"), r.getBoolean("granted"),
                r.getTimestamp("recorded_at").toInstant());
    }

    @Transactional
    public SafetyDto.Consent recordConsent(UUID viewer, SafetyDto.ConsentInput input) {
        sql.update("INSERT INTO privacy_consents " +
                "(account_id,consent_type,document_version,granted) " +
                "VALUES (:viewer,:type,:version,:granted) " +
                "ON CONFLICT (account_id,consent_type) DO UPDATE SET " +
                "document_version=EXCLUDED.document_version,granted=EXCLUDED.granted," +
                "recorded_at=CURRENT_TIMESTAMP",
                Map.of("viewer", viewer, "type", input.consentType(),
                        "version", input.documentVersion(), "granted", input.granted()));
        List<SafetyDto.Consent> saved = sql.query(
                "SELECT consent_type,document_version,granted,recorded_at " +
                "FROM privacy_consents WHERE account_id=:viewer AND consent_type=:type",
                Map.of("viewer", viewer, "type", input.consentType()), this::consentRow);
        return saved.get(0);
    }

    @Transactional(readOnly = true)
    public List<SafetyDto.Consent> consents(UUID viewer) {
        return sql.query("SELECT consent_type,document_version,granted,recorded_at " +
                        "FROM privacy_consents WHERE account_id=:viewer ORDER BY consent_type",
                Map.of("viewer", viewer), this::consentRow);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> export(UUID viewer) {
        AccountStore.StoredAccount me = accounts.byId(viewer)
                .orElseThrow(ApiExceptions.Unauthorized::new);
        Map<String, ?> params = Map.of("viewer", viewer);
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("exportedAt", Instant.now());
        // Never expose password hashes, token hashes, session values or other users' email.
        snapshot.put("account", Map.of("id", me.id(), "email", me.email(),
                "handle", me.handle(), "displayName", me.displayName()));
        snapshot.put("posts", sql.queryForList(
                "SELECT id,body,created_at FROM posts WHERE author_id=:viewer ORDER BY id", params));
        snapshot.put("comments", sql.queryForList(
                "SELECT id,post_id,body,created_at FROM post_comments " +
                "WHERE author_id=:viewer ORDER BY id", params));
        snapshot.put("messagesSent", sql.queryForList(
                "SELECT id,receiver_id,body,created_at FROM direct_messages " +
                "WHERE sender_id=:viewer ORDER BY id", params));
        snapshot.put("messagesReceived", sql.queryForList(
                "SELECT id,sender_id,body,created_at FROM direct_messages " +
                "WHERE receiver_id=:viewer ORDER BY id", params));
        snapshot.put("following", sql.queryForList(
                "SELECT following_id,created_at FROM follows " +
                "WHERE follower_id=:viewer ORDER BY created_at", params));
        snapshot.put("blockedAccounts", sql.queryForList(
                "SELECT blocked_id,created_at FROM user_blocks WHERE blocker_id=:viewer", params));
        snapshot.put("groups", sql.queryForList(
                "SELECT group_id,joined_at FROM group_members WHERE account_id=:viewer", params));
        snapshot.put("groupMessages", sql.queryForList(
                "SELECT group_id,body,created_at FROM group_messages " +
                "WHERE sender_id=:viewer ORDER BY id", params));
        snapshot.put("reports", sql.queryForList(
                "SELECT target_type,target_id,category,details,status,created_at " +
                "FROM moderation_reports WHERE reporter_id=:viewer ORDER BY id", params));
        snapshot.put("consents", consents(viewer));
        return snapshot;
    }

    @Transactional
    public void erase(UUID viewer, SafetyDto.DeleteAccountInput input) {
        if (!"DELETE MY ACCOUNT".equals(input.confirmation())) {
            throw new ApiExceptions.InvalidInput("Confirmação de exclusão inválida.");
        }
        AccountStore.StoredAccount existing = accounts.byId(viewer)
                .orElseThrow(ApiExceptions.Unauthorized::new);
        if (!encoder.matches(input.password(), existing.passwordHash())) {
            throw new ApiExceptions.Forbidden();
        }
        int changed = sql.update("DELETE FROM accounts WHERE id=:viewer",
                Map.of("viewer", viewer));
        if (changed != 1) throw new ApiExceptions.NotFound();
    }
}
