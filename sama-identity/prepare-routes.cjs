// Mechanical, fail-closed migration of the deployed legacy build. Stages only.
const fs = require('node:fs');
const path = require('node:path');
const base = '/home/semit/Documentos/api-semit/backend/public/sama';
const stage = '/tmp/sama-routes-20260904';
const read = name => fs.readFileSync(path.join(base, name), 'utf8');
const save = (name, value) => fs.writeFileSync(path.join(stage, name), value);
let bundle = read('static/js/main.014d197f.js');
const routes = ['sama','arvores','arvore/myarvore','arvore/add','arvore/edit/:id','arvore/myrequests','arvore/:id','castracao','zoologico','denunciar','funcionalidade'];
for (const route of routes) {
  const old = 'path:"/garcapet/' + route + '"';
  const next = route === 'sama' ? '/sama/' : '/sama/' + route;
  if (bundle.split(old).length !== 2) throw Error('Route not unique: ' + route);
  bundle = bundle.replace(old, 'path:["/garcapet/' + route + '","' + next + '"]');
}
save('main.sama-routes-20260904.js', bundle.replace(/\/\/# sourceMappingURL=.*$/m, ''));
for (const name of ['patch.js','patch-adoption-chat.js','patch-garcapet-auth.js','patch-castration-module.js','patch-garca-pet-inauguration.js']) {
  let source = read(name);
  // Preserve legacy feature guards under the new public URLs.
  if (/window\.location\.pathname\s*=(?!=)/.test(source)) throw Error('Path assignment in '+name);
  source = source.replaceAll('window.location.pathname', 'window.SamaRoutes.legacyPath()');
  if (name === 'patch-castration-module.js') source = source.replace('function normalizeAppPath(path) {', 'function normalizeAppPath(path) { path = window.SamaRoutes.legacyPath(path);');
  save(name.replace('.js', '.sama-routes-20260904.js'), source);
}
let index = read('index.html');
index = index.replace('<script src="/sama/config.js">', '<script src="/sama/routes.js?v=20260904"></script><script src="/sama/config.js">');
for (const name of ['patch','patch-adoption-chat','patch-garcapet-auth','patch-castration-module','patch-garca-pet-inauguration']) {
  index = index.replace(new RegExp('/sama/'+name+'\\.js\\?[^" ]+'), '/sama/'+name+'.sama-routes-20260904.js');
}
index = index.replace('/sama/static/js/main.014d197f.js?v=20260601b', '/sama/main.sama-routes-20260904.js');
save('index.html', index);
save('identity.js', read('identity.js').replace('path = path.toLowerCase()', 'path = (window.SamaRoutes ? window.SamaRoutes.legacyPath(path) : path).toLowerCase()'));
save('manifest.json', JSON.stringify({ ...JSON.parse(read('manifest.json')), start_url: '/sama/' }, null, 2));
let config = fs.readFileSync('/home/semit/Documentos/api-semit/nginx/nginx.conf','utf8');
config = config.replace('location = /sama { return 302 /garcapet/sama; }','location = /sama { return 302 /sama/$is_args$args; }');
config = config.replace('location = /sama/ { return 302 /garcapet/sama; }','location = /sama/ { root /opt/backend-public; try_files /sama/index.html =404; add_header Cache-Control "no-store"; }');
config = config.replace('location ^~ /garcapet/ {','location ^~ /garcapet/ {\n    rewrite ^/garcapet/sama/?$ /sama/ redirect;\n    rewrite ^/garcapet/(arvores|arvore|castracao|zoologico|denunciar|funcionalidade)(/.*)?$ /sama/$1$2 redirect;');
const additions = ['arvores','castracao','zoologico','denunciar','funcionalidade'].map(name => '  location = /sama/'+name+' { root /opt/backend-public; try_files /sama/index.html =404; add_header Cache-Control "no-store"; }\n  location = /sama/'+name+'/ { return 302 /sama/'+name+'$is_args$args; }').join('\n');
config = config.replace('  # Suporte para assets', additions+'\n  location ^~ /sama/arvore/ { root /opt/backend-public; try_files /sama/index.html =404; add_header Cache-Control "no-store"; }\n  # Suporte para assets');
config = config.replace('location = /garcapet/vacinacao {','location = /garcapet/vacinacao { return 302 /sama/vacinacao$is_args$args; }\n  location = /sama/vacinacao/ { return 302 /sama/vacinacao$is_args$args; }\n  location = /sama/vacinacao {');
save('nginx.conf', config);
save('nginx-test.conf', 'events {}\nhttp { include /etc/nginx/mime.types; include /tmp/sama-routes-check.conf; }\n');
console.log('Prepared aliases, versioned assets, compatibility layer and nginx config. Production unchanged.');
