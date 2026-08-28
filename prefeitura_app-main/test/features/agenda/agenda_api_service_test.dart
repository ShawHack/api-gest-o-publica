import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:prefeitura_app/features/agenda/data/agenda_api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({'token': 'jwt-central'}));

  test('usa JWT central, origem mobile e chave de idempotência', () async {
    late http.Request captured;
    final api = AgendaApiService(
      baseUrl: 'https://api.example.test',
      client: MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode({
            'appointment': {
              '_id': 'appointment-1',
              'protocol': 'AGD-1',
              'status': 'booked',
              'startsAt': '2026-09-01T12:00:00.000Z',
            },
          }),
          201,
        );
      }),
    );

    await api.create(
      serviceId: 'service-1',
      startsAt: DateTime.utc(2026, 9, 1, 12),
      idempotencyKey: 'mobile-test-123',
    );

    final body = jsonDecode(captured.body) as Map<String, dynamic>;
    expect(captured.headers['authorization'], 'Bearer jwt-central');
    expect(captured.headers['idempotency-key'], 'mobile-test-123');
    expect(body['source'], 'mobile');
    expect(body.containsKey('userId'), isFalse);
  });

  test('bloqueia chamada sem sessão central', () async {
    SharedPreferences.setMockInitialValues({});
    final api = AgendaApiService(
      baseUrl: 'https://api.example.test',
      client: MockClient((_) async => http.Response('{}', 200)),
    );

    expect(
      api.mine(),
      throwsA(
        isA<AgendaApiException>().having(
          (error) => error.statusCode,
          'statusCode',
          401,
        ),
      ),
    );
  });

  test('propaga mensagem segura da API', () async {
    final api = AgendaApiService(
      baseUrl: 'https://api.example.test',
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({'message': 'Horário indisponível.'}),
          409,
        ),
      ),
    );

    expect(
      api.cancel('appointment-1'),
      throwsA(
        isA<AgendaApiException>()
            .having((error) => error.statusCode, 'statusCode', 409)
            .having(
              (error) => error.message,
              'message',
              'Horário indisponível.',
            ),
      ),
    );
  });
}
