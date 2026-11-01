package com.seven.chat;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.text.InputFilter;
import android.text.InputType;
import android.text.TextWatcher;
import android.text.Editable;
import android.view.Gravity;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.seven.chat.net.SevenApiClient;
import com.seven.chat.ui.UiKit;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Server-backed entry point. No fake profiles, feeds, messages, credits or VIP state.
 * Network and database operations never execute on the Android main thread.
 */
public final class OnlineActivity extends Activity {
    private SevenApiClient api;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private LinearLayout root;
    private LinearLayout page;
    private String route;
    private int generation;
    private String meId = "";
    private String myHandle = "";
    private String selectedId = "";
    private String selectedHandle = "";
    private long selectedPost;
    private String selectedGroupId = "";
    private String groupDraft = "";
    private String groupMutationId = UUID.randomUUID().toString();
    private Long cursor;
    private String searchQuery = "";
    private String restoreRoute = "feed";
    private String draftCaption = "";
    private String draftMutationId = UUID.randomUUID().toString();
    private String messageDraft = "";
    private String messageDraftPeerId = "";
    private String messageMutationId = UUID.randomUUID().toString();

    private interface JsonAction { void accept(JSONObject json) throws JSONException; }

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        api = new SevenApiClient(this);
        root = UiKit.vertical(this);
        root.setBackgroundColor(UiKit.BACKGROUND);
        setContentView(root);
        if (saved != null) {
            restoreRoute = saved.getString("route", "feed");
            if (restoreRoute == null || restoreRoute.equals("server")
                    || restoreRoute.equals("login") || restoreRoute.equals("register")
                    || restoreRoute.equals("bootstrap")) {
                restoreRoute = "feed";
            }
            selectedId = saved.getString("selected_id", "");
            selectedHandle = saved.getString("selected_handle", "");
            selectedPost = saved.getLong("selected_post", 0L);
            selectedGroupId = saved.getString("selected_group", "");
            groupDraft = saved.getString("group_draft", "");
            groupMutationId = saved.getString("group_mutation", groupMutationId);
            searchQuery = saved.getString("search", "");
            draftCaption = saved.getString("draft_caption", "");
            draftMutationId = saved.getString("draft_mutation", draftMutationId);
            messageDraft = saved.getString("message_draft", "");
            messageDraftPeerId = saved.getString("message_peer", "");
            messageMutationId = saved.getString("message_mutation", messageMutationId);
        }
        if (api.baseUrl().isEmpty()) {
            navigate("server");
        } else if (!api.isSignedIn()) {
            navigate("login");
        } else {
            navigate("bootstrap");
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        out.putString("route", route);
        out.putString("selected_id", selectedId);
        out.putString("selected_handle", selectedHandle);
        out.putLong("selected_post", selectedPost);
        out.putString("selected_group", selectedGroupId);
        out.putString("group_draft", groupDraft);
        out.putString("group_mutation", groupMutationId);
        out.putString("search", searchQuery);
        out.putString("draft_caption", draftCaption);
        out.putString("draft_mutation", draftMutationId);
        out.putString("message_draft", messageDraft);
        out.putString("message_peer", messageDraftPeerId);
        out.putString("message_mutation", messageMutationId);
        super.onSaveInstanceState(out);
    }

    private interface TextChange {
        void changed(String value);
    }

