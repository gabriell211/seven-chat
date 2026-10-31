package com.seven.chat.ui;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class UiKit {
    public static final int BACKGROUND = Color.rgb(12, 10, 23);
    public static final int SURFACE = Color.rgb(27, 22, 44);
    public static final int SURFACE_ALT = Color.rgb(38, 30, 59);
    public static final int PRIMARY = Color.rgb(181, 106, 255);
    public static final int PRIMARY_DARK = Color.rgb(120, 50, 199);
    public static final int TEXT = Color.rgb(250, 248, 255);
    public static final int MUTED = Color.rgb(183, 176, 203);
    public static final int BORDER = Color.rgb(60, 49, 79);

    private UiKit() { }

    public static int dp(Context context, int value) {
        return (int) (value * context.getResources().getDisplayMetrics().density + 0.5f);
    }

    public static LinearLayout vertical(Context c) {
        LinearLayout view = new LinearLayout(c);
        view.setOrientation(LinearLayout.VERTICAL);
        return view;
    }

    public static LinearLayout horizontal(Context c) {
        LinearLayout view = new LinearLayout(c);
        view.setGravity(Gravity.CENTER_VERTICAL);
        view.setOrientation(LinearLayout.HORIZONTAL);
        return view;
    }

    public static GradientDrawable background(Context c, int color, int radius, int border) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(c, radius));
        if (border != Color.TRANSPARENT) d.setStroke(dp(c, 1), border);
        return d;
    }

    public static TextView text(Context c, String value, int size, int color, boolean bold) {
        TextView view = new TextView(c);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        view.setGravity(Gravity.CENTER_VERTICAL);
        return view;
    }

    public static TextView button(Context c, String label, boolean primary) {
        TextView view = text(c, label, 14, TEXT, true);
        view.setGravity(Gravity.CENTER);
        view.setBackground(background(c, primary ? PRIMARY_DARK : SURFACE_ALT, 14,
                primary ? PRIMARY : BORDER));
        view.setPadding(dp(c, 12), dp(c, 10), dp(c, 12), dp(c, 10));
        view.setMinHeight(dp(c, 48));
        view.setContentDescription(label);
        view.setClickable(true);
        view.setFocusable(true);
        return view;
    }

    public static LinearLayout card(Context c) {
        LinearLayout view = vertical(c);
        view.setBackground(background(c, SURFACE, 18, BORDER));
        view.setPadding(dp(c, 16), dp(c, 16), dp(c, 16), dp(c, 16));
        return view;
    }

    public static void gap(LinearLayout view, Context c, int height) {
        View space = new View(c);
        view.addView(space, new LinearLayout.LayoutParams(1, dp(c, height)));
    }

    public static void cardInto(LinearLayout parent, LinearLayout card, Context c) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.bottomMargin = dp(c, 14);
        parent.addView(card, params);
    }
}
