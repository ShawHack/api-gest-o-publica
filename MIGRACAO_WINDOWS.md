# Guia de Migração da API para Windows Server

Este guia detalha como migrar a API do servidor Linux (Docker) para um servidor Windows.

## 📋 Pré-requisitos

### Software Necessário

1. **Node.js** (versão 20 ou superior)
   - Download: https://nodejs.org/
   - Instalar com opção "Add to PATH"

2. **MongoDB Community Server**
   - Download: https://www.mongodb.com/try/download/community
   - Instalar como serviço do Windows

3. **Git** (opcional, para clonar o repositório)
   - Download: https://git-scm.com/download/win

4. **Nginx para Windows** (ou IIS com URL Rewrite)
   - Download: http://nginx.org/en/download.html
   - Ou usar IIS com módulo URL Rewrite

## 🚀 Passo a Passo da Migração

### 1. Preparar o Ambiente Windows

#### 1.1 Instalar Node.js
```powershell
# Verificar instalação
node --version
npm --version
```

#### 1.2 Instalar MongoDB
1. Baixar o instalador do MongoDB Community Server
2. Durante a instalação, marcar "Install MongoDB as a Service"
3. Configurar o serviço para iniciar automaticamente
4. Anotar o caminho de instalação (geralmente `C:\Program Files\MongoDB\Server\7.0\bin`)

#### 1.3 Configurar MongoDB
```powershell
# Conectar ao MongoDB
mongosh

# Criar banco de dados (se necessário)
use apicemiterio
```

### 2. Transferir os Arquivos

#### 2.1 Copiar o Diretório `backend`
Copie toda a pasta `backend` do servidor Linux para o servidor Windows.

**Estrutura esperada no Windows:**
```
C:\api-semit\
  └── backend\
      ├── controllers\
      ├── helpers\
      ├── models\
      ├── routes\
      ├── public\
      ├── index.js
      ├── package.json
      └── .env
```

#### 2.2 Criar Diretório de Uploads
```powershell
# Criar diretório para uploads de imagens
New-Item -ItemType Directory -Path "C:\api-semit\uploads" -Force
New-Item -ItemType Directory -Path "C:\api-semit\uploads\users" -Force
New-Item -ItemType Directory -Path "C:\api-semit\uploads\sepultados" -Force
```

### 3. Configurar Variáveis de Ambiente

#### 3.1 Criar arquivo `.env` no diretório `backend`

Copie o conteúdo do `.env` do servidor Linux e ajuste os caminhos:

```env
# Porta da API
PORT=5000

# MongoDB (ajustar conforme sua instalação)
MONGODB_URI=mongodb://localhost:27017/apicemiterio

# Diretório de uploads (Windows)
UPLOAD_DIR=C:\api-semit\uploads

# Ambiente
NODE_ENV=production

# CORS (ajustar com o domínio do seu servidor Windows)
CORS_ORIGIN=https://api.garca.sp.gov.br,http://localhost:3000
CORS_ORIGIN_REGEX=^https?://localhost:\d+$

# Trust Proxy (1 = sim, 0 = não)
TRUST_PROXY=1

# JWT Secret (usar o mesmo do servidor Linux para manter compatibilidade)
JWT_SECRET=seu_jwt_secret_aqui

# Email (ajustar conforme necessário)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app
```

### 4. Instalar Dependências

```powershell
# Navegar para o diretório backend
cd C:\api-semit\backend

# Instalar dependências
npm install
```

### 5. Configurar o Serviço do Windows (Opcional)

Para rodar a API como serviço do Windows, você pode usar:

#### Opção A: PM2 (Recomendado)
```powershell
# Instalar PM2 globalmente
npm install -g pm2
npm install -g pm2-windows-startup

# Iniciar a API
cd C:\api-semit\backend
pm2 start index.js --name "api-semit"

# Salvar configuração
pm2 save

# Configurar para iniciar com Windows
pm2-startup install
```

#### Opção B: NSSM (Node Service Manager)
1. Download: https://nssm.cc/download
2. Instalar o serviço:
```powershell
nssm install ApiSemit "C:\Program Files\nodejs\node.exe" "C:\api-semit\backend\index.js"
nssm set ApiSemit AppDirectory "C:\api-semit\backend"
nssm set ApiSemit AppEnvironmentExtra "NODE_ENV=production"
nssm start ApiSemit
```

### 6. Configurar Nginx no Windows

#### 6.1 Instalar Nginx
1. Baixar Nginx para Windows
2. Extrair para `C:\nginx`
3. Editar `C:\nginx\conf\nginx.conf`

#### 6.2 Configuração do Nginx para Windows

Edite `C:\nginx\conf\nginx.conf` e adicione/modifique:

