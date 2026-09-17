# Painel de Senhas e TV Corporativa — Cliente Desktop (Windows e Linux)

Aplicativo oficial instalável para execução do Painel de Senhas e TV Corporativa da Prefeitura Municipal de Garça (SEMIT) em computadores dedicados.

## Vantagens em Relação ao Navegador Web
1. **Zero Telas Pretas / Zero Engasgos:** Baixa 100% dos vídeos e mídias para o disco local antes de iniciar a reprodução.
2. **Funcionamento Offline:** Se a internet oscilar, a programação de vídeos continua rodando sem interrupções.
3. **Audio Ducking Automático:** Abaixa o volume da TV corporativa para 5% durante a fala de uma nova senha e restaura o volume automaticamente após o anúncio.
4. **Modo Kiosk (Tela Cheia Nativa):** Abre em tela cheia e esconde o cursor do mouse em inatividade.
5. **Modo TV / PC antigo:** reduz animações, sombras, transparências e pré-carga em memória; a reprodução continua usando somente arquivos já concluídos no disco.

## Mídia recomendada para equipamentos antigos

Publique preferencialmente vídeo MP4 com H.264/AAC, até 1280×720. Evite HEVC/H.265, 4K e bitrates excessivos, pois a decodificação dessas mídias pode exceder a capacidade de computadores antigos mesmo com o cliente otimizado.

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
*O instalador gerado ficará em `dist/Painel TV Garça Setup 1.1.0.exe` e na versão `.exe` portátil.*

### Para Linux (.deb e .AppImage):
```bash
npm run build:linux
```
*Os pacotes gerados incluem `.deb`, `.tar.gz` e `.zip` na pasta `dist/`.*

---

## Atalhos do Sistema
- **`F2`**: Abre o painel de configurações (alterar URL do servidor, display da TV, velocidade da voz e volume).
- **`F11`**: Alternar tela cheia.
- **`Esc`**: Fechar modal de configurações.
