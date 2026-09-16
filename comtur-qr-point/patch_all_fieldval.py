#!/usr/bin/env python3
"""Patch comtur-content-admin: safe fieldVal across buildPayload + hours helper."""
from pathlib import Path
import re

path = Path(__file__).with_name('comtur-content-admin.server.html')
html = path.read_text(encoding='utf-8')

# bump cache
html = html.replace('content="v26"', 'content="v27"', 1)
html = html.replace('content="v25"', 'content="v27"', 1)

# harden getHoursData
old_hours = '''  function getHoursData(containerId = 'gastroHoursTable') {
    const el = $(containerId);
    if (!el) return {};
    const res = {};
    el.querySelectorAll('.hours-row').forEach(row => {
      const dayId = row.dataset.day;
      const closed = row.querySelector('.hours-closed-chk').checked;
      const open = row.querySelector('.hours-open').value.trim();
      const close = row.querySelector('.hours-close').value.trim();
      const open2 = row.querySelector('.hours-open2').value.trim();
      const close2 = row.querySelector('.hours-close2').value.trim();
      res[dayId] = { closed, open, close, open2, close2 };
    });
    return res;
  }'''

new_hours = '''  function getHoursData(containerId = 'gastroHoursTable') {
    const el = $(containerId);
    if (!el) return {};
    const res = {};
    el.querySelectorAll('.hours-row').forEach(row => {
      const dayId = row.dataset.day;
      const closedEl = row.querySelector('.hours-closed-chk');
      const openEl = row.querySelector('.hours-open');
      const closeEl = row.querySelector('.hours-close');
      const open2El = row.querySelector('.hours-open2');
      const close2El = row.querySelector('.hours-close2');
      const closed = !!(closedEl && closedEl.checked);
      const open = openEl && openEl.value ? String(openEl.value).trim() : '';
      const close = closeEl && closeEl.value ? String(closeEl.value).trim() : '';
      const open2 = open2El && open2El.value ? String(open2El.value).trim() : '';
      const close2 = close2El && close2El.value ? String(close2El.value).trim() : '';
      res[dayId] = { closed, open, close, open2, close2 };
    });
    return res;
  }'''

if old_hours in html:
    html = html.replace(old_hours, new_hours, 1)
else:
    print('WARN: getHoursData block not found exact')

start = html.find('function buildPayload(statusToSave)')
end = html.find('// --- SAVE ACTION ---', start)
if start < 0 or end < 0:
    raise SystemExit('buildPayload bounds not found')

before, body, after = html[:start], html[start:end], html[end:]

# Attraction ID aliases: payload expects old names, DOM has newer ones
attraction_aliases = {
    "attractionPriceType": "attractionEntryType",
    "attractionHighlightBadge": "attractionSeoShareText",
    "attractionBestTimeToVisit": "attractionBestSeason",
    "attractionReferencePoint": "attractionReference",
    "attractionGoogleMapsUrl": "attractionWebsite",  # fallback no maps url field; keep empty via missing - use '' better
    "attractionProfilesList": "attractionAudienceList",
    "attractionRestrictionsList": "attractionAccessibilityList",  # chips missing; avoid crash
    "attractionPaymentList": "attractionAccessibilityList",
    "attractionPublishDate": "attractionFeatured",  # publish date missing; featured is checkbox - BAD
}

# Better: for missing publish date just use fieldVal which returns ''
# Map GoogleMaps to empty - don't map to website
attraction_aliases = {
    'attractionPriceType': 'attractionEntryType',
    'attractionBestTimeToVisit': 'attractionBestSeason',
    'attractionReferencePoint': 'attractionReference',
    'attractionProfilesList': 'attractionAudienceList',
}

for old, new in attraction_aliases.items():
    body = body.replace(f"$('{old}')", f"$('{new}')")
    body = body.replace(f"getSelectedChips('{old}')", f"getSelectedChips('{new}')")

# lodging payment list id mismatch
body = body.replace("getSelectedChips('lodgingPaymentList')", "getSelectedChips('lodgingPaymentMethodsList')")
body = body.replace("getSelectedChips('shopPaymentList')", "getSelectedChips('shopPaymentMethodsList')")

# Mechanical safe reads inside buildPayload:
# 1) $('id').value.trim() -> fieldVal('id')
body = re.sub(
    r"\$\('([^']+)'\)\.value\.trim\(\)",
    r"fieldVal('\1')",
    body,
)
# 2) ($('id').value || '').trim() -> fieldVal('id')
body = re.sub(
    r"\(\s*\$\('([^']+)'\)\.value\s*\|\|\s*''\s*\)\.trim\(\)",
    r"fieldVal('\1')",
    body,
)
# 3) $('id').value ? ... keep using fieldVal for the read
# $('x').value ? new Date($('x').value) -> fieldVal
body = re.sub(
    r"\$\('([^']+)'\)\.value\s*\?\s*new Date\(\$\('([^']+)'\)\.value\)",
    lambda m: f"fieldVal('{m.group(1)}') ? new Date(fieldVal('{m.group(2)}'))" if m.group(1)==m.group(2) else m.group(0),
    body,
)
# 4) Remaining $('id').value (not assignment, not already fieldVal)
# Avoid replacing inside comments; do simple replace for .value and .checked reads

