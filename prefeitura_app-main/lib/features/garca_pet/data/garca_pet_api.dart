import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/adoption_chat_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/adoption_request_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/services/audit_client_headers.dart';
import 'package:prefeitura_app/services/auth_service.dart';

class GarcaPetApi {
  GarcaPetApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const String baseUrl = AuthService.kApiBase;

  Uri _uri(String path) {
    final normalized = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$baseUrl$normalized');
  }

  Future<Map<String, String>> _headers({bool withAuth = false}) async {
    final headers = <String, String>{
      'Accept': 'application/json',
    };
    if (withAuth) {
      final token = await AuthService.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return AuditClientHeaders.merge(headers, module: 'garca_pet');
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

    String? code;
    if (res.statusCode == 403) {
      final lower = message.toLowerCase();
      if (lower.contains('verifique') || lower.contains('verificar seu e-mail')) {
        code = 'email_not_verified';
      }
    }

    throw GarcaPetException(message, statusCode: res.statusCode, code: code);
  }

  List<PetModel> _parsePetList(String body) {
    final decoded = jsonDecode(body);
    List<dynamic> rawList = [];
    if (decoded is Map && decoded['pets'] is List) {
      rawList = decoded['pets'] as List;
    } else if (decoded is List) {
      rawList = decoded;
    }
    return rawList
        .whereType<Map>()
        .map((e) => PetModel.fromJson(Map<String, dynamic>.from(e)))
        .where((p) => p.id.isNotEmpty)
        .toList();
  }

  /// Catálogo público — envia token se existir (flags canRequestAdoption).
  Future<List<PetModel>> fetchAvailablePets() async {
    final res = await _client.get(
      _uri('/pets'),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
    return _parsePetList(res.body);
  }

  Future<PetModel> fetchPetById(String id) async {
    final res = await _client.get(
      _uri('/pets/$id'),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body);
    if (decoded is Map && decoded['pet'] is Map) {
      return PetModel.fromJson(Map<String, dynamic>.from(decoded['pet'] as Map));
    }
    if (decoded is Map) {
      return PetModel.fromJson(Map<String, dynamic>.from(decoded));
    }
    throw GarcaPetException('Resposta inválida ao carregar pet.');
  }

  Future<List<PetModel>> fetchMyPets() async {
    final res = await _client.get(
      _uri('/pets/mypets'),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
    return _parsePetList(res.body);
  }

  Future<String?> _requireToken() async {
    final token = await AuthService.getToken();
    if (token == null || token.isEmpty) {
      throw GarcaPetException('Faça login para continuar.', statusCode: 401);
    }
    return token;
  }

  MediaType _contentTypeForUpload(XFile file, String filename) {
    final mime = file.mimeType?.toLowerCase().trim();
    if (mime != null && mime.startsWith('image/')) {
      final parts = mime.split('/');
      if (parts.length == 2 && parts[0] == 'image' && parts[1].isNotEmpty) {
        return MediaType(parts[0], parts[1]);
      }
    }
    final lower = filename.toLowerCase();
    if (lower.endsWith('.png')) return MediaType('image', 'png');
    if (lower.endsWith('.webp')) return MediaType('image', 'webp');
    if (lower.endsWith('.gif')) return MediaType('image', 'gif');
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) {
      return MediaType('image', 'heic');
    }
    return MediaType('image', 'jpeg');
  }

  String _filenameForUpload(XFile file, int index) {
    final fromPath = file.path.split('/').last;
    if (fromPath.isNotEmpty && fromPath.contains('.')) return fromPath;
    final name = file.name;
    if (name.isNotEmpty && name.contains('.')) return name;
    return 'pet_$index.jpg';
  }

  Future<void> _attachImages(http.MultipartRequest request, List<XFile> imageFiles) async {
    for (var i = 0; i < imageFiles.length; i += 1) {
      final picked = imageFiles[i];
      final file = File(picked.path);
      if (!await file.exists()) continue;
      final length = await file.length();
      final filename = _filenameForUpload(picked, i);
      final stream = http.ByteStream(file.openRead());
      request.files.add(
        http.MultipartFile(
          'images',
          stream,
          length,
          filename: filename,
          contentType: _contentTypeForUpload(picked, filename),
        ),
      );
    }
  }

  /// Cadastro (doação) — validação definitiva no backend.
  Future<PetModel> createPet({
    required Map<String, String> fields,
    required List<XFile> imageFiles,
  }) async {
    if (imageFiles.isEmpty) {
      throw GarcaPetException('Selecione pelo menos uma foto.');
    }

    final token = await _requireToken();
    final request = http.MultipartRequest('POST', _uri('/pets/create'));
    request.headers['Authorization'] = 'Bearer $token';
    request.headers['Accept'] = 'application/json';
    AuditClientHeaders.applyToMultipart(request, module: 'garca_pet', screen: 'garca_pet/create');
    request.fields.addAll(fields);
    await _attachImages(request, imageFiles);

    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    _throwIfError(res);

    final decoded = jsonDecode(res.body);
    if (decoded is Map && decoded['newPet'] is Map) {
      return PetModel.fromJson(Map<String, dynamic>.from(decoded['newPet'] as Map));
    }
    throw GarcaPetException('Pet cadastrado, mas resposta inválida.');
  }

  /// Edição — novas imagens substituem a lista se enviadas (comportamento backend).
  Future<void> updatePet({
    required String petId,
    required Map<String, String> fields,
    List<XFile> imageFiles = const [],
  }) async {
    final token = await _requireToken();
    final request = http.MultipartRequest('PATCH', _uri('/pets/$petId'));
    request.headers['Authorization'] = 'Bearer $token';
    request.headers['Accept'] = 'application/json';
    AuditClientHeaders.applyToMultipart(request, module: 'garca_pet', screen: 'garca_pet/edit');
    request.fields.addAll(fields);
    if (imageFiles.isNotEmpty) {
      await _attachImages(request, imageFiles);
    }

    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    _throwIfError(res);
  }

  Future<void> deletePet(String petId) async {
    final res = await _client.delete(
      _uri('/pets/$petId'),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
  }

  /// Solicitar adoção — Fase 4.
  Future<Map<String, dynamic>> createAdoptionRequest({
    required String petId,
    required String message,
  }) async {
    final res = await _client.post(
      _uri('/pets/$petId/adoption-requests'),
      headers: {
        ...await _headers(withAuth: true),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'message': message.trim()}),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'message': 'Solicitação enviada.'};
  }

  /// Fila de pretendentes — doador/admin.
  Future<List<AdoptionRequestModel>> fetchAdoptionQueue(String petId) async {
    final res = await _client.get(
      _uri('/pets/$petId/adoption-requests'),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body);
    if (decoded is! Map || decoded['requests'] is! List) return [];
    return (decoded['requests'] as List)
        .whereType<Map>()
        .map((e) => AdoptionRequestModel.fromJson(Map<String, dynamic>.from(e)))
        .where((r) => r.id.isNotEmpty)
        .toList();
  }

  /// Minhas solicitações de adoção.
  Future<List<PetModel>> fetchMyAdoptions() async {
    final res = await _client.get(
      _uri('/adoption-requests/my'),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body);
    if (decoded is Map && decoded['pets'] is List) {
      return (decoded['pets'] as List)
          .whereType<Map>()
          .map((e) => PetModel.fromJson(Map<String, dynamic>.from(e)))
          .where((p) => p.id.isNotEmpty)
          .toList();
    }
    return [];
  }

  Future<Map<String, dynamic>> updateAdoptionStatus({
    required String requestId,
    required String status,
    String message = '',
  }) async {
    final res = await _client.patch(
      _uri('/adoption-requests/$requestId/status'),
      headers: {
        ...await _headers(withAuth: true),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'status': status,
        if (message.trim().isNotEmpty) 'message': message.trim(),
      }),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'message': 'Status atualizado.'};
  }

  Future<Map<String, dynamic>> concludeAdoption({
    required String requestId,
    String message = '',
  }) async {
    final res = await _client.post(
      _uri('/adoption-requests/$requestId/conclude'),
      headers: {
        ...await _headers(withAuth: true),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        if (message.trim().isNotEmpty) 'message': message.trim(),
      }),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'message': 'Adoção concluída.'};
  }

