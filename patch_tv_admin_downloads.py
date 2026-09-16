import subprocess
from pathlib import Path

script_content = '''from pathlib import Path
p = Path('/tmp/admin.html')
content = p.read_text(encoding='utf-8')

# 1. Update navigation actions in header
target_header = """            <div class="admin-nav-actions" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <a id="link-download-apk" href="semit-tv-player.apk" download="semit-tv-player.apk" class="btn btn-secondary" style="border-color: #10b981; color: #34d399; background: rgba(16, 185, 129, 0.15); display: inline-flex; align-items: center; gap: 6px; text-decoration: none;" title="Baixar Aplicativo Android (APK) para Smart TV, TV Box e Totens">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    📲 Baixar APK (TV Box / Android)
                </a>"""

replacement_header = """            <div class="admin-nav-actions" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <a id="link-download-apk-tv" href="semit-tv-player.apk" download="semit-tv-player.apk" class="btn btn-secondary" style="border-color: #10b981; color: #34d399; background: rgba(16, 185, 129, 0.15); display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-weight: 700;" title="Baixar APK Só TV Corporativa">
                    📺 Baixar APK (Só TV)
                </a>
                <a id="link-download-apk-painel" href="painel-senhas.apk" download="painel-senhas.apk" class="btn btn-secondary" style="border-color: #10b981; color: #34d399; background: rgba(16, 185, 129, 0.15); display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-weight: 700;" title="Baixar APK TV + Painel de Senhas">
                    🎟️ Baixar APK (TV + Senhas)
                </a>
                <a id="link-download-win" href="painel-tv-garca-windows.exe" download="painel-tv-garca-windows.exe" class="btn btn-secondary" style="border-color: #38bdf8; color: #38bdf8; background: rgba(56, 189, 248, 0.15); display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-weight: 700;" title="Baixar Instalador Oficial Windows (.exe)">
                    🖥️ Baixar Windows (.exe)
                </a>
                <a id="link-download-linux" href="painel-tv-garca-linux.tar.gz" download="painel-tv-garca-linux.tar.gz" class="btn btn-secondary" style="border-color: #f59e0b; color: #fbbf24; background: rgba(245, 158, 11, 0.15); display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-weight: 700;" title="Baixar Pacote Linux (.tar.gz)">
                    🐧 Baixar Linux
                </a>"""

if target_header in content:
    content = content.replace(target_header, replacement_header, 1)
    print("Header actions replaced!")
else:
    print("Warning: target_header not found in admin.html")

# 2. Add rich download cards block above Central de Displays
target_section = '<section class="admin-section">'
download_block = """        <!-- SEÇÃO OFICIAL DE DOWNLOADS -->
        <section class="admin-section" style="margin-bottom: 24px;">
            <div class="section-header" style="margin-bottom: 14px;">
                <h2 style="font-size: 1.25rem; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
                    <span>📦</span> Central de Downloads Oficiais (TV Box, Windows & Linux)
                </h2>
                <span style="font-size: 0.85rem; color: #94a3b8;">Aplicativos nativos com cache local de vídeos para evitar travamentos e telas pretas em PCs e TVs</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px;">
                <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
                    <div style="font-size: 1.05rem; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">🖥️ Windows (Instalador)</div>
                    <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 12px; flex: 1;">Instalador oficial com atalho na Área de Trabalho e inicialização automática</div>
                    <a href="painel-tv-garca-windows.exe" download="painel-tv-garca-windows.exe" class="btn btn-primary" style="text-align: center; text-decoration: none; justify-content: center; background: #0284c7; border: none; font-weight: 700;">
                        ⬇️ Baixar .EXE (146 MB)
                    </a>
                </div>

                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
                    <div style="font-size: 1.05rem; font-weight: 700; color: #ffffff; margin-bottom: 6px;">💼 Windows (Portátil)</div>
                    <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 12px; flex: 1;">Execução direta sem instalação prévia, ideal para rodar via pendrive</div>
                    <a href="painel-tv-garca-portatil.exe" download="painel-tv-garca-portatil.exe" class="btn btn-secondary" style="text-align: center; text-decoration: none; justify-content: center; font-weight: 600;">
                        ⬇️ Baixar Portátil (75 MB)
                    </a>
                </div>

                <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
                    <div style="font-size: 1.05rem; font-weight: 700; color: #fbbf24; margin-bottom: 6px;">🐧 Linux (Ubuntu/Debian)</div>
                    <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 12px; flex: 1;">Pacote compactado com script de instalação e autostart no boot</div>
                    <a href="painel-tv-garca-linux.tar.gz" download="painel-tv-garca-linux.tar.gz" class="btn btn-secondary" style="text-align: center; text-decoration: none; justify-content: center; border-color: #f59e0b; color: #fbbf24; font-weight: 600;">
                        ⬇️ Baixar Linux (98 MB)
                    </a>
                </div>

                <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
                    <div style="font-size: 1.05rem; font-weight: 700; color: #34d399; margin-bottom: 6px;">📱 TV Box (TV + Senhas)</div>
                    <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 12px; flex: 1;">APK nativo para Android / Smart TV Box com TV e chamadas de senhas</div>
                    <a href="painel-senhas.apk" download="painel-senhas.apk" class="btn btn-secondary" style="text-align: center; text-decoration: none; justify-content: center; border-color: #10b981; color: #34d399; font-weight: 700;">
                        ⬇️ Baixar APK Painel (7.6 MB)
                    </a>
                </div>

                <div style="background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
                    <div style="font-size: 1.05rem; font-weight: 700; color: #34d399; margin-bottom: 6px;">📺 TV Box (Só TV)</div>
                    <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 12px; flex: 1;">APK nativo para exibição de programação de TV em tela cheia</div>
                    <a href="semit-tv-player.apk" download="semit-tv-player.apk" class="btn btn-secondary" style="text-align: center; text-decoration: none; justify-content: center; border-color: #10b981; color: #34d399; font-weight: 700;">
                        ⬇️ Baixar APK TV (4.4 MB)
                    </a>
                </div>
            </div>
        </section>

        <section class="admin-section">"""

if target_section in content:
    content = content.replace(target_section, download_block, 1)
    print("Download section block inserted!")

p.write_text(content, encoding='utf-8')
'''

Path('apply_remote_tv_admin.py').write_text(script_content, encoding='utf-8')
print('apply_remote_tv_admin.py created!')
