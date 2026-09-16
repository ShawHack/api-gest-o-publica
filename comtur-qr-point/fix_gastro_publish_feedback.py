#!/usr/bin/env python3
"""Fix gastronomy publish feedback: fixed toast + safer saveContent + location string."""
from pathlib import Path
from datetime import datetime
import re

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
NAV = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")
text = ADMIN.read_text(encoding="utf-8")
bak = ADMIN.with_name(f"comtur-content-admin.html.bak-gastrofix-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(ADMIN.read_bytes())
print("BAK", bak.name)

# 1) Replace showNotice with fixed bottom toast (always visible)
m = re.search(r"function showNotice\(msg, isError = false\) \{[\s\S]*?\n  \}", text)
if not m:
    raise SystemExit("showNotice not found")

NEW_NOTICE = r'''function showNotice(msg, isError = false) {
    const el = $('notice');
    if (el) {
      el.textContent = msg;
      el.className = 'comtur-notice' + (isError ? ' is-error' : '');
      el.style.display = 'block';
    }

    let toast = document.getElementById('comturActionToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'comturActionToast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'comtur-action-toast' + (isError ? ' is-error' : '');
    toast.style.display = 'block';

    // also mirror above the visible publish bar when possible
    let near = document.getElementById('noticeNearActions');
    if (!near) {
      near = document.createElement('div');
      near.id = 'noticeNearActions';
      near.setAttribute('role', 'status');
      near.setAttribute('aria-live', 'polite');
    }
    near.textContent = msg;
    near.className = 'comtur-notice' + (isError ? ' is-error' : '');
    near.style.display = 'block';
    near.style.margin = '12px 0 16px';
    const openFields = document.querySelector('.comtur-category-fields[style*="display: block"]')
      || Array.from(document.querySelectorAll('.comtur-category-fields')).find(f => f.style.display !== 'none' && f.offsetParent);
    const bar = openFields && openFields.querySelector('.comtur-actions-bar');
    if (bar && bar.parentNode) {
      if (near.parentNode !== bar.parentNode || near.nextElementSibling !== bar) {
        bar.parentNode.insertBefore(near, bar);
      }
      try { near.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
    }

    clearTimeout(window.__comturNoticeTimer);
    window.__comturNoticeTimer = setTimeout(() => {
      if (el) el.style.display = 'none';
      if (near) near.style.display = 'none';
      if (toast) toast.style.display = 'none';
    }, 8000);
  }'''

text = text[:m.start()] + NEW_NOTICE + text[m.end():]
print("NOTICE_TOAST")

# 2) CSS for fixed toast
if ".comtur-action-toast" not in text:
    css = """
    .comtur-action-toast {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      z-index: 99999;
      min-width: min(520px, calc(100vw - 32px));
      max-width: calc(100vw - 32px);
      padding: 14px 18px;
      border-radius: 12px;
      background: #065f46;
      color: #fff;
      font-weight: 700;
      font-size: 0.95rem;
      box-shadow: 0 16px 40px rgba(16,33,63,.28);
      text-align: center;
    }
    .comtur-action-toast.is-error {
      background: #991b1b;
    }
"""
    # insert before </style>
    if "</style>" in text:
        text = text.replace("</style>", css + "\n  </style>", 1)
        print("TOAST_CSS")

# 3) Harden saveContent to catch buildPayload errors
old_save = "async function saveContent(statusToSave) {\n    const data = buildPayload(statusToSave);\n    if (!data) return;"
new_save = """async function saveContent(statusToSave) {
    let data;
    try {
      data = buildPayload(statusToSave);
    } catch (err) {
      console.error('buildPayload error:', err);
      showNotice((err && err.message) || 'Não foi possível montar os dados para salvar.', true);
      return;
    }
    if (!data) return;"""
if old_save in text:
    text = text.replace(old_save, new_save, 1)
    print("SAVE_TRYCATCH")
else:
    print("SAVE_PATTERN_MISS")

# 4) Fix gastronomy location object -> string + keep structured address in metadata
old_loc = """      return {
        type: 'gastronomy',
        title: name,
        slug,
        summary,
        body,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        location: { street, number, complement, neighborhood, referencePoint },
        contact: { phone, whatsapp, email, website, instagram },
        metadata: {
          category,
          priceLevel,
          highlightBadge,
          signatureDishes,
          googleMapsUrl,
          amenities,
          dietary,
          accessibility,
          paymentMethods,
          languages,
          openingHours,
          coverUrl: gastroCoverUrl || (gastroMedia.length ? gastroMedia[0].url : '')
        },
        media: gastroMedia
      };
    }"""

new_loc = """      if (!name) { showNotice('Informe o nome do estabelecimento.', true); return null; }
      if (!slug) { showNotice('Informe o slug / identificador na URL.', true); return null; }
      const locationStr = [street, number, complement, neighborhood, referencePoint].filter(Boolean).join(', ');
      return {
        type: 'gastronomy',
        title: name,
        slug,
        summary,
        body,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        location: locationStr,
        contact: { phone, email, website },
        metadata: {
          category,
          priceLevel,
          highlightBadge,
          signatureDishes,
          googleMapsUrl,
          amenities,
          dietary,
          accessibility,
          paymentMethods,
          languages,
          openingHours,
          address: { street, number, complement, neighborhood, referencePoint },
          whatsapp,
          instagram,
          coverUrl: gastroCoverUrl || (gastroMedia.length ? gastroMedia[0].url : '')
        },
        media: gastroMedia
      };
    }"""

if old_loc in text:
    text = text.replace(old_loc, new_loc, 1)
    print("GASTRO_LOCATION_FIXED")
else:
    print("GASTRO_LOCATION_MISS")

# 5) Cache bust: inject meta + bump self-reference if any
if 'comtur-admin-cache-bust' not in text:
    text = text.replace("<head>", '<head>\n  <meta name="comtur-admin-cache-bust" content="v23">', 1)
    print("META_BUST")

ADMIN.write_text(text, encoding="utf-8")

nt = NAV.read_text(encoding="utf-8")
nt2 = nt.replace("comtur-content-admin.html?v=22", "comtur-content-admin.html?v=23").replace("comtur-content-admin.html?v=21", "comtur-content-admin.html?v=23")
if nt2 != nt:
    NAV.write_text(nt2, encoding="utf-8")
    print("NAV_v23")

# verify syntax
import subprocess
Path("/tmp/check_admin2.js").write_text(
    "const fs=require('fs');const h=fs.readFileSync('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html','utf8');"
    "const scripts=[...h.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]).join('\\n');"
    "try{new Function(scripts); console.log('SYNTAX_OK')}catch(e){console.error('SYNTAX_ERR', e.message); process.exit(1)}",
    encoding="utf-8",
)
r = subprocess.run(["node", "/tmp/check_admin2.js"], capture_output=True, text=True)
print(r.stdout.strip(), r.stderr.strip())
print("DONE", ADMIN.stat().st_size)
