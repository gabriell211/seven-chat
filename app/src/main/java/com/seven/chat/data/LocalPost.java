package com.seven.chat.data;

/** Dados persistidos exclusivamente no aparelho. */
public final class LocalPost {
    public final long id;
    public final String caption;
    public final String imageUri;
    public final long createdAt;
    public final boolean liked;
    public final boolean bookmarked;
    public final boolean archived;
    public final long editedAt;

    public LocalPost(long id, String caption, String imageUri, long createdAt,
                     boolean liked, boolean bookmarked, boolean archived, long editedAt) {
        this.id = id;
        this.caption = caption;
        this.imageUri = imageUri;
        this.createdAt = createdAt;
        this.liked = liked;
        this.bookmarked = bookmarked;
        this.archived = archived;
        this.editedAt = editedAt;
    }
}
