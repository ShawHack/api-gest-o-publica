import subprocess
import json

# Test POST to https://api.garca.sp.gov.br/ferramentas/api/tools with kind=word-to-pdf
p = subprocess.run([
    "curl", "-k", "-s", "-X", "POST",
    "-F", "kind=word-to-pdf",
    "-F", "files=@/tmp/teste.docx",
    "https://api.garca.sp.gov.br/ferramentas/api/tools"
], capture_output=True, text=True)

print("HTTPS Status & Response:")
print(p.stdout)
