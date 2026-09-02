#!/usr/bin/env bash
# Build prefeitura-app-release.apk com WhatsApp/Evolution (notify secret).
set -euo pipefail
LOG=/tmp/build-prefeitura-apk.log
exec >"$LOG" 2>&1
echo "=== INICIO $(date) ==="

export PATH="$HOME/development/flutter/bin:$HOME/flutter/bin:$PATH"
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

PROJECT=/home/semit/Documentos/api-semit
APP="$PROJECT/full/prefeitura_app-main"
JDK_DIR="$HOME/jdk-17"

# 1) JDK 17 se necessário
if ! command -v java >/dev/null 2>&1 || [ ! -x "$JDK_DIR/bin/java" ]; then
  echo "Instalando Temurin JDK 17 em $JDK_DIR ..."
  mkdir -p "$HOME/tmp-jdk"
  cd "$HOME/tmp-jdk"
  URL="https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse?project=jdk"
  curl -L --fail -o jdk17.tar.gz "$URL"
  rm -rf "$JDK_DIR"
  mkdir -p "$JDK_DIR"
  tar -xzf jdk17.tar.gz -C "$JDK_DIR" --strip-components=1
  rm -f jdk17.tar.gz
fi
export JAVA_HOME="$JDK_DIR"
export PATH="$JAVA_HOME/bin:$PATH"
java -version

# 2) Secret
SECRET="$(grep -E '^ILUMINACAO_NOTIFY_SECRET=' "$PROJECT/backend/.env" | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//')"
if [ -z "$SECRET" ]; then
  echo "[ERRO] ILUMINACAO_NOTIFY_SECRET ausente"
  exit 1
fi
echo "secret_len=${#SECRET}"

# 3) Build
cd "$APP"
flutter pub get
flutter build apk --release \
  --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api \
  --dart-define=ILUMINACAO_NOTIFY_SECRET="$SECRET"

OUT="$APP/build/app/outputs/flutter-apk/app-release.apk"
if [ ! -f "$OUT" ]; then
  echo "[ERRO] APK nao gerado"
  exit 1
fi

mkdir -p "$APP/dist"
cp -a "$OUT" "$APP/dist/prefeitura-app-release.apk"
# Espelho util na pasta de download do projeto
mkdir -p "$PROJECT/dist"
cp -a "$OUT" "$PROJECT/dist/prefeitura-app-release.apk"

ls -lh "$APP/dist/prefeitura-app-release.apk" "$PROJECT/dist/prefeitura-app-release.apk"
md5sum "$APP/dist/prefeitura-app-release.apk"
echo "=== FIM $(date) ==="
