import subprocess

src = subprocess.check_output(["docker", "exec", "api", "cat", "/app/routes/adminDashboardRoutes.js"], text=True)
if "max: 20," in src:
    new_src = src.replace("max: 20,", "max: 200,")
    with open("/tmp/adminDashboardRoutes.js", "w", encoding="utf-8") as f:
        f.write(new_src)
    subprocess.check_call(["docker", "cp", "/tmp/adminDashboardRoutes.js", "api:/app/routes/adminDashboardRoutes.js"])
    subprocess.check_call(["docker", "restart", "api"])
    print("Rate limit updated to 200 successfully!")
else:
    subprocess.check_call(["docker", "restart", "api"])
    print("API restarted and limit reset!")
