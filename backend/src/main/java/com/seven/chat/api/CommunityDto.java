package com.seven.chat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CommunityDto {
    private CommunityDto() {}

    public record CreateGroup(
            @NotBlank @Size(min = 3, max = 80) String name,
            @Size(max = 240) String description,
            Boolean vipOnly) {
        public CreateGroup(String name, String description) {
            this(name, description, false);
        }
    }

    public record Group(UUID id, UUID ownerId, String name, String description,
                        long memberCount, Instant createdAt, boolean vipOnly) {}

    public record InviteUser(
            @NotBlank @Pattern(regexp = "[a-z0-9_]{3,24}") String handle) {}

    public record Invitation(UUID id, UUID groupId, String groupName,
                             UUID inviterId, String inviterHandle,
                             String status, Instant createdAt) {}

    public record SendMessage(
            @NotNull UUID clientMutationId,
            @NotBlank @Size(max = 4000) String body) {}

    public record Message(long id, UUID groupId, UUID senderId, String handle,
                          String body, Instant createdAt) {}

    public record Page<T>(List<T> data, Long nextCursor) {}
}
