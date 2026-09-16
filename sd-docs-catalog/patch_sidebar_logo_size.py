#!/usr/bin/env python3
from pathlib import Path

css = Path("/home/semit/Documentos/sd_docs/apps/web/src/app/globals.css")
text = css.read_text(encoding="utf-8")

replacements = [
    (
        """.app-sidebar-logo-image {
  display: block;
  height: var(--ui-logo-height, 35px);
  width: var(--ui-logo-width, auto);
  max-width: 172px;
  object-fit: contain;
  object-position: left center;
}""",
        """.app-sidebar-logo-image {
  display: block;
  height: var(--ui-logo-height, 48px);
  width: var(--ui-logo-width, auto);
  max-width: 228px;
  object-fit: contain;
  object-position: left center;
}""",
    ),
    (
        """.app-sidebar-brand {
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  gap: var(--space-2);
  height: var(--header-height);
  justify-content: space-between;
  padding: 0 var(--space-3);
}""",
        """.app-sidebar-brand {
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  gap: var(--space-2);
  height: 72px;
  min-height: 72px;
  justify-content: space-between;
  padding: 0 var(--space-3);
}""",
    ),
    (
        """.app-sidebar-logo-image.compact {
  border-radius: 9px;
  height: 38px;
  object-fit: contain;
  width: 38px;
}""",
        """.app-sidebar-logo-image.compact {
  border-radius: 9px;
  height: 44px;
  object-fit: contain;
  width: 44px;
}""",
    ),
]

for old, new in replacements:
    if old not in text:
        # already patched?
        if new in text:
            print("already ok:", old.splitlines()[0])
            continue
        raise SystemExit(f"block not found: {old.splitlines()[0]}")
    text = text.replace(old, new, 1)
    print("patched:", old.splitlines()[0])

css.write_text(text, encoding="utf-8")
print("CSS_OK")
