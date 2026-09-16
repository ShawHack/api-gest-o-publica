from pathlib import Path

p = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
text = p.read_text()
marker = "  location /api/ {"
idx = text.find(marker)
if idx < 0:
    raise SystemExit("location /api/ not found")
end = text.find("\n  }\n", idx)
if end < 0:
    raise SystemExit("end of location /api/ not found")
block = text[idx:end + 5]
if "proxy_read_timeout" in block:
    print("already has proxy_read_timeout")
else:
    new_block = block.replace(
        "    client_max_body_size 500m;\n  }",
        "    client_max_body_size 500m;\n"
        "    proxy_connect_timeout 60s;\n"
        "    proxy_send_timeout 300s;\n"
        "    proxy_read_timeout 300s;\n"
        "  }",
    )
    if new_block == block:
        raise SystemExit("could not patch block")
    text = text[:idx] + new_block + text[end + 5 :]
    p.write_text(text)
    print("nginx patched")
