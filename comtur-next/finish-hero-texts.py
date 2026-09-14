#!/usr/bin/env python3
import json, subprocess, os, time
subprocess.check_call(["docker", "tag", "api-semit-api:comtur-hero-texts", "api-semit-api:latest"])
info = json.loads(subprocess.check_output(["docker", "inspect", "api"]))[0]
workdir = info["Config"]["Labels"]["com.docker.compose.project.working_dir"]
print("WORKDIR", workdir)
os.chdir(workdir)
subprocess.check_call(["docker", "compose", "up", "-d", "--no-deps", "--force-recreate", "api"])
subprocess.check_call(["docker", "exec", "nginx", "nginx", "-t"])
subprocess.check_call(["docker", "exec", "nginx", "nginx", "-s", "reload"])
for _ in range(40):
    st = subprocess.check_output(["docker", "inspect", "api", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}"], text=True).strip()
    print("status", st)
    if st == "healthy":
        break
    time.sleep(2)
print("HERO_TEXTS_OK")
