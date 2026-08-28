# Agenda Garça Web

Portal React do novo sistema de agendamentos. O build usa base `/agendamentos/`, mas não deve substituir o Flutter publicado antes da homologação.

## Identidade

Reutiliza exclusivamente `/users/login`, o token central em `localStorage` (`token`/`auth.token`) e `/api/agenda/me`. Não possui cadastro próprio.

## Desenvolvimento

```bash
npm install
npm run dev
npm run build
```

O artefato validado fica em `dist/`. Copiá-lo para o Nginx é uma etapa separada, condicionada a testes E2E, homologação e rollback.
