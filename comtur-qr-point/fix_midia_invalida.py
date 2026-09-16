#!/usr/bin/env python3
"""Fix gastro/attraction media: use kind:'image' and sanitize payload before save."""
from pathlib import Path
from datetime import datetime
import re, subprocess

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
NAV = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")
text = ADMIN.read_text(encoding="utf-8")
bak = ADMIN.with_name(f"comtur-content-admin.html.bak-midia-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(ADMIN.read_bytes())
print("BAK", bak.name)

# 1) Fix uploadMediaFiles object shape
old_push = """          targetArray.push({
            type: 'image',
            url: data.url,
            title: file.name.replace(/\\.[^/.]+$/, ''),
            credit: '',
            order: targetArray.length
          });"""

new_push = """          targetArray.push({
            kind: 'image',
            type: 'image',
            url: data.url,
            title: file.name.replace(/\\.[^/.]+$/, ''),
            credit: '',
            mimeType: file.type || 'image/jpeg',
            isAccessible: false,
            order: targetArray.length
          });"""

if old_push in text:
    text = text.replace(old_push, new_push)
    print("UPLOAD_PUSH_FIXED", text.count("kind: 'image',\n            type: 'image'"))
else:
    # try looser
    if "type: 'image',\n            url: data.url," in text:
        text = text.replace(
            "type: 'image',\n            url: data.url,",
            "kind: 'image',\n            type: 'image',\n            url: data.url,",
        )
        print("UPLOAD_PUSH_LOOSE")
    else:
        print("UPLOAD_PUSH_MISS")

# ensure uploadMediaFiles unwraps payload.data
old_up = "const data = await res.json();\n        if (res.ok && data.url)"
if old_up in text:
    text = text.replace(
        old_up,
        "const payload = await res.json().catch(() => ({}));\n        const data = payload.data || payload;\n        if (res.ok && data.url)",
    )
    print("UPLOAD_UNWRAP")

# 2) Add sanitizeMedia helper
if "function sanitizeMediaList(" not in text:
    helper = r'''
  function sanitizeMediaList(list) {
    return (Array.isArray(list) ? list : []).map((m) => {
      if (!m || !m.url) return null;
      let kind = m.kind;
      if (!kind && (m.type === 'image' || m.type === 'photo')) kind = 'image';
      if (!kind && (m.type === 'document' || m.type === 'pdf')) kind = 'document';
      if (!kind) kind = 'image';
      if (!['image', 'video', 'audio', 'document', 'link'].includes(kind)) return null;
      return {
        kind,
        title: String(m.title || '').slice(0, 180),
        url: String(m.url || '').slice(0, 1000),
        mimeType: String(m.mimeType || (kind === 'image' ? 'image/jpeg' : '')).slice(0, 120),
        isAccessible: m.isAccessible === true
      };
    }).filter(Boolean);
  }

'''
    text = text.replace("function showNotice(msg, isError = false) {", helper + "function showNotice(msg, isError = false) {", 1)
    print("SANITIZE_HELPER")

# 3) Use sanitizeMediaList in gastronomy/attraction/lodging/etc payloads: media: gastroMedia -> media: sanitizeMediaList(gastroMedia)
for var in ["gastroMedia", "attractionMedia", "lodgingMedia", "routeMedia", "eventMedia", "shopMedia", "svcMedia"]:
    old = f"media: {var}"
    new = f"media: sanitizeMediaList({var})"
    c = text.count(old)
    if c and f"sanitizeMediaList({var})" not in text:
        text = text.replace(old, new)
        print("PAYLOAD", var, c)

# 4) Fix duplicate publish date labels if present
# collapse doubled label text near gastroPublishDate
text2 = re.sub(
    r"(Data de publicação\s*){2,}",
    "Data de publicação",
    text,
)
if text2 != text:
    text = text2
    print("DEDUPED_LABEL")

# remove duplicate gastroPublishDate field blocks if we inserted twice
ids = [m.start() for m in re.finditer(r'id="gastroPublishDate"', text)]
print("publishDate fields", len(ids))
if len(ids) > 1:
    # remove second occurrence's surrounding field div
    second = ids[1]
    # find div start before second
    start = text.rfind('<div class="comtur-field"', 0, second)
    end = text.find('</div>', second)
    if start >= 0 and end > start:
        end = text.find('</div>', end + 1)  # close outer? 
        # simpler: remove from start to after first </div> following input
        end = text.find('</div>', second) + 6
        text = text[:start] + text[end:]
        print("REMOVED_DUP_PUBDATE")

ADMIN.write_text(text, encoding="utf-8")

nt = NAV.read_text(encoding="utf-8")
nt2 = (
    nt.replace("comtur-content-admin.html?v=24", "comtur-content-admin.html?v=25")
      .replace("comtur-content-admin.html?v=23", "comtur-content-admin.html?v=25")
)
if nt2 != nt:
    NAV.write_text(nt2, encoding="utf-8")
    print("NAV_v25")

text = ADMIN.read_text(encoding="utf-8")
text = text.replace('content="v24"', 'content="v25"')
ADMIN.write_text(text, encoding="utf-8")

Path("/tmp/check_admin5.js").write_text(
    "const fs=require('fs');const h=fs.readFileSync('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html','utf8');"
    "const scripts=[...h.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]).join('\\n');"
    "try{new Function(scripts); console.log('SYNTAX_OK')}catch(e){console.error('SYNTAX_ERR', e.message); process.exit(1)}",
    encoding="utf-8",
)
r = subprocess.run(["node", "/tmp/check_admin5.js"], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
print("has kind in push", "kind: 'image'" in ADMIN.read_text(encoding="utf-8") and "uploadMediaFiles" in ADMIN.read_text(encoding="utf-8"))
print("sanitize gastro", "sanitizeMediaList(gastroMedia)" in ADMIN.read_text(encoding="utf-8"))
print("DONE")
