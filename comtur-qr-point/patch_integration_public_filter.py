#!/usr/bin/env python3
"""Ensure public API hides integrations with showOnPortal=false."""
from pathlib import Path
from datetime import datetime

helper = Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-content.js")
ctrl = Path("/home/semit/Documentos/api-semit/backend/controllers/ComturContentController.js")
ht = helper.read_text(encoding="utf-8")
bak = helper.with_name(f"comtur-content.js.bak-integration-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_text(ht, encoding="utf-8")

# Find publicContentFilter and enhance
if "showOnPortal" not in ht:
    # typical pattern: filter = { status: 'published' }
    # After building filter from type, add optional portal visibility for integration
    needle = None
    for cand in [
        "const filter = { status: 'published' }",
        "filter.status = 'published'",
        "status: 'published'",
    ]:
        if cand in ht:
            needle = cand
            break
    print("HELPER_NEEDLE", needle)
    # print function around publicContentFilter
    idx = ht.find("function publicContentFilter")
    if idx < 0:
        idx = ht.find("publicContentFilter")
    print("CTX", ht[idx:idx+900])
else:
    print("ALREADY_HAS_showOnPortal")
