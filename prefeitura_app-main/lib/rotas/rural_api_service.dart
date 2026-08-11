import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:prefeitura_app/services/audit_client_headers.dart';

class RuralMapProperty {
  const RuralMapProperty({
    required this.codigoUpa,
    required this.plusCode,
    required this.name,
    required this.latitude,
    required this.longitude,
  });

  final String codigoUpa;
  final String plusCode;
  final String name;
  final double latitude;
  final double longitude;

  factory RuralMapProperty.fromJson(Map<String, dynamic> json) {
    final location = json['location'] is Map
        ? Map<String, dynamic>.from(json['location'] as Map)
        : <String, dynamic>{};
    return RuralMapProperty(
      codigoUpa: json['codigoUpa']?.toString().trim() ?? '',
      plusCode: json['plusCode']?.toString().trim() ?? '',
      name: json['name']?.toString().trim() ?? '',
      latitude: (location['latitude'] as num).toDouble(),
      longitude: (location['longitude'] as num).toDouble(),
    );
  }
}

class RuralApiException implements Exception {
  const RuralApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

class RuralApiService {
  RuralApiService({http.Client? client}) : _client = client ?? http.Client();

  static const String _baseUrl = 'https://api.garca.sp.gov.br/api/rotas-rurais';

  final http.Client _client;

  Future<List<RuralMapProperty>> searchProperties(String query) async {
    final value = query.trim();
    if (value.length < 2) return const [];

    final response = await _client.get(
      Uri.parse(
        '$_baseUrl/map/properties/search',
      ).replace(queryParameters: {'q': value}),
      headers: AuditClientHeaders.merge(
        const {'Accept': 'application/json'},
        module: 'rotas-rurais',
        screen: 'mobile/search',
      ),
    );

    Map<String, dynamic> body = const {};
    try {
      body = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      throw const RuralApiException(
        'A API de Estradas Rurais retornou uma resposta inválida.',
      );
    }

    if (response.statusCode != 200) {
      throw RuralApiException(
        body['message']?.toString() ??
            'Não foi possível pesquisar as propriedades rurais.',
      );
    }

    final items = body['items'];
    if (items is! List) return const [];
    return items
        .whereType<Map>()
        .map(
          (item) => RuralMapProperty.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList(growable: false);
  }

  void close() => _client.close();
}
