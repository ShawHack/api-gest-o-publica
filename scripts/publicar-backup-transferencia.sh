#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"

ID="$(find "$BASE_DIR" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??_??-??-??' -printf '%f\n' | sort -r | head -1)"
[ -n "$ID" ] || { echo "ERRO: nenhum backup encontrado" >&2; exit 1; }
DIR="$BASE_DIR/$ID"

mapfile -t ARCHIVES < <(find "$DIR" -maxdepth 1 -type f -name 'api-semit-backup-*.tar.gz' -size +0c -printf '%f\n')
[ "${#ARCHIVES[@]}" -eq 1 ] || { echo "ERRO: esperado exatamente um api-semit-backup-*.tar.gz" >&2; exit 1; }
ARCHIVE="${ARCHIVES[0]}"
[ -s "$DIR/backup.log" ] || { echo "ERRO: backup.log ausente/vazio" >&2; exit 1; }

sha_of() {
  sha256sum "$1" | awk '{print $1}'
}

SHA="$(sha_of "$DIR/$ARCHIVE")"
printf '%s  %s\n' "$SHA" "$ARCHIVE" > "$DIR/$ARCHIVE.sha256.tmp"
mv -f "$DIR/$ARCHIVE.sha256.tmp" "$DIR/$ARCHIVE.sha256"
chmod 600 "$DIR/$ARCHIVE" "$DIR/$ARCHIVE.sha256"

TRANSFER_FILES="\"$ARCHIVE\", \"$ARCHIVE.sha256\", \"backup.log\", \"manifest.json\""
IMG="$(find "$DIR" -maxdepth 1 -type f -name 'docker-images-*.tar.gz' -printf '%f\n' | head -1 || true)"
IMG_SHA=""
IMG_JSON="null"
IMG_SHA_JSON="null"
if [ -n "$IMG" ]; then
  IMG_SHA="$(sha_of "$DIR/$IMG")"
  printf '%s  %s\n' "$IMG_SHA" "$IMG" > "$DIR/$IMG.sha256.tmp"
  mv -f "$DIR/$IMG.sha256.tmp" "$DIR/$IMG.sha256"
  chmod 600 "$DIR/$IMG" "$DIR/$IMG.sha256"
  TRANSFER_FILES="$TRANSFER_FILES, \"$IMG\", \"$IMG.sha256\""
  IMG_JSON="\"$IMG\""
  IMG_SHA_JSON="\"$IMG_SHA\""
fi

SIZE="$(stat -c %s "$DIR/$ARCHIVE")"
ENTRIES="$(tar -tzf "$DIR/$ARCHIVE" | wc -l)"
CREATED="$(date -Iseconds -r "$DIR/$ARCHIVE")"
CONTENT='["project","api","images","mongodb","frontend","nginx","tls","secrets","runtime","redis","tv-corporativa","grafana","prometheus","docker-volumes","docker-images","inventory"]'

cat > "$DIR/manifest.json.tmp" <<EOF
{
  "schema": 2,
  "backup_id": "$ID",
  "created_at": "$CREATED",
  "archive": "$ARCHIVE",
  "archive_bytes": $SIZE,
  "sha256": "$SHA",
  "archive_entries": $ENTRIES,
  "docker_images_archive": $IMG_JSON,
  "docker_images_sha256": $IMG_SHA_JSON,
  "content": $CONTENT,
  "restore": "scripts/restore-host-novo.sh --backup-dir <pasta> --iniciar --eu-autorizo-restore",
  "transfer_files": [$TRANSFER_FILES]
}
EOF
mv -f "$DIR/manifest.json.tmp" "$DIR/manifest.json"
chmod 600 "$DIR/manifest.json"
echo "Publicado: $ID ($ARCHIVE, SHA-256 $SHA)"
[ -n "$IMG" ] && echo "Imagens: $IMG (SHA-256 $IMG_SHA)"
