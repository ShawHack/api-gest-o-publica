import glob
import os

tag = '<script src="/cultura/acessibilidade.js" defer></script>\n'
roots = [
    '/home/semit/Documentos/api-semit/cultura-src',
    '/home/semit/Documentos/api-semit/backend/public/cultura',
]

for root in roots:
    for f in glob.glob(root + '/**/*.html', recursive=True):
        try:
            with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
            if '/cultura/acessibilidade.js' not in content:
                if '</body>' in content:
                    content = content.replace('</body>', f'  {tag}</body>')
                else:
                    content += f'\n  {tag}'
                with open(f, 'w', encoding='utf-8') as fp:
                    fp.write(content)
                print('Modificado:', f)
        except Exception as e:
            print('Erro em', f, e)

print('Processo de injeção concluído!')
