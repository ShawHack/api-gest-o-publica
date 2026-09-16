#!/usr/bin/env python3
"""Fix featured links for integration/open_data/research + unfeature test docs."""
from pathlib import Path
import re, subprocess, json

# 1) Unfeature test content so homepage is clean
js = r'''
process.chdir('/app');
const mongoose = require('mongoose');
const Content = require('./models/ComturContent');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const slugs = [
    'mapaturistico-1789491743472',
    'atrativos-turisticos-1789490861518',
    'pesquisa-teste-satisfacao-1789490203055',
  ];
  const r = await Content.updateMany(
    { slug: { $in: slugs } },
    { $set: { featured: false } }
  );
  console.log(JSON.stringify({ matched: r.matchedCount ?? r.n, modified: r.modifiedCount ?? r.nModified }));
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
'''
Path('/tmp/unfeature_tests.js').write_text(js, encoding='utf-8')
subprocess.check_call(['docker', 'cp', '/tmp/unfeature_tests.js', 'api:/app/unfeature_tests.js'])
out = subprocess.check_output(['docker', 'exec', '-w', '/app', 'api', 'node', '/app/unfeature_tests.js'], text=True)
print('UNFEATURE', out.strip())
subprocess.call(['docker', 'exec', 'api', 'rm', '-f', '/app/unfeature_tests.js'])

# 2) Patch SPA featured + card links for document types with static public pages
assets = Path('/home/semit/Documentos/api-semit/backend/public/turismo/assets')
files = sorted(assets.glob('index-*.js'), key=lambda p: p.stat().st_mtime, reverse=True)
# patch the newest that contains featured-hero-card
target = None
for f in files:
    t = f.read_text(encoding='utf-8', errors='ignore')
    if 'featured-hero-card' in t and 'Documento do COMTUR' in t:
        target = f
        break
if not target:
    raise SystemExit('SPA bundle not found')

text = target.read_text(encoding='utf-8')
bak = target.with_suffix(target.suffix + '.bak-featured')
if not bak.exists():
    bak.write_text(text, encoding='utf-8')
    print('BAK', bak.name)

# Add integration to document types label list Vu
old_vu_tail = '{type:"open_data",label:"Dados abertos"}]'
new_vu_tail = '{type:"open_data",label:"Dados abertos"},{type:"integration",label:"Integrações"}]'
if '{type:"integration",label:"Integrações"}' not in text:
    if old_vu_tail not in text:
        raise SystemExit('Vu open_data tail not found')
    text = text.replace(old_vu_tail, new_vu_tail, 1)
    print('VU_INTEGRATION_LABEL')

# Inject helper for public URL of content near oa/Dp functions
# After: function Dp(e){return bp.has(e==null?void 0:e.type)}
helper = (
    'function Dp(e){return bp.has(e==null?void 0:e.type)}'
    'function comturPublicHref(e){'
    'var t=e&&e.type,s=e&&e.slug,m=e&&e.metadata||{};'
    'if(t==="integration"){if(m.publicUrl)return m.publicUrl;if(m.documentationUrl)return m.documentationUrl;if(s)return"/turismo/integracoes/"+encodeURIComponent(s)}'
    'if(t==="open_data"&&s)return"/turismo/dados-abertos/"+encodeURIComponent(s);'
    'if(t==="research"&&s)return"/turismo/pesquisas/"+encodeURIComponent(s);'
    'return null}'
)
if 'function comturPublicHref' not in text:
    if 'function Dp(e){return bp.has(e==null?void 0:e.type)}' not in text:
        raise SystemExit('Dp function not found')
    text = text.replace(
        'function Dp(e){return bp.has(e==null?void 0:e.type)}',
        helper,
        1,
    )
    print('HELPER_INJECTED')

# Replace featured hero link pattern: href:M(`p/${u.slug}`),onClick:...t(`p/${u.slug}`)
# Need a pattern that uses comturPublicHref when available.
# Minified uses different navigate fn names; replace carefully with a wrapper.

