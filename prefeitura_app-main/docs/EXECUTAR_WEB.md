# 🌐 Como Executar a Versão Web na Porta 7500

Este documento explica como executar a versão web do aplicativo na porta fixa **7500**.

---

## 📋 Métodos de Execução

### **Método 1: VS Code (Recomendado)** ⭐

1. **Abra o VS Code**
2. **Pressione F5** ou vá em **Run > Start Debugging**
3. **Selecione:** `Flutter Web (Porta 7500)`
4. O navegador abrirá automaticamente em: `http://localhost:7500`

---

### **Método 2: Script Batch (Windows)**

1. **Clique duas vezes** no arquivo `run_web.bat` na raiz do projeto
2. Ou execute no terminal:
   ```bash
   run_web.bat
   ```
3. O navegador abrirá automaticamente em: `http://localhost:7500`

---

### **Método 3: Script Shell (Linux/Mac)**

1. **Dê permissão de execução** (apenas na primeira vez):
   ```bash
   chmod +x run_web.sh
   ```

2. **Execute o script:**
   ```bash
   ./run_web.sh
   ```

3. O navegador abrirá automaticamente em: `http://localhost:7500`

---

### **Método 4: Linha de Comando Manual**

Execute diretamente no terminal:

```bash
flutter run -d chrome --web-hostname=localhost --web-port=7500
```

---

## 🔧 Configuração do VS Code

O arquivo `.vscode/launch.json` já está configurado com duas opções:

### **1. Flutter Web (Porta 7500)**
- Executa a versão web na porta fixa 7500
- Ideal para atendentes e gerentes

### **2. Flutter Mobile**
- Executa a versão mobile (Android/iOS)
- Ideal para cidadãos

---

## 🌐 Acessando a Aplicação Web

Após iniciar, acesse no navegador:

```
http://localhost:7500
```

### **Telas Disponíveis:**

- **Atendente:** `http://localhost:7500/#/attendant`
- **Gerente:** `http://localhost:7500/#/manager`
- **Login:** `http://localhost:7500/#/login`

---

## ⚠️ Importante

### **Porta em Uso:**
Se a porta 7500 já estiver em uso, você verá um erro:
```
Error: Port 7500 is already in use
```

**Solução:**
1. Feche o processo que está usando a porta 7500
2. Ou altere a porta nos arquivos:
   - `.vscode/launch.json`
   - `run_web.bat`
   - `run_web.sh`

### **Verificar Porta em Uso (Windows):**
```bash
netstat -ano | findstr :7500
```

### **Verificar Porta em Uso (Linux/Mac):**
```bash
lsof -i :7500
```

---

## 🔥 Hot Reload

Durante o desenvolvimento, você pode fazer alterações no código e pressionar:
- **`r`** no terminal para hot reload
- **`R`** no terminal para hot restart
- **`q`** para sair

---

## 📱 Diferença entre Web e Mobile

| Característica | Web (Porta 7500) | Mobile |
|----------------|------------------|--------|
| **Usuários** | Atendentes e Gerentes | Cidadãos |
| **Acesso** | Navegador (Chrome) | App Android/iOS |
| **Funcionalidades** | Gerenciar agendamentos, aprovar solicitações, estatísticas | Criar agendamentos, visualizar agendamentos |
| **Login** | Requer role `atendente` ou `gerente` | Qualquer usuário |

---

## 🚀 Próximos Passos

Após executar a versão web:

1. **Faça login** com credenciais de atendente ou gerente
2. **Selecione o tipo de acesso** (Atendente ou Gerente)
3. **Comece a usar** as funcionalidades administrativas

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique se o Flutter está instalado: `flutter doctor`
2. Verifique se a porta 7500 está livre
3. Limpe o cache: `flutter clean && flutter pub get`
4. Tente novamente

---

**Desenvolvido para a Prefeitura de Garca - SP** 🏛️

