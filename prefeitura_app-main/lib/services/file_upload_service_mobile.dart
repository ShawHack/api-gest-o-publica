// Serviço de upload de arquivos para mobile usando dart:io
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:prefeitura_app/services/audit_client_headers.dart';

/// Serviço para upload de arquivos via API do backend (versão mobile)
/// Os arquivos são armazenados em um container separado no backend e apenas os links são salvos no Firestore
class FileUploadService {
  static const String kApiBase = 'https://api.garca.sp.gov.br/api';

  /// Monta URL completa a partir de um path
  static String _fullUrl(String path) {
    if (path.isEmpty) return kApiBase;
    if (path.startsWith('/')) {
      return '$kApiBase$path';
    } else {
      return '$kApiBase/$path';
    }
  }

  /// Obtém o token de autenticação
  Future<String?> _getAuthToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('token') ?? prefs.getString('auth_token');
    } catch (e) {
      debugPrint('❌ Erro ao obter token: $e');
      return null;
    }
  }

  /// Faz upload de um arquivo via API do backend e retorna o link (versão mobile)
  Future<String> uploadFile({
    required File file,
    required String formId,
    required String inscriptionId,
    required String fieldId,
    required String fileName,
  }) async {
    try {
      // Verifica se o arquivo existe
      if (!await file.exists()) {
        throw Exception('Arquivo não encontrado: ${file.path}');
      }

      // Obtém token de autenticação
      final token = await _getAuthToken();
      if (token == null) {
        throw Exception('Usuário não autenticado. Faça login antes de fazer upload.');
      }

      debugPrint('📤 Iniciando upload via API: ${file.path}');
      
      // Prepara a requisição multipart
      final uri = Uri.parse(_fullUrl('/forms-garca/upload'));
      final request = http.MultipartRequest('POST', uri);
      
      // Adiciona o token de autenticação
      request.headers['Authorization'] = 'Bearer $token';
      
      // Adiciona os parâmetros necessários para a estrutura de pastas
      request.fields['formId'] = formId;
      request.fields['inscriptionId'] = inscriptionId;
      request.fields['fieldId'] = fieldId;
      
      debugPrint('📋 Parâmetros do upload: formId=$formId, inscriptionId=$inscriptionId, fieldId=$fieldId');
      
      // Adiciona o arquivo
      final fileStream = http.ByteStream(file.openRead());
      final fileLength = await file.length();
      final multipartFile = http.MultipartFile(
        'file',
        fileStream,
        fileLength,
        filename: fileName,
      );
      request.files.add(multipartFile);
      
      // Envia a requisição
      debugPrint('📡 Enviando requisição para: ${uri.toString()}');
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      
      debugPrint('📥 Resposta recebida: Status ${response.statusCode}');
      debugPrint('📥 Content-Type: ${response.headers['content-type']}');
      debugPrint('📥 Body (primeiros 200 chars): ${response.body.length > 200 ? response.body.substring(0, 200) : response.body}');
      
      // Verifica se a resposta é HTML (erro do servidor)
      if (response.headers['content-type']?.contains('text/html') == true || 
          response.body.trim().startsWith('<!DOCTYPE') ||
          response.body.trim().startsWith('<html')) {
        debugPrint('❌ Servidor retornou HTML em vez de JSON. Possível erro de roteamento ou servidor.');
        throw Exception('Erro do servidor: A API retornou HTML em vez de JSON. Verifique se a rota está configurada corretamente. Status: ${response.statusCode}');
      }
      
      if (response.statusCode == 200) {
        try {
          final responseData = jsonDecode(response.body) as Map<String, dynamic>;
          final fileLink = responseData['fileLink'] as String;
          debugPrint('✅ Arquivo enviado com sucesso. Link: $fileLink');
          return fileLink;
        } catch (e) {
          debugPrint('❌ Erro ao decodificar JSON: $e');
          debugPrint('📄 Resposta completa: ${response.body}');
          throw Exception('Erro ao processar resposta do servidor: $e');
        }
      } else {
        try {
          final errorData = jsonDecode(response.body) as Map<String, dynamic>;
          final errorMessage = errorData['message'] ?? 'Erro ao fazer upload';
          throw Exception('Erro ${response.statusCode}: $errorMessage');
        } catch (e) {
          debugPrint('❌ Erro ao decodificar JSON de erro: $e');
          debugPrint('📄 Resposta completa: ${response.body}');
          throw Exception('Erro ${response.statusCode}: ${response.body.length > 100 ? response.body.substring(0, 100) : response.body}');
        }
      }
    } catch (e) {
      debugPrint('❌ Erro ao fazer upload do arquivo: $e');
      rethrow;
    }
  }

  /// Faz upload de múltiplos arquivos para o container separado via API (versão mobile)
  /// Retorna apenas os links de download que devem ser salvos no banco de dados
  Future<List<String>> uploadFiles({
    required List<File> files,
    required String formId,
    required String inscriptionId,
    required String fieldId,
  }) async {
    final fileLinks = <String>[];
    
    debugPrint('📤 Iniciando upload de ${files.length} arquivo(s) para container separado via API...');
    
    // Obtém token de autenticação
    final token = await _getAuthToken();
    if (token == null) {
      throw Exception('Usuário não autenticado. Faça login antes de fazer upload.');
    }

    // Prepara a requisição multipart para múltiplos arquivos
    final uri = Uri.parse(_fullUrl('/forms-garca/upload-multiple'));
    final request = http.MultipartRequest('POST', uri);
    
    request.headers['Authorization'] = 'Bearer $token';
    AuditClientHeaders.applyToMultipart(request, module: 'forms', screen: 'forms/upload_multiple');
    
    request.fields['formId'] = formId;
    request.fields['inscriptionId'] = inscriptionId;
    request.fields['fieldId'] = fieldId;
    
    debugPrint('📋 Parâmetros do upload múltiplo: formId=$formId, inscriptionId=$inscriptionId, fieldId=$fieldId');
    
    // Adiciona todos os arquivos
    for (int i = 0; i < files.length; i++) {
      final file = files[i];
      if (await file.exists()) {
        final fileStream = http.ByteStream(file.openRead());
        final fileLength = await file.length();
        final multipartFile = http.MultipartFile(
          'files',
          fileStream,
          fileLength,
          filename: _getFileName(file.path),
        );
        request.files.add(multipartFile);
      }
    }
    
    if (request.files.isEmpty) {
      throw Exception('Nenhum arquivo válido para upload');
    }
    
    try {
      // Envia a requisição
      debugPrint('📡 Enviando requisição para: ${uri.toString()}');
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      
      debugPrint('📥 Resposta recebida: Status ${response.statusCode}');
      debugPrint('📥 Content-Type: ${response.headers['content-type']}');
      
      // Verifica se a resposta é HTML (erro do servidor)
      if (response.headers['content-type']?.contains('text/html') == true || 
          response.body.trim().startsWith('<!DOCTYPE') ||
          response.body.trim().startsWith('<html')) {
        debugPrint('❌ Servidor retornou HTML em vez de JSON. Possível erro de roteamento ou servidor.');
        debugPrint('📄 Resposta (primeiros 500 chars): ${response.body.length > 500 ? response.body.substring(0, 500) : response.body}');
        throw Exception('Erro do servidor: A API retornou HTML em vez de JSON. Verifique se a rota está configurada corretamente. Status: ${response.statusCode}');
      }
      
      if (response.statusCode == 200) {
        try {
          final responseData = jsonDecode(response.body) as Map<String, dynamic>;
          final filesData = responseData['files'] as List<dynamic>;
          
          for (var fileData in filesData) {
            if (fileData is Map<String, dynamic>) {
              final fileLink = fileData['fileLink'] as String?;
              if (fileLink != null) {
                fileLinks.add(fileLink);
              }
            }
          }
          
          debugPrint('✅ ${fileLinks.length} arquivo(s) enviado(s) com sucesso');
          debugPrint('💾 Apenas os links serão salvos no Firestore, os arquivos ficam no container do backend');
          return fileLinks;
        } catch (e) {
          debugPrint('❌ Erro ao decodificar JSON: $e');
          debugPrint('📄 Resposta completa: ${response.body}');
          throw Exception('Erro ao processar resposta do servidor: $e');
        }
      } else {
        try {
          final errorData = jsonDecode(response.body) as Map<String, dynamic>;
          final errorMessage = errorData['message'] ?? 'Erro ao fazer upload';
          throw Exception('Erro ${response.statusCode}: $errorMessage');
        } catch (e) {
          debugPrint('❌ Erro ao decodificar JSON de erro: $e');
          debugPrint('📄 Resposta completa: ${response.body}');
          throw Exception('Erro ${response.statusCode}: ${response.body.length > 100 ? response.body.substring(0, 100) : response.body}');
        }
      }
    } catch (e) {
      debugPrint('❌ Erro ao fazer upload de múltiplos arquivos: $e');
      // Se falhar, tenta fazer upload individual de cada arquivo
      debugPrint('⚠️ Tentando upload individual dos arquivos...');
      
      for (int i = 0; i < files.length; i++) {
        final file = files[i];
        try {
          final timestamp = DateTime.now().millisecondsSinceEpoch;
          final fileName = '${timestamp}_${i}_${_getFileName(file.path)}';
          final downloadLink = await uploadFile(
            file: file,
            formId: formId,
            inscriptionId: inscriptionId,
            fieldId: fieldId,
            fileName: fileName,
          );
          fileLinks.add(downloadLink);
        } catch (e) {
          debugPrint('❌ Erro ao fazer upload do arquivo $i: $e');
        }
      }
      
      return fileLinks;
    }
  }

  /// Obtém o nome do arquivo sem o caminho completo
  String _getFileName(String path) {
    return path.split('/').last.split('\\').last;
  }
  
  // Expõe o método para uso externo
  static String getFileName(String path) {
    return path.split('/').last.split('\\').last;
  }

  /// Obtém a extensão do arquivo
  String _getFileExtension(String path) {
    final parts = path.split('.');
    if (parts.length > 1) {
      return '.${parts.last}';
    }
    return '';
  }
}



