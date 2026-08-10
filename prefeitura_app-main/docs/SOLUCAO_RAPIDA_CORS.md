# ⚡ Solução Rápida para CORS - Desenvolvimento

## 🚨 Erro:

```
ClientException: Failed to fetch, uri=https://api.garca.sp.gov.br/api/users/login
```

## ✅ Solução Aplicada:

Configurei o Chrome para **desabilitar CORS** durante o desenvolvimento.

⚠️ **ATENÇÃO:** Esta solução é **APENAS PARA DESENVOLVIMENTO**. Nunca use em produção!

---

## 🚀 Como Usar:

### **Método 1: Android Studio** ⭐

1. **Feche TODOS os processos Flutter** que estão rodando
2. **Feche e reabra o Android Studio**
3. **Selecione:** `Flutter Web 7500` no dropdown de configurações
4. **Selecione:** `Chrome (web)` no dropdown de dispositivos
5. **Clique em ▶️ Run** ou pressione **Shift+F10**
6. **Pronto!** O Chrome abrirá **SEM CORS** na porta 7500

---

### **Método 2: Script Batch**

1. **Feche TODOS os processos Flutter** que estão rodando
2. **Clique duas vezes** em `run_web.bat`
3. **Pronto!** O Chrome abrirá **SEM CORS** na porta 7500

---

### **Método 3: VS Code**

1. **Feche TODOS os processos Flutter** que estão rodando
2. **Pressione F5** no VS Code
3. **Selecione:** `prefeitura_app` ou `Flutter Web (Porta 7500)`
4. **Pronto!** O Chrome abrirá **SEM CORS** na porta 7500

---

### **Método 4: Terminal Manual**

```bash
flutter run -d chrome --web-hostname=localhost --web-port=7500 --web-browser-flag="--disable-web-security" --web-browser-flag="--user-data-dir=C:\temp\chrome_dev_session"
```

---

## 🔍 Como Verificar se Funcionou:

### **1. Chrome deve abrir com aviso:**

No topo do Chrome, você verá um banner amarelo:

```
⚠️ Você está usando uma flag de linha de comando não compatível: --disable-web-security.
   A estabilidade e a segurança sofrerão.
```

**Isso é NORMAL e ESPERADO!** Significa que o CORS está desabilitado.

### **2. Login deve funcionar:**

Agora você pode fazer login normalmente na versão web sem erro de CORS.

---

## ⚠️ Importante:

### **NÃO use este Chrome para navegar na internet!**

Este Chrome está com segurança desabilitada. Use **APENAS** para desenvolvimento do app.

### **Sempre feche este Chrome após o desenvolvimento**

Não deixe este Chrome aberto navegando em outros sites.

### **Para navegar normalmente:**

Abra outro Chrome (clique no ícone do Chrome normalmente) que terá segurança habilitada.

---

## 🔧 Troubleshooting:

### **Problema 1: Ainda dá erro de CORS**

**Solução:**

1. **Feche TODOS os Chromes abertos:**
   ```bash
   taskkill /F /IM chrome.exe
   ```

2. **Execute novamente**

### **Problema 2: Chrome não abre**

**Solução:**

1. **Verifique se o Flutter está configurado para web:**
   ```bash
   flutter config --enable-web
   flutter devices
   ```

2. **Deve aparecer:**
   ```
   Chrome (web) • chrome • web-javascript • Google Chrome
   ```

### **Problema 3: Erro "Port already in use"**

**Solução:**

```bash
# Encontre o processo usando a porta 7500:
netstat -ano | findstr :7500

# Mate o processo (substitua XXXX pelo PID):
taskkill /F /PID XXXX
```

---

## 📋 Checklist Antes de Executar:

- [ ] Todos os processos Flutter foram fechados
- [ ] Todos os Chromes foram fechados
- [ ] Configuração `Flutter Web 7500` está selecionada (Android Studio)
- [ ] Dispositivo `Chrome (web)` está selecionado

---

## 🎯 Resumo:

| O que foi feito | Resultado |
|-----------------|-----------|
| ✅ Configuração Android Studio atualizada | Chrome abre sem CORS |
| ✅ Script `run_web.bat` atualizado | Chrome abre sem CORS |
| ✅ Configuração VS Code atualizada | Chrome abre sem CORS |
| ✅ Porta fixa 7500 | Sempre `http://localhost:7500` |

---

## 🚀 Próximos Passos:

Após executar com sucesso:

1. **Faça login** com suas credenciais
2. **Teste as funcionalidades** de agendamento
3. **Desenvolva normalmente** sem erro de CORS

---

## 📖 Documentação Completa:

Para entender melhor o problema de CORS e outras soluções, veja:

- **Documentação completa:** `docs/SOLUCAO_CORS.md`
- **Configuração Android Studio:** `docs/ANDROID_STUDIO_WEB.md`
- **Executar Web:** `docs/EXECUTAR_WEB.md`

---

## ⚠️ Para Produção:

Esta solução é **APENAS PARA DESENVOLVIMENTO**.

Para produção, você precisa:

1. **Configurar CORS no servidor** (melhor opção)
2. **Fazer deploy no mesmo domínio da API**
3. **Usar proxy reverso**

Veja detalhes em: `docs/SOLUCAO_CORS.md`

---

**Desenvolvido para a Prefeitura de Garca - SP** 🏛️

