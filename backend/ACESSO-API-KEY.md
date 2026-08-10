# API Key - Integrações Externas

## Configuração

No `.env` do backend, adicione:

```env
# Chaves válidas (separadas por vírgula)
API_KEYS=sua_chave_secreta_1,outra_chave_parceiro

# Opcional: vincular a um usuário específico (para operações que precisam de userId)
API_KEY_USER_ID=64f1234567890abcdef
```

## Uso

Envie a chave no header de cada requisição:

```
X-API-Key: sua_chave_secreta_1
```

## Gerar uma chave segura

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Endpoints que aceitam API Key

Todos os endpoints que exigem autenticação (`verifyToken`) aceitam **JWT** ou **API Key**:

- `Authorization: Bearer <token>` (JWT – login de usuário)
- `X-API-Key: <chave>` (API Key – integração sistema a sistema)

## Permissões

- Sem `API_KEY_USER_ID`: a chave usa o papel `apikey` (acesso básico).
- Com `API_KEY_USER_ID`: a chave age como o usuário informado (herda as permissões dele).

## Exemplo (curl)

```bash
curl -H "X-API-Key: sua_chave" https://api.garca.sp.gov.br/api/pets/mypets
```
