# 🎯 Configurar Porta 7500 no Android Studio

Este guia mostra como configurar o Android Studio para **sempre** executar a versão web na porta **7500**.

---

## 📋 Método 1: Usar Configuração Automática (Recomendado)

O arquivo `.idea/runConfigurations/Flutter_Web_7500.xml` já foi criado automaticamente.

### **Como Usar:**

1. **Abra o Android Studio**
2. **No topo da tela**, clique no dropdown de configurações (ao lado do botão ▶️ Run)
3. **Selecione:** `Flutter Web 7500`
4. **Clique no botão ▶️ Run** ou pressione **Shift+F10**
5. **Pronto!** O Chrome abrirá em `http://localhost:7500`

---

## 📋 Método 2: Criar Configuração Manual

Se a configuração automática não aparecer, crie manualmente:

### **Passo a Passo:**

#### 1️⃣ **Abrir Configurações de Execução**

- Clique no dropdown de configurações (ao lado do botão ▶️)
- Selecione **"Edit Configurations..."**

#### 2️⃣ **Criar Nova Configuração**

- Clique no **+** (Add New Configuration)
- Selecione **"Flutter"**

#### 3️⃣ **Configurar os Campos**

Preencha os seguintes campos:

| Campo | Valor |
|-------|-------|
| **Name** | `Flutter Web 7500` |
| **Dart entrypoint** | `lib/main.dart` |
| **Additional run args** | `--web-hostname=localhost --web-port=7500` |
| **Build flavor** | *(deixe vazio)* |

#### 4️⃣ **Salvar**

- Clique em **"Apply"**
- Clique em **"OK"**

#### 5️⃣ **Executar**

- Selecione `Flutter Web 7500` no dropdown
- Clique em **▶️ Run** ou pressione **Shift+F10**

---

## 📋 Método 3: Editar Configuração Existente

Se você já tem uma configuração de execução:

### **Passo a Passo:**

1. **Clique no dropdown de configurações**
2. **Selecione "Edit Configurations..."**
3. **Selecione sua configuração atual** (ex: "main.dart")
4. **No campo "Additional run args"**, adicione:
   ```
   --web-hostname=localhost --web-port=7500
   ```
5. **Clique em "Apply"** e depois **"OK"**
6. **Execute normalmente**

---

## 📋 Método 4: Usar Terminal Integrado

Se preferir usar o terminal do Android Studio:

### **Passo a Passo:**

1. **Abra o terminal** no Android Studio (Alt+F12)
2. **Execute o comando:**
   ```bash
   flutter run -d chrome --web-hostname=localhost --web-port=7500
   ```
3. **Ou use o script:**
   ```bash
   run_web.bat
   ```

---

## 🔍 Verificar Dispositivo Chrome

Certifique-se de que o **Chrome** está selecionado como dispositivo:

### **Como Verificar:**

1. **No topo da tela**, ao lado do botão ▶️ Run
2. **Clique no dropdown de dispositivos**
3. **Selecione:** `Chrome (web)`

Se o Chrome não aparecer:

1. **Execute no terminal:**
   ```bash
   flutter devices
   ```
2. **Você deve ver:**
   ```
   Chrome (web) • chrome • web-javascript • Google Chrome 120.0.6099.109
   ```

Se não aparecer:

```bash
flutter config --enable-web
flutter create .
```

---

## 🎨 Captura de Tela da Configuração

A configuração deve ficar assim:

```
┌─────────────────────────────────────────────┐
│ Name: Flutter Web 7500                      │
│                                             │
│ Dart entrypoint: lib/main.dart              │
│                                             │
│ Additional run args:                        │
│ --web-hostname=localhost --web-port=7500    │
│                                             │
│ Build flavor: [vazio]                       │
└─────────────────────────────────────────────┘
```

---

## ⚠️ Problemas Comuns

### **1. Porta ainda é aleatória**

**Solução:**
- Verifique se você está usando a configuração correta (`Flutter Web 7500`)
- Verifique se o campo "Additional run args" está preenchido
- Feche todos os processos Flutter e tente novamente

### **2. Chrome não abre**

**Solução:**
```bash
flutter config --enable-web
flutter devices
```

### **3. Erro "Port already in use"**

**Solução:**
```bash
# Windows PowerShell:
netstat -ano | findstr :7500
taskkill /F /PID [número_do_processo]
```

### **4. Configuração não aparece**

**Solução:**
- Feche e reabra o Android Studio
- Ou crie manualmente seguindo o **Método 2**

---

## 🚀 Atalhos Úteis do Android Studio

| Ação | Atalho |
|------|--------|
| **Run** | Shift+F10 |
| **Debug** | Shift+F9 |
| **Stop** | Ctrl+F2 |
| **Edit Configurations** | Alt+Shift+F10 → 0 |
| **Terminal** | Alt+F12 |
| **Hot Reload** | Ctrl+\ |
| **Hot Restart** | Ctrl+Shift+\ |

---

## 📱 Diferença: Web vs Mobile

| Característica | Web (Chrome) | Mobile (Emulador) |
|----------------|--------------|-------------------|
| **Dispositivo** | Chrome (web) | Android Emulator |
| **Porta** | 7500 (fixa) | N/A |
| **URL** | http://localhost:7500 | N/A |
| **Usuários** | Atendentes/Gerentes | Cidadãos |
| **Hot Reload** | ✅ Sim | ✅ Sim |

---

## ✅ Checklist Final

Antes de executar, verifique:

- [ ] Configuração `Flutter Web 7500` criada
- [ ] Campo "Additional run args" preenchido com `--web-hostname=localhost --web-port=7500`
- [ ] Dispositivo `Chrome (web)` selecionado
- [ ] Configuração `Flutter Web 7500` selecionada no dropdown

---

## 🎯 Resumo Rápido

**Para executar na porta 7500:**

1. **Selecione:** `Flutter Web 7500` (dropdown de configurações)
2. **Selecione:** `Chrome (web)` (dropdown de dispositivos)
3. **Clique:** ▶️ Run (ou Shift+F10)
4. **Acesse:** http://localhost:7500

---

**Desenvolvido para a Prefeitura de Garca - SP** 🏛️

