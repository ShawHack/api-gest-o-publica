import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../../services/audit_client_headers.dart';
import '../../../services/env.dart';
import 'agenda_models.dart';

class AgendaApiException implements Exception {
  const AgendaApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// Cliente móvel da Agenda Garça. A identidade sempre vem do JWT central.
class AgendaApiService {
  AgendaApiService({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = (baseUrl ?? apiBaseUrl).replaceFirst(RegExp(r'/$'), '');

  final http.Client _client;
  final String _baseUrl;

  Future<Map<String, dynamic>> me() => _get('/api/agenda/me');

  Future<List<AgendaServiceSummary>> listServices() async {
    final data = await _get('/api/agenda/services');
    return _items(data).map(AgendaServiceSummary.fromJson).toList();
  }

  Future<AgendaAvailability> availability(String serviceId, String date) async {
    final data = await _get(
      '/api/agenda/services/${Uri.encodeComponent(serviceId)}/availability',
      query: {'date': date},
    );
    return AgendaAvailability.fromJson(data);
  }

  Future<List<AgendaAppointment>> mine() async {
    final data = await _get('/api/agenda/appointments/mine');
    return _items(data).map(AgendaAppointment.fromJson).toList();
  }

  Future<AgendaAppointment> create({
    required String serviceId,
    required DateTime startsAt,
    String? notes,
    String? resourceId,
    String? idempotencyKey,
  }) async {
    final data = await _send(
      'POST',
      '/api/agenda/appointments',
      headers: {'Idempotency-Key': idempotencyKey ?? newIdempotencyKey()},
      body: {
        'serviceId': serviceId,
        'startsAt': startsAt.toUtc().toIso8601String(),
        'source': 'mobile',
        if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
        if (resourceId?.isNotEmpty == true) 'resourceId': resourceId,
      },
    );
    return AgendaAppointment.fromJson(_map(data['appointment']));
  }

  Future<AgendaAppointment> reschedule({
    required String appointmentId,
    required String serviceId,
    required DateTime startsAt,
    String? resourceId,
    String? idempotencyKey,
  }) async {
    final data = await _send(
      'PATCH',
      '/api/agenda/appointments/${Uri.encodeComponent(appointmentId)}/reschedule',
      headers: {'Idempotency-Key': idempotencyKey ?? newIdempotencyKey()},
      body: {
        'serviceId': serviceId,
        'startsAt': startsAt.toUtc().toIso8601String(),
        if (resourceId?.isNotEmpty == true) 'resourceId': resourceId,
      },
    );
    return AgendaAppointment.fromJson(_map(data['appointment']));
  }

  Future<AgendaAppointment> cancel(
    String appointmentId, {
    String? reason,
  }) async {
    final data = await _send(
      'PATCH',
      '/api/agenda/appointments/${Uri.encodeComponent(appointmentId)}/cancel',
      body: {if (reason?.trim().isNotEmpty == true) 'reason': reason!.trim()},
    );
    return AgendaAppointment.fromJson(_map(data['appointment']));
  }

  String newIdempotencyKey() {
    final random = Random.secure().nextInt(0x7fffffff).toRadixString(16);
    return 'mobile-${DateTime.now().microsecondsSinceEpoch}-$random';
  }

  Future<Map<String, dynamic>> _get(
    String path, {
    Map<String, String>? query,
  }) => _send('GET', path, query: query);

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, String>? query,
    Map<String, String>? headers,
    Map<String, dynamic>? body,
  }) async {
    final token = await _centralToken();
    if (token == null) {
      throw const AgendaApiException(
        'Entre novamente para acessar a Agenda.',
        statusCode: 401,
      );
    }
    final uri = Uri.parse('$_baseUrl$path').replace(queryParameters: query);
    final request = http.Request(method, uri)
      ..headers.addAll(
        AuditClientHeaders.merge(
          {
            'Authorization': 'Bearer $token',
            'Accept': 'application/json',
            'Content-Type': 'application/json; charset=utf-8',
            ...?headers,
          },
          module: 'agenda',
          screen: 'agenda_mobile',
        ),
      );
    if (body != null) request.body = jsonEncode(body);

    final response = await http.Response.fromStream(
      await _client.send(request).timeout(const Duration(seconds: 20)),
    );
    final decoded = _decode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AgendaApiException(
        decoded['message']?.toString() ??
            'Não foi possível concluir a operação.',
        statusCode: response.statusCode,
      );
    }
    return decoded;
  }

  Future<String?> _centralToken() async {
    final preferences = await SharedPreferences.getInstance();
    final token =
        preferences.getString('token') ?? preferences.getString('auth_token');
    return token?.trim().isNotEmpty == true ? token!.trim() : null;
  }

  Map<String, dynamic> _decode(String body) {
    if (body.trim().isEmpty) return <String, dynamic>{};
    try {
      return _map(jsonDecode(body));
    } on FormatException {
      throw const AgendaApiException('A API retornou uma resposta inválida.');
    }
  }

  List<Map<String, dynamic>> _items(Map<String, dynamic> data) =>
      (data['items'] as List? ?? const []).map((item) => _map(item)).toList();

  Map<String, dynamic> _map(dynamic value) =>
      value is Map<String, dynamic> ? value : <String, dynamic>{};

  void close() => _client.close();
}
