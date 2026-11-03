package com.seven.chat.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/recovery")
public class PasswordRecoveryController {
    private final PasswordRecoveryService recovery;
    private final AuthThrottle throttle;

    public PasswordRecoveryController(PasswordRecoveryService recovery,
            AuthThrottle throttle) {
        this.recovery = recovery;
        this.throttle = throttle;
    }

    @PostMapping("/request")
    public ResponseEntity<Void> request(@Valid @RequestBody ApiDto.RecoverPasswordRequest input,
            HttpServletRequest http) {
        throttle.passwordRecoveryRequestAttempt(input.email(), http.getRemoteAddr());
        recovery.request(input.email());
        // Never disclose whether an account exists or has a verified email.
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .cacheControl(CacheControl.noStore()).build();
    }

    @PostMapping("/confirm")
    public ResponseEntity<Void> confirm(@Valid @RequestBody ApiDto.RecoverPasswordConfirm input,
            HttpServletRequest http) {
        throttle.passwordRecoveryConfirmAttempt(input.email(), http.getRemoteAddr());
        if (!recovery.confirm(input.email(), input.code(), input.newPassword())) {
            throw new ApiExceptions.InvalidInput("Código inválido ou expirado.");
        }
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
