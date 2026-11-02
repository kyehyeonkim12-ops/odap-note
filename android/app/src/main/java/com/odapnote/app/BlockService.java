package com.odapnote.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.accessibility.AccessibilityEvent;
import android.widget.Toast;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * 순공 타이머가 켜져 있는 동안 다른 앱(홈 화면 포함)이 앞으로 나오면 바로 오답 노트 순공 화면을 다시 띄운다.
 * - "all" 모드: 오답 노트, 전화·긴급 통화, 키보드, 시스템 화면 말고는 전부 되돌린다.
 * - "list" 모드: 학생이 고른 앱만 되돌린다.
 * 사용자가 설정 → 접근성에서 직접 켜야 동작한다. 화면 내용은 읽지 않고 앞에 나온 앱 이름만 본다.
 */
public class BlockService extends AccessibilityService {
    // 공부 중에도 막으면 안 되는 것: 전화 받기·걸기, 긴급 통화, 권한 창, 상태 표시줄
    private static final Set<String> ALWAYS_ALLOWED = new HashSet<>(Arrays.asList(
        "android", "com.android.systemui", "com.android.permissioncontroller", "com.google.android.permissioncontroller",
        "com.android.server.telecom", "com.android.phone", "com.android.incallui", "com.android.dialer",
        "com.google.android.dialer", "com.samsung.android.dialer", "com.samsung.android.incallui",
        "com.skt.prod.dialer", "com.android.emergency", "com.google.android.apps.safetyhub",
        "com.samsung.android.emergency"
    ));

    private long lastBlock = 0;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;
        CharSequence pkgSeq = event.getPackageName();
        if (pkgSeq == null) return;
        String pkg = pkgSeq.toString();
        if (pkg.equals(getPackageName()) || !BlockStore.isActive(this)) return;

        boolean block = "list".equals(BlockStore.mode(this))
            ? BlockStore.blocked(this).contains(pkg)
            : !ALWAYS_ALLOWED.contains(pkg) && !isKeyboard(pkg);
        if (!block) return;

        long now = System.currentTimeMillis();
        if (now - lastBlock < 700) return; // 같은 전환 이벤트가 연달아 와도 한 번만
        lastBlock = now;
        BlockStore.countBlock(this);

        Intent i = new Intent(this, MainActivity.class);
        i.putExtra("focus", true);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(i);
        new Handler(Looper.getMainLooper()).post(() ->
            Toast.makeText(this, "순공 중이에요! 타이머를 멈춰야 다른 앱을 쓸 수 있어요.", Toast.LENGTH_SHORT).show());
    }

    /** 키보드 창은 막지 않는다 (오답 노트에서 글을 쓸 때도 뜬다) */
    private boolean isKeyboard(String pkg) {
        String ims = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_INPUT_METHODS);
        if (TextUtils.isEmpty(ims)) return false;
        for (String id : ims.split(":")) if (id.startsWith(pkg + "/")) return true;
        return false;
    }

    @Override
    public void onInterrupt() {}
}
