import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:prefeitura_app/features/memorial/data/memorial_exception.dart';
import 'package:prefeitura_app/features/memorial/domain/models/memorial_comment_model.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/services/audit_client_headers.dart';
import 'package:prefeitura_app/services/auth_service.dart';

class MemorialListResult {
  MemorialListResult({
    required this.items,
    required this.page,
    required this.pages,
    required this.total,
  });

  final List<SepultadoModel> items;
  final int page;
  final int pages;
  final int total;
}

class MemorialCommentsResult {
  MemorialCommentsResult({
    required this.items,
    required this.page,
    required this.hasMore,
  });

  final List<MemorialCommentModel> items;
  final int page;
  final bool hasMore;
}

class MemorialApi {
  MemorialApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const String baseUrl = AuthService.kApiBase;

  Uri _uri(String path, [Map<String, String>? query]) {
    final normalized = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$baseUrl$normalized').replace(queryParameters: query);
  }

  Future<Map<String, String>> _headers({bool withAuth = false}) async {
    final headers = <String, String>{'Accept': 'application/json'};
    if (withAuth) {
      final token = await AuthService.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return AuditClientHeaders.merge(headers, module: 'memorial');
  }

  void _throwIfError(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    String message = 'Erro ${res.statusCode}';
    try {
      final body = jsonDecode(res.body);
      if (body is Map && body['message'] != null) {
        message = body['message'].toString();
      }
    } catch (_) {
      if (res.body.isNotEmpty) {
        message = res.body.length > 120 ? res.body.substring(0, 120) : res.body;
      }
    }
    throw MemorialException(message, statusCode: res.statusCode);
  }

  List<SepultadoModel> _parseSepultadosList(dynamic data) {
    if (data is List) {
      return data
          .whereType<Map>()
          .map((e) => SepultadoModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    if (data is Map) {
      for (final key in ['sepultados', 'sepultado', 'sepults', 'items']) {
        final value = data[key];
        if (value is List) {
          return value
              .whereType<Map>()
              .map((e) => SepultadoModel.fromJson(Map<String, dynamic>.from(e)))
              .toList();
        }
      }
    }
    return [];
  }

  Future<MemorialListResult> fetchRecent({int page = 1, int limit = 20}) async {
    final res = await _client.get(
      _uri('/sepultados', {'page': '$page', 'limit': '$limit'}),
      headers: await _headers(),
    );
    _throwIfError(res);
    final body = jsonDecode(res.body);
    final items = _parseSepultadosList(body is Map ? body['sepultados'] ?? body : body);
    if (body is Map) {
      return MemorialListResult(
        items: items,
        page: (body['page'] as num?)?.toInt() ?? page,
        pages: (body['pages'] as num?)?.toInt() ?? 1,
        total: (body['total'] as num?)?.toInt() ?? items.length,
      );
    }
    return MemorialListResult(items: items, page: page, pages: 1, total: items.length);
  }

  Future<List<SepultadoModel>> search(String query, {int limit = 50}) async {
    final term = query.trim();
    if (term.isEmpty) return [];
    final res = await _client.get(
      _uri('/sepultados/pesquisa', {'q': term, 'limit': '$limit'}),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
    final body = jsonDecode(res.body);
    if (body is Map) {
      return _parseSepultadosList(body['sepultado'] ?? body['sepultados'] ?? body);
    }
    return _parseSepultadosList(body);
  }

  Future<List<SepultadoModel>> suggestions(String query) async {
    final term = query.trim();
    if (term.length < 2) return [];
    final res = await _client.get(
      _uri('/sepultados/pesquisa', {'q': term, 'limit': '8'}),
      headers: await _headers(withAuth: true),
    );
    if (res.statusCode >= 400) return [];
    final body = jsonDecode(res.body);
    if (body is Map) {
      return _parseSepultadosList(body['sepultado'] ?? body['sepultados'] ?? body);
    }
    return [];
  }

  /// Plus code da quadra (`GET /dloc/:quadra`), igual ao Memorial Web.
  Future<String?> fetchPlusCodeByQuadra(String quadra) async {
    final normalized = quadra.trim();
    if (normalized.isEmpty) {
      throw MemorialException('Quadra é obrigatória.', statusCode: 422);
    }

    final res = await _client.get(
      _uri('/dloc/${Uri.encodeComponent(normalized)}'),
      headers: await _headers(),
    );

    if (res.statusCode == 404) {
      String message = 'Quadra "$normalized" não encontrada no sistema.';
      try {
        final body = jsonDecode(res.body);
        if (body is Map && body['message'] != null) {
          message = body['message'].toString();
        }
      } catch (_) {}
      throw MemorialException(message, statusCode: 404);
    }

    if (res.statusCode == 422) {
      throw MemorialException('Quadra inválida.', statusCode: 422);
    }

    _throwIfError(res);

    final body = jsonDecode(res.body);
    if (body is Map) {
      final pluscode = body['pluscode']?.toString().trim();
      if (pluscode != null && pluscode.isNotEmpty) return pluscode;
    }
    throw MemorialException('Plus code não encontrado para esta quadra.', statusCode: 404);
  }

  Future<SepultadoModel> getById(String id) async {
    final res = await _client.get(
      _uri('/sepultados/$id'),
      headers: await _headers(),
    );
    _throwIfError(res);
    final body = jsonDecode(res.body);
    if (body is! Map) {
      throw MemorialException('Resposta inválida do servidor.');
    }
    return SepultadoModel.fromJson(Map<String, dynamic>.from(body));
  }

  Future<MemorialCommentsResult> getComments(
    String sepultadoId, {
    int page = 1,
    int limit = 10,
  }) async {
    final res = await _client.get(
      _uri('/sepultados/$sepultadoId/comentarios', {
        'page': '$page',
        'limit': '$limit',
      }),
      headers: await _headers(),
    );
    _throwIfError(res);
    final body = jsonDecode(res.body);
    final items = <MemorialCommentModel>[];
    bool hasMore = false;
    var currentPage = page;

    if (body is Map) {
      final rawItems = body['items'];
      if (rawItems is List) {
        for (final item in rawItems) {
          if (item is Map) {
            items.add(MemorialCommentModel.fromJson(Map<String, dynamic>.from(item)));
          }
        }
      }
      hasMore = body['hasMore'] == true;
      currentPage = (body['page'] as num?)?.toInt() ?? page;
    } else if (body is List) {
      for (final item in body) {
        if (item is Map) {
          items.add(MemorialCommentModel.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }

    return MemorialCommentsResult(
      items: items,
      page: currentPage,
      hasMore: hasMore,
    );
  }

  Future<void> postComment(String sepultadoId, String texto) async {
    final res = await _client.post(
      _uri('/sepultados/$sepultadoId/comentarios'),
      headers: {
        ...(await _headers(withAuth: true)),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'mensagem': texto.trim()}),
    );
    _throwIfError(res);
  }

  Future<MemorialListResult> fetchMySepultados({
    int page = 1,
    int limit = 20,
    String? query,
  }) async {
    final params = <String, String>{
      'page': '$page',
      'limit': '$limit',
    };
    if (query != null && query.trim().isNotEmpty) {
      params['q'] = query.trim();
    }
    final res = await _client.get(
      _uri('/sepultados/meussepultados', params),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
    final body = jsonDecode(res.body);
    final items = _parseSepultadosList(body is Map ? body['sepults'] ?? body : body);
    if (body is Map) {
      return MemorialListResult(
        items: items,
        page: (body['page'] as num?)?.toInt() ?? page,
        pages: (body['pages'] as num?)?.toInt() ?? 1,
        total: (body['total'] as num?)?.toInt() ?? items.length,
      );
    }
    return MemorialListResult(items: items, page: page, pages: 1, total: items.length);
  }

  Future<Map<String, dynamic>> fetchCurrentUser() async {
    final res = await _client.get(
      _uri('/users/checkuser'),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
    final body = jsonDecode(res.body);
    if (body is! Map) {
      throw MemorialException('Resposta inválida ao carregar perfil.');
    }
    final map = Map<String, dynamic>.from(body);
    final user = map['user'];
    if (user is Map) {
      return Map<String, dynamic>.from(user);
    }
    return map;
  }

  Future<void> updateProfile({
    required String userId,
    required String name,
    required String email,
    String? phone,
    required String password,
    required String confirmPassword,
  }) async {
    final res = await _client.patch(
      _uri('/users/edit/$userId'),
      headers: {
        ...(await _headers(withAuth: true)),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'name': name,
        'email': email,
        if (phone != null) 'phone': phone,
        'password': password,
        'confirmpassword': confirmPassword,
      }),
    );
    _throwIfError(res);
  }
}
