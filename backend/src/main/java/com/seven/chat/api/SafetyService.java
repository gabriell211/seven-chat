package com.seven.chat.api;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SafetyService {
    private final NamedParameterJdbcTemplate sql;

    public SafetyService(NamedParameterJdbcTemplate sql) {
        this.sql = sql;
    }

    private long count(String query, Map<String, ?> args) {
        Long n = sql.queryForObject(query, args, Long.class);
        return n == null ? 0L : n;
    }

    private boolean moderator(UUID viewer) {
        return count("SELECT COUNT(*) FROM moderation_roles WHERE account_id=:viewer",
                Map.of("viewer", viewer)) > 0;
    }

    private void requireModerator(UUID viewer) {
        if (!moderator(viewer)) throw new ApiExceptions.Forbidden();
    }

    private void targetExists(UUID reporter, SafetyDto.ReportInput input) {
        if (input.targetType().equals("account")) {
            UUID subject;
            try {
                subject = UUID.fromString(input.targetId());
            } catch (IllegalArgumentException ex) {
                throw new ApiExceptions.InvalidInput("Identificador de usuário inválido.");
            }
            if (subject.equals(reporter)) {
                throw new ApiExceptions.InvalidInput("Não é permitido denunciar a si mesmo.");
            }
            if (count("SELECT COUNT(*) FROM accounts WHERE id=:id",
                    Map.of("id", subject)) == 0) throw new ApiExceptions.NotFound();
        } else {
            long id;
            try {
                id = Long.parseLong(input.targetId());
            } catch (NumberFormatException ex) {
                throw new ApiExceptions.InvalidInput("Identificador inválido.");
            }
            if (id < 1) throw new ApiExceptions.InvalidInput("Identificador inválido.");
            if (input.targetType().equals("post")) {
                if (count("SELECT COUNT(*) FROM posts WHERE id=:id",
                        Map.of("id", id)) == 0) throw new ApiExceptions.NotFound();
            } else {
                if (count("SELECT COUNT(*) FROM group_messages m " +
                                "JOIN group_members gm ON gm.group_id=m.group_id " +
                                "WHERE m.id=:id AND gm.account_id=:reporter",
                        Map.of("id", id, "reporter", reporter)) == 0) {
                    throw new ApiExceptions.NotFound();
                }
            }
        }
    }

    private SafetyDto.Report map(ResultSet row, int index) throws SQLException {
        return new SafetyDto.Report(row.getLong("id"),
                row.getObject("reporter_id", UUID.class),
                row.getString("target_type"), row.getString("target_id"),
                row.getString("category"), row.getString("details"),
                row.getString("status"), row.getTimestamp("created_at").toInstant());
    }

    @Transactional
    public SafetyDto.Report report(UUID reporter, SafetyDto.ReportInput input) {
        targetExists(reporter, input);
        if (count("SELECT COUNT(*) FROM moderation_reports WHERE reporter_id=:reporter " +
                        "AND created_at>CURRENT_TIMESTAMP-INTERVAL '1 day'",
                Map.of("reporter", reporter)) >= 20) {
            throw new ApiExceptions.TooManyRequests();
        }
        MapSqlParameterSource args = new MapSqlParameterSource()
                .addValue("reporter", reporter)
                .addValue("targetType", input.targetType())
                .addValue("targetId", input.targetId())
                .addValue("category", input.category())
                .addValue("details", input.details() == null ? "" : input.details().trim());
        List<SafetyDto.Report> existing = sql.query(
                "SELECT id,reporter_id,target_type,target_id,category,details,status,created_at " +
                "FROM moderation_reports WHERE reporter_id=:reporter " +
                "AND target_type=:targetType AND target_id=:targetId",
                args, this::map);
        if (!existing.isEmpty()) throw new ApiExceptions.InvalidInput("Denúncia já registrada.");
        try {
            List<SafetyDto.Report> inserted = sql.query(
                    "INSERT INTO moderation_reports " +
                    "(reporter_id,target_type,target_id,category,details) " +
                    "VALUES (:reporter,:targetType,:targetId,:category,:details) " +
                    "ON CONFLICT (reporter_id,target_type,target_id) DO NOTHING " +
                    "RETURNING id,reporter_id,target_type,target_id,category,details,status,created_at",
                    args, this::map);
            if (inserted.isEmpty()) throw new ApiExceptions.InvalidInput("Denúncia já registrada.");
            return inserted.get(0);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiExceptions.InvalidInput("Dados da denúncia inválidos.");
        }
    }

    @Transactional(readOnly = true)
    public List<SafetyDto.Report> mine(UUID viewer) {
        return sql.query("SELECT id,reporter_id,target_type,target_id,category,details," +
                        "status,created_at FROM moderation_reports WHERE reporter_id=:viewer " +
                        "ORDER BY id DESC LIMIT 100",
                Map.of("viewer", viewer), this::map);
    }

    @Transactional(readOnly = true)
    public List<SafetyDto.Report> queue(UUID viewer, String status) {
        requireModerator(viewer);
        if (!List.of("OPEN", "REVIEWING", "RESOLVED", "DISMISSED").contains(status)) {
            throw new ApiExceptions.InvalidInput("Status de moderação inválido.");
        }
        return sql.query("SELECT id,reporter_id,target_type,target_id,category,details," +
                        "status,created_at FROM moderation_reports WHERE status=:status " +
                        "ORDER BY id DESC LIMIT 100",
                Map.of("status", status), this::map);
    }

    @Transactional
    public SafetyDto.Report review(UUID reviewer, long id, SafetyDto.ReviewInput input) {
        requireModerator(reviewer);
        int updated = sql.update("UPDATE moderation_reports " +
                        "SET status=:status,review_notes=:notes,reviewer_id=:reviewer," +
                        "reviewed_at=CURRENT_TIMESTAMP WHERE id=:id",
                Map.of("status", input.status(), "notes", input.notes().trim(),
                        "reviewer", reviewer, "id", id));
        if (updated == 0) throw new ApiExceptions.NotFound();
        List<SafetyDto.Report> reports = sql.query(
                "SELECT id,reporter_id,target_type,target_id,category,details,status,created_at " +
                "FROM moderation_reports WHERE id=:id", Map.of("id", id), this::map);
        return reports.get(0);
    }
}
