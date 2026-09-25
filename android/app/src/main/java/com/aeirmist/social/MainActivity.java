package com.aeirmist.social;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    private static final int NOTIFICATION_PERMISSION_CODE = 1001;

    @CapacitorPlugin(name = "NativeSettings")
    public static class NativeSettingsPlugin extends Plugin {
        @PluginMethod
        public void openNotificationSettings(PluginCall call) {
            try {
                Intent intent = new Intent();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                    intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
                } else {
                    intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    fallback.setData(Uri.fromParts("package", getContext().getPackageName(), null));
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(fallback);
                    call.resolve();
                } catch (Exception ex) {
                    call.reject("Failed to open notification settings: " + ex.getMessage());
                }
            }
        }

        @PluginMethod
        public void requestNotificationPermission(PluginCall call) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_CODE);
                    }
                }
                call.resolve();
            } catch (Exception ex) {
                call.reject("Permission request error: " + ex.getMessage());
            }
        }

        @PluginMethod
        public void selectDownloadFolder(PluginCall call) {
            try {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                        | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
                startActivityForResult(call, intent, "folderPickerResult");
            } catch (Exception e) {
                call.reject("Failed to open folder picker: " + e.getMessage());
            }
        }

        @ActivityCallback
        private void folderPickerResult(PluginCall call, androidx.activity.result.ActivityResult result) {
            if (call == null) return;
            if (result.getResultCode() == android.app.Activity.RESULT_OK && result.getData() != null) {
                Uri treeUri = result.getData().getData();
                if (treeUri != null) {
                    final int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                    try {
                        getContext().getContentResolver().takePersistableUriPermission(treeUri, takeFlags);
                    } catch (Exception ignored) {}

                    String displayName = resolveFolderName(treeUri);

                    android.content.SharedPreferences prefs = getContext().getSharedPreferences("aeirmist_prefs", android.content.Context.MODE_PRIVATE);
                    prefs.edit()
                            .putString("aeirmist_download_mode", "custom")
                            .putString("aeirmist_download_custom_uri", treeUri.toString())
                            .putString("aeirmist_download_custom_name", displayName)
                            .apply();

                    com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
                    ret.put("success", true);
                    ret.put("uri", treeUri.toString());
                    ret.put("name", displayName);
                    call.resolve(ret);
                    return;
                }
            }
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("canceled", true);
            call.resolve(ret);
        }

        private String resolveFolderName(Uri uri) {
            if (uri == null) return "Custom Folder";
            try {
                String docId = android.provider.DocumentsContract.getTreeDocumentId(uri);
                if (docId != null) {
                    String[] parts = docId.split(":");
                    if (parts.length > 1) {
                        return parts[1];
                    }
                    return parts[0];
                }
            } catch (Exception ignored) {}
            return uri.getLastPathSegment() != null ? uri.getLastPathSegment() : "Custom Folder";
        }

        @PluginMethod
        public void getDownloadPathConfig(PluginCall call) {
            try {
                android.content.SharedPreferences prefs = getContext().getSharedPreferences("aeirmist_prefs", android.content.Context.MODE_PRIVATE);
                String mode = prefs.getString("aeirmist_download_mode", "system_downloads");
                String customUri = prefs.getString("aeirmist_download_custom_uri", null);
                String customName = prefs.getString("aeirmist_download_custom_name", null);

                com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
                ret.put("mode", mode);
                ret.put("customUri", customUri);
                ret.put("customName", customName);
                ret.put("isAvailable", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to get download config: " + e.getMessage());
            }
        }

        @PluginMethod
        public void setDownloadMode(PluginCall call) {
            try {
                String mode = call.getString("mode", "system_downloads");
                android.content.SharedPreferences prefs = getContext().getSharedPreferences("aeirmist_prefs", android.content.Context.MODE_PRIVATE);
                prefs.edit().putString("aeirmist_download_mode", mode).apply();
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to set download mode: " + e.getMessage());
            }
        }

        @PluginMethod
        public void resetDownloadPath(PluginCall call) {
            try {
                android.content.SharedPreferences prefs = getContext().getSharedPreferences("aeirmist_prefs", android.content.Context.MODE_PRIVATE);
                prefs.edit()
                        .putString("aeirmist_download_mode", "system_downloads")
                        .remove("aeirmist_download_custom_uri")
                        .remove("aeirmist_download_custom_name")
                        .apply();
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to reset download path: " + e.getMessage());
            }
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSettingsPlugin.class);
        super.onCreate(savedInstanceState);

        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebView webView = this.bridge.getWebView();
                // Let Chromium handle GPU compositing dynamically to save VRAM on budget Mali/PowerVR GPUs
                webView.setLayerType(View.LAYER_TYPE_NONE, null);
                // Prevent white flash during cold start or configuration change
                webView.setBackgroundColor(0xFF050508);

                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setLoadsImagesAutomatically(true);
                // HTML5 video autoplay handles muted stories/reels; keep user gesture policy clean
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebView webView = this.bridge.getWebView();
                // Only purge ephemeral resources under critical memory pressure, preserving disk cache
                if (level == TRIM_MEMORY_RUNNING_CRITICAL || level == TRIM_MEMORY_COMPLETE) {
                    webView.freeMemory();
                }
            }
        } catch (Exception ignored) {
        }
    }
}
