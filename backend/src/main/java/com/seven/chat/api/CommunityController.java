package com.seven.chat.api;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/groups")
public class CommunityController {
    private final CommunityService service;

    public CommunityController(CommunityService service) {
        this.service = service;
    }

    private static UUID who(Authentication principal) {
        return UUID.fromString(principal.getName());
    }

    @GetMapping
    public Map<String, List<CommunityDto.Group>> mine(Authentication principal) {
        return Map.of("data", service.mine(who(principal)));
    }

    @PostMapping
    public ResponseEntity<CommunityDto.Group> create(
            Authentication principal, @Valid @RequestBody CommunityDto.CreateGroup input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(who(principal), input));
    }

    @GetMapping("/invitations")
    public Map<String, List<CommunityDto.Invitation>> invitations(Authentication principal) {
        return Map.of("data", service.invitations(who(principal)));
    }

    @PostMapping("/invitations/{invitation}/accept")
    public CommunityDto.Group accept(Authentication principal, @PathVariable UUID invitation) {
        return service.accept(who(principal), invitation);
    }

    @PostMapping("/invitations/{invitation}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(Authentication principal, @PathVariable UUID invitation) {
        service.decline(who(principal), invitation);
    }

    @GetMapping("/{group}")
    public CommunityDto.Group group(Authentication principal, @PathVariable UUID group) {
        return service.get(who(principal), group);
    }

    @PostMapping("/{group}/invitations")
    public ResponseEntity<CommunityDto.Invitation> invite(
            Authentication principal, @PathVariable UUID group,
            @Valid @RequestBody CommunityDto.InviteUser input) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.invite(who(principal), group, input));
    }

    @GetMapping("/{group}/messages")
    public CommunityDto.Page<CommunityDto.Message> messages(
            Authentication principal, @PathVariable UUID group,
            @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "30") int limit) {
        return service.messages(who(principal), group, before, limit);
    }

    @PostMapping("/{group}/messages")
    public ResponseEntity<CommunityDto.Message> send(
            Authentication principal, @PathVariable UUID group,
            @Valid @RequestBody CommunityDto.SendMessage input) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.send(who(principal), group, input));
    }

    @DeleteMapping("/{group}/membership")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(Authentication principal, @PathVariable UUID group) {
        service.leave(who(principal), group);
    }

    @DeleteMapping("/{group}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication principal, @PathVariable UUID group) {
        service.delete(who(principal), group);
    }
}
