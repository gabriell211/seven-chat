package com.seven.chat.api;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/privacy")
public class PrivacyController {
    private final PrivacyService privacy;

    public PrivacyController(PrivacyService privacy) {
        this.privacy = privacy;
    }

    private static UUID who(Authentication principal) {
        return UUID.fromString(principal.getName());
    }

    @GetMapping("/consents")
    public Map<String, List<SafetyDto.Consent>> consents(Authentication principal) {
        return Map.of("data", privacy.consents(who(principal)));
    }

    @PostMapping("/consents")
    public SafetyDto.Consent consent(Authentication principal,
            @Valid @RequestBody SafetyDto.ConsentInput input) {
        return privacy.recordConsent(who(principal), input);
    }

    @GetMapping("/export")
    public ResponseEntity<Map<String, Object>> export(Authentication principal) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache")
                .body(privacy.export(who(principal)));
    }

    @PostMapping("/delete-account")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(Authentication principal,
            @Valid @RequestBody SafetyDto.DeleteAccountInput input) {
        privacy.erase(who(principal), input);
    }
}
