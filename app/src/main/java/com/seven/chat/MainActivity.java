package com.seven.chat;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputFilter;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.seven.chat.data.LocalComment;
import com.seven.chat.data.LocalPost;
import com.seven.chat.data.LocalPostStore;
import com.seven.chat.domain.PostRules;
import com.seven.chat.ui.UiKit;

import java.text.DateFormat;
import java.util.Date;
import java.util.List;

public final class MainActivity extends Activity {
    private static final int PICK_PHOTO = 48;
    private static final String PREFS = "seven_profile";
    private LocalPostStore posts;
    private SharedPreferences profile;
    private LinearLayout root;
    private LinearLayout page;
    private String current = "feed";
    private String search = "";
    private boolean savedOnly = false;
    private String selectedPhotoUri;
    private EditText draftCaption;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(UiKit.BACKGROUND);
        getWindow().setNavigationBarColor(UiKit.BACKGROUND);
        posts = new LocalPostStore(this);
        profile = getSharedPreferences(PREFS, MODE_PRIVATE);
        root = UiKit.vertical(this);
        root.setBackgroundColor(UiKit.BACKGROUND);
        setContentView(root);
        show("feed");
    }

    @Override
    protected void onDestroy() {
        posts.close();
        super.onDestroy();
    }

    private void show(String route) {
        current = route;
        root.removeAllViews();

        LinearLayout heading = UiKit.horizontal(this);
        heading.setPadding(dp(18), dp(12), dp(18), dp(12));
        TextView logo = UiKit.text(this, "SEVEN  CHAT", 21, UiKit.TEXT, true);
        heading.addView(logo, new LinearLayout.LayoutParams(0, -2, 1));
        TextView vip = UiKit.button(this, "✦ VIP", false);
        vip.setOnClickListener(v -> show("vip"));
        heading.addView(vip);
        root.addView(heading);
        line(root);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        page = UiKit.vertical(this);
        page.setPadding(dp(16), dp(16), dp(16), dp(18));
        scroll.addView(page);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        switch (route) {
            case "feed": feed(); break;
            case "explore": explore(); break;
            case "create": create(); break;
            case "messages": messages(); break;
            case "profile": profile(); break;
            case "vip": vip(); break;
            default: feed();
        }

        line(root);
        LinearLayout nav = UiKit.horizontal(this);
        nav.setPadding(dp(4), dp(6), dp(4), dp(8));
        nav(nav, "Início", "feed");
        nav(nav, "Buscar", "explore");
        nav(nav, "+", "create");
        nav(nav, "Chat", "messages");
        nav(nav, "Perfil", "profile");
        root.addView(nav);
    }

    private void nav(LinearLayout parent, String label, String route) {
        TextView item = UiKit.text(this, label, 13,
                current.equals(route) ? UiKit.PRIMARY : UiKit.MUTED, true);
        item.setGravity(Gravity.CENTER);
        item.setMinHeight(dp(48));
        item.setContentDescription(label);
        item.setClickable(true);
        item.setFocusable(true);
        item.setOnClickListener(v -> show(route));
        parent.addView(item, new LinearLayout.LayoutParams(0, dp(50), 1));
    }

    private void feed() {
        title("Seu espaço", "Publicações salvas só neste aparelho.");
        TextView publish = action("Criar publicação", true, () -> show("create"));
        page.addView(publish);
        gap(page, 18);
        renderPosts("", false);
    }

    private void explore() {
        title("Explorar", "Busque suas publicações locais; a descoberta de pessoas virá com o servidor.");
        EditText field = input("Buscar na legenda", search, 1, false);
        page.addView(field);
        gap(page, 8);
        page.addView(action("Buscar", true, () -> {
            search = field.getText().toString();
            savedOnly = false;
            show("explore");
        }));
        gap(page, 8);
        page.addView(action(savedOnly ? "Mostrar todas" : "Mostrar salvas", false, () -> {
            search = "";
            savedOnly = !savedOnly;
            show("explore");
        }));
        gap(page, 20);
        renderPosts(search, savedOnly);
    }

    private void renderPosts(String term, boolean onlySaved) {
        List<LocalPost> list = posts.listPosts(term, onlySaved);
        if (list.isEmpty()) {
            note("Nenhuma publicação encontrada", "Crie seu primeiro post ou altere os filtros de busca.");
            return;
        }
        for (LocalPost post : list) {
            LinearLayout card = UiKit.card(this);
            String name = profile.getString("name", "Meu perfil");
            addText(card, name + "  ·  " + DateFormat.getDateInstance().format(new Date(post.createdAt)),
                    14, UiKit.PRIMARY, true);
            gap(card, 10);
            if (!post.caption.isEmpty()) addText(card, post.caption, 16, UiKit.TEXT, false);
            if (post.imageUri != null && !post.imageUri.isEmpty()) {
                try {
                    ImageView photo = new ImageView(this);
                    photo.setImageURI(Uri.parse(post.imageUri));
                    photo.setScaleType(ImageView.ScaleType.CENTER_CROP);
                    photo.setContentDescription("Foto da publicação");
                    LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(220));
                    params.topMargin = dp(10);
                    card.addView(photo, params);
                } catch (RuntimeException ignored) {
                    addText(card, "A foto não está disponível neste aparelho.", 13, UiKit.MUTED, false);
                }
            }
            gap(card, 12);
            LinearLayout actions = UiKit.horizontal(this);
            smallAction(actions, post.liked ? "♥ Curtido" : "♡ Curtir", () -> {
                posts.setLiked(post.id, !post.liked);
                show(current);
            });
            smallAction(actions, post.bookmarked ? "★ Salvo" : "☆ Salvar", () -> {
                posts.setBookmarked(post.id, !post.bookmarked);
                show(current);
            });
            smallAction(actions, "Comentar", () -> commentDialog(post.id));
            card.addView(actions);
            List<LocalComment> comments = posts.comments(post.id);
            if (!comments.isEmpty()) {
                gap(card, 8);
                for (LocalComment comment : comments) {
                    addText(card, "↳ " + comment.body, 13, UiKit.MUTED, false);
                    gap(card, 3);
                }
            }
            gap(card, 8);
            TextView delete = UiKit.text(this, "Excluir publicação", 12, UiKit.MUTED, false);
            delete.setContentDescription("Excluir publicação");
            delete.setClickable(true);
            delete.setOnClickListener(v -> new AlertDialog.Builder(this)
                    .setTitle("Excluir publicação?")
                    .setMessage("Esta ação removerá o post e os comentários do aparelho.")
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Excluir", (dialog, which) -> {
                        posts.deletePost(post.id);
                        show(current);
                    }).show());
            card.addView(delete);
            UiKit.cardInto(page, card, this);
        }
    }

    private void commentDialog(long postId) {
        EditText field = input("Escreva seu comentário", "", 500, true);
        new AlertDialog.Builder(this)
                .setTitle("Novo comentário")
                .setView(field)
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Publicar", (d, w) -> {
                    try {
                        posts.createComment(postId, field.getText().toString());
                        show(current);
                    } catch (IllegalArgumentException e) {
                        toast(e.getMessage());
                    }
                }).show();
    }

    private void create() {
        title("Nova publicação", "Publique textos e fotos localmente.");
        draftCaption = input("O que você quer compartilhar?", "", PostRules.MAX_CAPTION, true);
        draftCaption.setMinLines(5);
        page.addView(draftCaption);
        gap(page, 14);
        page.addView(action(selectedPhotoUri == null ? "Escolher foto" : "✓ Foto selecionada",
                false, this::selectPhoto));
        gap(page, 14);
        page.addView(action("Publicar", true, () -> {
            try {
                posts.createPost(draftCaption.getText().toString(), selectedPhotoUri);
                selectedPhotoUri = null;
                toast("Publicação salva neste aparelho");
                show("feed");
            } catch (IllegalArgumentException e) {
                toast(e.getMessage());
            } catch (RuntimeException e) {
                toast("Não foi possível salvar a publicação");
            }
        }));
        gap(page, 20);
        note("Visibilidade", "Nesta versão os posts não são enviados à internet.");
    }

    private void selectPhoto() {
        Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.setType("image/*");
        picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            startActivityForResult(picker, PICK_PHOTO);
        } catch (RuntimeException e) {
            toast("Nenhum seletor de imagens disponível");
        }
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_PHOTO && result == RESULT_OK && data != null
                && data.getData() != null) {
            Uri uri = data.getData();
            try {
                int grant = data.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION;
                getContentResolver().takePersistableUriPermission(uri, grant);
                selectedPhotoUri = uri.toString();
                if (draftCaption != null) {
                    String caption = draftCaption.getText().toString();
                    show("create");
                    draftCaption.setText(caption);
                }
            } catch (SecurityException e) {
                toast("Não foi possível manter o acesso à imagem");
            }
        }
    }

    private void profile() {
        title("Meu perfil", "Configure sua identidade local.");
        addText(page, "Publicações neste aparelho: " + posts.countPosts(), 14, UiKit.PRIMARY, true);
        gap(page, 18);
        addText(page, "Nome público", 14, UiKit.TEXT, true);
        EditText name = input("Seu nome", profile.getString("name", ""), PostRules.MAX_NAME, false);
        page.addView(name);
        gap(page, 14);
        addText(page, "Biografia", 14, UiKit.TEXT, true);
        EditText bio = input("Fale sobre você", profile.getString("bio", ""), PostRules.MAX_BIO, true);
        page.addView(bio);
        gap(page, 18);
        page.addView(action("Salvar perfil", true, () -> {
            try {
                profile.edit().putString("name", PostRules.name(name.getText().toString()))
                        .putString("bio", PostRules.bio(bio.getText().toString())).apply();
                toast("Perfil salvo no aparelho");
                show("profile");
            } catch (IllegalArgumentException e) {
                toast(e.getMessage());
            }
        }));
        gap(page, 20);
        note("Contas e seguidores", "Cadastro, login e seguidores precisam de uma API segura.");
    }

    private void messages() {
        title("Conversas", "A comunicação com outras pessoas ainda depende de infraestrutura online.");
        note("Mensagens e grupos", "Planejado: mensagens em tempo real, mídia, grupos e privacidade.");
        note("Salas de voz", "Planejado: salas com participantes e moderação.");
        note("Lives", "Planejado: transmissão ao vivo, convidados e presentes.");
        note("Chamadas de voz e vídeo", "Planejado: comunicação WebRTC com autenticação.");
    }

    private void vip() {
        title("Seven VIP", "Recursos exclusivos do Seven Chat");
        note("Personalização premium", "Molduras animadas, avatar GIF, selo VIP e cores exclusivas.");
        note("Comunidades VIP", "Grupos privados, benefícios em salas e recursos de chat.");
        note("Assinatura segura", "Os planos e os benefícios serão liberados após validação de compra pelo servidor.");
        addText(page, "VIP ainda indisponível nesta versão. Nenhuma compra ou ativação é simulada.",
                14, UiKit.MUTED, false);
    }

    private void note(String headline, String detail) {
        LinearLayout card = UiKit.card(this);
        addText(card, headline, 16, UiKit.TEXT, true);
        gap(card, 7);
        addText(card, detail, 14, UiKit.MUTED, false);
        UiKit.cardInto(page, card, this);
    }

    private void title(String heading, String subtitle) {
        addText(page, heading, 24, UiKit.TEXT, true);
        gap(page, 6);
        addText(page, subtitle, 14, UiKit.MUTED, false);
        gap(page, 22);
    }

    private void smallAction(LinearLayout parent, String label, Runnable action) {
        TextView view = UiKit.text(this, label, 12, UiKit.PRIMARY, true);
        view.setGravity(Gravity.CENTER);
        view.setMinHeight(dp(45));
        view.setContentDescription(label);
        view.setClickable(true);
        view.setFocusable(true);
        view.setOnClickListener(v -> action.run());
        parent.addView(view, new LinearLayout.LayoutParams(0, dp(45), 1));
    }

    private TextView action(String caption, boolean primary, Runnable onClick) {
        TextView view = UiKit.button(this, caption, primary);
        view.setOnClickListener(v -> onClick.run());
        return view;
    }

    private EditText input(String hint, String value, int limit, boolean multiline) {
        EditText edit = new EditText(this);
        edit.setText(value);
        edit.setHint(hint);
        edit.setHintTextColor(UiKit.MUTED);
        edit.setTextColor(UiKit.TEXT);
        edit.setTextSize(15);
        edit.setBackground(UiKit.background(this, UiKit.SURFACE, 12, UiKit.BORDER));
        edit.setPadding(dp(14), dp(10), dp(14), dp(10));
        edit.setFilters(new InputFilter[]{new InputFilter.LengthFilter(limit)});
        edit.setInputType(multiline ? InputType.TYPE_CLASS_TEXT
                | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
                : InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        return edit;
    }

    private void addText(LinearLayout parent, String content, int size, int color, boolean bold) {
        parent.addView(UiKit.text(this, content, size, color, bold));
    }

    private void line(LinearLayout parent) {
        View divider = new View(this);
        divider.setBackgroundColor(UiKit.BORDER);
        parent.addView(divider, new LinearLayout.LayoutParams(-1, dp(1)));
    }

    private void gap(LinearLayout parent, int value) {
        UiKit.gap(parent, this, value);
    }

    private int dp(int value) {
        return UiKit.dp(this, value);
    }

    private void toast(String value) {
        Toast.makeText(this, value, Toast.LENGTH_SHORT).show();
    }
}
