# Como fazer Build pelo Android Studio

## Pré-requisitos

1. **Android Studio instalado** (versão mais recente recomendada)
2. **Flutter SDK instalado** e configurado
3. **Android SDK** configurado no Android Studio

## Passos para Build

### 1. Abrir o Projeto no Android Studio

```bash
# Navegue até a pasta do projeto Android
cd prefeitura_app-main/android

# Ou abra o Android Studio e selecione:
# File > Open > Selecione a pasta "prefeitura_app-main"
```

### 2. Configurar o Projeto

1. No Android Studio, aguarde a sincronização do Gradle (pode demorar na primeira vez)
2. Certifique-se de que o Flutter plugin está instalado:
   - `File > Settings > Plugins`
   - Procure por "Flutter" e instale se necessário

### 3. Selecionar o Build Variant

1. Vá em `Build > Select Build Variant` (ou use o painel lateral)
2. Selecione:
   - **debug** - para desenvolvimento/testes
   - **release** - para produção

### 4. Fazer o Build

#### Opção A: Via Menu do Android Studio

1. `Build > Make Project` (ou `Ctrl+F9` / `Cmd+F9`)
   - Compila o projeto
   
2. `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - Gera o APK para instalação
   
3. `Build > Build Bundle(s) / APK(s) > Build Bundle(s)`
   - Gera o AAB (Android App Bundle) para publicação na Play Store

#### Opção B: Via Terminal do Android Studio

No terminal integrado do Android Studio:

```bash
# Build APK Debug
./gradlew assembleDebug

# Build APK Release
./gradlew assembleRelease

# Build AAB Release (para Play Store)
./gradlew bundleRelease
```

#### Opção C: Via Flutter CLI (Recomendado)

```bash
# Navegue até a raiz do projeto Flutter
cd prefeitura_app-main

# Build APK Debug
flutter build apk --debug

# Build APK Release
flutter build apk --release

# Build AAB Release (para Play Store)
flutter build appbundle --release

# Build APK Split por ABI (otimizado)
flutter build apk --split-per-abi --release
```

### 5. Localização dos Arquivos Gerados

Após o build, os arquivos estarão em:

- **APK Debug**: `prefeitura_app-main/build/app/outputs/flutter-apk/app-debug.apk`
- **APK Release**: `prefeitura_app-main/build/app/outputs/flutter-apk/app-release.apk`
- **AAB Release**: `prefeitura_app-main/build/app/outputs/bundle/release/app-release.aab`

### 6. Instalar no Dispositivo

#### Via Android Studio:
1. Conecte o dispositivo via USB (ou use um emulador)
2. `Run > Run 'app'` (ou `Shift+F10` / `Ctrl+R`)
3. O app será instalado e executado automaticamente

#### Via ADB:
```bash
# Instalar APK
adb install build/app/outputs/flutter-apk/app-release.apk

# Instalar e substituir se já existir
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

## Configurações Importantes

### Assinatura (Signing) para Release

Para builds de produção, você precisa configurar a assinatura:

1. Crie um arquivo `key.properties` em `android/`:
```properties
storePassword=sua_senha
keyPassword=sua_senha
keyAlias=sua_alias
storeFile=caminho/para/seu/keystore.jks
```

2. Configure no `android/app/build.gradle.kts`:
```kotlin
android {
    signingConfigs {
        create("release") {
            val keystoreProperties = Properties()
            val keystorePropertiesFile = rootProject.file("key.properties")
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

## Troubleshooting

### Erro: "Gradle sync failed"
- Verifique a conexão com a internet
- Limpe o cache: `File > Invalidate Caches / Restart`

### Erro: "SDK not found"
- Configure o Android SDK: `File > Settings > Appearance & Behavior > System Settings > Android SDK`

### Build muito lento
- Use `flutter build apk --release` via terminal (geralmente mais rápido)
- Desabilite antivírus temporariamente durante o build

### Erro de permissões
- Verifique se o `AndroidManifest.xml` tem as permissões necessárias


