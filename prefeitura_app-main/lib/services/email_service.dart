import 'package:flutter/foundation.dart';

import '../config/email_config.dart';
import 'api_client.dart';

/// Serviço responsável por acionar o endpoint de e-mails do backend.
class EmailService {
  EmailService._();

  static final ApiClient _client = ApiClient();

  /// Envia um e-mail relacionado a agendamentos no backend.
  static Future<bool> sendAppointmentEmail({
    required String eventType,
    required String to,
    required Map<String, dynamic> data,
    String? idempotencyKey,
  }) async {
    assert(eventType.isNotEmpty, 'eventType não pode ser vazio');
    assert(to.isNotEmpty, 'to não pode ser vazio');

    try {
      final headers = <String, String>{
        if (EmailConfig.apiKey.isNotEmpty) 'Authorization': 'Bearer ${EmailConfig.apiKey}',
        if (idempotencyKey != null && idempotencyKey.isNotEmpty) 'Idempotency-Key': idempotencyKey,
      };

      debugPrint('📧 Disparando email ($eventType) para $to via API...');

      final response = await _client
          .post(
            EmailConfig.appointmentMailPath,
            headers: headers,
            body: {
              'eventType': eventType,
              'to': to,
              'data': data,
            },
          )
          .timeout(EmailConfig.requestTimeout);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        debugPrint('✅ Email API respondeu ${response.statusCode}: ${response.body}');
        return true;
      }

      debugPrint('❌ Falha ao enviar email (${response.statusCode}): ${response.body}');
      return false;
    } catch (e, st) {
      debugPrint('❌ Erro ao chamar API de email: $e');
      debugPrint('$st');
      return false;
    }
  }
}
