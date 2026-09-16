#!/usr/bin/env python3
"""Harden admin auth UX + safe resetForm/btnNew; bump cache to v29."""
from pathlib import Path
import re

path = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html')
html = path.read_text(encoding='utf-8')

# bump cache
html = re.sub(r'content="v\d+"', 'content="v29"', html, count=1)

# Improve loadItems 401 handling
old_load = """      const res = await send('/api/comtur/admin/content');
      if (!res.ok) throw new Error(`HTTP ${res.status}: Falha ao carregar conteúdos`);"""

new_load = """      const res = await send('/api/comtur/admin/content');
      if (res.status === 401 || res.status === 403) {
        if (listEl) {
          listEl.innerHTML = '<div class="comtur-empty" style="color:#b91c1c;padding:16px 8px;">Sessão expirada ou sem permissão.<br><button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" style="margin-top:10px" onclick="location.href=\\'/login\\'">Fazer login</button></div>';
        }
        showNotice('Sessão expirada. Faça login novamente para carregar e criar conteúdos.', true);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: Falha ao carregar conteúdos`);"""

if old_load not in html:
    raise SystemExit('loadItems auth block not found')
html = html.replace(old_load, new_load, 1)

# Harden btnNew click
old_btn = """    if ($('btnNew')) {
      $('btnNew').addEventListener('click', () => resetForm(true));
    }"""
new_btn = """    if ($('btnNew')) {
      $('btnNew').addEventListener('click', () => {
        try {
          resetForm(true);
          showNotice('Formulário pronto para novo item.', false);
        } catch (err) {
          console.error('btnNew/resetForm', err);
          showNotice((err && err.message) || 'Não foi possível abrir o formulário novo.', true);
        }
      });
    }"""
if old_btn not in html:
    raise SystemExit('btnNew block not found')
html = html.replace(old_btn, new_btn, 1)

# Make $('id').value safe in loadItems after load
html = html.replace(
    "const currentItem = allItems.find(i => i._id === $('id').value);",
    "const currentItem = allItems.find(i => i._id === fieldVal('id'));",
)

# Ensure fieldSet exists (from prior patch)
if 'function fieldSet(' not in html:
    raise SystemExit('fieldSet missing')

path.write_text(html, encoding='utf-8')
Path('/tmp/comtur-content-admin.server.html').write_text(html, encoding='utf-8')
print('OK v29', 'Sessão expirada' in html)
