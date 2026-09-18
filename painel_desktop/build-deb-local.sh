#!/bin/sh
set -eu

project_dir=/mnt/host/c/Users/saulo.lima/Documents/api-semit-backup-2026-07-13_09-57-44/conexao_ssh/painel_desktop
input="$project_dir/dist/painel-senhas-desktop-1.1.1.tar.gz"
parts="$project_dir/dist/deb-parts-1.1.1"
work="$project_dir/dist/deb-work-1.1.1"

rm -rf "$work" "$parts"
mkdir -p "$work/data/opt" "$work/data/usr/bin" "$work/data/usr/share/applications" "$work/control" "$parts"
tar -xzf "$input" -C "$work/data/opt"
mv "$work/data/opt/painel-senhas-desktop-1.1.1" "$work/data/opt/painel-tv-garca"
chmod 755 "$work/data/opt/painel-tv-garca/painel-tv-garca"
ln -s /opt/painel-tv-garca/painel-tv-garca "$work/data/usr/bin/painel-tv-garca"

cat > "$work/control/control" <<'EOF'
Package: painel-senhas-desktop
Version: 1.1.1
Section: utils
Priority: optional
Architecture: amd64
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0
Maintainer: SEMIT - Prefeitura Municipal de Garça <semit@garca.sp.gov.br>
Installed-Size: 185000
Description: Painel de Senhas e TV Corporativa
 Cliente desktop da Prefeitura de Garça com cache local integral de mídias.
EOF

cat > "$work/data/usr/share/applications/painel-tv-garca.desktop" <<'EOF'
[Desktop Entry]
Name=Painel TV Garça
Comment=Painel de Senhas e TV Corporativa SEMIT
Exec=/opt/painel-tv-garca/painel-tv-garca --no-sandbox
Terminal=false
Type=Application
Categories=Utility;
EOF

printf '2.0\n' > "$parts/debian-binary"
tar -czf "$parts/control.tar.gz" -C "$work/control" .
tar -czf "$parts/data.tar.gz" -C "$work/data" .
