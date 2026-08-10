/// Configurações usadas para envio de e-mails via API da Prefeitura.
class EmailConfig {
  /// Caminho da rota responsável por enviar e-mails de agendamento.
  static const String appointmentMailPath = '/mail/email/appointment';

  /// API key usada para autenticar com o serviço de e-mail.
  /// Deve ser informada via `--dart-define=EMAIL_API_KEY=<chave>`.
  static const String apiKey = String.fromEnvironment('EMAIL_API_KEY', defaultValue: '');

  /// Tempo máximo aguardando resposta da API de e-mail.
  static const Duration requestTimeout = Duration(seconds: 15);
}
