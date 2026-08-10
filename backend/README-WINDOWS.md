# Instalação Rápida no Windows

## Passo 1: Pré-requisitos

1. **Node.js 20+**: https://nodejs.org/
2. **MongoDB Community Server**: https://www.mongodb.com/try/download/community

## Passo 2: Configuração Inicial

```powershell
# 1. Copiar arquivo de exemplo de configuração
Copy-Item env.windows.example .env

# 2. Editar .env e ajustar:
#    - MONGODB_URI (se necessário)
#    - UPLOAD_DIR (caminho onde salvar imagens)
#    - CORS_ORIGIN (domínio do seu servidor)
#    - JWT_SECRET (gerar um novo ou usar o mesmo do Linux)

# 3. Instalar dependências
npm install
```

## Passo 3: Criar Diretório de Uploads

```powershell
# Criar diretórios (ajustar caminho conforme UPLOAD_DIR no .env)
New-Item -ItemType Directory -Path "C:\api-semit\uploads" -Force
New-Item -ItemType Directory -Path "C:\api-semit\uploads\users" -Force
New-Item -ItemType Directory -Path "C:\api-semit\uploads\sepultados" -Force
```

## Passo 4: Iniciar a API

### Opção A: Execução Manual
```powershell
.\start-windows.ps1
```

### Opção B: Como Serviço do Windows (PM2)
```powershell
.\install-windows-service.ps1
```

## Passo 5: Verificar

Abra o navegador e acesse:
- http://localhost:5000/health

Deve retornar: `{"status":"UP"}`

## Migração de Dados

Se você precisa migrar dados do servidor Linux, consulte o arquivo `MIGRACAO_WINDOWS.md` na raiz do projeto.

## Troubleshooting

### MongoDB não conecta
```powershell
# Verificar se o serviço está rodando
Get-Service MongoDB

# Iniciar se necessário
Start-Service MongoDB
```

### Erro de permissões no diretório de uploads
```powershell
icacls "C:\api-semit\uploads" /grant "Users:(OI)(CI)F" /T
```

### Porta 5000 já em uso
```powershell
# Verificar qual processo está usando
netstat -ano | findstr :5000

# Ou alterar PORT no arquivo .env
```


