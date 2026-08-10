# Problema: Alterações do Flutter Web não aparecem após deploy no Docker

## 🔍 Problema Identificado

Quando você faz o build do Flutter web localmente e sobe o Docker Compose, as alterações podem não aparecer no navegador devido a:

1. **Cache do Service Worker do Flutter**: O Flutter usa um Service Worker que cacheia arquivos agressivamente
2. **Cache do Navegador**: O navegador pode estar servindo arquivos em cache
3. **Cache do Nginx**: Embora menos comum, o Nginx pode ter cache de arquivos estáticos

## ✅ Solução Implementada

### Script de Deploy Completo

Foi criado o script `deploy-agendamentos.sh` que:

1. Faz o build do Flutter com as configurações corretas
2. Copia os arquivos para `frontend/build/agendamentos`
3. **Força atualização do Service Worker** modificando o `version.json`
4. Reinicia o Nginx
5. Verifica se os arquivos estão sendo servidos corretamente

### Como Usar

```bash
# Execute o script de deploy completo
./deploy-agendamentos.sh
```

Ou use o script de build existente (que foi atualizado):

```bash
./build-prefeitura-app.sh
docker compose restart nginx
```

## 🔧 Como Funciona

### 1. Volume Montado no Docker

O `docker-compose.yml` monta o diretório local como volume:

```yaml
volumes:
  - ./frontend/build:/usr/share/nginx/html:ro
```

Isso significa que quando você copia arquivos para `frontend/build/agendamentos`, eles ficam imediatamente disponíveis no container do Nginx.

### 2. Service Worker do Flutter

O Flutter gera um arquivo `version.json` que contém informações sobre a versão do build. Quando este arquivo muda, o Service Worker detecta uma nova versão e atualiza o cache.

O script força essa atualização modificando o `version.json` com um timestamp único a cada build.

### 3. Reinicialização do Nginx

Após copiar os arquivos, o Nginx precisa ser reiniciado para garantir que está servindo os arquivos atualizados:

```bash
docker compose restart nginx
```

## 🐛 Troubleshooting

### As alterações ainda não aparecem?

1. **Limpe o cache do navegador**:
   - Chrome/Edge: `Ctrl+Shift+Delete` ou `Ctrl+Shift+R` (hard refresh)
   - Firefox: `Ctrl+Shift+Delete` ou `Ctrl+F5`
   - Ou abra em uma janela anônima/privada

2. **Desregistre o Service Worker**:
   - Abra DevTools (F12)
   - Vá em `Application` > `Service Workers`
   - Clique em `Unregister` para cada service worker listado
   - Recarregue a página

3. **Verifique se os arquivos foram copiados**:
   ```bash
   ls -la frontend/build/agendamentos/
   docker compose exec nginx ls -la /usr/share/nginx/html/agendamentos/
   ```

4. **Verifique o timestamp dos arquivos**:
   ```bash
   stat frontend/build/agendamentos/main.dart.js
   docker compose exec nginx stat /usr/share/nginx/html/agendamentos/main.dart.js
   ```

5. **Force rebuild completo**:
   ```bash
   cd prefeitura_app-main
   flutter clean
   flutter build web --release --base-href=/agendamentos/ \
     --dart-define=API_BASE_URL=https://api.garca.sp.gov.br/api \
     --dart-define=EMAIL_API_KEY=flutter
   cd ..
   rm -rf frontend/build/agendamentos
   cp -r prefeitura_app-main/build/web frontend/build/agendamentos
   docker compose restart nginx
   ```

## 📝 Notas Importantes

- O build do Flutter **deve** ser feito com `--base-href=/agendamentos/` para funcionar corretamente
- Os arquivos são servidos em modo **read-only** (`:ro`) no Docker, então não é possível modificar arquivos dentro do container
- Sempre faça o build localmente e copie os arquivos para `frontend/build/agendamentos`
- O Service Worker do Flutter é muito agressivo com cache - sempre desregistre-o se tiver problemas

## 🔄 Processo Recomendado de Deploy

1. Faça suas alterações no código Flutter
2. Execute `./deploy-agendamentos.sh` (ou `./build-prefeitura-app.sh` + `docker compose restart nginx`)
3. Limpe o cache do navegador ou desregistre o Service Worker
4. Teste em uma janela anônima primeiro para garantir que funciona
5. Se funcionar em anônimo mas não no navegador normal, é problema de cache do navegador






