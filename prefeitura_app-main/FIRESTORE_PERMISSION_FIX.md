# Como Corrigir o Erro de Permissão do Firestore

## Problema
O aplicativo está recebendo o erro: `[cloud_firestore/permission-denied] The caller does not have permission to execute the specified operation.`

## Solução

### Opção 1: Aplicar via Firebase Console (Recomendado)

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto: **prefeituraapp**
3. No menu lateral, clique em **Firestore Database**
4. Clique na aba **Regras** (Rules)
5. Copie o conteúdo do arquivo `firestore.rules` deste projeto
6. Cole no editor de regras do Firebase Console
7. Clique em **Publicar** (Publish)

### Opção 2: Aplicar via Firebase CLI

Se você tiver o Firebase CLI instalado:

```bash
# Instalar Firebase CLI (se não tiver)
npm install -g firebase-tools

# Fazer login
firebase login

# Inicializar o projeto (se ainda não foi feito)
firebase init firestore

# Aplicar as regras
firebase deploy --only firestore:rules
```

### Opção 3: Regras Temporárias para Desenvolvimento (NÃO USAR EM PRODUÇÃO)

Se você precisa de uma solução rápida apenas para desenvolvimento/teste:

1. Acesse o Firebase Console
2. Vá em Firestore Database > Regras
3. Substitua por estas regras TEMPORÁRIAS:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**ATENÇÃO**: Essas regras permitem acesso total a qualquer pessoa. Use APENAS para testes e NUNCA em produção!

## Verificação

Após aplicar as regras:

1. Aguarde alguns segundos para as regras serem propagadas
2. Reinicie o aplicativo
3. Tente acessar a tela de "Novo Agendamento" novamente

## Credenciais de Teste

O aplicativo está configurado para fazer login automaticamente com:
- Email: ls789679@gmail.com
- Senha: fornecida por canal seguro; não armazenar no repositório.

Certifique-se de que este usuário existe no Firebase Authentication.
