#!/usr/bin/env bash
set -e

echo "=== Instalador do Painel de Senhas e TV — SEMIT Garça (Linux) ==="

INSTALL_DIR="/opt/painel-tv-garca"
BIN_SOURCE="$(dirname "$0")/dist/linux-unpacked"

if [ ! -d "$BIN_SOURCE" ]; then
  if [ -f "$(dirname "$0")/dist/painel-senhas-desktop-1.1.0.tar.gz" ]; then
    echo "Extraindo tar.gz..."
    mkdir -p /tmp/painel-extract
    tar -xzf "$(dirname "$0")/dist/painel-senhas-desktop-1.1.0.tar.gz" -C /tmp/painel-extract
    BIN_SOURCE="/tmp/painel-extract"
  else
    echo "Erro: Binários do Linux não encontrados em dist/"
    exit 1
  fi
fi

echo "Copiando arquivos para $INSTALL_DIR..."
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r "$BIN_SOURCE"/* "$INSTALL_DIR/"
sudo chmod +x "$INSTALL_DIR/painel-senhas-desktop"

echo "Criando link em /usr/local/bin..."
sudo ln -sf "$INSTALL_DIR/painel-senhas-desktop" /usr/local/bin/painel-tv-garca

echo "Criando lançador no menu de aplicativos..."
cat <<EOF | sudo tee /usr/share/applications/painel-tv-garca.desktop >/dev/null
[Desktop Entry]
Name=Painel TV Garça
Comment=Painel de Senhas e TV Corporativa SEMIT
Exec=/opt/painel-tv-garca/painel-senhas-desktop --no-sandbox
Terminal=false
Type=Application
Categories=Utility;
EOF

echo "Configurando inicialização automática (Autostart)..."
AUTOSTART_DIR="$HOME/.config/autostart"
mkdir -p "$AUTOSTART_DIR"
cp /usr/share/applications/painel-tv-garca.desktop "$AUTOSTART_DIR/"

echo "✅ Instalação concluída com sucesso!"
echo "Para executar agora: painel-tv-garca"
