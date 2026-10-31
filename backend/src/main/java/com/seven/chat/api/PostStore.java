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
        Long id = jdbc.queryForObject(
                "INSERT INTO posts (author_id, client_mutation_id, body) " +
                "VALUES (:author, :mutation, :body) RETURNING id",
                Map.of("author", authorId, "mutation", input.clientMutationId(),
                        "body", input.body().trim()), Long.class);
        return findMutation(authorId, input.clientMutationId())
                .orElseThrow(() -> new IllegalStateException("Post não foi persistido: " + id));
    }

    public ApiDto.Feed feed(Long before, int limit) {
        String sql = "SELECT p.id, p.author_id, p.body, p.created_at, a.handle, a.display_name " +
                "FROM posts p JOIN accounts a ON a.id=p.author_id ";
        Map<String, ?> params;
        if (before != null) {
            sql += "WHERE p.id < :before ORDER BY p.id DESC LIMIT :size";
            params = Map.of("before", before, "size", limit + 1);
        } else {
            sql += "ORDER BY p.id DESC LIMIT :size";
            params = Map.of("size", limit + 1);
        }
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
