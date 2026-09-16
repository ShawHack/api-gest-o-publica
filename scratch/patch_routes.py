with open('/home/semit/Documentos/api-semit/backend/routes/ComturRoutes.js', 'r', encoding='utf-8') as f:
    code = f.read()

target = "router.post('/admin/media', ...adminChain, receiveFile, ComturMediaController.upload)"
replacement = "router.post('/admin/media', ...adminChain, receiveFile, ComturMediaController.upload)\nrouter.post('/admin/media/upload', ...adminChain, receiveFile, ComturMediaController.upload)"

if "router.post('/admin/media/upload'" not in code:
    code = code.replace(target, replacement)
    with open('/home/semit/Documentos/api-semit/backend/routes/ComturRoutes.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Host ComturRoutes.js patched successfully!")
else:
    print("Already patched!")
