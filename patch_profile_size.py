import os

files_to_update = [
    ('/home/semit/Documentos/sd_docs/apps/web/src/components/structure-account.tsx', [
        ('file.size > 2 * 1024 * 1024', 'file.size > 10 * 1024 * 1024'),
        ('A foto deve ter no máximo 2 MB', 'A foto deve ter no máximo 10 MB'),
        ('PNG, JPEG ou WebP · máx. 2 MB', 'PNG, JPEG ou WebP · máx. 10 MB')
    ]),
    ('/home/semit/Documentos/sd_docs/apps/web/src/components/admin.tsx', [
        ('if (file.size > 2 * 1024 * 1024) {\n                  setFormError("A foto deve ter no máximo 2 MB.");',
         'if (file.size > 10 * 1024 * 1024) {\n                  setFormError("A foto deve ter no máximo 10 MB.");')
    ]),
    ('/home/semit/Documentos/sd_docs/apps/api/src/structure/structure.controller.ts', [
        ('FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } })',
         'FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } })')
    ]),
    ('/home/semit/Documentos/sd_docs/apps/api/src/structure/structure.service.ts', [
        ('if (file.size > 2 * 1024 * 1024) {\n      throw new BadRequestException("A foto deve ter no máximo 2 MB");',
         'if (file.size > 10 * 1024 * 1024) {\n      throw new BadRequestException("A foto deve ter no máximo 10 MB");')
    ]),
    ('/home/semit/Documentos/sd_docs/apps/api/src/admin/users/users.controller.ts', [
        ('FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } })',
         'FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } })')
    ]),
    ('/home/semit/Documentos/sd_docs/apps/api/src/admin/users/users.service.ts', [
        ('if (file.size > 2 * 1024 * 1024) {\n      throw new BadRequestException("A foto deve ter no máximo 2 MB");',
         'if (file.size > 10 * 1024 * 1024) {\n      throw new BadRequestException("A foto deve ter no máximo 10 MB");')
    ])
]

for filepath, replacements in files_to_update:
    if not os.path.exists(filepath):
        print('Not found:', filepath)
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            print(f'Replaced in {os.path.basename(filepath)}')
        else:
            print(f'Pattern not found in {os.path.basename(filepath)}: {old[:40]}...')
    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Updated:', filepath)
