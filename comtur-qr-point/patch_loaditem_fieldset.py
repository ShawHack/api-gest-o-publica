#!/usr/bin/env python3
"""Harden loadItemForEdit: never read/write .value on missing nodes; alias attraction fields."""
from pathlib import Path
import re

path = Path('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html')
html = path.read_text(encoding='utf-8')

# ensure fieldSet helper near fieldVal
if 'function fieldSet(' not in html:
    html = html.replace(
        '''  function fieldVal(id, fallback = '') {
    const el = $(id);
    if (!el) return fallback;
    if (el.type === 'checkbox' || el.type === 'radio') return !!el.checked;
    const v = el.value;
    return typeof v === 'string' ? v.trim() : (v == null ? fallback : v);
  }''',
        '''  function fieldVal(id, fallback = '') {
    const el = $(id);
    if (!el) return fallback;
    if (el.type === 'checkbox' || el.type === 'radio') return !!el.checked;
    const v = el.value;
    return typeof v === 'string' ? v.trim() : (v == null ? fallback : v);
  }

  function fieldSet(id, value) {
    const el = $(id);
    if (!el) return false;
    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = !!value;
      return true;
    }
    el.value = value == null ? '' : value;
    return true;
  }''',
        1,
    )

start = html.find('function loadItemForEdit(item)')
end = html.find('// --- BUILD PAYLOAD ---', start)
if start < 0 or end < 0:
    raise SystemExit('loadItemForEdit bounds missing')
before, body, after = html[:start], html[start:end], html[end:]

# Alias mismatches inside loadItemForEdit
aliases = {
    "attractionPriceType": "attractionEntryType",
    "attractionBestTimeToVisit": "attractionBestSeason",
    "attractionReferencePoint": "attractionReference",
    "attractionProfilesList": "attractionAudienceList",
    "lodgingPaymentList": "lodgingPaymentMethodsList",
    "shopPaymentList": "shopPaymentMethodsList",
}
for old, new in aliases.items():
    body = body.replace(f"$('{old}')", f"$('{new}')")
    body = body.replace(f"renderChips('{old}'", f"renderChips('{new}'")
    body = body.replace(f"getSelectedChips('{old}'", f"getSelectedChips('{new}'")
    body = body.replace(f"renderHoursTable(meta.openingHours || {{}}, '{old}'", f"renderHoursTable(meta.openingHours || {{}}, '{new}'")

# Replace bare $('id').value = X  with fieldSet (when not already guarded by if ($('id')))
# Pattern: optional whitespace then $('id').value = 
body2 = re.sub(
    r"(?m)^(\s*)\$\('([^']+)'\)\.value\s*=\s*",
    r"\1fieldSet('\2', ",
    body,
)
# That broke syntax: fieldSet('x', rhs;  need closing paren before ;
# Actually we replaced `$('x').value = ` with `fieldSet('x', ` so the RHS ends at `;` 
# We need to change trailing `;` on those lines to `);` — but only lines we changed.

# Safer approach: only convert unguarded assignments that look like:
# $('foo').value = expr;
lines = body.splitlines(True)
out = []
for line in lines:
    m = re.match(r"^(\s*)\$\('([^']+)'\)\.value\s*=\s*(.*);\s*$", line)
    if m and 'fieldSet' not in line and 'if ($' not in line:
        ind, fid, rhs = m.group(1), m.group(2), m.group(3)
        out.append(f"{ind}fieldSet('{fid}', {rhs});\n")
        continue
    m = re.match(r"^(\s*)\$\('([^']+)'\)\.checked\s*=\s*(.*);\s*$", line)
    if m and 'fieldSet' not in line and 'if ($' not in line:
        ind, fid, rhs = m.group(1), m.group(2), m.group(3)
        out.append(f"{ind}fieldSet('{fid}', {rhs});\n")
        continue
    # Guaranteed if ($('x')) $('x').value = ... already safe — leave
    out.append(line)
body = ''.join(out)

# also protect textContent on summary count when field missing
body = body.replace(
    "$('attractionSummaryCount').textContent = `${$('attractionSummary').value.length} / 250`;",
    "if ($('attractionSummaryCount')) $('attractionSummaryCount').textContent = `${fieldVal('attractionSummary').length} / 250`;",
)
body = body.replace(
    "$('eventSummaryCount').textContent = `${$('eventSummary').value.length} / 250`;",
    "if ($('eventSummaryCount')) $('eventSummaryCount').textContent = `${fieldVal('eventSummary').length} / 250`;",
)
body = body.replace(
    "$('gastroSummaryCount').textContent = `${$('gastroSummary').value.length} / 250`;",
    "if ($('gastroSummaryCount')) $('gastroSummaryCount').textContent = `${fieldVal('gastroSummary').length} / 250`;",
)

html = before + body + after
# bump to v27 already; keep v27 or bump v28 for cache
if 'content="v27"' in html:
    html = html.replace('content="v27"', 'content="v28"', 1)
elif 'content="v26"' in html:
    html = html.replace('content="v26"', 'content="v28"', 1)

path.write_text(html, encoding='utf-8')
Path('/tmp/comtur-content-admin.server.html').write_text(html, encoding='utf-8')
print('fieldSet' in html, 'v28' in html[:500])
# count unguarded in loadItemForEdit
body = html[html.find('function loadItemForEdit'):html.find('// --- BUILD PAYLOAD ---')]
unguarded = [ln.strip() for ln in body.splitlines() if re.search(r"\$\('[^']+'\)\.value\s*=", ln) and 'if ($' not in ln and 'fieldSet' not in ln]
print('unguarded assigns', len(unguarded))
for u in unguarded[:15]:
    print(' ', u[:100])
