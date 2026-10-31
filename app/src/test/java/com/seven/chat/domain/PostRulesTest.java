package com.seven.chat.domain;

import org.junit.Test;
import static org.junit.Assert.*;

public class PostRulesTest {
    @Test public void acceptsCaption() {
        assertEquals("Olá Seven", PostRules.caption("  Olá Seven  ", false));
    }

    @Test(expected = IllegalArgumentException.class)
    public void rejectsBlankPost() {
        PostRules.caption("  ", false);
    }

    @Test public void acceptsImageWithoutCaption() {
        assertEquals("", PostRules.caption("", true));
    }

    @Test(expected = IllegalArgumentException.class)
    public void rejectsEmptyComment() {
        PostRules.comment(null);
    }

    @Test(expected = IllegalArgumentException.class)
    public void rejectsOverlongCaption() {
        PostRules.caption("a".repeat(2001), false);
    }

    @Test public void normalizesNull() {
        assertEquals("", PostRules.normalize(null));
    }
}
