package com.seven.chat.data;

public final class LocalComment {
    public final long id;
    public final long postId;
    public final String body;
    public final long createdAt;

    public LocalComment(long id, long postId, String body, long createdAt) {
        this.id = id;
        this.postId = postId;
        this.body = body;
        this.createdAt = createdAt;
    }
}
