admin_path = "/home/semit/Documentos/sd_docs/apps/web/src/components/admin.tsx"
with open(admin_path, "r", encoding="utf-8") as f:
    c = f.read()

import re
c = re.sub(r',\s*ImagePlus,\s*Upload\}\s*from\s*"lucide-react";', '  ImagePlus,\n  Upload,\n} from "lucide-react";', c)

with open(admin_path, "w", encoding="utf-8") as f:
    f.write(c)

print("Import cleaned successfully")
