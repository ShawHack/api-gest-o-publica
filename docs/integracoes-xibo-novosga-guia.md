# Guia Passo a Passo: Instala????o e Integra????o Xibo CMS + NovoSGA + SD_Docs

Este guia fornece o procedimento detalhado e operacional para instalar, configurar e integrar o **Xibo CMS (TV Corporativa)** e o **NovoSGA (Chamador de Senhas)** ?? plataforma **SD_Docs** da Prefeitura Municipal de Gar??a.

---

## ???? Sum??rio
1. [Vis??o Geral e Cen??rios de Uso](#1-vis??o-geral-e-cen??rios-de-uso)
2. [Passo a Passo: Instala????o e Configura????o do NovoSGA](#2-passo-a-passo-instala????o-e-configura????o-do-novosga)
3. [Passo a Passo: Configura????o do Xibo CMS & Widgets do SD_Docs](#3-passo-a-passo-configura????o-do-xibo-cms--widgets-do-sd_docs)
4. [Passo a Passo: Integra????o de Senhas NovoSGA na TV do Xibo (Tela Dividida)](#4-passo-a-passo-integra????o-de-senhas-novosga-na-tv-do-xibo-tela-dividida)
5. [Passo a Passo: Integra????o Operacional do Guich?? com o SD_Docs](#5-passo-a-passo-integra????o-operacional-do-guich??-com-o-sd_docs)
6. [Troubleshooting e Comandos ??teis](#6-troubleshooting-e-comandos-??teis)

---

## 1. Vis??o Geral e Cen??rios de Uso

A arquitetura permite 3 fluxos de atendimento e comunica????o visual no Pa??o Municipal:

```mermaid
flowchart TD
    subgraph "Sagu??o do Pa??o / Sala de Espera"
        TV["TV do Sagu??o (Player Xibo)"]
        Totem["Totem de Autoatendimento (NovoSGA Triagem)"]
    end

    subgraph "Balc??o / Atendimento"
        Guiche["Atendente no Guich?? (SD_Docs + NovoSGA)"]
    end

    subgraph "Servidores e Backend"
        Nginx["Nginx Gateway (api.garca.sp.gov.br)"]
        SGA["NovoSGA (10.15.25.31)"]
        Xibo["Xibo CMS (10.15.25.28:8080)"]
        DocsApi["SD_Docs API (sd_docs-api:3001)"]
    end

    Totem -->|1. Emite Senha (SP01, SE02)| SGA
    Guiche -->|2. Chama Pr??xima Senha| DocsApi
    DocsApi -->|3. Dispara Chamada| SGA
    SGA -->|4. Atualiza Painel Web / ??udio de Chamada| TV
    DocsApi -->|5. Feed de Editais & Sustentabilidade| Xibo
    Xibo -->|6. Renderiza Layout Multizona na TV| TV
    Guiche -->|7. Vincula Senha ao Processo Digital| DocsApi
```

---

## 2. Passo a Passo: Instala????o e Configura????o do NovoSGA

O NovoSGA opera no servidor dedicado `10.15.25.31` e j?? est?? roteado pelo Nginx da Prefeitura em `https://api.garca.sp.gov.br/senhas/`.

### 2.1 Estrutura de Servi??os e Unidades
1. Acesse o painel administrativo do NovoSGA:
   - **URL:** `http://10.15.25.31/admin` ou `https://api.garca.sp.gov.br/senhas/admin`
2. **Cadastrar Unidade de Atendimento:**
   - Navegue em: *Administra????o* ??? *Unidades* ??? *Adicionar Unidade*.
   - Nome: `Pa??o Municipal - Atendimento ao Cidad??o`.
3. **Cadastrar Servi??os e Prioridades:**
   - *Administra????o* ??? *Servi??os*:
     - `Protocolo Geral` (Sigla: `PG`)
     - `Tributa????o / IPTU` (Sigla: `TR`)
     - `D??vida Ativa` (Sigla: `DA`)
     - `Obras / Urbanismo` (Sigla: `OB`)
   - Em cada servi??o, habilite as op????es de atendimento Normal e Priorit??rio (Lei 10.048/2000).
4. **Cadastrar Locais / Guich??s:**
   - *Administra????o* ??? *Locais*: Adicione `Guich?? 01`, `Guich?? 02`, `Guich?? 03`, etc.
5. **Configurar o Painel de Chamadas Web:**
   - *Administra????o* ??? *Pain??is*:
   - Crie o painel `Painel Sagu??o Principal` e selecione os servi??os que devem ser exibidos na TV.
   - **URL do Painel Web para a TV:** `http://10.15.25.31/painel` ou `https://api.garca.sp.gov.br/painel-senhas/`.

---

## 3. Passo a Passo: Configura????o do Xibo CMS & Widgets do SD_Docs

O Xibo CMS gerencia a programa????o das TVs do sagu??o no endere??o `http://10.15.25.28:8080`.

### 3.1 Acessar o Xibo CMS
- **URL:** `http://10.15.25.28:8080`
- **Login:** `admin` | Senha inicial configurada na instala????o.

### 3.2 Criar um Layout (Resolu????o Full HD 1920x1080)
1. No menu lateral, acesse **Layouts** ??? **Add Layout**.
2. Preencha:
   - **Name:** `Sagu??o Digital - Pa??o Municipal`
   - **Resolution:** `1080p (1920x1080 Landscape)`
3. Clique em **Save**.

### 3.3 Adicionar o Widget de Editais e Decretos do SD_Docs
1. Abra o Layout Designer no layout criado.
2. Na barra de ferramentas de m??dia/widgets (lado esquerdo), arraste o componente **Webpage** (P??gina Web) ou **Embedded** (C??digo Incorporado) para a tela.
3. Se utilizar o tipo **Webpage**:
   - **Mode:** `Open natively / Iframe`
   - **URL:** `https://api.garca.sp.gov.br/api-docs/public/tv-feed/edicts?view=widget`
4. Se utilizar o tipo **Embedded (HTML personalizado)**:
   - Cole o conte??do do arquivo [`apps/api/src/integrations/templates/xibo-edicts-widget.html`](file:///c:/Users/saulo.lima/Documents/projeto/sd_docs/apps/api/src/integrations/templates/xibo-edicts-widget.html).
   - O widget faz requisi????es autom??ticas a `https://api.garca.sp.gov.br/api-docs/public/tv-feed/edicts` a cada 30 segundos com transi????o suave em carrossel.

---

## 4. Passo a Passo: Integra????o de Senhas NovoSGA na TV do Xibo (Tela Dividida)

Para que a **mesma TV** exiba simultaneamente o **Chamador de Senhas do NovoSGA** e o **Feed de Decretos / Transpar??ncia do SD_Docs**:

```text
+-------------------------------------------------------------+
|               CABE??ALHO: PREFEITURA DE GAR??A                |
+------------------------------+------------------------------+
|       ZONA ESQUERDA (60%)    |      ZONA DIREITA (40%)      |
|                              |                              |
|   PAINEL DE SENHAS NOVOSGA   |    WIDGET DE TRANSPAR??NCIA   |
|                              |           SD_DOCS            |
|       SENHA CHAMADA:         |                              |
|           PG-042             |   ??? ??ltimos Decretos         |
|         GUICH??: 03           |   ??? Editais Publicados       |
|                              |   ??? Economia: 42.800 folhas  |
|   Hist??rico de Senhas:       |                              |
|   ??? TR-018 - Guich?? 01       |                              |
|   ??? DA-005 - Guich?? 02       |                              |
+------------------------------+------------------------------+
|               RODAP??: DATA / HORA / NOT??CIAS                |
+-------------------------------------------------------------+
```

### 4.1 Criar o Layout Multizona no Xibo:
1. No Layout Designer, adicione 2 Regi??es (Zonas):
   - **Regi??o 1 (Senhas NovoSGA):**
     - Largura: `1152px` (60%), Altura: `900px`, Top: `100px`, Left: `0px`.
     - Widget: **Webpage** com a URL `https://api.garca.sp.gov.br/painel-senhas/` (ou `http://10.15.25.31/painel`).
   - **Regi??o 2 (Feed SD_Docs):**
     - Largura: `768px` (40%), Altura: `900px`, Top: `100px`, Left: `1152px`.
     - Widget: **Embedded / Webpage** com o template `xibo-edicts-widget.html`.
2. Salve e publique o Layout (**Publish Layout**).
3. No menu **Schedule (Agendamento)**, associe o layout ao Display Group `TVs Sagu??o Pa??o`.

---

## 5. Passo a Passo: Integra????o Operacional do Guich?? com o SD_Docs

Quando o cidad??o ?? chamado no guich??, o atendente pode vincular o ticket do atendimento diretamente ao processo no SD_Docs.

### 5.1 No Backend do SD_Docs (`apps/api`):
O m??dulo `NovosgaModule` j?? exp??e as opera????es necess??rias:
- **Consultar Filas:** `GET /integrations/novosga/queues`
- **Chamar Pr??xima Senha:** `POST /integrations/novosga/call-next`
  ```json
  {
    "serviceId": 1,
    "deskNumber": 3
  }
  ```
- **Vincular Ticket ao Processo:** `POST /integrations/novosga/link-ticket`
  ```json
  {
    "documentId": "cly1234567890",
    "ticketNumber": "PG-042",
    "serviceName": "Protocolo Geral"
  }
  ```
  *O sistema registra automaticamente um evento de auditoria (`AuditLog`) no hist??rico do processo.*

---

## 6. Troubleshooting e Comandos ??teis

### 6.1 Testar Conectividade com o NovoSGA:
```bash
curl -I http://10.15.25.31/api
```

### 6.2 Testar Feed P??blico do Xibo:
```bash
curl -s https://api.garca.sp.gov.br/api-docs/public/tv-feed/edicts | jq .
curl -s https://api.garca.sp.gov.br/api-docs/public/tv-feed/transparency | jq .
```

### 6.3 Reiniciar Containers de Integra????o:
```bash
# Reiniciar SD_Docs API
docker restart sd_docs-api

# Reiniciar Nginx Gateway
docker restart api-semit-nginx
```

