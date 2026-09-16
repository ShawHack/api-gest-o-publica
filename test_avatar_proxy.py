import urllib.request
import json
import subprocess

# Generate an auth token for user 84e7e96c-0543-4116-b2d4-099bec2c8212 or login
cmd = "docker exec sd_docs-postgres psql -U sd_docs -d sd_docs_prod -t -c \"SELECT token FROM refresh_tokens WHERE user_id = '84e7e96c-0543-4116-b2d4-099bec2c8212' ORDER BY created_at DESC LIMIT 1;\""
p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("Latest refresh token in DB:", p.stdout.strip()[:30])

# Let's test calling api directly via nestjs
# In apps/api, let's see how tokens are signed or let's test /auth/refresh
refreshToken = p.stdout.strip()
if refreshToken:
    req = urllib.request.Request(
        "http://127.0.0.1:3002/auth/refresh",
        data=json.dumps({"refreshToken": refreshToken}).encode('utf-8'),
        headers={"Content-Type": "application/json", "X-App-Hostname": "garca.sp.gov.br"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            accessToken = data.get("accessToken")
            print("Got accessToken:", accessToken[:30])

            # Now test GET /users/84e7e96c-0543-4116-b2d4-099bec2c8212/avatar?ext=jpg
            req_avatar = urllib.request.Request(
                "http://127.0.0.1:3002/users/84e7e96c-0543-4116-b2d4-099bec2c8212/avatar?ext=jpg",
                headers={"Authorization": f"Bearer {accessToken}", "X-App-Hostname": "garca.sp.gov.br"}
            )
            with urllib.request.urlopen(req_avatar) as resp_avatar:
                body = resp_avatar.read()
                print("API avatar response status:", resp_avatar.status)
                print("API avatar headers:", resp_avatar.headers.items())
                print("API avatar size:", len(body))

            # Now test GET through web proxy with cookie sd_access
            req_web = urllib.request.Request(
                "http://127.0.0.1:3003/api/backend/users/84e7e96c-0543-4116-b2d4-099bec2c8212/avatar?ext=jpg",
                headers={"Cookie": f"sd_access={accessToken}", "Host": "localhost"}
            )
            with urllib.request.urlopen(req_web) as resp_web:
                body_web = resp_web.read()
                print("WEB proxy avatar status:", resp_web.status)
                print("WEB proxy headers:", resp_web.headers.items())
                print("WEB proxy size:", len(body_web))
    except Exception as e:
        print("Error:", e)
