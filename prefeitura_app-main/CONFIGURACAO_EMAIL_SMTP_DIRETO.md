# 📧 Configuração do Envio de E-mails via API - Prefeitura de Garça

## ✅ Nova Arquitetura

Os e-mails de agendamento agora são enviados **via API do backend Node.js**. O Flutter não se conecta mais diretamente ao servidor SMTP (eliminação do pacote `mailer`).

## 🎯 Fluxo de Funcionamento

1. **Flutter chama a API**: ao criar, reagendar ou cancelar um agendamento o app envia um POST para `/api/mail/email/appointment`.
2. **Backend autentica**: o backend valida a `API_KEY_EMAIL_SERVICE`.
3. **Backend entrega**: a API monta o template correto (`created`, `rescheduled`, `canceled`) e usa o Nodemailer com as credenciais SMTP do servidor.

## 📋 Configurações Necessárias

### Flutter (`prefeitura_app-main`)

- Defina a base da API ao executar o app:  
  `--dart-define=API_BASE_URL=https://seu-dominio/api`
- Informe a chave de autenticação da API de e-mail:  
  `--dart-define=EMAIL_API_KEY=<chave_configurada_no_backend>`
- Verifique o arquivo `lib/config/email_config.dart`:
  ```dart
  class EmailConfig {
    static const String appointmentMailPath = '/mail/email/appointment';
    static const String apiKey = String.fromEnvironment('EMAIL_API_KEY', defaultValue: '');
    static const Duration requestTimeout = Duration(seconds: 15);
  }
  ```

### Backend Node.js (`backend/.env`)

Certifique-se de preencher:

```
API_KEY_EMAIL_SERVICE=mesma_chave_definida_no_flutter
MAIL_HOST=webmail.garca.sp.gov.br
MAIL_PORT=587
MAIL_USER=cgp@garca.sp.gov.br
MAIL_PASS=********
MAIL_FROM="Prefeitura M. de Garça <cgp@garca.sp.gov.br>"
```

## 📝 Principais Arquivos

- `lib/config/email_config.dart` – guarda caminho e chave da API.
- `lib/services/email_service.dart` – cliente HTTP que chama o backend.
- `lib/services/appointment_service.dart` – dispara os e-mails para:
  - criação (`created`);
  - reagendamento (`rescheduled`);
  - cancelamento (`canceled`).

## 🔍 Como o App Usa

O `AppointmentService` envia e-mails automaticamente quando:

- um agendamento é criado;
- um gerente aprova um reagendamento solicitado;
- um gerente reagenda diretamente;
- um gerente cancela o agendamento (direto ou aprovação de cancelamento).

Cada disparo envia um `Idempotency-Key` baseado no ID do agendamento, evitando duplicidades no backend.

## ✅ Vantagens da Nova Abordagem

- Funciona em todas as plataformas Flutter (incluindo Web/iOS).
- Remove credenciais SMTP do app.
- Centraliza regras e templates no backend.

## 🛠️ Troubleshooting

- **401 Unauthorized**: verifique se o `EMAIL_API_KEY` informado no Flutter coincide com `API_KEY_EMAIL_SERVICE`.
- **500 Internal Server Error**: consulte os logs do backend (`docker-compose logs api`) para entender o erro SMTP.
- **Timeout**: verifique conectividade entre o app e a API e o valor de `requestTimeout` em `EmailConfig`.

## 🎯 Pronto!

Com as definições acima, o app já dispara automaticamente os e-mails de confirmação, reagendamento e cancelamento via API oficial.

