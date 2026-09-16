#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime

helper = Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-content.js")
ht = helper.read_text(encoding="utf-8")

old = """  if (query.type) {
    if (!TYPE_SET.has(String(query.type))) return { error: 'Tipo inválido' }
    filter.type = String(query.type)
  }"""

new = """  if (query.type) {
    if (!TYPE_SET.has(String(query.type))) return { error: 'Tipo inválido' }
    filter.type = String(query.type)
    // Integrações marcadas como não visíveis não entram no portal público
    if (filter.type === 'integration') {
      filter['metadata.showOnPortal'] = { $ne: false }
    }
  }"""

if "metadata.showOnPortal" not in ht:
    if old not in ht:
        raise SystemExit("publicContentFilter type block not found")
    ht = ht.replace(old, new, 1)
    helper.write_text(ht, encoding="utf-8")
    print("HELPER_FILTER_OK")
else:
    print("HELPER_ALREADY")

# Patch getPublic in controller
ctrl = Path("/home/semit/Documentos/api-semit/backend/controllers/ComturContentController.js")
ct = ctrl.read_text(encoding="utf-8")
bak = ctrl.with_name(f"ComturContentController.js.bak-integration-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
if "showOnPortal" not in ct:
    bak.write_text(ct, encoding="utf-8")
    old_get = "static async getPublic(req,res){const data=await Content.findOne({slug:req.params.slug,status:'published'}).select('-createdBy -updatedBy -__v').lean();return data?res.json({data}):res.status(404).json({error:'Conteúdo não encontrado'})}"
    new_get = "static async getPublic(req,res){const data=await Content.findOne({slug:req.params.slug,status:'published'}).select('-createdBy -updatedBy -__v').lean();if(!data)return res.status(404).json({error:'Conteúdo não encontrado'});if(data.type==='integration'&&data.metadata&&data.metadata.showOnPortal===false)return res.status(404).json({error:'Conteúdo não encontrado'});return res.json({data})}"
    if old_get not in ct:
        raise SystemExit("getPublic block not found")
    ct = ct.replace(old_get, new_get, 1)
    ctrl.write_text(ct, encoding="utf-8")
    print("CTRL_GETPUBLIC_OK", bak.name)
else:
    print("CTRL_ALREADY")

print("DONE")
