package com.seven.chat.api;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SocialService {
    private final NamedParameterJdbcTemplate sql;

    public SocialService(NamedParameterJdbcTemplate sql) {
        this.sql = sql;
    }

    private long count(String query, Map<String, ?> args) {
        Long value = sql.queryForObject(query, args, Long.class);
        return value == null ? 0L : value;
    }

    private boolean accountExists(UUID id) {
        return count("SELECT COUNT(*) FROM accounts WHERE id=:id", Map.of("id", id)) != 0;
    }

    private void otherAccount(UUID actor, UUID target) {
        if (actor.equals(target)) {
            throw new ApiExceptions.InvalidInput("Não é permitido usar esta ação na própria conta.");
        }
        if (!accountExists(target)) {
            throw new ApiExceptions.InvalidInput("Usuário não encontrado.");
        }
    }

    private boolean blocked(UUID first, UUID second) {
        return count("SELECT COUNT(*) FROM user_blocks WHERE " +
                "(blocker_id=:a AND blocked_id=:b) OR (blocker_id=:b AND blocked_id=:a)",
                Map.of("a", first, "b", second)) > 0;
    }

    private void allowed(UUID viewer, UUID target) {
        if (blocked(viewer, target)) {
            throw new ApiExceptions.Forbidden();
        }
    }

    private void postAccessible(UUID viewer, long postId) {
        List<UUID> authors = sql.query(
                "SELECT author_id FROM posts WHERE id=:post",
                Map.of("post", postId),
                (r, n) -> r.getObject(1, UUID.class));
        if (authors.isEmpty()) {
            throw new ApiExceptions.NotFound();
        }
        allowed(viewer, authors.get(0));
    }

    private void notifyAccount(UUID recipient, UUID actor, String type, Long resource) {
        if (recipient.equals(actor)) return;
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("account", recipient).addValue("actor", actor)
                .addValue("type", type).addValue("resource", resource);
        sql.update("INSERT INTO notifications (account_id, actor_id, event_type, resource_id) " +
                "VALUES (:account,:actor,:type,:resource)", p);
    }

    @Transactional(readOnly = true)
    public SocialDto.Profile profile(UUID viewer, String handle) {
        String normalized = handle.trim().toLowerCase(Locale.ROOT);
        List<SocialDto.Profile> found = sql.query(
                "SELECT id,handle,display_name,bio FROM accounts WHERE handle=:handle",
                Map.of("handle", normalized), (r, n) -> profileRow(viewer, r));
        if (found.isEmpty()) throw new ApiExceptions.NotFound();
        SocialDto.Profile profile = found.get(0);
        if (blocked(viewer, profile.id())) throw new ApiExceptions.NotFound();
        return profile;
    }

    private SocialDto.Profile profileRow(UUID viewer, ResultSet r) throws SQLException {
        UUID id = r.getObject("id", UUID.class);
        long followers = count("SELECT COUNT(*) FROM follows WHERE following_id=:id", Map.of("id", id));
        long following = count("SELECT COUNT(*) FROM follows WHERE follower_id=:id", Map.of("id", id));
        long posts = count("SELECT COUNT(*) FROM posts WHERE author_id=:id", Map.of("id", id));
        boolean follows = count("SELECT COUNT(*) FROM follows WHERE follower_id=:me AND following_id=:id",
                Map.of("me", viewer, "id", id)) > 0;
        boolean blockedByMe = count(
                "SELECT COUNT(*) FROM user_blocks WHERE blocker_id=:me AND blocked_id=:id",
                Map.of("me", viewer, "id", id)) > 0;
        return new SocialDto.Profile(id, r.getString("handle"), r.getString("display_name"),
                r.getString("bio"), followers, following, posts, follows, blockedByMe);
    }

    @Transactional(readOnly = true)
    public List<SocialDto.Profile> search(UUID viewer, String query) {
        String term = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        if (!term.matches("[a-z0-9_]{2,24}")) {
            throw new ApiExceptions.InvalidInput("Busque por 2 a 24 letras, números ou _.");
        }
        return sql.query("SELECT id,handle,display_name,bio FROM accounts " +
                        "WHERE id<>:viewer AND handle LIKE :term " +
                        "AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE " +
                        "(b.blocker_id=:viewer AND b.blocked_id=accounts.id) OR " +
                        "(b.blocker_id=accounts.id AND b.blocked_id=:viewer)) " +
                        "ORDER BY handle LIMIT 25",
                Map.of("viewer", viewer, "term", "%" + term + "%"),
                (r, n) -> profileRow(viewer, r));
    }

    @Transactional
    public SocialDto.Profile updateProfile(UUID viewer, SocialDto.EditProfile input) {
        String name = input.displayName().trim();
        String bio = input.bio() == null ? "" : input.bio().trim();
        if (name.isEmpty() || name.length() > 60 || bio.length() > 160) {
            throw new ApiExceptions.InvalidInput("Nome ou biografia inválidos.");
        }
        sql.update("UPDATE accounts SET display_name=:name,bio=:bio WHERE id=:viewer",
                Map.of("name", name, "bio", bio, "viewer", viewer));
        List<String> handles = sql.query(
                "SELECT handle FROM accounts WHERE id=:viewer",
                Map.of("viewer", viewer), (r, n) -> r.getString(1));
        if (handles.isEmpty()) throw new ApiExceptions.Unauthorized();
        return profile(viewer, handles.get(0));
    }

    @Transactional
    public void follow(UUID viewer, UUID other) {
        otherAccount(viewer, other);
        allowed(viewer, other);
        if (count("SELECT COUNT(*) FROM follows WHERE follower_id=:me AND following_id=:other",
                Map.of("me", viewer, "other", other)) > 0) return;
        sql.update("INSERT INTO follows (follower_id,following_id) VALUES (:me,:other)",
                Map.of("me", viewer, "other", other));
        notifyAccount(other, viewer, "follow", null);
    }

    @Transactional
    public void unfollow(UUID viewer, UUID other) {
        sql.update("DELETE FROM follows WHERE follower_id=:me AND following_id=:other",
                Map.of("me", viewer, "other", other));
    }

    @Transactional
    public void block(UUID viewer, UUID other) {
        otherAccount(viewer, other);
        if (count("SELECT COUNT(*) FROM user_blocks WHERE blocker_id=:me AND blocked_id=:other",
                Map.of("me", viewer, "other", other)) == 0) {
            sql.update("INSERT INTO user_blocks (blocker_id,blocked_id) VALUES (:me,:other)",
                    Map.of("me", viewer, "other", other));
        }
        // Blocking removes both follow edges immediately.
        sql.update("DELETE FROM follows WHERE " +
                "(follower_id=:me AND following_id=:other) OR " +
                "(follower_id=:other AND following_id=:me)",
                Map.of("me", viewer, "other", other));
    }

    @Transactional
    public void unblock(UUID viewer, UUID other) {
        sql.update("DELETE FROM user_blocks WHERE blocker_id=:me AND blocked_id=:other",
                Map.of("me", viewer, "other", other));
    }

    @Transactional
    public SocialDto.Engagement engage(UUID viewer, long id, boolean like, boolean enabled) {
        postAccessible(viewer, id);
        String table = like ? "post_likes" : "post_saves";
        String sqlWhere = "account_id=:viewer AND post_id=:post";
        Map<String, ?> args = Map.of("viewer", viewer, "post", id);
        boolean exists = count("SELECT COUNT(*) FROM " + table + " WHERE " + sqlWhere, args) > 0;
        if (enabled && !exists) {
            sql.update("INSERT INTO " + table + " (account_id,post_id) VALUES (:viewer,:post)", args);
            if (like) {
                UUID author = sql.queryForObject("SELECT author_id FROM posts WHERE id=:post",
                        Map.of("post", id), UUID.class);
                if (author != null) notifyAccount(author, viewer, "like", id);
            }
        } else if (!enabled && exists) {
            sql.update("DELETE FROM " + table + " WHERE " + sqlWhere, args);
        }
        return engagement(viewer, id);
    }

    @Transactional(readOnly = true)
    public SocialDto.Engagement engagement(UUID viewer, long id) {
        postAccessible(viewer, id);
        Map<String, ?> args = Map.of("post", id, "viewer", viewer);
        return new SocialDto.Engagement(id,
                count("SELECT COUNT(*) FROM post_likes WHERE post_id=:post", args),
                count("SELECT COUNT(*) FROM post_comments WHERE post_id=:post", args),
                count("SELECT COUNT(*) FROM post_likes " +
                        "WHERE post_id=:post AND account_id=:viewer", args) > 0,
                count("SELECT COUNT(*) FROM post_saves " +
                        "WHERE post_id=:post AND account_id=:viewer", args) > 0);
    }

    private SocialDto.Comment commentRow(ResultSet row, int number) throws SQLException {
        return new SocialDto.Comment(row.getLong("id"), row.getLong("post_id"),
                row.getObject("author_id", UUID.class), row.getString("handle"),
                row.getString("body"), row.getTimestamp("created_at").toInstant());
    }

    @Transactional
    public SocialDto.Comment comment(UUID viewer, long id, SocialDto.CreateComment input) {
        postAccessible(viewer, id);
        String body = input.body().trim();
        if (body.isEmpty()) throw new ApiExceptions.InvalidInput("Comentário vazio.");
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        sql.update("INSERT INTO post_comments (post_id,author_id,body) VALUES (:post,:viewer,:body)",
                new MapSqlParameterSource().addValue("post", id).addValue("viewer", viewer)
                        .addValue("body", body), key, new String[]{"id"});
        if (key.getKey() == null) throw new IllegalStateException("Comentário não salvo.");
        long createdId = key.getKey().longValue();
        UUID author = sql.queryForObject("SELECT author_id FROM posts WHERE id=:post",
                Map.of("post", id), UUID.class);
        if (author != null) notifyAccount(author, viewer, "comment", id);
        return sql.query("SELECT c.id,c.post_id,c.author_id,c.body,c.created_at,a.handle " +
                        "FROM post_comments c JOIN accounts a ON a.id=c.author_id WHERE c.id=:id",
                Map.of("id", createdId), this::commentRow).get(0);
    }

    @Transactional(readOnly = true)
    public List<SocialDto.Comment> comments(UUID viewer, long id) {
        postAccessible(viewer, id);
        return sql.query("SELECT c.id,c.post_id,c.author_id,c.body,c.created_at,a.handle " +
                "FROM post_comments c JOIN accounts a ON a.id=c.author_id " +
                "WHERE c.post_id=:post AND NOT EXISTS " +
                "(SELECT 1 FROM user_blocks b WHERE " +
                "(b.blocker_id=:viewer AND b.blocked_id=c.author_id) OR " +
                "(b.blocker_id=c.author_id AND b.blocked_id=:viewer)) " +
                "ORDER BY c.id DESC LIMIT 100",
                Map.of("post", id, "viewer", viewer), this::commentRow);
    }

    @Transactional
    public void deleteComment(UUID viewer, long id) {
        int count = sql.update("DELETE FROM post_comments WHERE id=:id AND author_id=:viewer",
                Map.of("id", id, "viewer", viewer));
        if (count == 0) throw new ApiExceptions.NotFound();
    }

    @Transactional
    public void deletePost(UUID viewer, long id) {
        int affected = sql.update("DELETE FROM posts WHERE id=:id AND author_id=:viewer",
                Map.of("id", id, "viewer", viewer));
        if (affected == 0) throw new ApiExceptions.NotFound();
    }

    @Transactional(readOnly = true)
    public SocialDto.Page<ApiDto.Post> saved(UUID viewer, Long before, int limit) {
        validatePage(before, limit);
        StringBuilder query = new StringBuilder(
                "SELECT p.id,p.author_id,p.body,p.created_at,a.handle,a.display_name " +
                "FROM post_saves s JOIN posts p ON p.id=s.post_id " +
                "JOIN accounts a ON a.id=p.author_id " +
                "WHERE s.account_id=:viewer AND NOT EXISTS " +
                "(SELECT 1 FROM user_blocks b WHERE " +
                "(b.blocker_id=:viewer AND b.blocked_id=p.author_id) OR " +
                "(b.blocker_id=p.author_id AND b.blocked_id=:viewer)) ");
        MapSqlParameterSource p = new MapSqlParameterSource().addValue("viewer", viewer)
                .addValue("size", limit + 1);
        if (before != null) {
            query.append("AND p.id<:before ");
            p.addValue("before", before);
        }
        query.append("ORDER BY p.id DESC LIMIT :size");
        List<ApiDto.Post> all = sql.query(query.toString(), p, (row, n) ->
                new ApiDto.Post(row.getLong("id"), row.getObject("author_id", UUID.class),
                        row.getString("handle"), row.getString("display_name"),
                        row.getString("body"), row.getTimestamp("created_at").toInstant()));
        boolean extra = all.size() > limit;
        List<ApiDto.Post> current = extra ? all.subList(0, limit) : all;
        return new SocialDto.Page<>(List.copyOf(current),
                extra ? current.get(current.size() - 1).id() : null);
    }

    public static void validatePage(Long before, int limit) {
        if (before != null && before <= 0 || limit < 1 || limit > 50) {
            throw new ApiExceptions.InvalidInput("Paginação inválida.");
        }
    }

    private SocialDto.Message messageRow(ResultSet row, int n) throws SQLException {
        return new SocialDto.Message(row.getLong("id"),
                row.getObject("sender_id", UUID.class), row.getObject("receiver_id", UUID.class),
                row.getString("body"), row.getTimestamp("created_at").toInstant());
    }

    @Transactional
    public SocialDto.Message send(UUID viewer, UUID other, SocialDto.CreateMessage input) {
        otherAccount(viewer, other);
        allowed(viewer, other);
        String body = input.body().trim();
        if (body.isEmpty()) throw new ApiExceptions.InvalidInput("Mensagem vazia.");
        List<SocialDto.Message> existing = sql.query(
                "SELECT id,sender_id,receiver_id,body,created_at FROM direct_messages " +
                "WHERE sender_id=:sender AND client_mutation_id=:mutation",
                Map.of("sender", viewer, "mutation", input.clientMutationId()), this::messageRow);
        if (!existing.isEmpty()) {
            SocialDto.Message previous = existing.get(0);
            if (!previous.receiverId().equals(other) || !previous.body().equals(body)) {
                throw new ApiExceptions.Conflict();
            }
            return previous;
        }
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        sql.update("INSERT INTO direct_messages " +
                        "(sender_id,receiver_id,client_mutation_id,body) " +
                        "VALUES (:sender,:receiver,:mutation,:body)",
                new MapSqlParameterSource().addValue("sender", viewer)
                        .addValue("receiver", other).addValue("mutation", input.clientMutationId())
                        .addValue("body", body), key, new String[]{"id"});
        if (key.getKey() == null) throw new IllegalStateException("Mensagem não persistida.");
        long id = key.getKey().longValue();
        notifyAccount(other, viewer, "message", id);
        return sql.query("SELECT id,sender_id,receiver_id,body,created_at " +
                        "FROM direct_messages WHERE id=:id",
                Map.of("id", id), this::messageRow).get(0);
    }

    @Transactional(readOnly = true)
    public List<SocialDto.Conversation> conversations(UUID viewer) {
        return sql.query("SELECT x.peer_id,a.handle,a.display_name,dm.body,dm.created_at " +
                "FROM (SELECT CASE WHEN sender_id=:me THEN receiver_id ELSE sender_id END peer_id, " +
                "MAX(id) last_id FROM direct_messages " +
                "WHERE sender_id=:me OR receiver_id=:me GROUP BY " +
                "CASE WHEN sender_id=:me THEN receiver_id ELSE sender_id END) x " +
                "JOIN direct_messages dm ON dm.id=x.last_id " +
                "JOIN accounts a ON a.id=x.peer_id " +
                "WHERE NOT EXISTS (SELECT 1 FROM user_blocks b WHERE " +
                "(b.blocker_id=:me AND b.blocked_id=x.peer_id) OR " +
                "(b.blocker_id=x.peer_id AND b.blocked_id=:me)) " +
                "ORDER BY x.last_id DESC LIMIT 50",
                Map.of("me", viewer),
                (row, n) -> new SocialDto.Conversation(
                        row.getObject("peer_id", UUID.class),
                        row.getString("handle"), row.getString("display_name"),
                        row.getString("body"), row.getTimestamp("created_at").toInstant()));
    }

    @Transactional(readOnly = true)
    public SocialDto.Page<SocialDto.Message> messages(UUID viewer, UUID other,
                                                      Long before, int limit) {
        otherAccount(viewer, other);
        allowed(viewer, other);
        validatePage(before, limit);
        StringBuilder query = new StringBuilder("SELECT id,sender_id,receiver_id,body,created_at " +
                "FROM direct_messages WHERE " +
                "((sender_id=:me AND receiver_id=:other) OR " +
                "(sender_id=:other AND receiver_id=:me)) ");
        MapSqlParameterSource args = new MapSqlParameterSource().addValue("me", viewer)
                .addValue("other", other).addValue("size", limit + 1);
        if (before != null) {
            query.append("AND id<:before ");
            args.addValue("before", before);
        }
        query.append("ORDER BY id DESC LIMIT :size");
        List<SocialDto.Message> rows = sql.query(query.toString(), args, this::messageRow);
        boolean extra = rows.size() > limit;
        List<SocialDto.Message> selected = extra ? rows.subList(0, limit) : rows;
        return new SocialDto.Page<>(List.copyOf(selected),
                extra ? selected.get(selected.size() - 1).id() : null);
    }

    @Transactional(readOnly = true)
    public List<SocialDto.Notification> notifications(UUID viewer) {
        return sql.query("SELECT n.id,n.actor_id,n.event_type,n.resource_id,n.created_at," +
                "n.seen_at,a.handle FROM notifications n " +
                "JOIN accounts a ON a.id=n.actor_id WHERE n.account_id=:me " +
                "AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE " +
                "(b.blocker_id=:me AND b.blocked_id=n.actor_id) OR " +
                "(b.blocker_id=n.actor_id AND b.blocked_id=:me)) " +
                "ORDER BY n.id DESC LIMIT 50", Map.of("me", viewer), (r, n) ->
                new SocialDto.Notification(r.getLong("id"),
                        r.getObject("actor_id", UUID.class), r.getString("handle"),
                        r.getString("event_type"),
                        r.getObject("resource_id") == null ? null : r.getLong("resource_id"),
                        r.getTimestamp("created_at").toInstant(), r.getTimestamp("seen_at") != null));
    }

    @Transactional
    public void markRead(UUID viewer, long id) {
        int changed = sql.update("UPDATE notifications SET seen_at=CURRENT_TIMESTAMP " +
                "WHERE id=:id AND account_id=:me",
                Map.of("id", id, "me", viewer));
        if (changed == 0) throw new ApiExceptions.NotFound();
    }

    public SocialDto.Capabilities capabilities() {
        // This describes implemented server endpoints, not sample users or fictitious services.
        return new SocialDto.Capabilities(true, true, true, true, true, true,
                true, true, false, false, false, false);
    }
}
