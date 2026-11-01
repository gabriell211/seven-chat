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
@RequestMapping("/api/v1/moderation")
public class SafetyController {
    private final SafetyService safety;

    public SafetyController(SafetyService safety) {
        this.safety = safety;
    }

    private static UUID who(Authentication principal) {
        return UUID.fromString(principal.getName());
    }

    @PostMapping("/reports")
    public ResponseEntity<SafetyDto.Report> report(
            Authentication principal, @Valid @RequestBody SafetyDto.ReportInput input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(safety.report(who(principal), input));
    }

    @GetMapping("/reports/me")
    public Map<String, List<SafetyDto.Report>> mine(Authentication principal) {
        return Map.of("data", safety.mine(who(principal)));
    }

    @GetMapping("/queue")
    public Map<String, List<SafetyDto.Report>> queue(
            Authentication principal, @RequestParam(defaultValue = "OPEN") String status) {
        return Map.of("data", safety.queue(who(principal), status));
    }

    @PostMapping("/reports/{id}/review")
    public SafetyDto.Report review(Authentication principal, @PathVariable long id,
            @Valid @RequestBody SafetyDto.ReviewInput input) {
        return safety.review(who(principal), id, input);
    }
}
