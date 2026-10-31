package com.seven.chat.net;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** The server token is encrypted using Android Keystore and is never logged. */
public final class SecureSessionStore {
    private static final String ALIAS = "seven_chat_api_token_v1";
    private final SharedPreferences pref;

    public SecureSessionStore(Context context) {
        pref = context.getApplicationContext()
                .getSharedPreferences("seven_encrypted_session", Context.MODE_PRIVATE);
    }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());
        return generator.generateKey();
    }

    public void setToken(String token) {
        if (token == null || token.length() < 30 || token.length() > 256) {
            throw new IllegalArgumentException("Token de sessão inválido.");
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key());
            byte[] sealed = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
            pref.edit()
                .putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                .putString("value", Base64.encodeToString(sealed, Base64.NO_WRAP))
                .apply();
        } catch (Exception ex) {
            throw new IllegalStateException("Não foi possível proteger a sessão.", ex);
        }
    }

    public String token() {
        String iv = pref.getString("iv", null), sealed = pref.getString("value", null);
        if (iv == null || sealed == null) return null;
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(),
                    new GCMParameterSpec(128, Base64.decode(iv, Base64.DEFAULT)));
            return new String(cipher.doFinal(Base64.decode(sealed, Base64.DEFAULT)),
                    StandardCharsets.UTF_8);
        } catch (Exception ex) {
            // Invalidated Keystore keys must never resurrect an old credential.
            clear();
            return null;
        }
    }

    public void clear() {
        pref.edit().clear().apply();
    }
}
