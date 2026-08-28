import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:prefeitura_app/features/agenda/data/agenda_api_service.dart';
import 'package:prefeitura_app/features/agenda/data/agenda_models.dart';
import 'package:prefeitura_app/screens/web/my_appointments_screen.dart';
import 'package:prefeitura_app/screens/web/new_appointment_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _app(Widget home) => MaterialApp(
  locale: const Locale('pt', 'BR'),
  supportedLocales: const [Locale('pt', 'BR')],
  localizationsDelegates: GlobalMaterialLocalizations.delegates,
  home: home,
);

void main() {
  setUp(
    () => SharedPreferences.setMockInitialValues({'auth_token': 'jwt-central'}),
  );

  testWidgets('novo agendamento apresenta catálogo da API', (tester) async {
    final api = AgendaApiService(
      baseUrl: 'https://api.example.test',
      client: MockClient((request) async {
        expect(request.url.path, '/api/agenda/services');
        expect(request.headers['authorization'], 'Bearer jwt-central');
        return http.Response(
          jsonEncode({
            'items': [
              {
                '_id': 'service-1',
                'name': 'Emissão de documento',
                'durationMinutes': 30,
                'unitId': {'_id': 'unit-1', 'name': 'Paço Municipal'},
              },
            ],
          }),
          200,
        );
      }),
    );

    await tester.pumpWidget(_app(NewAppointmentScreen(api: api)));
    await tester.pumpAndSettle();
    expect(find.text('Novo agendamento'), findsOneWidget);
    await tester.tap(
      find.byType(DropdownButtonFormField<AgendaServiceSummary>),
    );
    await tester.pumpAndSettle();
    expect(find.text('Emissão de documento — Paço Municipal'), findsOneWidget);
  });

  testWidgets('histórico usa endpoint mine e apresenta protocolo', (
    tester,
  ) async {
    final api = AgendaApiService(
      baseUrl: 'https://api.example.test',
      client: MockClient((request) async {
        expect(request.url.path, '/api/agenda/appointments/mine');
        expect(request.url.queryParameters.containsKey('userId'), isFalse);
        return http.Response(
          jsonEncode({
            'items': [
              {
                '_id': 'appointment-1',
                'protocol': 'AGD-20260828-TESTE',
                'status': 'booked',
                'startsAt': '2026-09-01T12:00:00.000Z',
                'serviceId': {
                  '_id': 'service-1',
                  'name': 'Emissão de documento',
                },
                'unitId': {'_id': 'unit-1', 'name': 'Paço Municipal'},
              },
            ],
          }),
          200,
        );
      }),
    );

    await tester.pumpWidget(_app(MyAppointmentsScreen(api: api)));
    await tester.pumpAndSettle();
    expect(find.text('Emissão de documento'), findsOneWidget);
    expect(find.text('Protocolo: AGD-20260828-TESTE'), findsOneWidget);
    expect(find.text('Agendado'), findsOneWidget);
  });
}
