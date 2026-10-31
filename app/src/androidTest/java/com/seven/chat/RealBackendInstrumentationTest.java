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

        api.call("POST", "/api/v1/auth/logout", null);
        try {
            api.call("GET", "/api/v1/auth/me", null);
            fail("A sessão revogada não pode ser aceita.");
        } catch (SevenApiClient.ApiError expected) {
            assertEquals(401, expected.status);
        }
    }
}
