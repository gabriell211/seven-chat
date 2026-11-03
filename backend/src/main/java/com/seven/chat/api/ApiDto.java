package com.seven.chat.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ApiDto {
    private ApiDto() {}

    public record Register(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = "[a-z0-9_]{3,24}") String handle,
            @NotBlank @Size(min = 1, max = 60) String displayName,
            @NotBlank @Size(min = 12, max = 72) String password) {}

    public record Login(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 72) String password) {}

    public record ChangePassword(
            @NotBlank @Size(max = 72) String currentPassword,
            @NotBlank @Size(min = 12, max = 72) String newPassword) {}

    public record Account(UUID id, String handle, String displayName) {}

    public record Session(String accessToken, String tokenType, Instant expiresAt, Account user) {}

    public record CreatePost(
            @NotNull UUID clientMutationId,
            @NotBlank @Size(max = 2000) String body) {}

    public record Post(
            long id, UUID authorId, String handle, String displayName,
            String body, Instant createdAt) {}

    public record Feed(List<Post> data, Long nextCursor) {}

    public record Error(String code, String message) {}
}