# Strategy: replace `p/${u.slug}` occurrences used in featured-hero with a computed path.
# There may be multiple `p/${u.slug}` - featured uses variable u.

def patch_featured_block(src: str) -> str:
    # Find featured-hero-card anchors
    # Pattern from bundle:
    # href:M(`p/${u.slug}`),onClick:k=>{k.preventDefault(),t(`p/${u.slug}`)}
    # or href:M(`p/${u.slug}`),onClick:k=>{k.preventDefault(),n(`p/${u.slug}`)}
    pat = re.compile(
        r'href:([A-Za-z_$][\w$]*)\(`p/\$\{u\.slug\}`\),onClick:([A-Za-z_$][\w$]*)=>\{\2\.preventDefault\(\),([A-Za-z_$][\w$]*)\(`p/\$\{u\.slug\}`\)\}'
    )
    def repl(m):
        build, ev, nav = m.group(1), m.group(2), m.group(3)
        return (
            f'href:(comturPublicHref(u)||{build}(`p/${{u.slug}}`)),'
            f'onClick:{ev}=>{{{ev}.preventDefault();'
            f'var _h=comturPublicHref(u);'
            f'if(_h){{if(/^https?:/i.test(_h))window.location.href=_h;else window.location.assign(_h)}}'
            f'else {nav}(`p/${{u.slug}}`)}}'
        )
    src2, n = pat.subn(repl, src)
    print('FEATURED_LINKS_PATCHED', n)
    return src2

text = patch_featured_block(text)

# Also when opening detail route p/slug, if type is integration/open_data/research, redirect.
# Find where item d is loaded for path p/: look for get by slug then type switch.
# Safer: patch after item fetch in detail - hard in minify.
# Alternative: at start of generic fiche fallback, redirect.
# Look for: d.type==="attraction"?l.jsx(Th
# Before attraction branch ends with :l.jsxs("article" - the final fallback.
# Insert redirect logic by replacing the fallback opener.

# Simpler approach for deep links: patch fetch-by-slug success handler if identifiable.
# For now featured homepage is the main user path; also patch card links for document types.

# Generic card links href:M(`p/${e.slug}`) — variable e
pat_card = re.compile(
    r'href:([A-Za-z_$][\w$]*)\(`p/\$\{e\.slug\}`\),onClick:([A-Za-z_$][\w$]*)=>\{\2\.preventDefault\(\),([A-Za-z_$][\w$]*)\(`p/\$\{e\.slug\}`\)\}'
)
def repl_card(m):
    build, ev, nav = m.group(1), m.group(2), m.group(3)
    return (
        f'href:(comturPublicHref(e)||{build}(`p/${{e.slug}}`)),'
        f'onClick:{ev}=>{{{ev}.preventDefault();'
        f'var _h=comturPublicHref(e);'
        f'if(_h){{if(/^https?:/i.test(_h))window.location.href=_h;else window.location.assign(_h)}}'
        f'else {nav}(`p/${{e.slug}}`)}}'
    )
text, n2 = pat_card.subn(repl_card, text)
print('CARD_LINKS_PATCHED', n2)

target.write_text(text, encoding='utf-8')
print('WRITTEN', target.name, target.stat().st_size)

# verify featured API
import urllib.request, ssl
ctx = ssl._create_unverified_context()
with urllib.request.urlopen('https://127.0.0.1/api/comtur/content?featured=true&limit=10', context=ctx, timeout=15) as r:
    data = json.loads(r.read().decode())
print('FEATURED_NOW', [(i.get('type'), i.get('slug'), i.get('title','')[:40]) for i in data.get('data') or []])
print('HAS_HELPER', 'comturPublicHref' in target.read_text(encoding='utf-8'))
print('HAS_INT_LABEL', 'Integrações' in target.read_text(encoding='utf-8'))
