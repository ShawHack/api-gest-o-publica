#!/usr/bin/env python3
"""Make COMTUR admin notices appear near publish action buttons."""
from pathlib import Path
from datetime import datetime

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
NAV = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")
text = ADMIN.read_text(encoding="utf-8")
bak = ADMIN.with_name(f"comtur-content-admin.html.bak-notice-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(ADMIN.read_bytes())
print("BAK", bak.name)

# Find current showNotice
import re
m = re.search(r"function showNotice\(msg, isError = false\) \{[\s\S]*?\n  \}", text)
if not m:
    # try without default
    m = re.search(r"function showNotice\(msg,\s*isError\s*=\s*false\)\s*\{[\s\S]*?\n  \}", text)
if not m:
    raise SystemExit("showNotice not found")

print("OLD", repr(m.group(0)[:200]))

NEW = r'''function showNotice(msg, isError = false) {
    const el = $('notice');
    if (el) {
      el.textContent = msg;
      el.className = 'comtur-notice' + (isError ? ' is-error' : '');
      el.style.display = 'block';
    }

    // Feedback próximo aos botões de ação (formulários longos)
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

    const bars = Array.from(document.querySelectorAll('.comtur-actions-bar, .comtur-actions-group'));
    let anchor = null;
    for (const b of bars) {
      const style = window.getComputedStyle(b);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const fields = b.closest('.comtur-category-fields');
      if (fields && fields.style.display === 'none') continue;
      if (b.getClientRects().length) { anchor = b.classList.contains('comtur-actions-bar') ? b : (b.closest('.comtur-actions-bar') || b); break; }
    }
    // fallback: last visible actions bar in open form
    if (!anchor) {
      const open = document.querySelector('.comtur-category-fields[style*="display: block"], .comtur-category-fields:not([style*="display: none"])');
      if (open) anchor = open.querySelector('.comtur-actions-bar');
    }
    if (anchor && anchor.parentNode) {
      if (near.parentNode !== anchor.parentNode || near.nextElementSibling !== anchor) {
        anchor.parentNode.insertBefore(near, anchor);
      }
    }

    try {
      near.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {}

    clearTimeout(window.__comturNoticeTimer);
    window.__comturNoticeTimer = setTimeout(() => {
      if (el) el.style.display = 'none';
      if (near) near.style.display = 'none';
    }, 7000);
  }'''

text = text[:m.start()] + NEW + text[m.end():]
ADMIN.write_text(text, encoding="utf-8")
print("SHOWNOTICE_PATCHED")

# Ensure CSS for notice near actions is visible (reuse .comtur-notice)
if "#noticeNearActions" not in text:
    css = """
    #noticeNearActions {
      position: relative;
      z-index: 5;
      box-shadow: 0 8px 24px rgba(16, 33, 63, 0.12);
    }
"""
    # insert after .comtur-notice.is-error if present
    marker = ".comtur-notice.is-error"
    idx = text.find(marker)
    if idx >= 0:
        end = text.find("}", idx)
        text = text[:end+1] + css + text[end+1:]
        ADMIN.write_text(text, encoding="utf-8")
        print("CSS_ADDED")

nt = NAV.read_text(encoding="utf-8")
nt2 = (
    nt.replace("comtur-content-admin.html?v=21", "comtur-content-admin.html?v=22")
      .replace("comtur-content-admin.html?v=20", "comtur-content-admin.html?v=22")
)
if nt2 != nt:
    NAV.write_text(nt2, encoding="utf-8")
    print("NAV_v22")

# verify
t2 = ADMIN.read_text(encoding="utf-8")
print("HAS_NEAR", "noticeNearActions" in t2)
print("HAS_SCROLL_CENTER", "block: 'center'" in t2)
print("DONE")
