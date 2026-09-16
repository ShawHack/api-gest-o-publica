import os

# 1. Update filterCharterTree in apps/web/src/components/structure-account.tsx
web_path = '/home/semit/Documentos/sd_docs/apps/web/src/components/structure-account.tsx'
if os.path.exists(web_path):
    with open(web_path, 'r', encoding='utf-8') as f:
        web_code = f.read()

    target_filter = '''function filterCharterTree(nodes: Charter[], search: string): Charter[] {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  if (!term) return nodes;

  return nodes.flatMap((node) => {
    const children = filterCharterTree(node.children ?? [], term);
    const matches = node.name.toLocaleLowerCase("pt-BR").includes(term);

    return matches || children.length ? [{ ...node, children }] : [];
  });
}'''

    replacement_filter = '''function filterCharterTree(nodes: Charter[], search: string): Charter[] {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  if (!term) return nodes;

  return nodes.flatMap((node) => {
    const matches = node.name.toLocaleLowerCase("pt-BR").includes(term);
    if (matches) {
      return [node];
    }
    const children = filterCharterTree(node.children ?? [], term);
    return children.length ? [{ ...node, children }] : [];
  });
}'''

    if target_filter in web_code:
        web_code = web_code.replace(target_filter, replacement_filter)
        print("Updated filterCharterTree in structure-account.tsx")
    else:
        print("Target filterCharterTree not found in structure-account.tsx")

    with open(web_path, 'w', encoding='utf-8') as f:
        f.write(web_code)

# 2. Update AdminListToolbar in apps/web/src/components/admin-list-toolbar.tsx
toolbar_path = '/home/semit/Documentos/sd_docs/apps/web/src/components/admin-list-toolbar.tsx'
if os.path.exists(toolbar_path):
    with open(toolbar_path, 'r', encoding='utf-8') as f:
        toolbar_code = f.read()

    target_toolbar = '''  return (
    <div className="admin-toolbar admin-list-toolbar">
      <details className="admin-actions-menu">
        <summary className="admin-button">
          <MoreVertical size={17} aria-hidden />
          Ações
        </summary>
        <div className="admin-actions-menu-panel">{actions}</div>
      </details>
      {searchable && ('''

    replacement_toolbar = '''  return (
    <div className="admin-toolbar admin-list-toolbar">
      <div className="admin-toolbar-actions">{actions}</div>
      {searchable && ('''

    if target_toolbar in toolbar_code:
        toolbar_code = toolbar_code.replace(target_toolbar, replacement_toolbar)
        print("Updated AdminListToolbar to render actions inline")
    else:
        print("Target toolbar not found in admin-list-toolbar.tsx")

    with open(toolbar_path, 'w', encoding='utf-8') as f:
        f.write(toolbar_code)

# 3. Add CSS for admin-toolbar-actions in globals.css if needed
css_path = '/home/semit/Documentos/sd_docs/apps/web/src/app/globals.css'
if os.path.exists(css_path):
    with open(css_path, 'r', encoding='utf-8') as f:
        css_code = f.read()

    if ".admin-toolbar-actions" not in css_code:
        target_css = '''.admin-list-toolbar {
  align-items: center;
}'''
        replacement_css = '''.admin-list-toolbar {
  align-items: center;
}
.admin-toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.admin-toolbar-actions .admin-button {
  height: 38px;
}'''
        css_code = css_code.replace(target_css, replacement_css)
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css_code)
        print("Added .admin-toolbar-actions CSS to globals.css")

print("All patches applied!")
