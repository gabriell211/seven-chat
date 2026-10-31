package com.seven.chat;

import android.content.Context;
import android.os.SystemClock;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.seven.chat.net.SevenApiClient;

import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.UUID;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.matcher.RootMatchers.isDialog;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.closeSoftKeyboard;
import static androidx.test.espresso.action.ViewActions.replaceText;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.isDescendantOfA;
import static androidx.test.espresso.matcher.ViewMatchers.withHint;
import static androidx.test.espresso.matcher.ViewMatchers.withClassName;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.is;
import android.widget.ScrollView;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertEquals;

/**
 * Native UI + emulator + real localhost backend + real PostgreSQL.
 * Exercises visible pages and actual writes, never fixture UI or synthetic responses.
 */
@RunWith(AndroidJUnit4.class)
public final class RealPagesInstrumentationTest {
    private SevenApiClient api;
    private String peerHandle;
    private String ownerHandle;
    private String seedPost;

    @Before
    public void prepareRealAccounts() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        api = new SevenApiClient(context);
        api.setBaseUrl("http://10.0.2.2:8080");
        api.signOut();
        String nonce = UUID.randomUUID().toString().substring(0, 8);
        ownerHandle = "ui_a_" + nonce;
        peerHandle = "ui_b_" + nonce;
        JSONObject owner = register(ownerHandle);
        JSONObject peer = register(peerHandle);
        api.signIn(peer.getString("accessToken"));
        api.call("POST", "/api/v1/users/" + owner.getJSONObject("user").getString("id") +
                "/follow", null);
        api.signIn(owner.getString("accessToken"));
        seedPost = "Post real de navegação " + nonce;
        JSONObject created = api.call("POST", "/api/v1/posts", new JSONObject()
                .put("clientMutationId", UUID.randomUUID().toString())
                .put("body", seedPost));
        api.call("POST", "/api/v1/posts/" + created.getLong("id") + "/save", null);
    }

    private JSONObject register(String handle) throws Exception {
        return api.call("POST", "/api/v1/auth/register", new JSONObject()
                .put("email", handle + "@seven.test")
                .put("handle", handle)
                .put("displayName", "Conta real " + handle)
                .put("password", "senha-real-para-qa-2026"));
    }

    @After
    public void clearToken() {
        if (api != null) api.signOut();
    }

    private void awaitText(String expected) {
        long deadline = SystemClock.elapsedRealtime() + 25000;
        while (true) {
            try {
                onView(withText(expected)).check(matches(isDisplayed()));
                return;
            } catch (AssertionError | RuntimeException failure) {
                if (SystemClock.elapsedRealtime() >= deadline) throw failure;
                SystemClock.sleep(180);
            }
        }
    }

    private void awaitHint(String expected) {
        long deadline = SystemClock.elapsedRealtime() + 25000;
        while (true) {
            try {
                onView(withHint(expected)).check(matches(isDisplayed()));
                return;
            } catch (AssertionError | RuntimeException failure) {
                if (SystemClock.elapsedRealtime() >= deadline) throw failure;
                SystemClock.sleep(180);
            }
        }
    }

    private void navigate(String item) {
        onView(withText("Menu")).perform(click());
        onView(withText(item)).inRoot(isDialog()).perform(click());
    }

    @Test
    public void realNativePagesPublishSearchFollowChatAndRestoreDraftAfterRotation()
            throws Exception {
        try (ActivityScenario<OnlineActivity> activity =
                ActivityScenario.launch(OnlineActivity.class)) {
            // Initial bootstrap verifies stored session; feed is served by PostgreSQL.
            awaitText(seedPost);

            navigate("Explorar");
            awaitText("Descobrir pessoas");
            onView(withHint("Buscar @usuário"))
                    .perform(replaceText(peerHandle), closeSoftKeyboard());
            onView(withText("Pesquisar")).perform(click());
            awaitText("Resultados");
            onView(withText("Conta real " + peerHandle + "  @" + peerHandle)).perform(click());
            awaitText("Seguir");
            onView(withText("Seguir")).perform(click());
            awaitText("Deixar de seguir");
            assertTrue(api.call("GET", "/api/v1/users/" + peerHandle, null)
                    .getBoolean("followedByMe"));

            onView(withText("Enviar mensagem")).perform(click());
            awaitHint("Escreva sua mensagem");
            onView(withHint("Escreva sua mensagem"))
                    .perform(replaceText("Mensagem enviada pela tela Android"), closeSoftKeyboard());
            onView(withText("Enviar")).perform(click());
            awaitText("Mensagem enviada pela tela Android");

            navigate("Publicar");
            awaitText("Nova publicação");
            onView(withHint("O que você gostaria de publicar?"))
                    .perform(replaceText("Rascunho preservado na rotação"), closeSoftKeyboard());
            activity.recreate();
            awaitHint("O que você gostaria de publicar?");
            onView(withHint("O que você gostaria de publicar?"))
                    .check(matches(withText("Rascunho preservado na rotação")));
            onView(allOf(withText("Publicar"), isDescendantOfA(withClassName(is(ScrollView.class.getName())))))
                    .perform(click());
            awaitText("Rascunho preservado na rotação");

            navigate("Conversas");
            awaitText("Conversas");
            navigate("Notificações");
            awaitText("Começou a seguir você.");
            onView(withText("Marcar como lida")).perform(click());

            navigate("Salvos");
            awaitText(seedPost);
            navigate("Perfil");
            awaitHint("Nome");
            onView(withHint("Nome"))
                    .perform(replaceText("Perfil atualizado pelo Android"), closeSoftKeyboard());
            onView(withHint("Biografia"))
                    .perform(replaceText("Perfil persistido no PostgreSQL"), closeSoftKeyboard());
            onView(withText("Salvar alterações")).perform(click());
            awaitText("Perfil atualizado pelo Android");
            assertEquals("Perfil persistido no PostgreSQL",
                    api.call("GET", "/api/v1/users/" + ownerHandle, null).getString("bio"));

            navigate("Configurações");
            awaitText("Configurações");
            onView(withText("Sair da conta")).perform(click());
            awaitText("Entrar no Seven");
            assertFalse(api.isSignedIn());
        }
    }
}
