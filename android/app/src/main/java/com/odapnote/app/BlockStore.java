package com.odapnote.app;

import android.content.Context;
import android.content.SharedPreferences;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/** 차단 상태(켜짐 여부, 막을 앱 목록, 오늘 막은 횟수)를 기기에 저장한다. */
final class BlockStore {
    private static final String PREFS = "odap_blocker";

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isActive(Context c) { return prefs(c).getBoolean("active", false); }

    static Set<String> blocked(Context c) {
        return new HashSet<>(prefs(c).getStringSet("packages", new HashSet<>()));
    }

    /** "all": 오답 노트·전화 말고 전부 막기, "list": 고른 앱만 막기 */
    static String mode(Context c) { return prefs(c).getString("mode", "all"); }

    static void set(Context c, boolean active, Set<String> packages, String mode) {
        prefs(c).edit().putBoolean("active", active).putStringSet("packages", packages).putString("mode", mode).apply();
    }

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.KOREA).format(new Date());
    }

    static void countBlock(Context c) {
        SharedPreferences p = prefs(c);
        String d = today();
        int n = d.equals(p.getString("day", "")) ? p.getInt("count", 0) : 0;
        p.edit().putString("day", d).putInt("count", n + 1).apply();
    }

    static int todayCount(Context c) {
        SharedPreferences p = prefs(c);
        return today().equals(p.getString("day", "")) ? p.getInt("count", 0) : 0;
    }

    private BlockStore() {}
}
