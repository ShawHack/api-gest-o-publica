---
description: Integração do frontend SEMIT_A_PET com api-semit
---

# Plano de Integração SEMIT_A_PET → API-SEMIT

## Objetivo
Integrar o frontend do projeto SEMIT_A_PET com o backend api-semit, adicionando as funcionalidades de gestão de pets, árvores e denúncias, além de estender o sistema de usuários com as regras específicas do SEMIT_A_PET.

## Análise dos Sistemas

### SEMIT_A_PET (Origem)
- **Frontend**: React build em `/frontend/build`
- **Backend**: Express + MongoDB na porta 5000
- **Modelos**: User, Pet, Arvore, Denounce, SystemSetting
- **Tipos de Usuário**: 
  - Pessoa Física
  - Instituto
  - Admin (isAdmin: true)
  - SAMA Member (isSamaMember: true)
  - Tree Manager (canManageTrees: true)

### API-SEMIT (Destino)
- **Backend**: Express + MongoDB (já configurado)
- **Modelos Existentes**: User, Sepultado, Dloc, FormGarca, InscriptionGarca
- **Sistema de Roles**: usuario, concessionario, admin

## Etapas de Integração

### 1. Estender o Modelo User
- [x] Adicionar campos do SEMIT_A_PET ao modelo User existente:
  - `userType`: enum ['Pessoa Física', 'Instituto', 'Cemitério']
  - `instituteName`: String (para institutos)
  - `cpf_cnpj`: String (CPF ou CNPJ)
  - `isAdmin`: Boolean
  - `isSamaMember`: Boolean
  - `canManageTrees`: Boolean
  - `createdBy`: ObjectId (referência ao admin que criou)

### 2. Criar Novos Modelos
- [ ] `Pet.js`: Modelo para cadastro de pets
- [ ] `Arvore.js`: Modelo para gestão de árvores
- [ ] `Denounce.js`: Modelo para denúncias
- [ ] `SystemSetting.js`: Configurações do sistema

### 3. Criar Controllers
- [ ] `PetController.js`: CRUD de pets
- [ ] `ArvoreController.js`: CRUD de árvores
- [ ] `DenounceController.js`: CRUD de denúncias
- [ ] `SystemSettingController.js`: Gestão de configurações

### 4. Estender UserController
- [ ] Adicionar métodos do SEMIT_A_PET:
  - `getInstitutes()`: Listar institutos
  - `createUserByAdmin()`: Admin criar usuários
  - `deleteUserByAdmin()`: Admin deletar usuários criados por ele
  - `toggleTreePermission()`: Ativar/desativar permissão de árvores

### 5. Criar Rotas
- [ ] `PetRoutes.js`
- [ ] `ArvoreRoutes.js`
- [ ] `DenounceRoutes.js`
- [ ] `SystemSettingRoutes.js`
- [ ] Estender `UserRoutes.js` com novas rotas

### 6. Atualizar Backend Index
- [ ] Adicionar imports das novas rotas
- [ ] Registrar rotas no Express
- [ ] Configurar CORS para o frontend SEMIT_A_PET

### 7. Copiar e Configurar Frontend
- [ ] Copiar build do SEMIT_A_PET para api-semit
- [ ] Criar configuração de ambiente
- [ ] Atualizar URLs da API
- [ ] Configurar roteamento no nginx/express

### 8. Helpers e Middlewares
- [ ] Verificar se os helpers existentes são compatíveis:
  - `verify-token.js`
  - `get-token.js`
  - `get-user-by-token.js`
  - `create-user-token.js`
  - `image-upload.js`

### 9. Testes
- [ ] Testar autenticação
- [ ] Testar CRUD de pets
- [ ] Testar CRUD de árvores
- [ ] Testar denúncias
- [ ] Testar permissões de admin
- [ ] Testar upload de imagens

## Considerações Importantes

### Compatibilidade de Schemas
- O User do api-semit usa `cpf` enquanto SEMIT_A_PET usa `cpf_cnpj`
- Precisamos manter compatibilidade com ambos os sistemas
- Solução: Adicionar `cpf_cnpj` e manter `cpf` como alias

### Sistema de Roles
- API-SEMIT: `role` (usuario, concessionario, admin)
- SEMIT_A_PET: `isAdmin`, `userType`, `isSamaMember`, `canManageTrees`
- Solução: Manter ambos os sistemas e criar helpers de compatibilidade

### Autenticação
- Ambos usam JWT com o mesmo secret ('nossosecret')
- Compatível, mas recomenda-se usar variável de ambiente

### Upload de Imagens
- Ambos usam multer
- Verificar se os paths são compatíveis

## Estrutura Final

```
api-semit/
├── backend/
│   ├── models/
│   │   ├── User.js (estendido)
│   │   ├── Pet.js (novo)
│   │   ├── Arvore.js (novo)
│   │   ├── Denounce.js (novo)
│   │   ├── SystemSetting.js (novo)
│   │   ├── Sepultado.js
│   │   ├── Dloc.js
│   │   └── FormGarca.js
│   ├── controllers/
│   │   ├── UserController.js (estendido)
│   │   ├── PetController.js (novo)
│   │   ├── ArvoreController.js (novo)
│   │   ├── DenounceController.js (novo)
│   │   ├── SystemSettingController.js (novo)
│   │   └── ...
│   ├── routes/
│   │   ├── UserRoutes.js (estendido)
│   │   ├── PetRoutes.js (novo)
│   │   ├── ArvoreRoutes.js (novo)
│   │   ├── DenounceRoutes.js (novo)
│   │   ├── SystemSettingRoutes.js (novo)
│   │   └── ...
│   └── public/
│       └── semit-a-pet/ (frontend build)
```

## Próximos Passos
1. Backup do banco de dados atual
2. Implementar as mudanças seguindo a ordem das etapas
3. Testar cada módulo individualmente
4. Integração completa e testes end-to-end