    private void onInput(EditText field, TextChange change) {
        field.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                change.changed(s.toString());
            }
            @Override public void afterTextChanged(Editable value) { }
        });
    }

    @Override
    protected void onDestroy() {
        generation++;
        io.shutdownNow();
        super.onDestroy();
    }

    private int dp(int n) { return UiKit.dp(this, n); }

    private void navigate(String next) {
        route = next;
        generation++;
        root.removeAllViews();
        LinearLayout header = UiKit.horizontal(this);
        header.setPadding(dp(16), dp(12), dp(16), dp(12));
        TextView title = UiKit.text(this, "SEVEN CHAT", 21, UiKit.TEXT, true);
        header.addView(title, new LinearLayout.LayoutParams(0, dp(48), 1));
        if (api.isSignedIn()) {
            TextView bell = UiKit.button(this, "Avisos", false);
            bell.setOnClickListener(v -> navigate("notifications"));
            header.addView(bell);
            TextView menu = UiKit.button(this, "Menu", false);
            menu.setOnClickListener(v -> menu());
            LinearLayout.LayoutParams m = new LinearLayout.LayoutParams(-2, -2);
            m.leftMargin = dp(8);
            header.addView(menu, m);
        }
        root.addView(header);
        View border = new View(this);
        border.setBackgroundColor(UiKit.BORDER);
        root.addView(border, new LinearLayout.LayoutParams(-1, dp(1)));

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        page = UiKit.vertical(this);
        page.setPadding(dp(16), dp(20), dp(16), dp(20));
        scroll.addView(page);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        switch (next) {
            case "bootstrap": bootstrap(); break;
            case "server": server(); break;
            case "login": login(false); break;
            case "register": login(true); break;
            case "feed": feed(false); break;
            case "saved": feed(true); break;
            case "explore": explore(); break;
            case "user": showUser(); break;
            case "followers": relations(true); break;
            case "following": relations(false); break;
            case "blocks": blockedUsers(); break;
            case "compose": compose(); break;
            case "profile": profile(); break;
            case "chats": chats(); break;
            case "thread": thread(); break;
            case "notifications": notifications(); break;
            case "comments": comments(); break;
            case "settings": settings(); break;
            case "groups": groups(); break;
            case "group-invites": groupInvitations(); break;
            case "group-thread": groupThread(); break;
            default: capabilityScreen(next); break;
        }

        if (api.isSignedIn() && !next.equals("server") && !next.equals("login") &&
                !next.equals("register")) {
            LinearLayout nav = UiKit.horizontal(this);
            nav.setPadding(dp(4), dp(5), dp(4), dp(7));
            navButton(nav, "Feed", "feed");
            navButton(nav, "Buscar", "explore");
            navButton(nav, "Publicar", "compose");
            navButton(nav, "Chat", "chats");
            navButton(nav, "Perfil", "profile");
            root.addView(nav);
        }
    }

    private void navButton(LinearLayout row, String title, String target) {
        TextView t = UiKit.text(this, title, 13, route.equals(target) ?
                UiKit.PRIMARY : UiKit.MUTED, true);
        t.setGravity(Gravity.CENTER);
        t.setContentDescription(title);
        t.setMinHeight(dp(48));
        t.setOnClickListener(v -> navigate(target));
        row.addView(t, new LinearLayout.LayoutParams(0, dp(48), 1));
    }

    private void menu() {
        String[] labels = {"Feed", "Explorar", "Publicar", "Conversas", "Notificações",
                "Salvos", "Perfil", "Stories", "Reels", "Grupos", "Salas de voz", "Lives",
                "Chamadas", "Presentes", "Carteira", "Seven VIP", "Configurações"};
        String[] routes = {"feed", "explore", "compose", "chats", "notifications",
                "saved", "profile", "stories", "reels", "groups", "rooms", "live",
                "calls", "gifts", "wallet", "vip", "settings"};
        new AlertDialog.Builder(this).setTitle("Navegação Seven")
                .setItems(labels, (dialog, which) -> navigate(routes[which]))
                .setNegativeButton("Fechar", null).show();
    }

    private void heading(String title, String explanation) {
        page.addView(UiKit.text(this, title, 24, UiKit.TEXT, true));
        gap(8);
        page.addView(UiKit.text(this, explanation, 14, UiKit.MUTED, false));
        gap(18);
    }

    private void gap(int n) { UiKit.gap(page, this, n); }

    private EditText input(String hint, int limit, boolean multiline) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setHintTextColor(UiKit.MUTED);
        e.setTextColor(UiKit.TEXT);
        e.setTextSize(15);
        e.setFilters(new InputFilter[]{new InputFilter.LengthFilter(limit)});
        e.setBackground(UiKit.background(this, UiKit.SURFACE, 14, UiKit.BORDER));
        e.setPadding(dp(12), dp(12), dp(12), dp(12));
        e.setInputType(multiline ? InputType.TYPE_CLASS_TEXT |
                InputType.TYPE_TEXT_FLAG_MULTI_LINE : InputType.TYPE_CLASS_TEXT);
        page.addView(e);
        gap(12);
        return e;
    }

    private TextView button(String label, boolean primary, Runnable action) {
        TextView b = UiKit.button(this, label, primary);
        b.setOnClickListener(v -> action.run());
        page.addView(b);
        gap(10);
        return b;
    }

    private void note(String title, String body) {
        LinearLayout card = UiKit.card(this);
        card.addView(UiKit.text(this, title, 16, UiKit.TEXT, true));
        UiKit.gap(card, this, 7);
        card.addView(UiKit.text(this, body, 14, UiKit.MUTED, false));
        UiKit.cardInto(page, card, this);
    }

    private void request(String method, String path, JSONObject payload,
                         boolean loading, JsonAction success) {
        final int render = generation;
        if (loading) note("Carregando", "Buscando dados do servidor Seven Chat.");
        io.execute(() -> {
            try {
                JSONObject result = api.call(method, path, payload);
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed() || generation != render) return;
                    try { success.accept(result); }
                    catch (JSONException error) { displayError("Resposta inválida do servidor."); }
                });
            } catch (SevenApiClient.ApiError ex) {
                runOnUiThread(() -> {
                    if (generation != render) return;
                    if (ex.status == 401 && !route.equals("login") && !route.equals("register")) {
                        api.signOut();
                        navigate("login");
                        return;
                    }
                    displayError(ex.getMessage());
                });
            } catch (IOException | JSONException | RuntimeException ex) {
                runOnUiThread(() -> {
                    if (generation == render) displayError("Falha de conexão ou resposta inválida.");
                });
            }
        });
    }

    private void displayError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        note("Não foi possível concluir", message);
        if (route.equals("feed") || route.equals("chats") ||
                route.equals("notifications") || route.equals("explore")) {
            button("Tentar novamente", false, () -> navigate(route));
        }
    }

    private JSONObject json(String... values) {
        JSONObject obj = new JSONObject();
        try {
            for (int i = 0; i < values.length; i += 2) obj.put(values[i], values[i + 1]);
        } catch (JSONException e) {
            throw new IllegalStateException(e);
        }
        return obj;
    }

    private void bootstrap() {
        heading("Autenticando", "Validando sua sessão no servidor.");
        request("GET", "/api/v1/auth/me", null, false, account -> {
            meId = account.getString("id");
            myHandle = account.getString("handle");
            navigate(restoreRoute);
        });
    }

    private void server() {
        heading("Conectar ao servidor", "O app usa contas e dados reais da API. Nenhum servidor de demonstração é utilizado.");
        EditText url = input("https://api.seu-dominio.com", 255, false);
        url.setText(api.baseUrl());
        button("Salvar servidor", true, () -> {
            try {
                api.setBaseUrl(url.getText().toString());
                navigate("login");
            } catch (IllegalArgumentException e) {
                displayError(e.getMessage());
            }
        });
        note("Privacidade", "Use apenas seu servidor HTTPS confiável. Ao trocar de servidor, sua sessão é encerrada.");
    }

    private void login(boolean create) {
        heading(create ? "Criar conta" : "Entrar no Seven",
                "Autenticação real. Os dados serão armazenados na API configurada.");
        EditText email = input("E-mail", 254, false);
        EditText handle = null, name = null;
        if (create) {
            handle = input("Usuário: letras minúsculas, números, _", 24, false);
            name = input("Nome de exibição", 60, false);
        }
        EditText secret = input("Senha", 72, false);
        secret.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        EditText finalHandle = handle, finalName = name;
        button(create ? "Cadastrar" : "Entrar", true, () -> {
            JSONObject body = create ? json("email", email.getText().toString(),
                    "handle", finalHandle.getText().toString(),
                    "displayName", finalName.getText().toString(),
                    "password", secret.getText().toString())
                    : json("email", email.getText().toString(),
                    "password", secret.getText().toString());
            request("POST", create ? "/api/v1/auth/register" : "/api/v1/auth/login",
                    body, false, response -> {
                        String token = response.getString("accessToken");
                        api.signIn(token);
                        JSONObject user = response.getJSONObject("user");
                        meId = user.getString("id");
                        myHandle = user.getString("handle");
                        navigate("feed");
                    });
        });
        button(create ? "Já tenho uma conta" : "Criar conta", false,
                () -> navigate(create ? "login" : "register"));
        button("Configurar servidor", false, () -> navigate("server"));
    }

    private void feed(boolean saved) {
        heading(saved ? "Publicações salvas" : "Feed",
                saved ? "Itens salvos na sua conta." : "Publicações reais de usuários cadastrados.");
        button("Atualizar", false, () -> navigate(route));
        String endpoint = saved ? "/api/v1/posts/saved" : "/api/v1/posts";
        loadPosts(endpoint, null);
    }

    private void loadPosts(String endpoint, Long before) {
        String path = endpoint + "?limit=20" + (before == null ? "" : "&before=" + before);
        request("GET", path, null, before == null, response -> {
            // A new route already has a fresh page. Keep the feed header and refresh
            // action visible while rendering the first page of real server results.
            JSONArray posts = response.getJSONArray("data");
            if (posts.length() == 0 && before == null) {
                note("Ainda não há publicações", "O servidor não retornou itens para esta conta.");
            }
            for (int i = 0; i < posts.length(); i++) {
                renderPost(posts.getJSONObject(i));
            }
            if (!response.isNull("nextCursor")) {
                long next = response.getLong("nextCursor");
                button("Carregar mais", false, () -> loadPosts(endpoint, next));
            }
        });
    }

    private void renderPost(JSONObject post) throws JSONException {
        long id = post.getLong("id");
        String authorId = post.getString("authorId");
        String handle = post.getString("handle");
        LinearLayout card = UiKit.card(this);
        TextView author = UiKit.text(this,
                post.optString("displayName", handle) + "  @" + handle, 15, UiKit.PRIMARY, true);
        author.setOnClickListener(v -> {
            selectedHandle = handle;
            selectedId = authorId;
            navigate("user");
        });
        card.addView(author);
        UiKit.gap(card, this, 12);
        card.addView(UiKit.text(this, post.optString("body"), 16, UiKit.TEXT, false));
        UiKit.gap(card, this, 10);
        LinearLayout controls = UiKit.horizontal(this);
        small(controls, "Curtir/Descurtir", () ->
                request("GET", "/api/v1/posts/" + id + "/engagement", null, false,
                        status -> request(status.optBoolean("likedByMe") ? "DELETE" : "POST",
                                "/api/v1/posts/" + id + "/like", null, false,
                                result -> Toast.makeText(this,
                                        "Curtidas: " + result.optLong("likes"),
                                        Toast.LENGTH_SHORT).show())));
        small(controls, "Salvar/Remover", () ->
                request("GET", "/api/v1/posts/" + id + "/engagement", null, false,
                        status -> request(status.optBoolean("savedByMe") ? "DELETE" : "POST",
                                "/api/v1/posts/" + id + "/save", null, false,
                                result -> Toast.makeText(this,
                                        result.optBoolean("savedByMe") ? "Salvo" : "Removido dos salvos",
                                        Toast.LENGTH_SHORT).show())));
        small(controls, "Comentários", () -> {
            selectedPost = id;
            navigate("comments");
        });
        card.addView(controls);
        if (authorId.equals(meId)) {
            TextView edit = UiKit.text(this, "Editar publicação", 13, UiKit.PRIMARY, true);
            edit.setMinHeight(dp(46));
            edit.setOnClickListener(v -> {
                EditText caption = new EditText(this);
                caption.setText(post.optString("body"));
                caption.setTextColor(UiKit.TEXT);
                caption.setFilters(new InputFilter[]{new InputFilter.LengthFilter(2000)});
                new AlertDialog.Builder(this)
                        .setTitle("Editar publicação")
                        .setView(caption)
                        .setNegativeButton("Cancelar", null)
                        .setPositiveButton("Salvar", (dialog, which) ->
                                request("POST", "/api/v1/posts/" + id + "/edit",
                                        json("body", caption.getText().toString()), false,
                                        result -> navigate(route))).show();
            });
            card.addView(edit);
            TextView delete = UiKit.text(this, "Excluir", 13, UiKit.MUTED, true);
            delete.setPadding(0, dp(8), 0, 0);
            delete.setOnClickListener(v -> new AlertDialog.Builder(this)
                    .setTitle("Excluir publicação?")
                    .setMessage("Esta ação é permanente e será enviada ao servidor.")
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Excluir", (d, w) ->
                            request("DELETE", "/api/v1/posts/" + id, null, false,
                                    result -> navigate(route))).show());
            card.addView(delete);
        }
        UiKit.cardInto(page, card, this);
    }

    private void small(LinearLayout row, String label, Runnable click) {
        TextView text = UiKit.text(this, label, 12, UiKit.PRIMARY, true);
        text.setGravity(Gravity.CENTER);
        text.setMinHeight(dp(48));
        text.setOnClickListener(v -> click.run());
        row.addView(text, new LinearLayout.LayoutParams(0, dp(48), 1));
    }

    private void relations(boolean followers) {
        heading(followers ? "Seguidores" : "Seguindo",
                "Relações reais gravadas no servidor.");
        if (selectedId.isEmpty()) {
            note("Perfil necessário", "Abra um perfil para consultar a lista.");
            return;
        }
        request("GET", "/api/v1/users/" + SevenApiClient.segment(selectedId) +
                (followers ? "/followers" : "/following"), null, true, response -> {
            JSONArray people = response.getJSONArray("data");
            if (people.length() == 0) note("Nenhum perfil encontrado",
                    "Esta lista ainda não possui pessoas.");
            for (int i = 0; i < people.length(); i++) {
                JSONObject person = people.getJSONObject(i);
                String id = person.getString("id");
                String handle = person.getString("handle");
                button(person.optString("displayName") + "  @" + handle, false, () -> {
                    selectedId = id;
                    selectedHandle = handle;
                    navigate("user");
                });
            }
        });
    }

    private void blockedUsers() {
        heading("Bloqueios", "Sua lista privada de usuários bloqueados.");
        request("GET", "/api/v1/users/me/blocks", null, true, response -> {
            JSONArray people = response.getJSONArray("data");
            if (people.length() == 0) note("Sem bloqueios", "Você não bloqueou nenhuma pessoa.");
            for (int i = 0; i < people.length(); i++) {
                JSONObject person = people.getJSONObject(i);
                String id = person.getString("id");
                String handle = person.getString("handle");
                button("Desbloquear @" + handle, false, () -> {
                    request("DELETE", "/api/v1/users/" + SevenApiClient.segment(id) +
                            "/block", null, false, result -> navigate("blocks"));
                });
            }
        });
    }

    private void compose() {
        heading("Nova publicação", "Seu texto será enviado ao servidor; nada é inventado localmente.");
        EditText body = input("O que você gostaria de publicar?", 2000, true);
        body.setMinLines(5);
        body.setText(draftCaption);
        onInput(body, value -> draftCaption = value);
        button("Publicar", true, () -> {
            if (body.getText().toString().trim().isEmpty()) {
                displayError("Escreva uma publicação.");
                return;
            }
            request("POST", "/api/v1/posts",
                    json("clientMutationId", draftMutationId, "body", body.getText().toString()),
                    false, result -> {
                        draftCaption = "";
                        draftMutationId = UUID.randomUUID().toString();
                        navigate("feed");
                    });
        });
    }

    private void explore() {
        heading("Descobrir pessoas", "Resultados reais de contas presentes no servidor.");
        EditText input = input("Buscar @usuário", 24, false);
        input.setText(searchQuery);
        button("Pesquisar", true, () -> {
            searchQuery = input.getText().toString().trim();
            if (!searchQuery.matches("[a-z0-9_]{2,24}")) {
                displayError("Digite de 2 a 24 letras, números ou _.");
                return;
            }
            request("GET", "/api/v1/users?query=" + SevenApiClient.segment(searchQuery),
                    null, false, response -> {
                        page.removeAllViews();
                        heading("Resultados", "Contas encontradas para @" + searchQuery);
                        JSONArray data = response.getJSONArray("data");
                        if (data.length() == 0) note("Nenhum usuário encontrado",
                                "Não há contas correspondentes a esta pesquisa.");
                        for (int i = 0; i < data.length(); i++) {
                            JSONObject user = data.getJSONObject(i);
                            String handle = user.getString("handle");
                            String id = user.getString("id");
                            button(user.getString("displayName") + "  @" + handle,
                                    false, () -> {
                                        selectedId = id;
                                        selectedHandle = handle;
                                        navigate("user");
                                    });
                        }
                    });
        });
    }

    private void showUser() {
        heading("Perfil público", "Dados e relações carregados diretamente do banco.");
        request("GET", "/api/v1/users/" + SevenApiClient.segment(selectedHandle),
                null, true, profile -> {
                    page.removeAllViews();
                    heading(profile.getString("displayName"),
                            "@" + profile.getString("handle"));
                    note("Biografia", profile.optString("bio", ""));
                    note("Comunidade", profile.optLong("followers") + " seguidores · " +
                            profile.optLong("following") + " seguindo · " +
                            profile.optLong("posts") + " posts");
                    selectedId = profile.getString("id");
                    button("Ver seguidores", false, () -> navigate("followers"));
                    button("Ver seguindo", false, () -> navigate("following"));
                    if (!meId.equals(selectedId)) {
                        boolean following = profile.optBoolean("followedByMe");
                        button(following ? "Deixar de seguir" : "Seguir", true, () ->
                                request(following ? "DELETE" : "POST",
                                        "/api/v1/users/" + selectedId + "/follow",
                                        null, false, result -> navigate("user")));
                        button("Enviar mensagem", false, () -> navigate("thread"));
                        button("Bloquear usuário", false, () -> new AlertDialog.Builder(this)
                                .setTitle("Bloquear @" + selectedHandle + "?")
                                .setMessage("Essa pessoa deixará de aparecer no seu feed e não poderá conversar com você.")
                                .setNegativeButton("Cancelar", null)
                                .setPositiveButton("Bloquear", (d, w) ->
                                        request("POST", "/api/v1/users/" + selectedId + "/block",
                                                null, false, result -> navigate("explore"))).show());
                    }
                });
    }

    private void profile() {
        heading("Meu perfil", "Dados recuperados da sua conta no servidor.");
        request("GET", "/api/v1/auth/me", null, true, account -> {
            meId = account.getString("id");
            myHandle = account.getString("handle");
            request("GET", "/api/v1/users/" + SevenApiClient.segment(myHandle),
                    null, false, p -> {
                        page.removeAllViews();
                        heading(p.getString("displayName"), "@" + myHandle);
                        note("Meu perfil", p.optString("bio", ""));
                        note("Estatísticas", p.optLong("followers") + " seguidores · " +
                                p.optLong("following") + " seguindo · " +
                                p.optLong("posts") + " posts");
                        selectedId = meId;
                        selectedHandle = myHandle;
                        button("Seguidores", false, () -> navigate("followers"));
                        button("Seguindo", false, () -> navigate("following"));
                        EditText name = input("Nome", 60, false);
                        name.setText(p.getString("displayName"));
                        EditText bio = input("Biografia", 160, true);
                        bio.setText(p.optString("bio"));
                        button("Salvar alterações", true, () ->
                                request("POST", "/api/v1/users/me",
                                        json("displayName", name.getText().toString(),
                                                "bio", bio.getText().toString()),
                                        false, updated -> navigate("profile")));
                        button("Publicações salvas", false, () -> navigate("saved"));
                        button("Configurações", false, () -> navigate("settings"));
                    });
        });
    }

    private void chats() {
        heading("Conversas", "Somente conversas reais da sua conta, armazenadas no banco.");
        button("Nova conversa", true, () -> navigate("explore"));
        request("GET", "/api/v1/conversations", null, true, response -> {
            JSONArray data = response.getJSONArray("data");
            if (data.length() == 0) {
                note("Sem conversas", "Procure uma pessoa e envie uma mensagem para começar.");
            }
            for (int i = 0; i < data.length(); i++) {
                JSONObject item = data.getJSONObject(i);
                String other = item.getString("peerId");
                String handle = item.getString("handle");
                button(item.optString("displayName", handle) + "  ·  " +
                        item.optString("lastMessage"), false, () -> {
                            selectedId = other;
                            selectedHandle = handle;
                            navigate("thread");
                        });
            }
        });
    }

    private void thread() {
        heading("Conversa com @" + selectedHandle, "Mensagens armazenadas no servidor. Atualize para buscar novas mensagens.");
        button("Atualizar conversa", false, () -> navigate("thread"));
        if (!selectedId.equals(messageDraftPeerId)) {
            messageDraft = "";
            messageDraftPeerId = selectedId;
            messageMutationId = UUID.randomUUID().toString();
        }
        EditText message = input("Escreva sua mensagem", 4000, true);
        message.setText(messageDraft);
        onInput(message, value -> messageDraft = value);
        button("Enviar", true, () -> request("POST", "/api/v1/conversations/" +
                SevenApiClient.segment(selectedId) + "/messages",
                json("clientMutationId", messageMutationId, "body", message.getText().toString()),
                false, result -> {
                    messageDraft = "";
                    messageMutationId = UUID.randomUUID().toString();
                    navigate("thread");
                }));
        request("GET", "/api/v1/conversations/" + SevenApiClient.segment(selectedId) +
                "/messages?limit=30", null, true, response -> {
            JSONArray messages = response.getJSONArray("data");
            if (messages.length() == 0) note("Conversa vazia", "Envie a primeira mensagem.");
            for (int i = messages.length() - 1; i >= 0; i--) {
                JSONObject item = messages.getJSONObject(i);
                note(item.getString("senderId").equals(meId) ? "Você" : selectedHandle,
                        item.getString("body"));
            }
            if (!response.isNull("nextCursor")) {
                note("Histórico", "Há mensagens anteriores. A paginação do histórico está disponível na API.");
            }
        });
    }

    private void groups() {
        heading("Grupos", "Converse apenas com pessoas que aceitaram participar.");
        button("Meus convites", false, () -> navigate("group-invites"));
        EditText name = input("Nome do novo grupo", 80, false);
        EditText description = input("Descrição do grupo", 240, true);
        button("Criar grupo", true, () ->
                request("POST", "/api/v1/groups",
                        json("name", name.getText().toString(),
                                "description", description.getText().toString()),
                        false, created -> {
                            selectedGroupId = created.getString("id");
                            navigate("group-thread");
                        }));
        request("GET", "/api/v1/groups", null, true, response -> {
            JSONArray data = response.getJSONArray("data");
            if (data.length() == 0) note("Nenhum grupo", "Crie um grupo ou aceite um convite.");
            for (int i = 0; i < data.length(); i++) {
                JSONObject item = data.getJSONObject(i);
                String group = item.getString("id");
                button(item.getString("name") + " · " + item.getLong("memberCount") +
                        " participantes", false, () -> {
                            selectedGroupId = group;
                            navigate("group-thread");
                        });
            }
        });
    }

    private void groupInvitations() {
        heading("Convites para grupos", "Você escolhe se deseja entrar.");
        button("Voltar aos grupos", false, () -> navigate("groups"));
        request("GET", "/api/v1/groups/invitations", null, true, response -> {
            JSONArray data = response.getJSONArray("data");
            if (data.length() == 0) note("Sem convites", "Novos convites aparecerão aqui.");
            for (int i = 0; i < data.length(); i++) {
                JSONObject item = data.getJSONObject(i);
                String invitation = item.getString("id");
                note(item.getString("groupName"),
                        "Convite de @" + item.getString("inviterHandle"));
                button("Aceitar convite para " + item.getString("groupName"), true, () ->
                        request("POST", "/api/v1/groups/invitations/" + invitation +
                                "/accept", null, false, result -> {
                                    selectedGroupId = result.getString("id");
                                    navigate("group-thread");
                                }));
                button("Recusar convite", false, () ->
                        request("POST", "/api/v1/groups/invitations/" + invitation +
                                "/decline", null, false, result -> navigate("group-invites")));
            }
        });
    }

    private void groupThread() {
        if (selectedGroupId.isEmpty()) {
            navigate("groups");
            return;
        }
        final String groupId = SevenApiClient.segment(selectedGroupId);
        heading("Conversa do grupo", "Mensagens reais, acessíveis somente aos participantes.");
        button("Voltar aos grupos", false, () -> navigate("groups"));
        button("Atualizar mensagens", false, () -> navigate("group-thread"));
        request("GET", "/api/v1/groups/" + groupId, null, true, group -> {
            note(group.getString("name"), group.optString("description") + " · " +
                    group.getLong("memberCount") + " participantes");
            if (meId.equals(group.getString("ownerId"))) {
                EditText invitee = input("Convidar @usuário", 24, false);
                button("Enviar convite", false, () ->
                        request("POST", "/api/v1/groups/" + groupId + "/invitations",
                                json("handle", invitee.getText().toString().trim()),
                                false, invitation -> {
                                    Toast.makeText(this, "Convite enviado", Toast.LENGTH_SHORT).show();
                                    navigate("group-thread");
                                }));
                button("Excluir grupo", false, () -> new AlertDialog.Builder(this)
                        .setTitle("Excluir o grupo definitivamente?")
                        .setMessage("Todas as mensagens e convites desse grupo serão removidos.")
                        .setNegativeButton("Cancelar", null)
                        .setPositiveButton("Excluir", (d, w) ->
                                request("DELETE", "/api/v1/groups/" + groupId, null,
                                        false, result -> {
                                            selectedGroupId = "";
                                            navigate("groups");
                                        })).show());
            } else {
                button("Sair do grupo", false, () -> new AlertDialog.Builder(this)
                        .setTitle("Sair do grupo?")
                        .setNegativeButton("Cancelar", null)
                        .setPositiveButton("Sair", (d, w) ->
                                request("DELETE", "/api/v1/groups/" + groupId +
                                        "/membership", null, false, result -> {
                                            selectedGroupId = "";
                                            navigate("groups");
                                        })).show());
            }
        });
        EditText message = input("Mensagem para o grupo", 4000, true);
        message.setText(groupDraft);
        onInput(message, value -> groupDraft = value);
        button("Enviar ao grupo", true, () ->
                request("POST", "/api/v1/groups/" + groupId + "/messages",
                        json("clientMutationId", groupMutationId,
                                "body", message.getText().toString()),
                        false, result -> {
                            groupDraft = "";
                            groupMutationId = UUID.randomUUID().toString();
                            navigate("group-thread");
                        }));
        request("GET", "/api/v1/groups/" + groupId + "/messages?limit=30",
                null, true, response -> {
                    JSONArray messages = response.getJSONArray("data");
                    if (messages.length() == 0) note("Conversa vazia", "Envie uma mensagem.");
                    for (int i = messages.length() - 1; i >= 0; i--) {
                        JSONObject item = messages.getJSONObject(i);
                        note("@" + item.getString("handle"), item.getString("body"));
                    }
                    if (!response.isNull("nextCursor")) {
                        note("Mensagens anteriores", "Histórico disponível com paginação na API.");
                    }
                });
    }

    private void comments() {
        heading("Comentários", "Comentários reais vinculados à publicação #" + selectedPost);
        EditText text = input("Comente", 500, true);
        button("Publicar comentário", true, () ->
                request("POST", "/api/v1/posts/" + selectedPost + "/comments",
                        json("body", text.getText().toString()), false,
                        result -> navigate("comments")));
        request("GET", "/api/v1/posts/" + selectedPost + "/comments",
                null, true, response -> {
                    JSONArray data = response.getJSONArray("data");
                    if (data.length() == 0) note("Sem comentários", "Seja o primeiro a comentar.");
                    for (int i = 0; i < data.length(); i++) {
                        JSONObject comment = data.getJSONObject(i);
                        note("@" + comment.getString("handle"), comment.getString("body"));
                    }
                });
    }

    private void notifications() {
        heading("Notificações", "Eventos persistidos da sua conta.");
        button("Atualizar", false, () -> navigate("notifications"));
        request("GET", "/api/v1/notifications", null, true, response -> {
            JSONArray data = response.getJSONArray("data");
            if (data.length() == 0) note("Sem notificações", "Novos eventos aparecerão aqui.");
            for (int i = 0; i < data.length(); i++) {
                JSONObject item = data.getJSONObject(i);
                String event = item.optString("eventType");
                long id = item.getLong("id");
                note("@" + item.optString("actorHandle"), eventLabel(event));
                if (!item.optBoolean("seen")) button("Marcar como lida", false, () ->
                        request("POST", "/api/v1/notifications/" + id + "/read",
                                null, false, result -> navigate("notifications")));
            }
        });
    }

    private String eventLabel(String event) {
        switch (event) {
            case "follow": return "Começou a seguir você.";
            case "like": return "Curtiu sua publicação.";
            case "comment": return "Comentou sua publicação.";
            case "message": return "Enviou uma mensagem.";
            default: return "Nova atividade.";
        }
    }

    private void capabilityScreen(String pageName) {
        heading(pageTitle(pageName), "Disponibilidade verificada no servidor, sem demonstrações.");
        request("GET", "/api/v1/features", null, true, capabilities -> {
            String flag;
            switch (pageName) {
                case "vip": flag = "vip"; break;
                case "rooms": flag = "voiceRooms"; break;
                case "live": flag = "livestreams"; break;
                case "wallet": flag = "payments"; break;
                default: flag = pageName;
            }
            // A missing capability is always treated as unavailable.
            if (!capabilities.optBoolean(flag, false)) {
                note("Recurso indisponível", "O servidor ainda não homologou este recurso. " +
                        "Nenhuma sala, chamada, saldo, live ou benefício VIP será inventado.");
            } else {
                note("Verificação necessária", "O servidor sinalizou suporte, " +
                        "mas esta interface ainda precisa de implementação e testes completos.");
            }
        });
    }

    private String pageTitle(String route) {
        switch (route) {
            case "vip": return "Seven VIP";
            case "rooms": return "Salas de voz";
            case "live": return "Lives";
            case "stories": return "Stories";
            case "reels": return "Reels";
            case "groups": return "Grupos";
            case "calls": return "Chamadas";
            case "gifts": return "Presentes";
            case "wallet": return "Carteira";
            default: return "Seven Chat";
        }
    }

    private void settings() {
        heading("Configurações", "Segurança, servidor e sessão.");
        note("Servidor atual", api.baseUrl());
        button("Trocar servidor", false, () -> navigate("server"));
        button("Usuários bloqueados", false, () -> navigate("blocks"));
        button("Minhas publicações locais anteriores", false,
                () -> startActivity(new Intent(this, MainActivity.class)));
        note("Dados antigos", "Publicações e fotos do banco local foram preservadas. " +
                "O envio delas ao servidor dependerá de uma importação com sua confirmação.");
        button("Sair da conta", true, () -> request("POST", "/api/v1/auth/logout",
                null, false, result -> {
                    api.signOut();
                    navigate("login");
                }));
        button("Voltar ao feed", false, () -> navigate("feed"));
    }
}
