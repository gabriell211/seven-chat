package com.seven.chat.api;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PostStore {
    private final NamedParameterJdbcTemplate jdbc;

    public PostStore(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<ApiDto.Post> findMutation(UUID authorId, UUID mutationId) {
        List<ApiDto.Post> found = jdbc.query(
                "SELECT p.id, p.author_id, p.body, p.created_at, a.handle, a.display_name " +
                "FROM posts p JOIN accounts a ON a.id=p.author_id " +
                "WHERE p.author_id=:author AND p.client_mutation_id=:mutation",
                Map.of("author", authorId, "mutation", mutationId), this::map);
        return found.stream().findFirst();
    }

    public ApiDto.Post create(UUID authorId, ApiDto.CreatePost input) {
        org.springframework.jdbc.support.GeneratedKeyHolder keys =
                new org.springframework.jdbc.support.GeneratedKeyHolder();
        org.springframework.jdbc.core.namedparam.MapSqlParameterSource values =
                new org.springframework.jdbc.core.namedparam.MapSqlParameterSource()
                        .addValue("author", authorId)
                        .addValue("mutation", input.clientMutationId())
                        .addValue("body", input.body().trim());
        jdbc.update("INSERT INTO posts (author_id, client_mutation_id, body) " +
                "VALUES (:author, :mutation, :body)", values, keys, new String[]{"id"});
        if (keys.getKey() == null) {
            throw new IllegalStateException("A inserção não retornou identificador.");
        }
        return findMutation(authorId, input.clientMutationId())
                .orElseThrow(() -> new IllegalStateException("Publicação não persistida."));
    }

    public ApiDto.Feed feed(UUID viewer, Long before, int limit) {
        String sql = "SELECT p.id,p.author_id,p.body,p.created_at,a.handle,a.display_name " +
                "FROM posts p JOIN accounts a ON a.id=p.author_id " +
                "WHERE NOT EXISTS (SELECT 1 FROM user_blocks b WHERE " +
                "(b.blocker_id=:viewer AND b.blocked_id=p.author_id) OR " +
                "(b.blocker_id=p.author_id AND b.blocked_id=:viewer)) ";
        org.springframework.jdbc.core.namedparam.MapSqlParameterSource params =
                new org.springframework.jdbc.core.namedparam.MapSqlParameterSource()
                        .addValue("viewer", viewer)
                        .addValue("size", limit + 1);
        if (before != null) {
            sql += "AND p.id<:before ";
            params.addValue("before", before);
        }
        sql += "ORDER BY p.id DESC LIMIT :size";
        List<ApiDto.Post> rows = jdbc.query(sql, params, this::map);
        boolean hasMore = rows.size() > limit;
        List<ApiDto.Post> displayed = hasMore ? rows.subList(0, limit) : rows;
        Long nextCursor = hasMore ? displayed.get(displayed.size() - 1).id() : null;
        return new ApiDto.Feed(List.copyOf(displayed), nextCursor);
    }

    private ApiDto.Post map(ResultSet row, int index) throws SQLException {
        return new ApiDto.Post(row.getLong("id"), row.getObject("author_id", UUID.class),
                row.getString("handle"), row.getString("display_name"),
                row.getString("body"), row.getTimestamp("created_at").toInstant());
    }
}
