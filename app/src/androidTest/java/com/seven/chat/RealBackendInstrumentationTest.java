package com.seven.chat;

import android.content.Context;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.seven.chat.net.SevenApiClient;

import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.UUID;

import static org.junit.Assert.*;

/**
 * Real emulator -> Android HttpURLConnection -> local Java API -> PostgreSQL.
 * Never runs against production or uses mock accounts; a CI-only database is required.
 */
@RunWith(AndroidJUnit4.class)
public final class RealBackendInstrumentationTest {
    private SevenApiClient api;

    @Before
    public void connectLocalBackend() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        api = new SevenApiClient(context);
        api.setBaseUrl("http://10.0.2.2:8080");
        api.signOut();
    }

    @After
    public void clearSession() {
        if (api != null) api.signOut();
    }

    private JSONObject register(String handle) throws Exception {
        return api.call("POST", "/api/v1/auth/register",
                new JSONObject()
                        .put("email", handle + "@seven.test")
                        .put("handle", handle)
                        .put("displayName", "Homologação Android")
                        .put("password", "uma-senha-segura-para-teste"));
    }

    @Test
    public void registerPublishDirectMessageAndRevokeSessionOnRealServer() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        JSONObject first = register("emua_" + suffix);
        JSONObject second = register("emub_" + suffix);

        String firstToken = first.getString("accessToken");
        String secondToken = second.getString("accessToken");
        String secondId = second.getJSONObject("user").getString("id");
        assertNotEquals(firstToken, secondToken);

        api.signIn(firstToken);
        assertTrue(api.isSignedIn());
        assertEquals("emua_" + suffix,
                api.call("GET", "/api/v1/auth/me", null).getString("handle"));

        String mutation = UUID.randomUUID().toString();
        JSONObject post = new JSONObject()
                .put("clientMutationId", mutation)
                .put("body", "Teste de publicação via Android e PostgreSQL");
        JSONObject published = api.call("POST", "/api/v1/posts", post);
        assertEquals(published.getLong("id"),
                api.call("POST", "/api/v1/posts", post).getLong("id"));

        JSONObject message = new JSONObject()
                .put("clientMutationId", UUID.randomUUID().toString())
                .put("body", "Mensagem real enviada pelo emulador");
        api.call("POST", "/api/v1/conversations/" + secondId + "/messages", message);

        api.signIn(secondToken);
        assertEquals("emub_" + suffix,
                api.call("GET", "/api/v1/auth/me", null).getString("handle"));
        assertTrue(api.call("GET", "/api/v1/posts?limit=30", null)
                .getJSONArray("data").toString().contains("Teste de publicação"));
        assertTrue(api.call("GET", "/api/v1/conversations/" +
                first.getJSONObject("user").getString("id") +
                "/messages?limit=30", null).getJSONArray("data")
                .toString().contains("Mensagem real enviada pelo emulador"));

        // Homologate interactions and persistence through the Android HTTP client.
        String firstId = first.getJSONObject("user").getString("id");
        api.call("POST", "/api/v1/users/" + firstId + "/follow", null);
        JSONObject updatedProfile = api.call("POST", "/api/v1/users/me",
                new JSONObject().put("displayName", "Perfil Android")
                        .put("bio", "Biografia persistente"));
        assertEquals("Biografia persistente", updatedProfile.getString("bio"));

        long postId = published.getLong("id");
        JSONObject liked = api.call("POST", "/api/v1/posts/" + postId + "/like", null);
        assertEquals(1L, liked.getLong("likes"));
        JSONObject saved = api.call("POST", "/api/v1/posts/" + postId + "/save", null);
        assertTrue(saved.getBoolean("savedByMe"));
        assertEquals(postId, api.call("GET", "/api/v1/posts/saved?limit=20", null)
                .getJSONArray("data").getJSONObject(0).getLong("id"));

        JSONObject postedComment = api.call("POST", "/api/v1/posts/" + postId + "/comments",
                new JSONObject().put("body", "Comentário do Android real"));
        assertTrue(api.call("GET", "/api/v1/posts/" + postId + "/comments", null)
                .getJSONArray("data").toString().contains("Comentário do Android real"));
        api.call("DELETE", "/api/v1/comments/" + postedComment.getLong("id"), null);

        assertTrue(api.call("GET", "/api/v1/users?query=emua_" + suffix, null)
                .getJSONArray("data").toString().contains("emua_" + suffix));

        JSONObject notice = api.call("GET", "/api/v1/notifications", null);
        assertTrue(notice.getJSONArray("data").length() >= 1);
        api.call("POST", "/api/v1/notifications/" +
                notice.getJSONArray("data").getJSONObject(0).getLong("id") + "/read", null);

        // Mutually blocked accounts cannot see each other's posts or messages.
        api.call("POST", "/api/v1/users/" + firstId + "/block", null);
        assertFalse(api.call("GET", "/api/v1/posts?limit=30", null).getJSONArray("data")
                .toString().contains("Teste de publicação via Android"));
        try {
            api.call("POST", "/api/v1/posts/" + postId + "/like", null);
            fail("Interações com contas bloqueadas precisam ser proibidas");
        } catch (SevenApiClient.ApiError denied) {
            assertEquals(403, denied.status);
        }
        api.call("DELETE", "/api/v1/users/" + firstId + "/block", null);
        assertTrue(api.call("GET", "/api/v1/posts?limit=30", null)
                .getJSONArray("data").toString().contains("Teste de publicação via Android"));

        api.call("DELETE", "/api/v1/posts/" + postId + "/save", null);
        api.call("DELETE", "/api/v1/posts/" + postId + "/like", null);

        api.call("POST", "/api/v1/auth/logout", null);
        try {
            api.call("GET", "/api/v1/auth/me", null);
            fail("A sessão revogada não pode ser aceita.");
        } catch (SevenApiClient.ApiError expected) {
            assertEquals(401, expected.status);
        }
    }
}
