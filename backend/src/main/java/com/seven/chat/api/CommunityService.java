package com.seven.chat.api;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommunityService {
    private final NamedParameterJdbcTemplate sql;

    public CommunityService(NamedParameterJdbcTemplate sql) {
        this.sql = sql;
    }

    private long count(String query, Map<String, ?> args) {
        Long result = sql.queryForObject(query, args, Long.class);
        return result == null ? 0L : result;
    }

    private boolean member(UUID viewer, UUID group) {
        return count("SELECT COUNT(*) FROM group_members WHERE account_id=:viewer AND group_id=:group",
                Map.of("viewer", viewer, "group", group)) > 0;
    }

    private void requireMember(UUID viewer, UUID group) {
        if (!member(viewer, group)) throw new ApiExceptions.NotFound();
    }

    private void requireOwner(UUID viewer, UUID group) {
        if (count("SELECT COUNT(*) FROM chat_groups WHERE id=:group AND owner_id=:viewer",
                Map.of("group", group, "viewer", viewer)) == 0) {
            throw new ApiExceptions.NotFound();
        }
    }

    private CommunityDto.Group groupRow(ResultSet r, int index) throws SQLException {
        return new CommunityDto.Group(r.getObject("id", UUID.class),
                r.getObject("owner_id", UUID.class), r.getString("name"),
                r.getString("description"), r.getLong("member_count"),
                r.getTimestamp("created_at").toInstant());
    }

    private static String groupSelect() {
        return "SELECT g.id,g.owner_id,g.name,g.description,g.created_at," +
                "(SELECT COUNT(*) FROM group_members gm WHERE gm.group_id=g.id) member_count " +
                "FROM chat_groups g ";
    }

    @Transactional
    public CommunityDto.Group create(UUID viewer, CommunityDto.CreateGroup input) {
        UUID id = UUID.randomUUID();
        String name = input.name().trim();
        String description = input.description() == null ? "" : input.description().trim();
        if (name.length() < 3) throw new ApiExceptions.InvalidInput("Nome de grupo muito curto.");
        sql.update("INSERT INTO chat_groups (id,owner_id,name,description) " +
                        "VALUES (:id,:viewer,:name,:description)",
                Map.of("id", id, "viewer", viewer, "name", name, "description", description));
        sql.update("INSERT INTO group_members (group_id,account_id) VALUES (:id,:viewer)",
                Map.of("id", id, "viewer", viewer));
        return get(viewer, id);
    }

    @Transactional(readOnly = true)
    public List<CommunityDto.Group> mine(UUID viewer) {
        return sql.query(groupSelect() +
                        "JOIN group_members gm ON gm.group_id=g.id " +
                        "WHERE gm.account_id=:viewer ORDER BY g.created_at DESC LIMIT 100",
                Map.of("viewer", viewer), this::groupRow);
    }

    @Transactional(readOnly = true)
    public CommunityDto.Group get(UUID viewer, UUID group) {
        requireMember(viewer, group);
        List<CommunityDto.Group> groups = sql.query(groupSelect() + "WHERE g.id=:group",
                Map.of("group", group), this::groupRow);
        if (groups.isEmpty()) throw new ApiExceptions.NotFound();
        return groups.get(0);
    }

    @Transactional
    public CommunityDto.Invitation invite(UUID viewer, UUID group, CommunityDto.InviteUser input) {
        requireOwner(viewer, group);
        List<UUID> matches = sql.query("SELECT id FROM accounts WHERE handle=:handle",
                Map.of("handle", input.handle()), (r, i) -> r.getObject(1, UUID.class));
        if (matches.isEmpty()) throw new ApiExceptions.NotFound();
        UUID invitee = matches.get(0);
        if (invitee.equals(viewer)) throw new ApiExceptions.InvalidInput("Você já está no grupo.");
        if (member(invitee, group)) throw new ApiExceptions.InvalidInput("A pessoa já está no grupo.");
        if (count("SELECT COUNT(*) FROM user_blocks WHERE " +
                        "(blocker_id=:a AND blocked_id=:b) OR (blocker_id=:b AND blocked_id=:a)",
                Map.of("a", viewer, "b", invitee)) > 0) {
            throw new ApiExceptions.Forbidden();
        }
        UUID inviteId = UUID.randomUUID();
        Map<String, Object> args = Map.of("id", inviteId, "group", group,
                "viewer", viewer, "invitee", invitee);
        sql.update("INSERT INTO group_invitations " +
                "(id,group_id,inviter_id,invitee_id) VALUES (:id,:group,:viewer,:invitee) " +
                "ON CONFLICT (group_id,invitee_id) DO UPDATE SET " +
                "status='PENDING',updated_at=CURRENT_TIMESTAMP,inviter_id=EXCLUDED.inviter_id", args);
        List<CommunityDto.Invitation> result = invitations(invitee);
        return result.stream().filter(i -> i.groupId().equals(group))
                .findFirst().orElseThrow(ApiExceptions.NotFound::new);
    }

    private CommunityDto.Invitation inviteRow(ResultSet r, int index) throws SQLException {
        return new CommunityDto.Invitation(r.getObject("id", UUID.class),
                r.getObject("group_id", UUID.class), r.getString("group_name"),
                r.getObject("inviter_id", UUID.class), r.getString("inviter_handle"),
                r.getString("status"), r.getTimestamp("created_at").toInstant());
    }

    @Transactional(readOnly = true)
    public List<CommunityDto.Invitation> invitations(UUID viewer) {
        return sql.query("SELECT i.id,i.group_id,g.name group_name,i.inviter_id," +
                        "a.handle inviter_handle,i.status,i.created_at FROM group_invitations i " +
                        "JOIN chat_groups g ON g.id=i.group_id " +
                        "JOIN accounts a ON a.id=i.inviter_id " +
                        "WHERE i.invitee_id=:viewer AND i.status='PENDING' " +
                        "ORDER BY i.created_at DESC LIMIT 100",
                Map.of("viewer", viewer), this::inviteRow);
    }

    @Transactional
    public CommunityDto.Group accept(UUID viewer, UUID invitation) {
        List<UUID> groups = sql.query("UPDATE group_invitations SET status='ACCEPTED'," +
                "updated_at=CURRENT_TIMESTAMP WHERE id=:id AND invitee_id=:viewer " +
                "AND status='PENDING' RETURNING group_id",
                Map.of("id", invitation, "viewer", viewer),
                (r, i) -> r.getObject(1, UUID.class));
        if (groups.isEmpty()) throw new ApiExceptions.NotFound();
        UUID group = groups.get(0);
        UUID owner = sql.queryForObject("SELECT owner_id FROM chat_groups WHERE id=:id",
                Map.of("id", group), UUID.class);
        if (owner == null) throw new ApiExceptions.NotFound();
        if (count("SELECT COUNT(*) FROM user_blocks WHERE " +
                        "(blocker_id=:a AND blocked_id=:b) OR (blocker_id=:b AND blocked_id=:a)",
                Map.of("a", viewer, "b", owner)) > 0) {
            throw new ApiExceptions.Forbidden();
        }
        sql.update("INSERT INTO group_members (group_id,account_id) " +
                        "VALUES (:group,:viewer) ON CONFLICT DO NOTHING",
                Map.of("group", group, "viewer", viewer));
        return get(viewer, group);
    }

    @Transactional
    public void decline(UUID viewer, UUID invitation) {
        int changed = sql.update("UPDATE group_invitations SET status='DECLINED'," +
                        "updated_at=CURRENT_TIMESTAMP WHERE id=:id AND invitee_id=:viewer " +
                        "AND status='PENDING'",
                Map.of("id", invitation, "viewer", viewer));
        if (changed == 0) throw new ApiExceptions.NotFound();
    }

    private CommunityDto.Message messageRow(ResultSet r, int index) throws SQLException {
        return new CommunityDto.Message(r.getLong("id"), r.getObject("group_id", UUID.class),
                r.getObject("sender_id", UUID.class), r.getString("handle"),
                r.getString("body"), r.getTimestamp("created_at").toInstant());
    }

    private String messagesQuery() {
        return "SELECT m.id,m.group_id,m.sender_id,a.handle,m.body,m.created_at " +
                "FROM group_messages m JOIN accounts a ON a.id=m.sender_id ";
    }

    @Transactional
    public CommunityDto.Message send(UUID viewer, UUID group, CommunityDto.SendMessage input) {
        requireMember(viewer, group);
        String body = input.body().trim();
        if (body.isEmpty()) throw new ApiExceptions.InvalidInput("Mensagem vazia.");
        MapSqlParameterSource args = new MapSqlParameterSource()
                .addValue("group", group).addValue("viewer", viewer)
                .addValue("mutation", input.clientMutationId()).addValue("body", body);
        List<Long> inserted = sql.query("INSERT INTO group_messages " +
                "(group_id,sender_id,client_mutation_id,body) " +
                "VALUES (:group,:viewer,:mutation,:body) " +
                "ON CONFLICT (sender_id,client_mutation_id) DO NOTHING RETURNING id",
                args, (r, n) -> r.getLong(1));
        List<CommunityDto.Message> existing = sql.query(messagesQuery() +
                "WHERE m.sender_id=:viewer AND m.client_mutation_id=:mutation",
                args, this::messageRow);
        if (existing.isEmpty()) throw new IllegalStateException("Mensagem não persistida.");
        CommunityDto.Message result = existing.get(0);
        if (!result.groupId().equals(group) || !result.body().equals(body)) {
            throw new ApiExceptions.Conflict();
        }
        return result;
    }

    @Transactional(readOnly = true)
    public CommunityDto.Page<CommunityDto.Message> messages(
            UUID viewer, UUID group, Long before, int limit) {
        requireMember(viewer, group);
        if (limit < 1 || limit > 50 || (before != null && before < 1)) {
            throw new ApiExceptions.InvalidInput("Paginação inválida.");
        }
        MapSqlParameterSource args = new MapSqlParameterSource()
                .addValue("group", group).addValue("viewer", viewer)
                .addValue("size", limit + 1);
        StringBuilder query = new StringBuilder(messagesQuery() +
                "WHERE m.group_id=:group AND NOT EXISTS (SELECT 1 FROM user_blocks b " +
                "WHERE (b.blocker_id=:viewer AND b.blocked_id=m.sender_id) OR " +
                "(b.blocker_id=m.sender_id AND b.blocked_id=:viewer)) ");
        if (before != null) {
            query.append("AND m.id<:before ");
            args.addValue("before", before);
        }
        query.append("ORDER BY m.id DESC LIMIT :size");
        List<CommunityDto.Message> rows = sql.query(query.toString(), args, this::messageRow);
        boolean more = rows.size() > limit;
        List<CommunityDto.Message> page = more ? rows.subList(0, limit) : rows;
        return new CommunityDto.Page<>(List.copyOf(page),
                more ? page.get(page.size() - 1).id() : null);
    }

    @Transactional
    public void leave(UUID viewer, UUID group) {
        requireMember(viewer, group);
        if (count("SELECT COUNT(*) FROM chat_groups WHERE id=:group AND owner_id=:viewer",
                Map.of("group", group, "viewer", viewer)) > 0) {
            throw new ApiExceptions.InvalidInput("O proprietário deve excluir o grupo.");
        }
        sql.update("DELETE FROM group_members WHERE group_id=:group AND account_id=:viewer",
                Map.of("group", group, "viewer", viewer));
    }

    @Transactional
    public void delete(UUID viewer, UUID group) {
        requireOwner(viewer, group);
        sql.update("DELETE FROM chat_groups WHERE id=:group", Map.of("group", group));
    }
}
