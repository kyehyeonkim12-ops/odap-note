package com.odapnote.app;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.provider.Settings;
import android.text.TextUtils;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONException;

/** 화면(JS)에서 앱 차단을 켜고 끄고, 권한 상태와 설치된 앱 목록을 가져온다. */
@CapacitorPlugin(name = "AppBlocker")
public class AppBlockerPlugin extends Plugin {

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject r = new JSObject();
        r.put("enabled", serviceEnabled());
        call.resolve(r);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void setActive(PluginCall call) {
        boolean active = Boolean.TRUE.equals(call.getBoolean("active", false));
        Set<String> pkgs = new HashSet<>();
        JSArray arr = call.getArray("packages");
        if (arr != null) {
            try {
                for (Object o : arr.toList()) pkgs.add(String.valueOf(o));
            } catch (JSONException e) {
                call.reject("앱 목록을 읽지 못했어요");
                return;
            }
        }
        BlockStore.set(getContext(), active, pkgs);
        call.resolve();
    }

    @PluginMethod
    public void getStats(PluginCall call) {
        JSObject r = new JSObject();
        r.put("today", BlockStore.todayCount(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void getApps(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        Intent main = new Intent(Intent.ACTION_MAIN, null);
        main.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> list = pm.queryIntentActivities(main, 0);
        JSArray apps = new JSArray();
        Set<String> seen = new HashSet<>();
        String self = getContext().getPackageName();
        for (ResolveInfo ri : list) {
            String pkg = ri.activityInfo.packageName;
            if (pkg.equals(self) || !seen.add(pkg)) continue;
            JSObject a = new JSObject();
            a.put("package", pkg);
            a.put("label", String.valueOf(ri.loadLabel(pm)));
            apps.put(a);
        }
        JSObject r = new JSObject();
        r.put("apps", apps);
        call.resolve(r);
    }

    private boolean serviceEnabled() {
        String enabled = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (TextUtils.isEmpty(enabled)) return false;
        ComponentName me = new ComponentName(getContext(), BlockService.class);
        TextUtils.SimpleStringSplitter sp = new TextUtils.SimpleStringSplitter(':');
        sp.setString(enabled);
        while (sp.hasNext()) {
            ComponentName c = ComponentName.unflattenFromString(sp.next());
            if (me.equals(c)) return true;
        }
        return false;
    }
}