```nginx
server {
    listen 80;
    server_name api.garca.sp.gov.br;

    # Proxy para a API
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        $connection_upgrade;
        proxy_set_header Authorization     $http_authorization;
        
        proxy_redirect    off;
        client_max_body_size 25m;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Servir imagens estáticas
    location /images/ {
        alias C:/api-semit/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Healthcheck
    location /health {
        proxy_pass http://localhost:5000/health;
    }
}
```

#### 6.3 Iniciar Nginx como Serviço
```powershell
# Usar NSSM para instalar Nginx como serviço
nssm install Nginx "C:\nginx\nginx.exe"
nssm set Nginx AppDirectory "C:\nginx"
nssm start Nginx
```

### 7. Configurar Firewall

```powershell
# Permitir porta 80 (HTTP)
New-NetFirewallRule -DisplayName "API HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Permitir porta 5000 (API direta, se necessário)
New-NetFirewallRule -DisplayName "API Direct" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow

# Permitir porta 27017 (MongoDB, apenas se acesso externo necessário)
# New-NetFirewallRule -DisplayName "MongoDB" -Direction Inbound -LocalPort 27017 -Protocol TCP -Action Allow
```

### 8. Testar a Instalação

#### 8.1 Verificar MongoDB
```powershell
mongosh
# Deve conectar sem erros
```

#### 8.2 Iniciar a API Manualmente
```powershell
cd C:\api-semit\backend
node index.js
```

Verificar se aparece:
```
🚀 Servidor rodando na porta 5000
Conectado ao MongoDB!
```

#### 8.3 Testar Endpoints
```powershell
# Healthcheck
Invoke-WebRequest -Uri "http://localhost:5000/health"

# Via Nginx
Invoke-WebRequest -Uri "http://localhost/api/health"
```

### 9. Migrar Dados do MongoDB (Se Necessário)

Se você precisa migrar dados do servidor Linux:

#### 9.1 Exportar do Linux
```bash
# No servidor Linux
mongodump --uri="mongodb://localhost:27017/apicemiterio" --out=/tmp/mongodb-backup
```

#### 9.2 Transferir para Windows
```powershell
# Usar SCP, FTP ou compartilhamento de rede
# Copiar a pasta /tmp/mongodb-backup para C:\mongodb-backup no Windows
```

#### 9.3 Importar no Windows
```powershell
# No servidor Windows
mongorestore --uri="mongodb://localhost:27017/apicemiterio" "C:\mongodb-backup\apicemiterio"
```

### 10. Migrar Arquivos de Upload

Se você precisa migrar as imagens já enviadas:

```powershell
# Copiar do volume Docker do Linux para o Windows
# Exemplo via SCP:
scp -r usuario@servidor-linux:/var/lib/docker/volumes/api-semit_apicemiterio_data/_data/* C:\api-semit\uploads\
```

## 🔧 Troubleshooting

### Problema: API não inicia
- Verificar se o MongoDB está rodando: `Get-Service MongoDB`
- Verificar se a porta 5000 está livre: `netstat -ano | findstr :5000`
- Verificar logs: `pm2 logs api-semit` ou verificar console

### Problema: Erro de permissões no diretório de uploads
```powershell
# Dar permissões de escrita
icacls "C:\api-semit\uploads" /grant "Users:(OI)(CI)F" /T
```

### Problema: CORS bloqueando requisições
- Verificar `CORS_ORIGIN` e `CORS_ORIGIN_REGEX` no `.env`
- Verificar se o domínio está correto

### Problema: Nginx não inicia
- Verificar se a porta 80 está livre: `netstat -ano | findstr :80`
- Verificar logs: `C:\nginx\logs\error.log`
- Verificar sintaxe: `C:\nginx\nginx.exe -t`

## 📝 Checklist de Migração

- [ ] Node.js instalado e funcionando
- [ ] MongoDB instalado e rodando como serviço
- [ ] Arquivos do backend copiados para Windows
- [ ] Diretório de uploads criado
- [ ] Arquivo `.env` configurado
- [ ] Dependências instaladas (`npm install`)
- [ ] API inicia sem erros
- [ ] MongoDB conecta corretamente
- [ ] Nginx configurado e rodando
- [ ] Firewall configurado
- [ ] Dados migrados (se necessário)
- [ ] Arquivos de upload migrados (se necessário)
- [ ] Testes de endpoints realizados
- [ ] API rodando como serviço (PM2 ou NSSM)

## 🔄 Atualizações Futuras

Para atualizar a API no Windows:

```powershell
cd C:\api-semit\backend
git pull  # ou copiar novos arquivos
npm install
pm2 restart api-semit  # ou reiniciar serviço
```

## 📞 Suporte

Em caso de problemas, verificar:
1. Logs da API: `pm2 logs api-semit`
2. Logs do MongoDB: `C:\Program Files\MongoDB\Server\7.0\log\mongod.log`
3. Logs do Nginx: `C:\nginx\logs\error.log`




