from pathlib import Path

java_path = Path('/home/semit/Documentos/semit_painel_native/app/src/main/java/br/gov/sp/garca/painelsenhas/MainActivity.java')
s = java_path.read_text(encoding='utf-8')

# 1. Guard startVideoSyncAndPlayback
old_sync = "    private void startVideoSyncAndPlayback() {\n        new Thread(() -> {"
new_sync = "    private void startVideoSyncAndPlayback() {\n        if (!isTvLayoutEnabled) return;\n        new Thread(() -> {"
if old_sync in s:
    s = s.replace(old_sync, new_sync, 1)

# 2. Guard updatePlayerWithLocalFiles
old_upd = "    private void updatePlayerWithLocalFiles(List<String> localPaths) {\n        runOnUiThread(() -> {\n            if (localPaths.isEmpty()) return;"
new_upd = "    private void updatePlayerWithLocalFiles(List<String> localPaths) {\n        runOnUiThread(() -> {\n            if (!isTvLayoutEnabled) {\n                if (player != null) {\n                    player.setVolume(0.0f);\n                    player.setPlayWhenReady(false);\n                    player.pause();\n                    player.stop();\n                }\n                return;\n            }\n            if (localPaths.isEmpty()) return;"
if old_upd in s:
    s = s.replace(old_upd, new_upd, 1)

# 3. Complete mute/stop in applyTvLayoutMode
old_apply = """    private void applyTvLayoutMode(boolean enableTv) {
        runOnUiThread(() -> {
            if (cardTvFrame != null) {
                cardTvFrame.setVisibility(enableTv ? View.VISIBLE : View.GONE);
            }
            if (spaceTvDivider != null) {
                spaceTvDivider.setVisibility(enableTv ? View.VISIBLE : View.GONE);
            }
            if (player != null) {
                if (enableTv) {
                    player.play();
                } else {
                    player.pause();
                }
            }
        });
    }"""

new_apply = """    private void applyTvLayoutMode(boolean enableTv) {
        runOnUiThread(() -> {
            if (cardTvFrame != null) {
                cardTvFrame.setVisibility(enableTv ? View.VISIBLE : View.GONE);
            }
            if (spaceTvDivider != null) {
                spaceTvDivider.setVisibility(enableTv ? View.VISIBLE : View.GONE);
            }
            if (player != null) {
                if (enableTv) {
                    player.setVolume(currentTvVolume);
                    player.setPlayWhenReady(true);
                    player.play();
                } else {
                    player.setVolume(0.0f);
                    player.setPlayWhenReady(false);
                    player.pause();
                    player.stop();
                }
            }
        });
    }"""
if old_apply in s:
    s = s.replace(old_apply, new_apply, 1)

# 4. Audio Ducking / Restore in speakTicket and playSpeechAudio
old_duck = "            // 2. Audio Ducking (abaixa TV para 5%)\n            if (player != null) player.setVolume(0.05f);"
new_duck = "            // 2. Audio Ducking (abaixa TV para 5% se TV estiver ligada, senao garante mudo total 0%)\n            if (player != null) {\n                player.setVolume(isTvLayoutEnabled ? 0.05f : 0.0f);\n            }"
if old_duck in s:
    s = s.replace(old_duck, new_duck, 1)

old_restore1 = "if (player != null) player.setVolume(currentTvVolume);"
new_restore1 = "if (player != null) player.setVolume(isTvLayoutEnabled ? currentTvVolume : 0.0f);"
s = s.replace(old_restore1, new_restore1)

java_path.write_text(s, encoding='utf-8')
print("MainActivity.java audio mute patched successfully!")