  Future<Map<String, dynamic>> cancelMyAdoptionRequest(String requestId) async {
    final res = await _client.patch(
      _uri('/adoption-requests/$requestId/cancel'),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'message': 'Solicitação cancelada.'};
  }

  Future<Map<String, dynamic>> sendAdoptionMessage({
    required String requestId,
    required String message,
  }) async {
    final res = await _client.post(
      _uri('/adoption-requests/$requestId/messages'),
      headers: {
        ...await _headers(withAuth: true),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'message': message.trim()}),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'message': 'Mensagem enviada.'};
  }

  Future<AdoptionChatSnapshot> fetchAdoptionChat(String requestId) async {
    final res = await _client.get(
      _uri('/adoption-requests/$requestId/chat'),
      headers: await _headers(withAuth: true),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) {
      return AdoptionChatSnapshot.fromJson(decoded);
    }
    throw GarcaPetException('Resposta inválida ao carregar conversa.');
  }

  Future<void> postAdoptionPresence(String requestId) async {
    final res = await _client.post(
      _uri('/adoption-requests/$requestId/presence'),
      headers: {
        ...await _headers(withAuth: true),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'heartbeat': true, 'markSeen': true}),
    );
    _throwIfError(res);
  }

  /// Denunciar anúncio — POST /pets/:id/report
  Future<Map<String, dynamic>> reportPet({
    required String petId,
    required String reason,
    String description = '',
  }) async {
    final res = await _client.post(
      _uri('/pets/$petId/report'),
      headers: {
        ...await _headers(withAuth: true),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'reason': reason.trim(),
        if (description.trim().isNotEmpty) 'description': description.trim(),
      }),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'message': 'Denúncia registrada.'};
  }

  /// Status público da campanha de castração (mesmo endpoint do site GarçaPet).
  /// Retorna `true` se encerrada. Em falha de rede/API, assume campanha aberta.
  Future<bool> fetchCastrationClosed() async {
    final fromV1 = await _fetchCastrationClosedFromPath('/v1/castracao/status');
    if (fromV1 != null) return fromV1;

    final fromSettings =
        await _fetchCastrationClosedFromPath('/settings/castration_closed');
    return fromSettings ?? false;
  }

  Future<bool?> _fetchCastrationClosedFromPath(String path) async {
    try {
      final res = await _client.get(
        _uri(path),
        headers: await _headers(withAuth: false),
      );
      if (res.statusCode < 200 || res.statusCode >= 300) return null;

      final decoded = jsonDecode(res.body);
      if (decoded is! Map) return false;

      if (decoded['closed'] == true || decoded['value'] == true) return true;
      final setting = decoded['setting'];
      if (setting is Map && setting['value'] == true) return true;
      return false;
    } catch (_) {
      return null;
    }
  }
}
