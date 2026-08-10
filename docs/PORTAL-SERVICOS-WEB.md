# Portal web `/servicos/` e módulos Flutter

Documentação operacional para evitar publicação de telas erradas (HTML estático, Dart substituto ou **downgrade** para builds antigos).

## O que o usuário deve ver

| URL | Conteúdo |
|-----|----------|
| `/servicos/` | Hub Flutter: logo GARÇA, **Serviços Web Integrados**, 3 cards horizontais (Agendamentos, Formulários, Iluminação Pública) |
| `/agendamentos/` | App Flutter Agenda Garça |
| `/formularios/` | App Flutter Formulários (`main_formularios.dart` ou `main_formulario.dart`) |
| `/iluminacao/` | App Flutter Iluminação Pública (`main_iluminacao.dart`) |

Dashboard (`backend/private/dashboard-app.html`): card PrefeituraApp → `href="/servicos/"` (correto).

## Onde o nginx lê os arquivos

```text
docker-compose.yml  →  ./frontend/build:/usr/share/nginx/html:ro
```

Todas as URLs acima precisam existir **dentro de** `frontend/build/<modulo>/` (com `index.html` e `main.dart.js`).

Espelho opcional: `rsync` para `backend/public/` (passo 5 do `rebuild.sh`), **sem** `--delete`.

## Fonte de verdade (pin + promoção)

Artefatos **aprovados** são pinados por MD5 em:

```text
scripts/flutter-web-builds.lock
```

Cópia de referência (mesmos bytes):

```text
full/project/frontend/build/
├── servicos/       ← hub pinado (~1,97 MB main.dart.js, marcador "Serviços Web Integrados")
├── agendamentos/
├── formularios/
└── iluminacao/
```

Validação rápida do hub:

```bash
grep -q 'Serviços Web Integrados' full/project/frontend/build/servicos/main.dart.js && echo OK
md5sum frontend/build/servicos/main.dart.js
# deve bater com scripts/flutter-web-builds.lock → modules.servicos.md5
```

### Fluxo correto para atualizar um módulo

1. Compilar (ou copiar) para `frontend/build/<modulo>/`
2. Testar em `https://api.garca.sp.gov.br/<modulo>/` (hard refresh / aba anônima)
3. **Só então** promover:

```bash
./scripts/promover-flutter-web.sh agendamentos   # ou formularios | iluminacao
```

Isso atualiza REF + `backend/public` + o lock. O próximo `./rebuild.sh` usará essa versão.

**Não** sincronizar `full/prefeitura_app-main/` → `prefeitura_app-main/` para “atualizar” o hub: gera UI inventada.

## O que NÃO publicar

| Artefato | Motivo |
|----------|--------|
| `frontend/public/servicos/index.html` | HTML estático (card branco, botões verticais) — **proibido** |
| `prefeitura_app-main/lib/main_servicos.dart` | Dart substituto; **removido** do repo |
| `prefeitura_app-main/lib/screens/web/services_home_screen.dart` | Dart substituto — `rebuild.sh` **aborta** se existir na raiz |
| `full/prefeitura_app-main/.../services_home_screen.dart` | Variante legada (botões roxos / vertical) — **não** é origem de deploy |
| Recompilar `/servicos/` com Flutter sem o `.dart` original | Gera outra UI |

Não criar novas telas em `lib/screens/web/` para o hub: até recuperar o fonte Dart original, use apenas o build pinado.

## Publicação (sem rebuild Flutter do hub)

```bash
cd /home/semit/Documentos/api-semit
./scripts/publicar-flutter-web.sh
```

Comportamento:

- `/servicos/` — sempre do pin (REF) + MD5 do lock + marcador
- Demais — se houver `.just_built` ou DEST já válido, **não** sobrescreve com REF antigo; se faltar, restaura do pin

Depois, se usar Docker:

```bash
docker compose restart nginx   # ou ./rebuild.sh (passo 6)
```

## `rebuild.sh` completo

1. Preserva `frontend/build/{servicos,agendamentos,formularios,iluminacao}` antes do `npm run build` e restaura depois (evita apagar Flutter).
2. Passos 2–3: podem recompilar agendamentos/formulários **se** o entrypoint existir; grava `.just_built`.
3. Passo 4: publica pinado — **não** faz downgrade do que acabou de compilar; **nunca** recompila `/servicos/`.
4. Build novo só vira referência oficial após `./scripts/promover-flutter-web.sh <modulo>`.

## Checklist pós-deploy

- [ ] `https://…/servicos/` — 3 cards horizontais + “Serviços Web Integrados”
- [ ] Botão **Acessar** → abre Flutter em `/agendamentos/`, `/formularios/`, `/iluminacao/`
- [ ] Não aparece card branco centralizado só com 3 botões azuis empilhados (HTML antigo)
- [ ] `frontend/public/servicos/` não contém `index.html`
- [ ] `md5sum frontend/build/*/main.dart.js` bate com `scripts/flutter-web-builds.lock` (módulos não promovidos no mesmo dia)

## Recuperar fonte Dart do hub (futuro)

O `.dart` que gerou `full/project/frontend/build/servicos/` não está no repositório canônico. Só reintroduzir `main_servicos.dart` + `services_home_screen.dart` quando o arquivo contiver `Serviços Web Integrados` e o layout validado; até lá, manter publicação por cópia do build pinado.

Ver também: [FONTE-CANONICA.md](./FONTE-CANONICA.md).
