package com.seven.chat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class SafetyDto {
    private SafetyDto() {}

    public record ReportInput(
            @NotBlank @Pattern(regexp = "account|post|group_message") String targetType,
            @NotBlank @Size(max = 64) String targetId,
            @NotBlank @Pattern(regexp = "spam|harassment|hate|violence|nudity|scam|other")
                    String category,
            @Size(max = 1000) String details) {}

    public record Report(long id, UUID reporterId, String targetType, String targetId,
                         String category, String details, String status,
                         Instant createdAt) {}

    public record ReviewInput(
            @NotBlank @Pattern(regexp = "REVIEWING|RESOLVED|DISMISSED") String status,
            @NotBlank @Size(max = 1000) String notes) {}

    public record ConsentInput(
            @NotBlank @Pattern(regexp = "terms|privacy|marketing") String consentType,
            @NotBlank @Pattern(regexp = "[a-zA-Z0-9._-]{1,32}") String documentVersion,
            @NotNull Boolean granted) {}

    public record Consent(String consentType, String documentVersion,
                          boolean granted, Instant recordedAt) {}

    public record DeleteAccountInput(
            @NotBlank String password,
            @NotBlank String confirmation) {}
}
