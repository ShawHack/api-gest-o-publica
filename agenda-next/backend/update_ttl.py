import re

filepath = '/home/semit/Documentos/api-semit/backend/helpers/memorial-auth-tokens.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("process.env.MEMORIAL_ACCESS_TTL || '15m'", "process.env.MEMORIAL_ACCESS_TTL || '7d'")
content = content.replace("process.env.MEMORIAL_REFRESH_DAYS || '7'", "process.env.MEMORIAL_REFRESH_DAYS || '30'")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("memorial-auth-tokens.js atualizado com sucesso!")