def replace_value_reads(s: str) -> str:
    # $('id').value || undefined / || '' / || 'x' / plain
    s = re.sub(
        r"\$\('([^']+)'\)\.value(?!\s*=)",
        r"fieldVal('\1')",
        s,
    )
    s = re.sub(
        r"\$\('([^']+)'\)\.checked(?:\s*===\s*true)?(?!\s*=)",
        r"!!fieldVal('\1', false)",
        s,
    )
    return s

body = replace_value_reads(body)

# Fix location objects -> string + metadata.address for main tourism types
def fix_location_block(type_name: str, block: str) -> str:
    # replace location: { street, number, complement, neighborhood, referencePoint },
    # with location string + address in metadata if not already
    pattern = r"location:\s*\{\s*street,\s*number,\s*complement,\s*neighborhood,\s*referencePoint\s*\},"
    if not re.search(pattern, block):
        return block
    # insert locationStr before return if missing
    if 'const locationStr' not in block:
        block = re.sub(
            r"(return \{\s*\n\s*type: '" + type_name + r"',)",
            r"const locationStr = [street, number, complement, neighborhood, referencePoint].filter(Boolean).join(', ');\n      \1",
            block,
            count=1,
        )
    block = re.sub(pattern, "location: locationStr,", block, count=1)
    # inject address into metadata if missing
    if 'address: { street' not in block:
        block = re.sub(
            r"(metadata:\s*\{)",
            r"\1\n          address: { street, number, complement, neighborhood, referencePoint },",
            block,
            count=1,
        )
    # contact: keep phone email website; move whatsapp/instagram to metadata if present as contact fields
    return block

# Split body by type blocks roughly and apply location fix
for t in ['attraction', 'event', 'lodging', 'shopping', 'service']:
    # find this type section within body
    m = re.search(rf"if \(currentType === '{t}'\) \{{", body)
    if not m:
        continue
    start_i = m.start()
    # next if currentType or end
    m2 = re.search(r"\n    if \(currentType === '", body[start_i+5:])
    end_i = start_i + 5 + m2.start() if m2 else len(body)
    section = body[start_i:end_i]
    section2 = fix_location_block(t, section)
    # also add videoUrl from *VideoUrl if metadata block exists and videoUrl not present
    vid_id = {
        'attraction': 'attractionVideoUrl',
        'event': 'eventVideoUrl',
        'lodging': 'lodgingVideoUrl',
        'shopping': 'shopVideoUrl',
        'service': 'svcVideoUrl',
        'route': 'routeVideoUrl',
    }.get(t)
    if vid_id and 'videoUrl' not in section2 and 'metadata:' in section2:
        # add const videoUrl near other fields
        section2 = re.sub(
            rf"(if \(currentType === '{t}'\) \{{)",
            rf"\1\n      const videoUrl = fieldVal('{vid_id}');",
            section2,
            count=1,
        )
        section2 = re.sub(
            r"(metadata:\s*\{)",
            r"\1\n          videoUrl,",
            section2,
            count=1,
        )
    body = body[:start_i] + section2 + body[end_i:]

# attraction: priceType from entry type, highlightBadge/bestTime already aliased
# ensure highlightBadge and publishDate don't crash — already fieldVal
# add missing field consts for fields that may not exist after alias
# Fix getHoursData calls that lost optional typeof guard - gastronomy already has it

# Fix accidental fieldVal on options access like fieldVal('accPeriodRef').options
body = body.replace(
    "fieldVal('accPeriodRef').options?.[fieldVal('accPeriodRef').selectedIndex]",
    "(($('accPeriodRef')||{}).options||{})[($('accPeriodRef')||{}).selectedIndex]",
)
# Also period line may be broken - check
body = re.sub(
    r"\? 'Período personalizado'\s*: \(fieldVal\('accPeriodRef'\) \|\| .*?\|\| periodType\)",
    "? 'Período personalizado' : (fieldVal('accPeriodRef') || periodType)",
    body,
    flags=re.S,
)

# council media should use kind image
body = body.replace(
    """        media.push({
          type: 'photo',
          url: councilPhotoUrl,
          caption: photoAlt,
          alt: photoAlt,
          order: 0
        });""",
    """        media.push({
          kind: 'image',
          title: photoAlt,
          url: councilPhotoUrl,
          mimeType: 'image/jpeg',
          isAccessible: !!photoAlt
        });""",
)

html2 = before + body + after

# Verify no raw .value.trim left in buildPayload
bp = html2[html2.find('function buildPayload'):html2.find('// --- SAVE ACTION ---')]
leftover = re.findall(r"\$\('[^']+'\)\.(value|checked)", bp)
print('leftover $= reads in buildPayload:', len(leftover))
for x in leftover[:30]:
    pass
# print lines
for m in re.finditer(r"^.*\$\('[^']+'\)\.(value|checked).*$", bp, re.M):
    print(' LEFT:', m.group(0).strip()[:120])

path.write_text(html2, encoding='utf-8')
print('Wrote', path, 'size', path.stat().st_size)
