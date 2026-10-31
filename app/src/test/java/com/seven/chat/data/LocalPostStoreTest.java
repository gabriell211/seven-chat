package com.seven.chat.data;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

import java.util.List;

import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 28)
public class LocalPostStoreTest {
    private static final String DB_NAME = "seven_chat_local.db";
    private Context context;
    private LocalPostStore store;

    @Before
    public void before() {
        context = RuntimeEnvironment.getApplication();
        context.deleteDatabase(DB_NAME);
    }

    @After
    public void after() {
        if (store != null) store.close();
        context.deleteDatabase(DB_NAME);
    }

    private LocalPostStore open() {
        if (store == null) store = new LocalPostStore(context);
        return store;
    }

    @Test
    public void draftsSurviveReopeningDatabase() {
        open().saveDraft("Um rascunho", "content://seven/image");
        store.close();
        store = null;
        LocalDraft draft = open().readDraft();
        assertNotNull(draft);
        assertEquals("Um rascunho", draft.caption);
        assertEquals("content://seven/image", draft.imageUri);
        open().clearDraft();
        assertNull(open().readDraft());
    }

    @Test
    public void emptyDraftIsRemoved() {
        open().saveDraft("Conteúdo", null);
        open().saveDraft("   ", null);
        assertNull(open().readDraft());
    }

    @Test
    public void editingAndArchivingAreReversible() {
        long id = open().createPost("Original", null);
        open().editPost(id, "Editado", false);
        List<LocalPost> visible = open().listPosts("", false);
        assertEquals("Editado", visible.get(0).caption);
        assertTrue(visible.get(0).editedAt > 0);
        open().setArchived(id, true);
        assertTrue(open().listPosts("", false).isEmpty());
        assertEquals(1, open().listArchivedPosts().size());
        open().setArchived(id, false);
        assertEquals(1, open().listPosts("", false).size());
    }

    @Test
    public void searchTreatsWildcardsLiterally() {
        open().createPost("100% Seven", null);
        open().createPost("100 do Seven", null);
        assertEquals(1, open().listPosts("%", false).size());
    }

    @Test
    public void deletingPostCascadesComments() {
        long id = open().createPost("Teste", null);
        open().createComment(id, "Comentário");
        assertEquals(1, open().comments(id).size());
        open().deletePost(id);
        assertTrue(open().comments(id).isEmpty());
    }

    @Test
    public void migrationFromVersionOnePreservesUserContent() {
        SQLiteDatabase db = context.openOrCreateDatabase(DB_NAME, Context.MODE_PRIVATE, null);
        db.execSQL("CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "caption TEXT NOT NULL, image_uri TEXT, created_at INTEGER NOT NULL, " +
                "liked INTEGER NOT NULL DEFAULT 0, bookmarked INTEGER NOT NULL DEFAULT 0)");
        db.execSQL("CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE, " +
                "body TEXT NOT NULL, created_at INTEGER NOT NULL)");
        db.execSQL("INSERT INTO posts (id, caption, created_at, liked, bookmarked) " +
                "VALUES (42, 'Publicação antiga', 1, 1, 1)");
        db.execSQL("INSERT INTO comments (post_id, body, created_at) " +
                "VALUES (42, 'Comentário antigo', 1)");
        db.setVersion(1);
        db.close();

        LocalPost post = open().listPosts("", false).get(0);
        assertEquals(42L, post.id);
        assertEquals("Publicação antiga", post.caption);
        assertTrue(post.liked);
        assertTrue(post.bookmarked);
        assertFalse(post.archived);
        assertEquals(1, open().comments(42L).size());
        open().saveDraft("Novo rascunho", null);
        assertNotNull(open().readDraft());
    }
}
