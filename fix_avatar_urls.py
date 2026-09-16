import subprocess
import os

# 1. Update existing records in postgres
sql = "UPDATE users SET avatar_url = CONCAT('/docs', avatar_url) WHERE avatar_url LIKE '/api/backend/%';"
p = subprocess.run(["docker", "exec", "sd_docs-postgres", "psql", "-U", "sd_docs", "-d", "sd_docs_prod", "-c", sql], capture_output=True, text=True)
print("Postgres update result:", p.stdout.strip(), p.stderr.strip())

# 2. Update structure.service.ts and users.service.ts so future uploads have /docs prefix
files = [
    ('/home/semit/Documentos/sd_docs/apps/api/src/structure/structure.service.ts', [
        ('const avatarUrl = `/api/backend/users/${actor.id}/avatar?ext=${extension}&v=${Date.now()}`;',
         'const avatarUrl = `/docs/api/backend/users/${actor.id}/avatar?ext=${extension}&v=${Date.now()}`;')
    ]),
    ('/home/semit/Documentos/sd_docs/apps/api/src/admin/users/users.service.ts', [
        ('const avatarUrl = `/api/backend/users/${id}/avatar?ext=${extension}&v=${Date.now()}`;',
         'const avatarUrl = `/docs/api/backend/users/${id}/avatar?ext=${extension}&v=${Date.now()}`;')
    ])
]

for filepath, reps in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            c = f.read()
        for old, new in reps:
            if old in c:
                c = c.replace(old, new)
                print(f"Patched {os.path.basename(filepath)}")
            else:
                print(f"Pattern not found in {os.path.basename(filepath)}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(c)

# 3. Check users avatar_url now
p2 = subprocess.run(["docker", "exec", "sd_docs-postgres", "psql", "-U", "sd_docs", "-d", "sd_docs_prod", "-c", "SELECT id, name, avatar_url FROM users WHERE avatar_url IS NOT NULL LIMIT 5;"], capture_output=True, text=True)
print("Updated users:\n", p2.stdout.strip())
