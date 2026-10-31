package com.seven.chat.api;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class SocialController {
    private final SocialService social;

    public SocialController(SocialService social) {
        this.social = social;
    }

    private UUID who(Authentication principal) {
        return UUID.fromString(principal.getName());
    }

    @GetMapping("/features")
    public SocialDto.Capabilities features() {
        return social.capabilities();
    }

    @GetMapping("/users")
    public List<SocialDto.Profile> search(Authentication principal, @RequestParam String query) {
        return social.search(who(principal), query);
    }

    @GetMapping("/users/{handle}")
    public SocialDto.Profile profile(Authentication principal, @PathVariable String handle) {
        return social.profile(who(principal), handle);
    }

    @PatchMapping("/users/me")
    public SocialDto.Profile updateProfile(Authentication principal,
                                            @Valid @RequestBody SocialDto.EditProfile input) {
        return social.updateProfile(who(principal), input);
    }

    @PostMapping("/users/{id}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void follow(Authentication principal, @PathVariable UUID id) {
        social.follow(who(principal), id);
    }

    @DeleteMapping("/users/{id}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unfollow(Authentication principal, @PathVariable UUID id) {
        social.unfollow(who(principal), id);
    }

    @PostMapping("/users/{id}/block")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void block(Authentication principal, @PathVariable UUID id) {
        social.block(who(principal), id);
    }

    @DeleteMapping("/users/{id}/block")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unblock(Authentication principal, @PathVariable UUID id) {
        social.unblock(who(principal), id);
    }

    @GetMapping("/posts/saved")
    public SocialDto.Page<ApiDto.Post> saved(Authentication principal,
            @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "20") int limit) {
        return social.saved(who(principal), before, limit);
    }

    @GetMapping("/posts/{id}/engagement")
    public SocialDto.Engagement engagement(Authentication principal, @PathVariable long id) {
        return social.engagement(who(principal), id);
    }

    @PostMapping("/posts/{id}/like")
    public SocialDto.Engagement like(Authentication principal, @PathVariable long id) {
        return social.engage(who(principal), id, true, true);
    }

    @DeleteMapping("/posts/{id}/like")
    public SocialDto.Engagement unlike(Authentication principal, @PathVariable long id) {
        return social.engage(who(principal), id, true, false);
    }

    @PostMapping("/posts/{id}/save")
    public SocialDto.Engagement save(Authentication principal, @PathVariable long id) {
        return social.engage(who(principal), id, false, true);
    }

    @DeleteMapping("/posts/{id}/save")
    public SocialDto.Engagement unsave(Authentication principal, @PathVariable long id) {
        return social.engage(who(principal), id, false, false);
    }

    @GetMapping("/posts/{id}/comments")
    public List<SocialDto.Comment> comments(Authentication principal, @PathVariable long id) {
        return social.comments(who(principal), id);
    }

    @PostMapping("/posts/{id}/comments")
    public ResponseEntity<SocialDto.Comment> comment(Authentication principal,
                  @PathVariable long id, @Valid @RequestBody SocialDto.CreateComment input) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(social.comment(who(principal), id, input));
    }

    @DeleteMapping("/comments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(Authentication principal, @PathVariable long id) {
        social.deleteComment(who(principal), id);
    }

    @DeleteMapping("/posts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(Authentication principal, @PathVariable long id) {
        social.deletePost(who(principal), id);
    }

    @GetMapping("/conversations/{other}/messages")
    public SocialDto.Page<SocialDto.Message> messages(Authentication principal,
          @PathVariable UUID other, @RequestParam(required = false) Long before,
          @RequestParam(defaultValue = "30") int limit) {
        return social.messages(who(principal), other, before, limit);
    }

    @PostMapping("/conversations/{other}/messages")
    public ResponseEntity<SocialDto.Message> send(Authentication principal,
          @PathVariable UUID other, @Valid @RequestBody SocialDto.CreateMessage input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(social.send(who(principal), other, input));
    }

    @GetMapping("/notifications")
    public List<SocialDto.Notification> notifications(Authentication principal) {
        return social.notifications(who(principal));
    }

    @PostMapping("/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(Authentication principal, @PathVariable long id) {
        social.markRead(who(principal), id);
    }
}
