package com.seven.chat.api;

import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ApiController {
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final AuthService auth;
    private final AuthThrottle throttle;
    private final PostService posts;

    public ApiController(AuthService auth, PostService posts,
                         org.springframework.jdbc.core.JdbcTemplate jdbc, AuthThrottle throttle) {
        this.throttle = throttle;
        this.jdbc = jdbc;
        this.auth = auth;
        this.posts = posts;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        Integer database = jdbc.queryForObject("SELECT 1", Integer.class);
        if (database == null || database != 1) {
            throw new IllegalStateException("Banco indisponível.");
        }
        return Map.of("status", "ok");
    }

    @PostMapping("/auth/register")
    public ResponseEntity<ApiDto.Session> register(
            @Valid @RequestBody ApiDto.Register input, HttpServletRequest request) {
        throttle.registrationAttempt(request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore()).body(auth.register(input));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<ApiDto.Session> login(
            @Valid @RequestBody ApiDto.Login input, HttpServletRequest request) {
        // Never trust unverified X-Forwarded-For values from a public caller.
        throttle.loginAttempt(input.email(), request.getRemoteAddr());
        ApiDto.Session session = auth.login(input);
        throttle.clearSuccessfulLogin(input.email());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(session);
    }

    @GetMapping("/auth/me")
    public ApiDto.Account me(Authentication principal) {
        return auth.me(UUID.fromString(principal.getName()));
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader("Authorization") String authorization) {
        if (authorization.startsWith("Bearer ")) {
            auth.logout(authorization.substring(7));
        }
    }

    @GetMapping("/posts")
    public ApiDto.Feed posts(Authentication principal,
                             @RequestParam(required = false) Long before,
                             @RequestParam(defaultValue = "20") int limit) {
        return posts.feed(UUID.fromString(principal.getName()), before, limit);
    }

    @PostMapping("/posts")
    public ResponseEntity<ApiDto.Post> publish(Authentication principal,
                                               @Valid @RequestBody ApiDto.CreatePost input) {
        ApiDto.Post created = posts.publish(UUID.fromString(principal.getName()), input);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
