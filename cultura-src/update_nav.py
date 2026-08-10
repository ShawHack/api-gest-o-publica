import os
import glob

# Files to process
root_dir = r"C:\Users\marjorie.talberg\Desktop\teatro"
html_files = []
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.html') and not file.endswith('_backup_corrupt.html') and 'eventos' not in file:
            html_files.append(os.path.join(root, file))

for file_path in html_files:
    # Determine depth to compute correct relative path
    rel_path = os.path.relpath(file_path, root_dir)
    depth = rel_path.count(os.sep)
    
    if depth == 0:
        eventos_path = "./eventos/eventos.html"
    elif depth == 1:
        eventos_path = "../eventos/eventos.html"
    elif depth == 2:
        eventos_path = "../../eventos/eventos.html"
    else:
        continue # Should not happen based on our tree

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Update Desktop NavMenu
    # Look for the last item in nav-menu which is Museu
    if 'href="./museu/museu.html"' in content:
        target = '<a href="./museu/museu.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: \'Rubik\', sans-serif; transition: color 0.3s;">Museu</a>'
        replacement = target + f'\n        <a href="{eventos_path}" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: \'Rubik\', sans-serif; transition: color 0.3s;">Eventos</a>'
        content = content.replace(target, replacement)
    
    if 'href="../museu/museu.html"' in content:
        target = '<a href="../museu/museu.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: \'Rubik\', sans-serif; transition: color 0.3s;">Museu</a>'
        replacement = target + f'\n        <a href="{eventos_path}" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: \'Rubik\', sans-serif; transition: color 0.3s;">Eventos</a>'
        content = content.replace(target, replacement)
        
    if 'href="../../museu/museu.html"' in content:
        target = '<a href="../../museu/museu.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: \'Rubik\', sans-serif; transition: color 0.3s;">Museu</a>'
        replacement = target + f'\n        <a href="{eventos_path}" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: \'Rubik\', sans-serif; transition: color 0.3s;">Eventos</a>'
        content = content.replace(target, replacement)

    # 2. Update Mobile Menu
    if 'href="./museu/museu.html" class="nav-link" onclick="toggleMenu()"' in content:
        target2 = '<a href="./museu/museu.html" class="nav-link" onclick="toggleMenu()">Museu</a>'
        replacement2 = target2 + f'\n    <a href="{eventos_path}" class="nav-link" onclick="toggleMenu()">Eventos</a>'
        content = content.replace(target2, replacement2)
        
    if 'href="../museu/museu.html" class="nav-link" onclick="toggleMenu()"' in content:
        target2 = '<a href="../museu/museu.html" class="nav-link" onclick="toggleMenu()">Museu</a>'
        replacement2 = target2 + f'\n    <a href="{eventos_path}" class="nav-link" onclick="toggleMenu()">Eventos</a>'
        content = content.replace(target2, replacement2)
        
    if 'href="../../museu/museu.html" class="nav-link" onclick="toggleMenu()"' in content:
        target2 = '<a href="../../museu/museu.html" class="nav-link" onclick="toggleMenu()">Museu</a>'
        replacement2 = target2 + f'\n    <a href="{eventos_path}" class="nav-link" onclick="toggleMenu()">Eventos</a>'
        content = content.replace(target2, replacement2)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Nav update completed!")
