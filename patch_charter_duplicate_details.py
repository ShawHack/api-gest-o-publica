#!/usr/bin/env python3
import os
import re

API_FILE = "/home/semit/Documentos/sd_docs/apps/api/src/structure/structure.service.ts"
WEB_FILE = "/home/semit/Documentos/sd_docs/apps/web/src/components/structure-account.tsx"

# 1. Update Backend API: apps/api/src/structure/structure.service.ts
with open(API_FILE, "r", encoding="utf-8") as f:
    api_content = f.read()

# Helper method to format duplicate message
format_helper = '''  private formatDuplicateCharterMessage(duplicate: {
    name: string;
    status: string;
    sector?: { name: string; code?: string } | null;
    taxonomyContext?: { name: string } | null;
    subjects?: Array<{ subject?: { name: string } | null }>;
    parent?: { name: string } | null;
  }) {
    const details: string[] = [];
    if (duplicate.taxonomyContext?.name) {
      details.push(`Categoria: "${duplicate.taxonomyContext.name}"`);
    } else if (duplicate.subjects?.length) {
      const subNames = duplicate.subjects
        .map((s) => s.subject?.name)
        .filter(Boolean);
      if (subNames.length) details.push(`Categoria: "${subNames.join(", ")}"`);
    }
    if (duplicate.sector?.name) {
      details.push(`Setor: "${duplicate.sector.name}"`);
    }
    if (duplicate.parent?.name) {
      details.push(`Pasta/Serviço Pai: "${duplicate.parent.name}"`);
    }
    const statusLabel =
      duplicate.status === "ACTIVE"
        ? "Ativo"
        : duplicate.status === "INACTIVE"
          ? "Inativo"
          : duplicate.status;
    details.push(`Status: ${statusLabel}`);

    return `Já existe um serviço cadastrado com este nome nesta categoria (${details.join(" | ")}).`;
  }'''

# Replace format helper if exists
api_content = re.sub(
    r'  private formatDuplicateCharterMessage\(.*?return `Já existe um serviço cadastrado com este nome.*?\n  \}',
    format_helper,
    api_content,
    flags=re.DOTALL,
)

# Update createServiceCharter duplicate check to include taxonomyContextId
create_pattern = r'(\s+const duplicate = await this\.prisma\.serviceCharter\.findFirst\(\{\s+where: \{\s+organizationId: actor\.organizationId,)(.*?)(name: \{ equals: trimmedName, mode: "insensitive" \},)'
create_replacement = r'\1\n        ...(dto.taxonomyContextId ? { taxonomyContextId: dto.taxonomyContextId } : {}),\n        \3'

# If not already filtered by taxonomyContextId in createServiceCharter
if "dto.taxonomyContextId ? { taxonomyContextId: dto.taxonomyContextId }" not in api_content:
    api_content = re.sub(create_pattern, create_replacement, api_content, count=1, flags=re.DOTALL)
    print("Scaped createServiceCharter duplicate check to category (taxonomyContextId)")

# Update updateServiceCharter duplicate check to include taxonomyContextId
update_search_block = '''    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) throw new BadRequestException("Informe o nome do serviço");
      const duplicate = await this.prisma.serviceCharter.findFirst({
        where: {
          id: { not: id },
          organizationId: actor.organizationId,'''

update_replace_block = '''    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) throw new BadRequestException("Informe o nome do serviço");
      const targetContextId =
        dto.taxonomyContextId !== undefined
          ? dto.taxonomyContextId
          : current.taxonomyContextId;
      const duplicate = await this.prisma.serviceCharter.findFirst({
        where: {
          id: { not: id },
          organizationId: actor.organizationId,
          ...(targetContextId ? { taxonomyContextId: targetContextId } : {}),'''

if update_search_block in api_content:
    api_content = api_content.replace(update_search_block, update_replace_block, 1)
    print("Scoped updateServiceCharter duplicate check to category (taxonomyContextId)")

with open(API_FILE, "w", encoding="utf-8") as f:
    f.write(api_content)
print("Saved structure.service.ts")


# 2. Update Frontend: apps/web/src/components/structure-account.tsx
with open(WEB_FILE, "r", encoding="utf-8") as f:
    web_content = f.read()

old_web_check = '''      const allLoadedRows = flattenCharters(query.data ?? []);
      const duplicateCharter = allLoadedRows.find(
        ({ node }) =>
          node.id !== editingId &&
          normalizeCharterName(node.name) === normalizeCharterName(trimmedName),
      );'''

new_web_check = '''      const currentContextId = form.taxonomyContextId || activeCategoryId;
      const allLoadedRows = flattenCharters(query.data ?? []);
      const duplicateCharter = allLoadedRows.find(
        ({ node }) =>
          node.id !== editingId &&
          node.taxonomyContextId === currentContextId &&
          normalizeCharterName(node.name) === normalizeCharterName(trimmedName),
      );'''

if old_web_check in web_content:
    web_content = web_content.replace(old_web_check, new_web_check, 1)
    print("Scoped client validation in structure-account.tsx to category")
else:
    # Try general pattern replacement
    web_content = re.sub(
        r'const isDuplicate = allRows\.some\(.*?\);',
        '''const currentContextId = form.taxonomyContextId || activeCategoryId;
      const allLoadedRows = flattenCharters(query.data ?? []);
      const duplicateCharter = allLoadedRows.find(
        ({ node }) =>
          node.id !== editingId &&
          node.taxonomyContextId === currentContextId &&
          normalizeCharterName(node.name) === normalizeCharterName(trimmedName),
      );''',
        web_content,
        flags=re.DOTALL
    )

with open(WEB_FILE, "w", encoding="utf-8") as f:
    f.write(web_content)
print("Saved structure-account.tsx")
