import json
d = json.load(open("/tmp/nginx-inspect.json"))
for m in d[0]["Mounts"]:
    print(m.get("Source"), "->", m.get("Destination"))
