package com.seven.chat.api;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only entitlement validation. Grants are provisioned only by a trusted
 * server-side billing reconciler; the mobile client cannot grant itself VIP.
 */
@Service
public class VipEntitlementService {
    public record Status(boolean active, Instant expiresAt) {}

    private final NamedParameterJdbcTemplate sql;

    public VipEntitlementService(NamedParameterJdbcTemplate sql) {
        this.sql = sql;
    }

    @Transactional(readOnly = true)
    public Status status(UUID accountId) {
        List<Timestamp> expires = sql.query(
                "SELECT expires_at FROM vip_entitlements WHERE account_id=:account " +
                "AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP",
                Map.of("account", accountId), (row, number) -> row.getTimestamp(1));
        if (expires.isEmpty()) return new Status(false, null);
        return new Status(true, expires.get(0).toInstant());
    }

    @Transactional(readOnly = true)
    public boolean active(UUID accountId) {
        return status(accountId).active();
    }

    public void requireActive(UUID accountId) {
        if (!active(accountId)) throw new ApiExceptions.Forbidden();
    }
}
