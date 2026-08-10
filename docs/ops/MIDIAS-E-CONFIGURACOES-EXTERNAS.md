# Mídias e configurações externas

O histórico limpo não inclui conteúdo operacional, credenciais ou artefatos gerados.

## Mídias culturais

Fotografias e vídeos brutos de `cultura-src/emca/imagesemca/` e `cultura-src/biblioteca/` permanecem preservados no servidor de produção. Eles devem ser migrados posteriormente para armazenamento de objetos ou para um repositório Git LFS separado.

## Builds publicados

`backend/public/`, `nginx/react/`, builds Flutter, uploads e pacotes de deploy são artefatos de publicação. Devem ser produzidos pelo pipeline e não versionados junto das fontes.

## Firebase

Os arquivos concretos `google-services.json`, `GoogleService-Info.plist` e `firebase_options.dart` foram excluídos. Cada ambiente deve provisioná-los por um canal seguro antes do build.

## Autenticação de build Flutter

A senha HTTP antes hardcoded foi substituída por:

```dart
const String.fromEnvironment('API_BASIC_AUTH_PASSWORD')
```

Forneça o valor com `--dart-define` apenas no ambiente de build. Nunca registre o valor no Git, documentação ou scripts.
