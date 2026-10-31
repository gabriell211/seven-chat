package com.seven.chat.data;

public final class LocalDraft {
    public final String caption;
    public final String imageUri;
    public final long updatedAt;

    public LocalDraft(String caption, String imageUri, long updatedAt) {
        this.caption = caption;
        this.imageUri = imageUri;
        this.updatedAt = updatedAt;
    }
}
