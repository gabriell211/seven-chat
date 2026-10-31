package com.seven.chat.api;

import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ApiController {
    private final AuthService auth;
    private final PostService posts;

    public ApiController(AuthService auth, PostService posts) {
        this.auth = auth;
        this.posts = posts;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @PostMapping("/auth/register")
    public ResponseEntity<ApiDto.Session> register(@Valid @RequestBody ApiDto.Register input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.register(input));
    }

    @PostMapping("/auth/login")
    public ApiDto.Session login(@Valid @RequestBody ApiDto.Login input) {
        return auth.login(input);
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
        return posts.feed(before, limit);
    }

    @PostMapping("/posts")
    public ResponseEntity<ApiDto.Post> publish(Authentication principal,
                                               @Valid @RequestBody ApiDto.CreatePost input) {
        ApiDto.Post created = posts.publish(UUID.fromString(principal.getName()), input);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
