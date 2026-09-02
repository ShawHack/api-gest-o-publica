import 'dart:convert';

import 'package:http/http.dart' as http;

import 'audit_client_headers.dart';
import 'env.dart';

/// Cliente HTTP simples centralizado para o app.
/// Lê a `apiBaseUrl` de `env.dart` (definida via `--dart-define`).
class ApiClient {
  ApiClient({http.Client? httpClient}) : _http = httpClient ?? http.Client();

  final http.Client _http;

  Uri _resolve(String path, [Map<String, dynamic>? query]) {
    final normalizedBase = apiBaseUrl.endsWith('/')
        ? apiBaseUrl.substring(0, apiBaseUrl.length - 1)
        : apiBaseUrl;
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$normalizedBase$normalizedPath').replace(
      queryParameters: query?.map((k, v) => MapEntry(k, '$v')),
    );
  }

  Future<http.Response> get(
    String path, {
    Map<String, dynamic>? query,
    Map<String, String>? headers,
  }) async {
    final uri = _resolve(path, query);
    return _http.get(uri, headers: AuditClientHeaders.merge(headers));
  }

  Future<http.Response> post(
    String path, {
    Object? body,
    Map<String, String>? headers,
    Map<String, dynamic>? query,
  }) async {
    final uri = _resolve(path, query);
    final effectiveHeaders = <String, String>{
      'Content-Type': 'application/json; charset=utf-8',
      if (headers != null) ...headers,
    };
    final payload = body is String ? body : jsonEncode(body ?? <String, dynamic>{});
    return _http.post(uri, headers: effectiveHeaders, body: payload);
  }

  Future<http.Response> put(
    String path, {
    Object? body,
    Map<String, String>? headers,
    Map<String, dynamic>? query,
  }) async {
    final uri = _resolve(path, query);
    final effectiveHeaders = AuditClientHeaders.merge(<String, String>{
      'Content-Type': 'application/json; charset=utf-8',
      if (headers != null) ...headers,
    });
    final payload = body is String ? body : jsonEncode(body ?? <String, dynamic>{});
    return _http.put(uri, headers: effectiveHeaders, body: payload);
  }

  Future<http.Response> delete(
    String path, {
    Map<String, String>? headers,
    Map<String, dynamic>? query,
  }) async {
    final uri = _resolve(path, query);
    return _http.delete(uri, headers: AuditClientHeaders.merge(headers));
  }

  void close() {
    _http.close();
  }
}



