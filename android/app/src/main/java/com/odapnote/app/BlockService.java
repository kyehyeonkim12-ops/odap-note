package com.odapnote.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityEvent;
import android.widget.Toast;

/**
 * 순공 타이머가 켜져 있는 동안, 고른 앱이 앞으로 나오면 오답 노트를 다시 띄운다.
 * 사용자가 설정 → 접근성에서 직접 켜야 동작한다. 화면 내용은 읽지 않고 앞에 나온 앱 이름만 본다.
 */
public class BlockService extends AccessibilityService {
    private long lastBlock = 0;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;
        CharSequence pkgSeq = event.getPackageName();
        if (pkgSeq == null) return;
        String pkg = pkgSeq.toString();
        if (pkg.equals(getPackageName())) return;
        if (!BlockStore.isActive(this) || !BlockStore.blocked(this).contains(pkg)) return;

        long now = System.currentTimeMillis();
        if (now - lastBlock < 1500) return; // 같은 앱 전환 이벤트가 연달아 와도 한 번만
        lastBlock = now;
        BlockStore.countBlock(this);

        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(i);
        new Handler(Looper.getMainLooper()).post(() ->
            Toast.makeText(this, "순공 중이에요! 오답 노트로 돌아왔어요.", Toast.LENGTH_SHORT).show());
    }

    @Override
    public void onInterrupt() {}
}
