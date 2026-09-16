import urllib.request
import urllib.error
import subprocess
import json

def run_cmd(cmd):
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return p.stdout.strip(), p.stderr.strip()

print("--- DB USERS ---")
out, err = run_cmd("docker exec -i sd_docs-postgres psql -U sd_docs -d sd_docs_prod -c \"SELECT id, name, organization_id, active, avatar_url FROM users;\"")
print(out)

print("--- STORAGE FILES ---")
out, err = run_cmd("docker exec sd_docs-api find /app/apps/api/storage -type f")
print(out)

print("--- TESTING API AVATAR ENDPOINT ---")
# Let's inspect docker logs of sd_docs-api and sd_docs-web for any 401 or errors
out, err = run_cmd("docker logs --tail 30 sd_docs-api")
print("API LOGS:\n", out)
out, err = run_cmd("docker logs --tail 30 sd_docs-web")
print("WEB LOGS:\n", out)
