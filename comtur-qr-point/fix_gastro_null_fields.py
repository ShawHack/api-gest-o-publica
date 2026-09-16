#!/usr/bin/env python3
"""Fix gastronomy buildPayload null .value + add missing publish date field."""
from pathlib import Path
from datetime import datetime
import re, subprocess

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
NAV = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")
text = ADMIN.read_text(encoding="utf-8")
bak = ADMIN.with_name(f"comtur-content-admin.html.bak-gastro-null-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(ADMIN.read_bytes())
print("BAK", bak.name)

# Add safe helpers near $ or showNotice if missing
HELPERS = r'''
  function fieldEl(id) { return $(id); }
  function fieldVal(id, fallback = '') {
    const el = $(id);
    if (!el) return fallback;
    if (el.type === 'checkbox' || el.type === 'radio') return !!el.checked;
    const v = el.value;
    return typeof v === 'string' ? v.trim() : (v == null ? fallback : v);
  }

'''

if "function fieldVal(" not in text:
    # insert before showNotice
    text = text.replace("function showNotice(msg, isError = false) {", HELPERS + "function showNotice(msg, isError = false) {", 1)
    print("HELPERS")

# Replace gastronomy buildPayload block with null-safe version
OLD = None
# find the block precisely
pat = re.compile(
    r"if \(currentType === 'gastronomy'\) \{\n"
    r"      const name = \$\('gastroName'\)\.value\.trim\(\);[\s\S]*?"
    r"media: gastroMedia\n"
    r"      \};\n"
    r"    \}"
)
m = pat.search(text)
if not m:
    raise SystemExit("gastronomy build block not found")

NEW = r'''if (currentType === 'gastronomy') {
      const name = fieldVal('gastroName');
      const slug = slugify(fieldVal('gastroSlug')) || slugify(name);
      const category = fieldVal('gastroCategory');
      const priceLevel = fieldVal('gastroPriceLevel');
      const summary = fieldVal('gastroSummary');
      const body = fieldVal('gastroBody');
      const highlightBadge = fieldVal('gastroHighlightBadge');
      const signatureDishes = fieldVal('gastroSignatureDishes');
      const street = fieldVal('gastroStreet');
      const number = fieldVal('gastroNumber');
      const complement = fieldVal('gastroComplement');
      const neighborhood = fieldVal('gastroNeighborhood');
      const referencePoint = fieldVal('gastroReferencePoint');
      const googleMapsUrl = fieldVal('gastroGoogleMapsUrl');
      const phone = fieldVal('gastroPhone');
      const whatsapp = fieldVal('gastroWhatsapp');
      const email = fieldVal('gastroEmail');
      const website = fieldVal('gastroWebsite');
      const instagram = fieldVal('gastroInstagram');
      const amenities = getSelectedChips('gastroAmenitiesList');
      const dietary = getSelectedChips('gastroDietaryList');
      const accessibility = getSelectedChips('gastroAccessibilityList');
      const paymentMethods = getSelectedChips('gastroPaymentList');
      const languages = getSelectedChips('gastroLanguagesList');
      const openingHours = (typeof getHoursData === 'function') ? getHoursData('gastroHoursTable') : {};
      const featured = !!fieldVal('gastroFeatured', false);
      const pubRaw = fieldVal('gastroPublishDate');
      const publishedAt = pubRaw ? new Date(pubRaw).toISOString() : undefined;

      if (!name) { showNotice('Informe o nome do estabelecimento.', true); return null; }
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
    }'''

text = text[:m.start()] + NEW + text[m.end():]
print("BUILD_SAFE")

# Add publish date next to featured if missing
if 'id="gastroPublishDate"' not in text:
    # insert before gastroFeatured checkbox row
    feat = '''<input id="gastroFeatured" type="checkbox"'''
    # find surrounding structure
    i = text.find(feat)
    if i < 0:
        print("FEATURED_NOT_FOUND")
    else:
        # look backward for the flex container start
        insert = '''
                <div class="comtur-field" style="margin-bottom:12px;">
                  <label for="gastroPublishDate">Data de publicação</label>
                  <input id="gastroPublishDate" type="date" class="comtur-input">
                </div>
'''
        # insert before the div that contains gastroFeatured
        # find '<div style="display: flex; align-items: center' before featured
        window = text[max(0, i-400):i]
        rel = window.rfind("<div")
        abs_pos = max(0, i-400) + rel if rel >= 0 else i
        text = text[:abs_pos] + insert + text[abs_pos:]
        print("PUBLISH_DATE_FIELD")

# Optional price level if missing - find category field and add after
if 'id="gastroPriceLevel"' not in text and 'id="gastroCategory"' in text:
    cat_block_end = text.find('id="gastroCategory"')
    # find closing </div> of the field after select - approximate insert after gastroCategory field container
    # simpler: add hidden defaults via JS only (fieldVal already returns '')
    print("PRICE_LEVEL_OPTIONAL_EMPTY")

ADMIN.write_text(text, encoding="utf-8")

nt = NAV.read_text(encoding="utf-8")
nt2 = nt.replace("comtur-content-admin.html?v=23", "comtur-content-admin.html?v=24").replace("comtur-content-admin.html?v=22", "comtur-content-admin.html?v=24")
if nt2 != nt:
    NAV.write_text(nt2, encoding="utf-8")
    print("NAV_v24")

# bump meta
text = ADMIN.read_text(encoding="utf-8")
text2 = text.replace('content="v23"', 'content="v24"')
if text2 != text:
    ADMIN.write_text(text2, encoding="utf-8")

# syntax check
Path("/tmp/check_admin3.js").write_text(
    "const fs=require('fs');const h=fs.readFileSync('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html','utf8');"
    "const scripts=[...h.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]).join('\\n');"
    "try{new Function(scripts); console.log('SYNTAX_OK')}catch(e){console.error('SYNTAX_ERR', e.message); process.exit(1)}",
    encoding="utf-8",
)
r = subprocess.run(["node", "/tmp/check_admin3.js"], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())

# verify missing ids no longer crash path
admin = ADMIN.read_text(encoding="utf-8")
print("has fieldVal", "function fieldVal(" in admin)
print("has gastroPublishDate", 'id="gastroPublishDate"' in admin)
print("unsafe gastroPriceLevel.value", "$('gastroPriceLevel').value" in admin)
print("DONE", ADMIN.stat().st_size)
