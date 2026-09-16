import re

path = '/home/semit/Documentos/api-semit/frontend/build/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

snippet = '<script>(function(){var p=(location.pathname||"").replace(/\\/+$/,"")||"/";if(p==="/rotas-rurais"){location.replace("/rotas-rurais/proprietario");}})();</script>'

if snippet not in html:
    html = html.replace('<head>', '<head>' + snippet)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("SUCCESS: Redirect added to index.html")
else:
    print("ALREADY PRESENT")
