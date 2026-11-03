package com.seven.chat.api;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration TOKEN_LIFETIME = Duration.ofDays(7);
    private static final Set<String> RESERVED = Set.of(
            "admin", "administrator", "seven", "sevenchat", "support", "suporte",
            "moderator", "moderador", "official", "oficial", "security");

    private final AccountStore accounts;
    private final PasswordEncoder passwords;

    public AuthService(AccountStore accounts, PasswordEncoder passwords) {
        this.accounts = accounts;
        this.passwords = passwords;
    }

    @Transactional
    public ApiDto.Session register(ApiDto.Register input) {
        String email = input.email().trim().toLowerCase(Locale.ROOT);
        String handle = input.handle().trim().toLowerCase(Locale.ROOT);
        if (RESERVED.contains(handle)) {
            throw new ApiExceptions.InvalidInput("Esse nome de usuário está reservado.");
        }
        if (input.displayName().isBlank()) {
            throw new ApiExceptions.InvalidInput("Informe seu nome.");
        }
        // BCrypt considera no máximo 72 bytes, não 72 caracteres Unicode.
        if (input.password().isBlank() ||
                input.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiExceptions.InvalidInput("A senha deve ter de 12 a 72 bytes.");
        }
        try {
            AccountStore.StoredAccount account = accounts.create(
                    new ApiDto.Register(email, handle, input.displayName(), input.password()),
                    passwords.encode(input.password()));
            return issue(account);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiExceptions.Conflict();
        }
    }

    @Transactional
    public ApiDto.Session login(ApiDto.Login input) {
        String email = input.email().trim().toLowerCase(Locale.ROOT);
        Optional<AccountStore.StoredAccount> found = accounts.byEmail(email);
        if (found.isEmpty() || !passwords.matches(input.password(), found.get().passwordHash())) {
            throw new ApiExceptions.Unauthorized();
        }
        return issue(found.get());
    }

    @Transactional
    public void changePassword(UUID accountId, ApiDto.ChangePassword input) {
        // Lock the account to serialize concurrent password rotations.
        AccountStore.StoredAccount account = accounts.byIdForUpdate(accountId)
                .orElseThrow(ApiExceptions.Unauthorized::new);
        if (!passwords.matches(input.currentPassword(), account.passwordHash())) {
            throw new ApiExceptions.InvalidInput("Senha atual incorreta.");
        }
        int newPasswordBytes = input.newPassword()
                .getBytes(StandardCharsets.UTF_8).length;
        if (input.newPassword().isBlank() || newPasswordBytes < 12 ||
                newPasswordBytes > 72) {
            throw new ApiExceptions.InvalidInput("A nova senha deve ter de 12 a 72 bytes.");
        }
        if (passwords.matches(input.newPassword(), account.passwordHash())) {
            throw new ApiExceptions.InvalidInput("A nova senha precisa ser diferente da atual.");
        }
        accounts.replacePasswordAndRevokeSessions(
                accountId, passwords.encode(input.newPassword()));
    }

    @Transactional
    public void logout(String rawToken) {
        accounts.revokeSession(hash(rawToken));
    }

    @Transactional(readOnly = true)
    public Optional<AccountStore.StoredAccount> authenticate(String rawToken) {
        if (rawToken == null || rawToken.length() < 30 || rawToken.length() > 256) {
            return Optional.empty();
        }
        return accounts.findSession(hash(rawToken));
    }

    @Transactional(readOnly = true)
    public ApiDto.Account me(UUID id) {
        return accounts.byId(id).orElseThrow(ApiExceptions.Unauthorized::new).publicView();
    }

    private ApiDto.Session issue(AccountStore.StoredAccount account) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires = Instant.now().plus(TOKEN_LIFETIME);
        accounts.putSession(account.id(), hash(token), expires);
        return new ApiDto.Session(token, "Bearer", expires, account.publicView());
    }

    private static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.US_ASCII));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponível.", ex);
        }
    }
}
