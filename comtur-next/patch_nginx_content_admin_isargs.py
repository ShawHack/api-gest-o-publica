#!/usr/bin/env python3
from pathlib import Path
p = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
t = p.read_text(encoding="utf-8")
old = 'if ($arg_v = "")'
new = 'if ($is_args = "0")'
if new in t:
    print("IS_ARGS_ALREADY")
elif old not in t:
    raise SystemExit("arg_v block missing")
else:
    p.write_text(t.replace(old, new, 1), encoding="utf-8")
    print("IS_ARGS_OK")
