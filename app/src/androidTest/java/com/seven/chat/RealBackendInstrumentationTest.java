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
    public void vipAccessFollowsServerEntitlement() throws Exception {
        String handle = "vipcheck_" + UUID.randomUUID().toString().substring(0, 8);
        JSONObject registered = register(handle);
        api.signIn(registered.getString("accessToken"));
        assertFalse(api.call("GET", "/api/v1/vip/me", null).getBoolean("active"));

        try {
            api.call("POST", "/api/v1/groups", new JSONObject()
                    .put("name", "Grupo restrito")
                    .put("vipOnly", true));
            fail("VIP não autorizado");
        } catch (SevenApiClient.ApiError expected) {
            assertEquals(403, expected.status);
        }
    }

    @Test
    public void privateGroupsReportsPrivacyAndErasureUseRealPostgresql() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String ownerHandle = "a_grp_" + suffix;
        String guestHandle = "b_grp_" + suffix;
        JSONObject owner = register(ownerHandle);
        JSONObject guest = register(guestHandle);
        String ownerToken = owner.getString("accessToken");
        String guestToken = guest.getString("accessToken");

        api.signIn(ownerToken);
        JSONObject group = api.call("POST", "/api/v1/groups",
                new JSONObject().put("name", "Equipe Android QA")
                        .put("description", "Grupo real no PostgreSQL"));
        String groupId = group.getString("id");
        assertEquals(1, group.getLong("memberCount"));
        api.call("POST", "/api/v1/groups/" + groupId + "/invitations",
                new JSONObject().put("handle", guestHandle));

        api.signIn(guestToken);
        try {
            api.call("GET", "/api/v1/groups/" + groupId, null);
            fail("Grupo privado deve negar acesso antes do aceite.");
        } catch (SevenApiClient.ApiError expected) {
            assertEquals(404, expected.status);
        }
        JSONObject invitations = api.call("GET", "/api/v1/groups/invitations", null);
        assertEquals(1, invitations.getJSONArray("data").length());
        String invitationId = invitations.getJSONArray("data").getJSONObject(0).getString("id");
        api.call("POST", "/api/v1/groups/invitations/" + invitationId + "/accept", null);
        JSONObject message = new JSONObject()
                .put("clientMutationId", UUID.randomUUID().toString())
                .put("body", "Mensagem privada via Android real");
        JSONObject saved = api.call("POST", "/api/v1/groups/" + groupId + "/messages", message);
        assertEquals(saved.getLong("id"), api.call("POST",
                "/api/v1/groups/" + groupId + "/messages", message).getLong("id"));

        api.signIn(ownerToken);
        assertTrue(api.call("GET", "/api/v1/groups/" + groupId + "/messages", null)
                .getJSONArray("data").toString().contains("Mensagem privada via Android real"));

        JSONObject report = api.call("POST", "/api/v1/moderation/reports", new JSONObject()
                .put("targetType", "account")
                .put("targetId", guest.getJSONObject("user").getString("id"))
                .put("category", "spam")
                .put("details", "Denúncia de teste"));
        assertEquals("OPEN", report.getString("status"));
        try {
            api.call("GET", "/api/v1/moderation/queue", null);
            fail("Usuário comum não pode revisar denúncias.");
        } catch (SevenApiClient.ApiError expected) {
            assertEquals(403, expected.status);
        }

        JSONObject consent = api.call("POST", "/api/v1/privacy/consents",
                new JSONObject().put("consentType", "marketing")
                        .put("documentVersion", "2026.11")
                        .put("granted", false));
        assertFalse(consent.getBoolean("granted"));
        JSONObject exported = api.call("GET", "/api/v1/privacy/export", null);
        assertEquals(ownerHandle, exported.getJSONObject("account").getString("handle"));
        assertFalse(exported.toString().contains(ownerToken));

        api.call("POST", "/api/v1/privacy/delete-account",
                new JSONObject().put("password", "uma-senha-segura-para-teste")
                        .put("confirmation", "DELETE MY ACCOUNT"));
        try {
            api.call("GET", "/api/v1/auth/me", null);
            fail("Conta excluída não pode manter sessão ativa.");
        } catch (SevenApiClient.ApiError expected) {
            assertEquals(401, expected.status);
        }
        api.signIn(guestToken);
        assertEquals(0, api.call("GET", "/api/v1/groups", null)
                .getJSONArray("data").length());
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

    @Test
    public void passwordRotationRevokesAllDeviceTokensUsingRealApi() throws Exception {
        String handle = "pw_" + UUID.randomUUID().toString().substring(0, 8);
        String email = handle + "@seven.test";
        String oldPassword = "uma-senha-segura-para-teste";
        String newPassword = "nova-senha-de-homologacao-2026";
        JSONObject created = register(handle);
        String first = created.getString("accessToken");
        String second = api.call("POST", "/api/v1/auth/login", new JSONObject()
                .put("email", email).put("password", oldPassword))
                .getString("accessToken");
        api.signIn(first);
        try {
            api.call("POST", "/api/v1/auth/password", new JSONObject()
                    .put("currentPassword", "senha-incorreta")
                    .put("newPassword", newPassword));
            fail("Senha atual inválida não pode alterar a conta.");
        } catch (SevenApiClient.ApiError expected) {
            assertEquals(422, expected.status);
        }
        assertEquals(handle, api.call("GET", "/api/v1/auth/me", null)
                .getString("handle"));
        api.call("POST", "/api/v1/auth/password", new JSONObject()
                .put("currentPassword", oldPassword)
                .put("newPassword", newPassword));

        for (String revoked : new String[]{first, second}) {
            api.signIn(revoked);
            try {
                api.call("GET", "/api/v1/auth/me", null);
                fail("Sessões anteriores à troca devem ser invalidadas.");
            } catch (SevenApiClient.ApiError expected) {
                assertEquals(401, expected.status);
            }
        }
        JSONObject newLogin = api.call("POST", "/api/v1/auth/login", new JSONObject()
                .put("email", email).put("password", newPassword));
        api.signIn(newLogin.getString("accessToken"));
        assertEquals(handle, api.call("GET", "/api/v1/auth/me", null)
                .getString("handle"));
    }

    @Test
    public void emailVerificationIsPrivateAndDoesNotInventSmtpDelivery() throws Exception {
        String handle = "email_" + UUID.randomUUID().toString().substring(0, 8);
        JSONObject registered = register(handle);
        api.signIn(registered.getString("accessToken"));
        JSONObject status = api.call("GET", "/api/v1/auth/email-verification", null);
        assertFalse(status.getBoolean("verified"));
        assertTrue(status.getString("maskedEmail").endsWith("@seven.test"));
        assertFalse(status.toString().contains(handle + "@seven.test"));

        // Local Android E2E has no SMTP credentials; it must reject delivery.
        try {
            api.call("POST", "/api/v1/auth/email-verification/send", null);
            fail("Sem SMTP configurado, nunca declarar código enviado.");
        } catch (SevenApiClient.ApiError expected) {
            assertEquals(503, expected.status);
        }
        assertFalse(api.call("GET", "/api/v1/auth/email-verification", null)
                .getBoolean("verified"));
    }

    @Test
    public void recoveryRequiresRealSmtpAndNeverIssuesAnonymousSession() throws Exception {
        String handle = "recover_" + UUID.randomUUID().toString().substring(0, 8);
        JSONObject account = register(handle);
        api.signOut();
        String email = handle + "@seven.test";

        try {
            api.call("POST", "/api/v1/auth/recovery/request",
                    new JSONObject().put("email", email));
            fail("Sem SMTP e segredo configurados, a API não pode alegar entrega.");
        } catch (SevenApiClient.ApiError expected) {
            assertEquals(503, expected.status);
        }

        try {
            api.call("POST", "/api/v1/auth/recovery/confirm",
                    new JSONObject().put("email", email)
                            .put("code", "0000000000")
                            .put("newPassword", "nova-senha-segura-2026"));
            fail("Código não emitido não pode ser aceito.");
        } catch (SevenApiClient.ApiError expected) {
            assertEquals(422, expected.status);
        }
        assertFalse(api.isSignedIn());
        JSONObject loggedIn = api.call("POST", "/api/v1/auth/login",
                new JSONObject().put("email", email)
                        .put("password", "uma-senha-segura-para-teste"));
        assertEquals(handle, loggedIn.getJSONObject("user").getString("handle"));
        assertNotNull(account.getString("accessToken"));
    }
}
