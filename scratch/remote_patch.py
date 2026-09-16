with open('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ensure window.$ is defined before any inline onclick runs
if 'window.$ = (id) => document.getElementById(id);' not in content:
    content = content.replace('<head>', '<head>\n  <script>window.$ = (id) => document.getElementById(id);</script>', 1)

# 2. Export functions to window
exports_to_add = '''
  window.$ = $;
  window.uploadIntegrationCover = uploadIntegrationCover;
  window.renderIntegrationCoverPreview = renderIntegrationCoverPreview;
'''

if 'window.uploadIntegrationCover = uploadIntegrationCover;' not in content:
    content = content.replace('window.uploadNewsCover = uploadNewsCover;', 'window.uploadNewsCover = uploadNewsCover;\n' + exports_to_add, 1)

with open('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('File patched successfully on 10.15.25.28!')
