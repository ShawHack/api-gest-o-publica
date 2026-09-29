# Não colocar HTML aqui

Esta pasta **não** é servida pelo nginx.

O portal `/servicos/` é o build Flutter em `frontend/build/servicos/`, copiado do artefato de referência (ver `docs/PORTAL-SERVICOS-WEB.md`).

**Proibido:** `index.html` ou qualquer página estática neste diretório.

Publicar:

```bash
./scripts/publicar-flutter-web.sh
```
