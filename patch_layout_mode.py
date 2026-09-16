from pathlib import Path

# 1. Update activity_main.xml to ensure spaceTvDivider has an ID
xml_path = Path('/home/semit/Documentos/semit_painel_native/app/src/main/res/layout/activity_main.xml')
xml_content = xml_path.read_text(encoding='utf-8')

old_space = """        <!-- ESPAÇADOR CENTRAL -->
        <Space
            android:layout_width="12dp"
            android:layout_height="match_parent" />"""

new_space = """        <!-- ESPAÇADOR CENTRAL -->
        <Space
            android:id="@+id/spaceTvDivider"
            android:layout_width="12dp"
            android:layout_height="match_parent" />"""

if old_space in xml_content:
    xml_content = xml_content.replace(old_space, new_space, 1)
    xml_path.write_text(xml_content, encoding='utf-8')
    print("activity_main.xml updated with spaceTvDivider id")
else:
    print("spaceTvDivider already present or pattern changed")

# 2. Update MainActivity.java
java_path = Path('/home/semit/Documentos/semit_painel_native/app/src/main/java/br/gov/sp/garca/painelsenhas/MainActivity.java')
java_content = java_path.read_text(encoding='utf-8')

# Add KEY_TV_ENABLED
if 'KEY_TV_ENABLED' not in java_content:
    needle_key = 'private static final String KEY_SPEECH_RATE = "speech_rate_level";'
    repl_key = needle_key + '\n    private static final String KEY_TV_ENABLED = "tv_layout_enabled";'
    java_content = java_content.replace(needle_key, repl_key, 1)

# Add member variables
if 'cardTvFrame' not in java_content:
    needle_views = 'private LinearLayout cardSenhaAtual;'
    repl_views = needle_views + '\n    private View cardTvFrame;\n    private View spaceTvDivider;\n    private boolean isTvLayoutEnabled = true;'
    java_content = java_content.replace(needle_views, repl_views, 1)

# Bind views and apply mode in onCreate
if 'cardTvFrame = findViewById' not in java_content:
    needle_bind = 'cardSenhaAtual = findViewById(R.id.cardSenhaAtual);'
    repl_bind = needle_bind + '\n        cardTvFrame = findViewById(R.id.cardTvFrame);\n        spaceTvDivider = findViewById(R.id.spaceTvDivider);\n        isTvLayoutEnabled = prefs.getBoolean(KEY_TV_ENABLED, true);\n        applyTvLayoutMode(isTvLayoutEnabled);'
    java_content = java_content.replace(needle_bind, repl_bind, 1)

# Add menu options and helper methods
if 'showLayoutSelectionDialog' not in java_content:
    needle_menu = 'options.add("🎟️ Trocar Unidade do NovoSGA (Atual: " + unitDisplayName + ")");\n        actions.add(this::showUnitSelectionDialog);'
    repl_menu = needle_menu + '\n\n        options.add("🖥️ Modo de Exibição (Atual: " + (isTvLayoutEnabled ? "Com TV Lateral" : "Sem TV / Somente Senhas") + ")");\n        actions.add(this::showLayoutSelectionDialog);'
    java_content = java_content.replace(needle_menu, repl_menu, 1)

    methods = """
    private void showLayoutSelectionDialog() {
        String[] modes = {
            "📺 Com TV Lateral (Vídeos da Programação + Senhas)",
            "📋 Clássico / Somente Senhas (Tela Cheia sem TV)"
        };
        new AlertDialog.Builder(this)
                .setTitle("Modo de Exibição do Painel")
                .setItems(modes, (d, which) -> {
                    boolean enableTv = (which == 0);
                    setTvLayoutMode(enableTv);
                })
                .setOnDismissListener(d -> hideSystemUI())
                .show();
    }

    private void setTvLayoutMode(boolean enableTv) {
        isTvLayoutEnabled = enableTv;
        prefs.edit().putBoolean(KEY_TV_ENABLED, enableTv).apply();
        applyTvLayoutMode(enableTv);
        if (enableTv) {
            startVideoSyncAndPlayback();
        }
        Toast.makeText(this, enableTv ? "📺 Modo: Com TV Lateral" : "📋 Modo: Somente Senhas (Tela Cheia)", Toast.LENGTH_SHORT).show();
    }

    private void applyTvLayoutMode(boolean enableTv) {
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
    }
"""
    needle_dialog = 'private void showUnitSelectionDialog()'
    java_content = java_content.replace(needle_dialog, methods + "\n    " + needle_dialog, 1)

java_path.write_text(java_content, encoding='utf-8')
print("MainActivity.java updated successfully!")
