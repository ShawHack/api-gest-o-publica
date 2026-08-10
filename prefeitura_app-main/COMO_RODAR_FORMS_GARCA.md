# 🚀 Como Rodar o Forms Garça

## 📋 Pré-requisitos

1. Flutter instalado e configurado
2. Chrome instalado
3. Dependências instaladas: `flutter pub get`

## 🎯 Método 1: Android Studio (Recomendado)

### Passo a Passo:

1. **Abra o Android Studio**
2. **Abra o projeto** na pasta `prefeitura_app-main`
3. **Aguarde a indexação** (pode demorar alguns minutos na primeira vez)
4. **No topo da tela**, ao lado do botão ▶️ Run:
   - **Dropdown de configurações**: Selecione ou crie "Flutter Web 7500"
   - **Dropdown de dispositivos**: Selecione "Chrome (web)"
5. **Clique em ▶️ Run** (ou pressione Shift+F10)

### Se não tiver a configuração "Flutter Web 7500":

1. Clique no dropdown de configurações
2. Selecione "Edit Configurations..."
3. Clique no **+** e escolha "Flutter"
4. Configure:
   - **Name**: `Flutter Web 7500`
   - **Dart entrypoint**: `lib/main.dart`
   - **Additional run args**: `--web-hostname=localhost --web-port=7500`
5. Clique em "Apply" e "OK"

## 🎯 Método 2: Terminal do Android Studio

1. **Abra o terminal** (Alt+F12)
2. **Execute**:
   ```bash
   cd prefeitura_app-main
   flutter run -d chrome --web-hostname=localhost --web-port=7500
   ```

## 🎯 Método 3: Script Batch (Windows)

1. **Navegue até a pasta** `prefeitura_app-main`
2. **Execute**:
   ```bash
   run_web.bat
   ```

## 🌐 Acessar o Forms Garça

Após o app iniciar:

1. **O Chrome abrirá automaticamente** em `http://localhost:7500`
2. **Acesse a tela de login**:
   - Digite na barra de endereços: `/#/forms-garca-login`
   - Ou acesse diretamente: `http://localhost:7500/#/forms-garca-login`

## ⚠️ Problemas Comuns

### 1. "Port 7500 is already in use"

**Solução:**
```powershell
# Windows PowerShell:
netstat -ano | findstr :7500
taskkill /F /PID [número_do_processo]
```

### 2. Chrome não aparece como dispositivo

**Solução:**
```bash
flutter config --enable-web
flutter devices
```

### 3. Erros de compilação

**Solução:**
```bash
cd prefeitura_app-main
flutter clean
flutter pub get
flutter run -d chrome --web-hostname=localhost --web-port=7500
```

### 4. Página em branco

**Solução:**
1. Verifique o console do navegador (F12) para erros
2. Tente acessar primeiro: `http://localhost:7500`
3. Depois navegue para: `/#/forms-garca-login`
4. Faça um Hot Restart (Ctrl+Shift+\)

### 5. "No devices found"

**Solução:**
```bash
flutter config --enable-web
flutter doctor
```

## 🔍 Verificar se está funcionando

1. ✅ O Chrome deve abrir automaticamente
2. ✅ A URL deve ser: `http://localhost:7500`
3. ✅ Você deve ver a tela inicial do app
4. ✅ Acesse `/#/forms-garca-login` para ver a tela de login

## 📝 Credenciais de Teste

Use as mesmas credenciais de admin do sistema de agendamento:
- **Email**: (seu email de admin)
- **Senha**: (sua senha de admin)
- **Role**: Deve ser `admin`

## 🆘 Ainda não funciona?

1. Verifique se o Flutter está atualizado: `flutter doctor`
2. Verifique se há erros no console do navegador (F12)
3. Tente fazer um `flutter clean` e rodar novamente
4. Verifique se todas as dependências foram instaladas: `flutter pub get`







