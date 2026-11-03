package com.seven.chat.api;

import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/email-verification")
public final class EmailVerificationController {
    private final EmailVerificationService service;
    private final AuthThrottle throttle;

    public EmailVerificationController(EmailVerificationService service, AuthThrottle throttle) {
        this.service = service;
        this.throttle = throttle;
    }

    private UUID account(Authentication auth) {
        return UUID.fromString(auth.getName());
    }

    @GetMapping
    public ResponseEntity<ApiDto.EmailStatus> status(Authentication auth) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.status(account(auth)));
    }

    @PostMapping("/send")
    public ResponseEntity<Void> send(Authentication auth) {
        UUID accountId = account(auth);
        throttle.emailVerificationSendAttempt(accountId.toString());
        service.send(accountId);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .cacheControl(CacheControl.noStore()).build();
    }

    @PostMapping("/confirm")
    public ResponseEntity<ApiDto.EmailStatus> confirm(Authentication auth,
            @Valid @RequestBody ApiDto.ConfirmEmail input) {
        UUID accountId = account(auth);
        if (!service.confirm(accountId, input.code())) {
            throw new ApiExceptions.InvalidInput("Código inválido, expirado ou sem tentativas.");
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.status(accountId));
    }
}
