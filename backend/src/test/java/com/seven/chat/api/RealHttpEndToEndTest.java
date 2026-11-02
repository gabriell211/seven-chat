package com.seven.chat.api;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real localhost HTTP + PostgreSQL integration; no MockMvc, stub, external hosting
 * or pre-populated production accounts. Test accounts live only in the CI database.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class RealHttpEndToEndTest {
    @Value("${local.server.port}")
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    private String firstHandle;
    private String secondHandle;

    @AfterEach
    void cleanupTestAccounts() {
        // Only accounts generated for this test may be deleted.
        if (firstHandle != null) {
            jdbc.update("DELETE FROM accounts WHERE handle=?", firstHandle);
        }
        if (secondHandle != null) {
            jdbc.update("DELETE FROM accounts WHERE handle=?", secondHandle);
        }
    }

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    record Response(int status, String body) {}

    private Response call(String method, String path, String bearer, String payload)
            throws IOException, InterruptedException {
        HttpRequest.Builder request = HttpRequest.newBuilder(
                URI.create("http://127.0.0.1:" + port + "/api/v1" + path))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json");
        if (bearer != null) request.header("Authorization", "Bearer " + bearer);
        if (payload == null) {
            request.method(method, HttpRequest.BodyPublishers.noBody());
        } else {
            request.header("Content-Type", "application/json");
            request.method(method, HttpRequest.BodyPublishers.ofString(
                    payload, StandardCharsets.UTF_8));
        }
        HttpResponse<String> result = http.send(
                request.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        return new Response(result.statusCode(), result.body());
    }

    private static String field(String json, String name) {
        Matcher matcher = Pattern.compile(
                "\\\"" + Pattern.quote(name) + "\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"")
                .matcher(json);
        assertTrue(matcher.find(), () -> "JSON missing field " + name + ": " + json);
        return matcher.group(1);
    }

    @Test
    void versionedMigrationsAreTrackedByFlywayNotAppliedAsAdHocDdl() {
        Integer migrated = jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history " +
                "WHERE version IN ('1','2','3') AND success=true", Integer.class);
        assertEquals(3, migrated);
    }

    @Test
    void realHttpTwoAccountsPersistAndRespectAuthentication() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        firstHandle = "http_a_" + suffix;
        secondHandle = "http_b_" + suffix;
        String password = "uma-senha-bem-segura-2026";

        Response health = call("GET", "/health", null, null);
        assertEquals(200, health.status(), health.body());

        Response first = call("POST", "/auth/register", null,
                registration(firstHandle, password));
        Response second = call("POST", "/auth/register", null,
                registration(secondHandle, password));
        assertEquals(201, first.status(), first.body());
        assertEquals(201, second.status(), second.body());
        String firstToken = field(first.body(), "accessToken");
        String secondToken = field(second.body(), "accessToken");
        String secondId = field(second.body(), "id");
        assertNotEquals(firstToken, secondToken);

        Response who = call("GET", "/auth/me", firstToken, null);
        assertEquals(200, who.status(), who.body());
        assertTrue(who.body().contains(firstHandle));

        String mutation = UUID.randomUUID().toString();
        String publish = """
                {"clientMutationId":"%s","body":"Publicação real de homologação"}
                """.formatted(mutation);
        Response published = call("POST", "/posts", firstToken, publish);
        assertEquals(201, published.status(), published.body());
        String postId = fieldNumber(published.body(), "id");
        Response retry = call("POST", "/posts", firstToken, publish);
        assertEquals(201, retry.status(), retry.body());
        assertEquals(postId, fieldNumber(retry.body(), "id"));

        Response feed = call("GET", "/posts?limit=20", secondToken, null);
        assertEquals(200, feed.status(), feed.body());
        assertTrue(feed.body().contains("Publicação real de homologação"));

        Response follow = call("POST", "/users/" + secondId + "/follow", firstToken, null);
        assertEquals(204, follow.status(), follow.body());

        String messagePayload = """
                {"clientMutationId":"%s","body":"Mensagem persistida via HTTP"}
                """.formatted(UUID.randomUUID());
        Response message = call("POST", "/conversations/" + secondId + "/messages",
                firstToken, messagePayload);
        assertEquals(201, message.status(), message.body());
        Response inbox = call("GET", "/conversations", secondToken, null);
        assertEquals(200, inbox.status(), inbox.body());
        assertTrue(inbox.body().contains("Mensagem persistida via HTTP"));

        Response unauthed = call("GET", "/posts", null, null);
        assertEquals(401, unauthed.status());

        Response logout = call("POST", "/auth/logout", firstToken, null);
        assertEquals(204, logout.status(), logout.body());
        Response revoked = call("GET", "/auth/me", firstToken, null);
        assertEquals(401, revoked.status());
        Response otherStillActive = call("GET", "/auth/me", secondToken, null);
        assertEquals(200, otherStillActive.status(), otherStillActive.body());
    }

    private static String fieldNumber(String json, String key) {
        Matcher matcher = Pattern.compile(
                "\\\"" + Pattern.quote(key) + "\\\"\\s*:\\s*([0-9]+)")
                .matcher(json);
        assertTrue(matcher.find(), () -> "Missing numeric " + key + ": " + json);
        return matcher.group(1);
    }

    private static String registration(String handle, String password) {
        return """
                {"handle":"%s","email":"%s@seven.test","displayName":"Teste de homologação","password":"%s"}
                """.formatted(handle, handle, password);
    }

}
