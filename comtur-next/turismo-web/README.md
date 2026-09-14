# Visit Garça — portal público

Substitui a vitrine atual (`/comtur-portal.html`, `mapaturistico` e Destinos Inteligentes como entrada institucional).

Endereço canônico: `/turismo/`.

O COMTUR permanece em `/turismo/comtur` (governança). Administração continua nas telas `/comtur-*-admin.html`.

```bash
npm ci
npm test
npm run build
```

Publicar o conteúdo de `dist/` em `/opt/backend-public/turismo/` sem apagar assets antigos, depois substituir `index.html`. Não aplicar o Nginx de produção sem conferir o arquivo montado no container.
