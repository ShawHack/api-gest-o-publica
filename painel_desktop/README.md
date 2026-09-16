# Painel de Senhas e TV Corporativa — Cliente Desktop (Windows e Linux)

Aplicativo oficial instalável para execução do Painel de Senhas e TV Corporativa da Prefeitura Municipal de Garça (SEMIT) em computadores dedicados.

## Vantagens em Relação ao Navegador Web
1. **Zero Telas Pretas / Zero Engasgos:** Baixa 100% dos vídeos e mídias para o disco local antes de iniciar a reprodução.
2. **Funcionamento Offline:** Se a internet oscilar, a programação de vídeos continua rodando sem interrupções.
3. **Audio Ducking Automático:** Abaixa o volume da TV corporativa para 5% durante a fala de uma nova senha e restaura o volume automaticamente após o anúncio.
4. **Modo Kiosk (Tela Cheia Nativa):** Abre em tela cheia e esconde o cursor do mouse em inatividade.

---

## Como Executar em Desenvolvimento

```bash
cd painel_desktop
npm install
npm start
```

---

## Como Gerar os Instaladores

### Para Windows (.exe / Instalador e Portátil):
```bash
npm run build:win
```
*O instalador gerado ficará em `dist/Painel TV Garça Setup 1.0.0.exe` e na versão `.exe` portátil.*

### Para Linux (.deb e .AppImage):
```bash
npm run build:linux
```
*Os pacotes gerados ficarão em `dist/painel-senhas-desktop_1.0.0_amd64.deb` e `dist/Painel TV Garça-1.0.0.AppImage`.*

---

## Atalhos do Sistema
- **`F2`**: Abre o painel de configurações (alterar URL do servidor, display da TV, velocidade da voz e volume).
- **`F11`**: Alternar tela cheia.
- **`Esc`**: Fechar modal de configurações.
