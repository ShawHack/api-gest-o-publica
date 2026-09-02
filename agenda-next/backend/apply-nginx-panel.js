const fs = require('fs');

const FILE_PATH = '/home/semit/Documentos/api-semit/nginx/nginx.conf';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// Limpar regras antigas
content = content.replace(/# Proxy integrado de Painel NovoSGA \+ Agenda Garca[\s\S]*?# 3\. Gerenciador Geral NovoSGA/g, '# 3. Gerenciador Geral NovoSGA');
content = content.replace(/# Proxy integrado de Painel NovoSGA \+ Agenda Garca[\s\S]*?proxy_read_timeout 30s;\n  \}/g, '');

const target = '  # 3. Gerenciador Geral NovoSGA (Atendentes & Administração)';
const block = `  # Proxy integrado de Painel NovoSGA + Agenda Garca (TVs Oficiais)
  location ^~ /senhas/api/unidades/ {
    proxy_pass http://api:5000/api/agenda/public/novosga-proxy/unidades/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Authorization $http_authorization;
    proxy_read_timeout 30s;
  }

  # 3. Gerenciador Geral NovoSGA (Atendentes & Administração)`;

const updated = content.replace(target, block);
fs.writeFileSync(FILE_PATH, updated, 'utf8');
console.log('Nginx config atualizado com location ^~ /senhas/api/unidades/ com proxy_pass com barra!');
