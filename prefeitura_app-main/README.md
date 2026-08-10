# Prefeitura App

> Documentação completa está em [`/docs`](../../Downloads/repo_com_readme/docs).

## Sumário rápido
- **Stack:** Flutter/Dart | cloud_firestore, cupertino_icons, firebase_core, flutter_staggered_grid_view, mask_text_input_formatter, url_launcher, webview_flutter
- **Rodar local (Mobile):**
  ```bash
  flutter pub get
  flutter run
  ```
- **Rodar local (Web - Porta 7500):**
  ```bash
  flutter run -d chrome --web-hostname=localhost --web-port=7500
  # Ou use o script: run_web.bat (Windows) / ./run_web.sh (Linux/Mac)
  ```
- **Build:**
  ```bash
  flutter build apk      # Android
  flutter build appbundle
  flutter build ios      # iOS
  flutter build web      # Web
  ```

## Documentação
- Visão Geral: `/docs/01_VisaoGeral.md`
- Instalação: `/docs/02_Instalacao.md`
- Dependências: `/docs/03_Dependencias.md`
- Estrutura: `/docs/04_EstruturaPastas.md`
- Firebase: `/docs/05_ConfiguracaoFirebase.md`
- Contribuição: `/docs/06_Contribuicao.md`
- Arquitetura: `/docs/07_Arquitetura.md`
- Telas & Fluxos: `/docs/08_TelasFluxos.md`
- Ambientes & Variáveis: `/docs/09_AmbienteVariaveis.md`
- Testes & CI: `/docs/10_TestesCI.md`
- **Executar Web (Porta 7500):** `/docs/EXECUTAR_WEB.md` ⭐
- Solução CORS: `/docs/SOLUCAO_CORS.md`

## Histórico de Atualizações (Dezembro/2025 - Janeiro/2026)

### 📱 Interface e Assets
- **Ícone do Launcher:** Corrigida a referência no `AndroidManifest.xml` e configuração do `flutter_launcher_icons` para usar o ícone correto (`@mipmap/launcher_icon`).
- **Estradas Rurais:** Corrigido bug visual do fundo "estourando". Substituída imagem quebrada por gradiente linear CSS-like no arquivo `main.dart`.
- **Botões:** Ajuste de visibilidade no botão "Solicitar Serviço", forçando fundo azul e texto branco para contraste adequado.

### 🌐 Serviços e WebView
- **Google Auth em WebViews:** Resolvido erro 403 (disallowed_useragent) ao tentar logar com Google (1Doc) dentro do app.
  - Implementado `UserAgent` falso simulando Chrome Mobile no `WebViewController`.
  - Habilitado Zoom (`enableZoom(true)`) para melhor usabilidade em serviços externos.
- **Carregamento de Serviços:** Corrigida lógica na `ServiceTab`.
  - Prioridade alterada para buscar na coleção `Services` (Maiúsculo - Categorias ao Cidadão) antes de `services` (minúsculo - Agendamentos).
  - Adicionado suporte a múltiplos nomes de campos (`title`, `nome`, `label`) e ícones para evitar "Título não disponível".

### 💡 Iluminação Pública
- **Plus Code / Localização:**
  - Integrada biblioteca `open_location_code` para validação e decodificação robusta.
  - O app agora extrai Latitude/Longitude exatas de Plus Codes completos.
  - **WhatsApp:** O link "Abrir no Maps" enviado aos administradores agora usa coordenadas exatas (`lat,lng`) quando disponíveis, garantindo precisão total para a equipe de reparo.
- **Regras de Segurança:** Identificada necessidade de liberar permissões de escrita em `iluminacao_reports` e leitura em `iluminacao_settings` no Firebase Console.
