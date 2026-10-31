package com.seven.chat.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import com.seven.chat.domain.PostRules;

import java.util.ArrayList;
import java.util.List;

/** Armazena somente dados locais; nunca representa contas, pagamentos nem VIP reais. */
public final class LocalPostStore extends SQLiteOpenHelper {
    private static final String DATABASE = "seven_chat_local.db";

    public LocalPostStore(Context context) {
        super(context.getApplicationContext(), DATABASE, null, 2);
    }

    @Override
    public void onConfigure(SQLiteDatabase db) {
        super.onConfigure(db);
        db.setForeignKeyConstraintsEnabled(true);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, caption TEXT NOT NULL, " +
                "image_uri TEXT, created_at INTEGER NOT NULL, liked INTEGER NOT NULL DEFAULT 0, " +
                "bookmarked INTEGER NOT NULL DEFAULT 0, " +
                "archived INTEGER NOT NULL DEFAULT 0, edited_at INTEGER NOT NULL DEFAULT 0)");
        db.execSQL("CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE, " +
                "body TEXT NOT NULL, created_at INTEGER NOT NULL)");
        db.execSQL("CREATE INDEX idx_posts_created_at ON posts(created_at DESC)");
        db.execSQL("CREATE INDEX idx_posts_archived_created ON posts(archived, created_at DESC)");
        createDraftsTable(db);
        db.execSQL("CREATE INDEX idx_comments_post_id ON comments(post_id, created_at)");
    }

    private static void createDraftsTable(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS drafts (" +
                "id INTEGER PRIMARY KEY CHECK(id = 1), caption TEXT NOT NULL, " +
                "image_uri TEXT, updated_at INTEGER NOT NULL)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) {
            // ALTER TABLE preserva publicações, comentários, curtidas e favoritos da versão 1.
            db.execSQL("ALTER TABLE posts ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
            db.execSQL("ALTER TABLE posts ADD COLUMN edited_at INTEGER NOT NULL DEFAULT 0");
            db.execSQL("CREATE INDEX idx_posts_archived_created ON posts(archived, created_at DESC)");
            createDraftsTable(db);
        }
    }

    public long createPost(String caption, String imageUri) {
        String body = PostRules.caption(caption, imageUri != null && !imageUri.isEmpty());
        ContentValues values = new ContentValues();
        values.put("caption", body);
        values.put("image_uri", imageUri);
        values.put("created_at", System.currentTimeMillis());
        return getWritableDatabase().insertOrThrow("posts", null, values);
    }

    public List<LocalPost> listPosts(String term, boolean savedOnly) {
        return queryPosts(term, savedOnly, false);
    }

    public List<LocalPost> listArchivedPosts() {
        return queryPosts("", false, true);
    }

    private List<LocalPost> queryPosts(String term, boolean savedOnly, boolean archivedOnly) {
        List<LocalPost> result = new ArrayList<>();
        String filter = term == null ? "" : term.trim();
        StringBuilder where = new StringBuilder("archived = ?");
        List<String> params = new ArrayList<>();
        params.add(archivedOnly ? "1" : "0");
        if (!filter.isEmpty()) {
            where.append(" AND caption LIKE ? ESCAPE '\\\\'");
            params.add("%" + filter.replace("\\", "\\\\").replace("%", "\\%")
                    .replace("_", "\\_") + "%");
        }
        if (savedOnly) where.append(" AND bookmarked = 1");
        try (Cursor cursor = getReadableDatabase().query("posts",
                new String[]{"id", "caption", "image_uri", "created_at", "liked", "bookmarked",
                        "archived", "edited_at"},
                where.toString(), params.toArray(new String[0]), null, null,
                "created_at DESC, id DESC", "100")) {
            while (cursor.moveToNext()) {
                result.add(new LocalPost(cursor.getLong(0), cursor.getString(1),
                        cursor.getString(2), cursor.getLong(3), cursor.getInt(4) != 0,
                        cursor.getInt(5) != 0, cursor.getInt(6) != 0, cursor.getLong(7)));
            }
        }
        return result;
    }

    public void editPost(long id, String caption, boolean hasMedia) {
        ContentValues values = new ContentValues();
        values.put("caption", PostRules.caption(caption, hasMedia));
        values.put("edited_at", System.currentTimeMillis());
        getWritableDatabase().update("posts", values, "id=?", new String[]{String.valueOf(id)});
    }

    public void setArchived(long id, boolean archived) {
        ContentValues values = new ContentValues();
        values.put("archived", archived ? 1 : 0);
        getWritableDatabase().update("posts", values, "id=?", new String[]{String.valueOf(id)});
    }

    public void saveDraft(String caption, String imageUri) {
        String safeCaption = PostRules.normalize(caption);
        if (safeCaption.length() > PostRules.MAX_CAPTION) {
            throw new IllegalArgumentException("O rascunho excede 2.000 caracteres.");
        }
        if (safeCaption.isEmpty() && (imageUri == null || imageUri.isEmpty())) {
            clearDraft();
            return;
        }
        ContentValues values = new ContentValues();
        values.put("id", 1);
        values.put("caption", safeCaption);
        values.put("image_uri", imageUri);
        values.put("updated_at", System.currentTimeMillis());
        getWritableDatabase().insertWithOnConflict("drafts", null, values,
                SQLiteDatabase.CONFLICT_REPLACE);
    }

    public LocalDraft readDraft() {
        try (Cursor cursor = getReadableDatabase().query("drafts",
                new String[]{"caption", "image_uri", "updated_at"},
                "id=?", new String[]{"1"}, null, null, null, "1")) {
            if (!cursor.moveToFirst()) return null;
            return new LocalDraft(cursor.getString(0), cursor.getString(1), cursor.getLong(2));
        }
    }

    public void clearDraft() {
        getWritableDatabase().delete("drafts", "id=?", new String[]{"1"});
    }

    public void setLiked(long id, boolean liked) {
        ContentValues v = new ContentValues();
        v.put("liked", liked ? 1 : 0);
        getWritableDatabase().update("posts", v, "id=?", new String[]{String.valueOf(id)});
    }

    public void setBookmarked(long id, boolean bookmarked) {
        ContentValues v = new ContentValues();
        v.put("bookmarked", bookmarked ? 1 : 0);
        getWritableDatabase().update("posts", v, "id=?", new String[]{String.valueOf(id)});
    }

    public void deletePost(long id) {
        getWritableDatabase().delete("posts", "id=?", new String[]{String.valueOf(id)});
    }

    public long createComment(long postId, String body) {
        ContentValues v = new ContentValues();
        v.put("post_id", postId);
        v.put("body", PostRules.comment(body));
        v.put("created_at", System.currentTimeMillis());
        return getWritableDatabase().insertOrThrow("comments", null, v);
    }

    public List<LocalComment> comments(long postId) {
        List<LocalComment> result = new ArrayList<>();
        try (Cursor cursor = getReadableDatabase().query("comments",
                new String[]{"id", "post_id", "body", "created_at"},
                "post_id=?", new String[]{String.valueOf(postId)},
                null, null, "created_at ASC, id ASC", "200")) {
            while (cursor.moveToNext()) {
                result.add(new LocalComment(cursor.getLong(0), cursor.getLong(1),
                        cursor.getString(2), cursor.getLong(3)));
            }
        }
        return result;
    }

    public int countPosts() {
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM posts", null)) {
            return cursor.moveToFirst() ? cursor.getInt(0) : 0;
        }
    }
}
