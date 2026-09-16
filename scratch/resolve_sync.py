import re
import subprocess
import os

repo_dir = "/tmp/turismo-sync"
mapa_path = os.path.join(repo_dir, "MAPA_DO_TESOURO.md")

with open(mapa_path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = r"<<<<<<< HEAD\r?\n(.*?)=======\r?\n(.*?)\r?\n>>>>>>> [^\r\n]+\r?\n"
match = re.search(pattern, content, re.DOTALL)

if match:
    head_part = match.group(1).strip()
    incoming_part = match.group(2).strip()
    
    parts = []
    if incoming_part:
        parts.append(incoming_part)
    if head_part:
        parts.append(head_part)
    combined = "\n\n".join(parts)
    
    resolved = content[:match.start()] + combined + "\n\n" + content[match.end():]
    with open(mapa_path, "w", encoding="utf-8") as f:
        f.write(resolved)
    print("Conflict in MAPA_DO_TESOURO.md resolved successfully.")
    
    res = subprocess.run(["git", "add", "MAPA_DO_TESOURO.md"], cwd=repo_dir, capture_output=True, text=True)
    print("git add:", res.returncode, res.stdout, res.stderr)
    
    res2 = subprocess.run(["git", "-c", "core.editor=true", "cherry-pick", "--continue"], cwd=repo_dir, capture_output=True, text=True)
    print("git cherry-pick --continue:", res2.returncode, res2.stdout, res2.stderr)
    
    res3 = subprocess.run(["git", "log", "-n", "5", "--oneline"], cwd=repo_dir, capture_output=True, text=True)
    print("git log:\n", res3.stdout)
else:
    print("Conflict pattern not found! Current content snippet:")
    print(repr(content[:500]))
