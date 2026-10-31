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
        super(context.getApplicationContext(), DATABASE, null, 1);
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
                "bookmarked INTEGER NOT NULL DEFAULT 0)");
        db.execSQL("CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE, " +
                "body TEXT NOT NULL, created_at INTEGER NOT NULL)");
        db.execSQL("CREATE INDEX idx_posts_created_at ON posts(created_at DESC)");
        db.execSQL("CREATE INDEX idx_comments_post_id ON comments(post_id, created_at)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // Migrações futuras deverão preservar os registros existentes.
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
        List<LocalPost> posts = new ArrayList<>();
        String filter = term == null ? "" : term.trim();
        StringBuilder where = new StringBuilder("1=1");
        List<String> params = new ArrayList<>();
        if (!filter.isEmpty()) {
            where.append(" AND caption LIKE ? ESCAPE '\\'");
            params.add("%" + filter.replace("\\", "\\\\").replace("%", "\\%")
                    .replace("_", "\\_") + "%");
        }
        if (savedOnly) where.append(" AND bookmarked = 1");
        try (Cursor cursor = getReadableDatabase().query("posts",
                new String[]{"id", "caption", "image_uri", "created_at", "liked", "bookmarked"},
                where.toString(), params.toArray(new String[0]), null, null,
                "created_at DESC, id DESC", "100")) {
            while (cursor.moveToNext()) {
                posts.add(new LocalPost(cursor.getLong(0), cursor.getString(1),
                        cursor.getString(2), cursor.getLong(3), cursor.getInt(4) != 0,
                        cursor.getInt(5) != 0));
            }
        }
        return posts;
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
