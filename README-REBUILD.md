# 🔄 Scripts de Rebuild Automático

Este documento explica como usar os scripts de rebuild que **garantem que agendamentos e formulários sejam sempre reconstruídos** junto com o projeto.

## 📋 Problema Resolvido

Antes, ao fazer rebuild, os apps Flutter (agendamentos e formulários) não eram reconstruídos automaticamente, causando erro 404 no servidor.

Agora, os scripts foram atualizados para **sempre rebuildar ambos os apps Flutter** automaticamente.

---

## 🖥️ Local (Windows)

### Como usar:

```powershell
# Repositório canônico (ajuste o caminho se necessário)
cd C:\caminho\para\api-semit
.\rebuild.ps1
```

> **Importante:** a cópia em `full/project/` é legado/backup. Deploy e rebuild devem usar a **raiz** do projeto (`api-semit`), no Linux: `~/Documentos/api-semit`.

### O que o script faz:

1. ✅ **Rebuilda o Frontend React**
2. ✅ **Rebuilda Agendamentos** (Flutter com `main.dart`)
3. ✅ **Rebuilda Formulários** (Flutter com `main_formulario.dart`)
4. ✅ **Rebuilda containers Docker**
5. ✅ **Verifica status dos serviços**

---

## 🌐 Servidor (Linux)

### Como usar:

```bash
cd ~/Documentos/api-semit
./rebuild.sh
```

### O que o script faz:

1. ✅ **Rebuilda o Frontend React**
2. ✅ **Rebuilda Agendamentos** (Flutter com `main.dart`)
3. ✅ **Rebuilda Formulários** (Flutter com `main_formulario.dart`)
4. ✅ **Publica Flutter web** (`/servicos/`, agendamentos, formulários, iluminação) — ver [docs/PORTAL-SERVICOS-WEB.md](docs/PORTAL-SERVICOS-WEB.md)
5. ✅ **Rebuilda containers Docker**
6. ✅ **Verifica status dos serviços**

---

## 📁 Estrutura de Build

Após executar o script, a estrutura será:

```
frontend/build/
├── servicos/              ← Hub Flutter (build de referência, NÃO HTML em public/servicos)
├── agendamentos/          ← App Flutter de Agendamentos
├── formularios/           ← App Flutter de Formulários
├── iluminacao/            ← App Flutter Iluminação Pública
├── index.html             ← Frontend React principal
├── static/
└── ...
```

Publicação só dos módulos Flutter (sem rebuild completo):

```bash
./scripts/publicar-flutter-web.sh
```

---

## 🚀 URLs Disponíveis

Após o rebuild, os seguintes serviços estarão disponíveis:

### Local:
- **Frontend Principal**: http://localhost
- **Agendamentos**: http://localhost/agendamentos/
- **Formulários**: http://localhost/formularios/
- **API**: http://localhost/api

### Servidor:
- **Frontend Principal**: https://api.garca.sp.gov.br
- **Agendamentos**: https://api.garca.sp.gov.br/agendamentos/
- **Formulários**: https://api.garca.sp.gov.br/formularios/
- **API**: https://api.garca.sp.gov.br/api

---

## ⚠️ Importante

- **Sempre use os scripts de rebuild** em vez de buildar manualmente
- Os scripts garantem que **servicos, agendamentos, formulários e iluminação** permaneçam em `frontend/build/`
- **Não** coloque `index.html` em `frontend/public/servicos/` (HTML estático errado)
- Se você modificar código Flutter, execute o rebuild completo
- O rebuild pode levar **3-5 minutos** (builds Flutter são lentos)
- **Nao use `rsync --delete` de `frontend/build` para `backend/public`**: isso pode apagar artefatos de outros servicos (ex.: `sama/`, `routes.json`, `endpoints.html`)
- Publicacao correta: usar sincronizacao **sem delete**, preservando arquivos que nao pertencem ao build React

---

## 🛠️ Troubleshooting

### Problema: "flutter: comando não encontrado"

**Solução**: Instale o Flutter SDK
```bash
# No servidor
sudo snap install flutter --classic
```

### Problema: "docker compose: comando não encontrado"

**Solução**: Use `docker-compose` (com hífen) ou instale o plugin compose
```bash
# Verificar versão
docker --version
docker compose version
```

### Problema: Erro de permissão ao deletar arquivos

**Solução**: Pare os containers antes do rebuild
```bash
docker compose down
./rebuild.sh
```

---

## 📝 Logs

Os scripts mostram progresso em tempo real:

```
========================================
  Rebuild Completo - Prefeitura App    
========================================

[1/5] Rebuildando Frontend...
  ✓ Frontend rebuildado

[2/5] Rebuildando Agenda Garca (Flutter)...
  ✓ Agenda Garca rebuildada

[3/5] Rebuildando Formularios (Flutter)...
  ✓ Formularios rebuildado

[4/5] Rebuildando containers Docker...
  ✓ Containers rebuildados

[5/5] Verificando status...
  ✓ Todos os serviços rodando

========================================
  Rebuild Concluido!                    
========================================
```

---

## 🔧 Manutenção

### Atualizar scripts no servidor:

```powershell
# No Windows
cd c:\full\project
scp rebuild.sh semit@10.15.25.28:~/Documentos/api-semit/
scp rebuild.ps1 semit@10.15.25.28:~/Documentos/api-semit/
```

### Verificar se os builds existem:

```bash
# No servidor
ls -la ~/Documentos/api-semit/frontend/build/
# Deve mostrar: agendamentos/ e formularios/
```

---

**Última atualização**: 13/01/2026  
**Autor**: Sistema automatizado de rebuild
