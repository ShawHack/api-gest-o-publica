# Instruções de Deploy - Sistema de Agendamentos Web

## 📦 Arquivos do Build

Os arquivos do build estão na pasta `build/web/`. Esta pasta contém todos os arquivos necessários para servir a aplicação web.

## 🚀 Opções de Deploy

### Opção 1: Servidor Web Estático (Nginx, Apache, IIS)

#### Nginx

1. Copie toda a pasta `build/web/` para o servidor (ex: `/var/www/agendamentos/`)

2. Configure o Nginx:

```nginx
server {
    listen 80;
    server_name agendamentos.seu-dominio.com.br;

    root /var/www/agendamentos;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Fallback para roteamento do Flutter
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

3. Reinicie o Nginx:
```bash
sudo systemctl restart nginx
```

#### Apache

1. Copie a pasta `build/web/` para o servidor (ex: `/var/www/html/agendamentos/`)

2. Configure o Apache (`/etc/apache2/sites-available/agendamentos.conf`):

```apache
<VirtualHost *:80>
    ServerName agendamentos.seu-dominio.com.br
    DocumentRoot /var/www/html/agendamentos
    
    <Directory /var/www/html/agendamentos>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Fallback para roteamento do Flutter
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</VirtualHost>
```

3. Ative o site e reinicie:
```bash
sudo a2ensite agendamentos.conf
sudo systemctl restart apache2
```

#### IIS (Windows Server)

1. Copie a pasta `build/web/` para `C:\inetpub\wwwroot\agendamentos\`

2. Configure o web.config:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Flutter Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    
    <staticContent>
      <mimeMap fileExtension=".js" mimeType="application/javascript" />
      <mimeMap fileExtension=".wasm" mimeType="application/wasm" />
    </staticContent>
    
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

### Opção 2: GitHub Pages / Netlify / Vercel

#### GitHub Pages

1. Crie um repositório no GitHub
2. Faça push da pasta `build/web/` para o branch `gh-pages`
3. Configure o GitHub Pages nas configurações do repositório

#### Netlify

1. Faça login no Netlify
2. Arraste a pasta `build/web/` para a área de deploy
3. Configure:
   - **Publish directory**: `build/web`
   - **Build command**: (deixe vazio, já está buildado)

#### Vercel

1. Instale o Vercel CLI: `npm i -g vercel`
2. Na pasta do projeto, execute:
```bash
cd build/web
vercel --prod
```

### Opção 3: Docker (Nginx)

Crie um `Dockerfile`:

```dockerfile
FROM nginx:alpine

# Copia os arquivos do build
COPY build/web /usr/share/nginx/html

# Copia configuração customizada do Nginx (opcional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Build e execute:
```bash
docker build -t agendamentos-web .
docker run -d -p 80:80 agendamentos-web
```

## ⚙️ Configurações Importantes

### CORS (Cross-Origin Resource Sharing)

A aplicação faz requisições para a API em `https://api.garca.sp.gov.br/api`. Certifique-se de que:

1. O servidor da API permite requisições do domínio onde o app está hospedado
2. Se necessário, configure CORS no backend para incluir seu domínio

### Variáveis de Ambiente

Se precisar alterar a URL da API, você pode:

1. **Recompilar** com a variável:
```bash
flutter build web --release --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api
```

2. Ou modificar diretamente em `lib/services/auth_service.dart` antes de fazer o build

### HTTPS (Recomendado)

Para produção, configure HTTPS usando Let's Encrypt (certbot):

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d agendamentos.seu-dominio.com.br
```

## 📋 Checklist de Deploy

- [ ] Build executado com sucesso (`flutter build web --release`)
- [ ] Arquivos copiados para o servidor
- [ ] Configuração de servidor web ajustada
- [ ] Roteamento do Flutter configurado (fallback para `index.html`)
- [ ] CORS configurado no backend (se necessário)
- [ ] HTTPS configurado (recomendado)
- [ ] Teste de acesso realizado
- [ ] Teste de login realizado
- [ ] Teste de funcionalidades principais realizado

## 🔍 Testando Localmente

Antes de fazer deploy, teste localmente:

```bash
# Opção 1: Usar o servidor do Flutter
cd build/web
python -m http.server 8000

# Opção 2: Usar o servidor do Node.js
cd build/web
npx serve

# Acesse: http://localhost:8000
```

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs do servidor web
2. Verifique o console do navegador (F12)
3. Verifique a conectividade com a API
4. Verifique as configurações de CORS

## 📝 Notas

- Os arquivos em `build/web/` são otimizados para produção
- O build usa tree-shaking para reduzir o tamanho dos arquivos
- Os ícones das fontes foram otimizados automaticamente
- A aplicação é uma SPA (Single Page Application), então todas as rotas devem redirecionar para `index.html`

