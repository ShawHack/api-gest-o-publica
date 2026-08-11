# Portal do Produtor Rural

## Escopo da primeira versão

- Operador com papel `rotas_operador` cria o acesso do proprietário.
- `rotas_operador` acessa somente consulta de UPA e criação de acesso; `rotas_admin` supervisiona o módulo e `admin` permanece como administrador global.
- O Plus Code é normalizado e pesquisado primeiro na base local e depois no catálogo Firebase existente.
- UPA encontrada no catálogo é vinculada automaticamente.
- UPA não encontrada é criada como `pending_review` e exige código informado pelo operador.
- CPF é validado e armazenado apenas como hash irreversível e últimos quatro dígitos.
- A senha inicial é o CPF com 11 dígitos e deve ser trocada no primeiro acesso.
- O proprietário precisa trocar a senha antes de preencher o formulário.
- O formulário pode ser salvo como rascunho ou enviado para análise.
- O fluxo de veículos continua separado e não faz parte desta versão.

## Rotas da API

### Operador autenticado

- `GET /api/rotas-rurais/operator/properties/resolve?plusCode=...`
- `POST /api/rotas-rurais/operator/owners`

### Proprietário

- `POST /api/rotas-rurais/portal/login`
- `POST /api/rotas-rurais/portal/change-password`
- `GET /api/rotas-rurais/portal/me`
- `PUT /api/rotas-rurais/portal/profile`

## Telas web React

- `/rotas-rurais/operador`
- `/rotas-rurais/proprietario`

## Configuração

O catálogo usa por padrão `https://upa-rural-default-rtdb.firebaseio.com`. Outro endereço pode ser definido com `ROTAS_FIREBASE_DATABASE_URL`.

## Publicação segura

1. Publicar primeiro em homologação com banco isolado.
2. Criar um usuário de teste com papel `rotas_admin`.
3. Testar uma UPA já existente e uma UPA inexistente.
4. Confirmar troca obrigatória da senha temporária.
5. Confirmar rascunho e envio do formulário.
6. Revisar logs de auditoria e política de acesso ao Firebase.
7. Somente depois gerar o build web e planejar a publicação em produção.

## Homologação local descartável

1. No diretório `backend`, execute `npm run homolog:rural`.
2. Em outro terminal, no diretório `frontend`, execute `npm start`.
3. Acesse `http://localhost:3000/login` com as credenciais exibidas pelo backend.
4. Abra `http://localhost:3000/rotas-rurais/operador` e consulte a UPA `58M5+CFGH`.
5. O portal do proprietário fica em `http://localhost:3000/rotas-rurais/proprietario`.

O banco existe somente na memória. Ao encerrar o backend com `Ctrl+C`, todos os
usuários, UPAs e formulários criados durante a homologação são apagados.
