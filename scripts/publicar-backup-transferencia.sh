#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
BASE_DIR="${BASE_DIR:-/home/semit/Documentos/backups-completos}"

ID="$(find "$BASE_DIR" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??_??-??-??' -printf '%f\n' | sort -r | head -1)"
[ -n "$ID" ] || { echo "ERRO: nenhum backup encontrado" >&2; exit 1; }
DIR="$BASE_DIR/$ID"
mapfile -t ARCHIVES < <(find "$DIR" -maxdepth 1 -type f -name '*.tar.gz' -size +0c -printf '%f\n')
[ "${#ARCHIVES[@]}" -eq 1 ] || { echo "ERRO: esperado exatamente um .tar.gz" >&2; exit 1; }
ARCHIVE="${ARCHIVES[0]}"
[ -s "$DIR/backup.log" ] || { echo "ERRO: backup.log ausente/vazio" >&2; exit 1; }

SHA="$(sha256sum "$DIR/$ARCHIVE" | awk '{print $1}')"
printf '%s  %s\n' "$SHA" "$ARCHIVE" > "$DIR/$ARCHIVE.sha256.tmp"
mv -f "$DIR/$ARCHIVE.sha256.tmp" "$DIR/$ARCHIVE.sha256"
SIZE="$(stat -c %s "$DIR/$ARCHIVE")"
ENTRIES="$(tar -tzf "$DIR/$ARCHIVE" | wc -l)"
CREATED="$(date -Iseconds -r "$DIR/$ARCHIVE")"
cat > "$DIR/manifest.json.tmp" <<EOF
{
  "schema": 1,
  "backup_id": "$ID",
  "created_at": "$CREATED",
  "archive": "$ARCHIVE",
  "archive_bytes": $SIZE,
  "sha256": "$SHA",
  "archive_entries": $ENTRIES,
  "content": ["project", "api", "images", "mongodb", "frontend", "nginx", "tls", "runtime-environment"],
  "transfer_files": ["$ARCHIVE", "$ARCHIVE.sha256", "backup.log", "manifest.json"]
}
EOF
mv -f "$DIR/manifest.json.tmp" "$DIR/manifest.json"
echo "Publicado: $ID ($ARCHIVE, SHA-256 $SHA)"
