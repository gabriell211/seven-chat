package com.seven.chat.net;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import com.seven.chat.BuildConfig;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;

import org.json.JSONException;
import org.json.JSONObject;

public final class SevenApiClient {
    private static final int LIMIT_BYTES = 1024 * 1024;
    private final SharedPreferences settings;
    private final SecureSessionStore sessions;

    public static final class ApiError extends Exception {
        public final int status;
        public ApiError(int status, String message) {
            super(message);
            this.status = status;
        }
    }

    public SevenApiClient(Context context) {
        settings = context.getApplicationContext()
                .getSharedPreferences("seven_api_settings", Context.MODE_PRIVATE);
        sessions = new SecureSessionStore(context);
    }

    public static String validateBaseUrl(String value) {
        try {
            URI url = URI.create(value.trim());
            boolean secure = "https".equalsIgnoreCase(url.getScheme());
            boolean localDebug = BuildConfig.DEBUG &&
                    "http".equalsIgnoreCase(url.getScheme()) &&
                    ("10.0.2.2".equalsIgnoreCase(url.getHost()) ||
                     "localhost".equalsIgnoreCase(url.getHost()) ||
                     "127.0.0.1".equalsIgnoreCase(url.getHost()));
            if ((!secure && !localDebug) ||
                    url.getHost() == null || url.getHost().trim().isEmpty() ||
                    url.getRawUserInfo() != null || url.getRawQuery() != null ||
                    url.getRawFragment() != null ||
                    url.getPath() != null && !url.getPath().isEmpty() &&
                            !url.getPath().equals("/")) {
                throw new IllegalArgumentException("Informe a URL HTTPS do servidor, sem caminho ou usuário.");
            }
            int port = url.getPort();
            if (port > 65535 || port == 0 || port < -1) {
                throw new IllegalArgumentException("Porta do servidor inválida.");
            }
            return url.toString().replaceAll("/+$", "");
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Informe uma URL HTTPS válida.", ex);
        }
    }

    public String baseUrl() {
        return settings.getString("base_url", "");
    }

    public void setBaseUrl(String value) {
        String normalized = validateBaseUrl(value);
        if (!normalized.equals(baseUrl())) {
            sessions.clear();
            settings.edit().putString("base_url", normalized).apply();
        }
    }

    public boolean isSignedIn() {
        return sessions.token() != null;
    }

    public void signIn(String token) {
        sessions.setToken(token);
    }

    public void signOut() {
        sessions.clear();
    }

    public JSONObject call(String method, String path, JSONObject payload)
            throws IOException, JSONException, ApiError {
        String base = baseUrl();
        if (base.isEmpty()) throw new ApiError(0, "Configure a URL do seu servidor.");
        if (!path.startsWith("/api/v1/") || path.startsWith("//") ||
                path.contains("..") || path.contains("#") || path.contains("\r") ||
                path.contains("\n")) {
            throw new ApiError(0, "Caminho de API inválido.");
        }
        URL target = new URL(base + path);
        HttpURLConnection connection = (HttpURLConnection) target.openConnection();
        // Manual redirects avoid forwarding Bearer tokens to another host.
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(12000);
        connection.setRequestMethod(method);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Cache-Control", "no-store");
        String token = sessions.token();
        if (token != null && !token.isEmpty()) {
            connection.setRequestProperty("Authorization", "Bearer " + token);
        }
        try {
            if (payload != null) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                try (OutputStream out = connection.getOutputStream()) {
                    out.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }
            }
            int status = connection.getResponseCode();
            String text;
            try (InputStream stream = status < 400 ? connection.getInputStream()
                    : connection.getErrorStream()) {
                text = stream == null ? "" : readBounded(stream);
            }
            if (status >= 300) {
                String message = "Servidor retornou HTTP " + status;
                if (!text.isEmpty()) {
                    try { message = new JSONObject(text).optString("message", message); }
                    catch (JSONException ignored) { }
                }
                throw new ApiError(status, message);
            }
            return text.trim().isEmpty() ? new JSONObject() : new JSONObject(text);
        } finally {
            connection.disconnect();
        }
    }

    private static String readBounded(InputStream input) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int read;
        while ((read = input.read(chunk)) != -1) {
            if (bytes.size() + read > LIMIT_BYTES) {
                throw new IOException("Resposta do servidor excedeu o limite seguro.");
            }
            bytes.write(chunk, 0, read);
        }
        return bytes.toString(StandardCharsets.UTF_8.name());
    }

    public static String segment(String raw) {
        try {
            return java.net.URLEncoder.encode(raw, "UTF-8").replace("+", "%20");
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
