package com.seven.chat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class SocialDto {
    private SocialDto() {}

    public record Profile(UUID id, String handle, String displayName,
                          String bio, long followers, long following, long posts,
                          boolean followedByMe, boolean blockedByMe) {}

    public record EditProfile(
            @NotBlank @Size(max = 60) String displayName,
            @Size(max = 160) String bio) {}

    public record EditPost(@NotBlank @Size(max = 2000) String body) {}

    public record CreateComment(@NotBlank @Size(max = 500) String body) {}

    public record Comment(long id, long postId, UUID authorId, String handle,
                          String body, Instant createdAt) {}

    public record Engagement(long postId, long likes, long comments,
                             boolean likedByMe, boolean savedByMe) {}

    public record CreateMessage(@NotNull UUID clientMutationId,
                                @NotBlank @Size(max = 4000) String body) {}

    public record Message(long id, UUID senderId, UUID receiverId,
                          String body, Instant createdAt) {}

    public record Conversation(UUID peerId, String handle, String displayName,
                               String lastMessage, Instant updatedAt) {}

    public record Notification(long id, UUID actorId, String actorHandle,
                               String eventType, Long resourceId, Instant createdAt,
                               boolean seen) {}

    public record Page<T>(List<T> data, Long nextCursor) {}

    public record Capabilities(boolean accounts, boolean feed, boolean profiles,
                               boolean follow, boolean likes, boolean comments,
                               boolean messages, boolean notifications, boolean vip,
                               boolean voiceRooms, boolean livestreams, boolean payments) {}
}
