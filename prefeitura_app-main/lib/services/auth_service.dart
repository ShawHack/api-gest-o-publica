import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:prefeitura_app/services/audit_client_headers.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Serviço de autenticação compartilhado
/// Usa o mesmo endpoint da API para login mobile e web
class AuthService {
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

  /// Verifica se a resposta é JSON
  static bool _isJson(http.Response r) =>
      (r.headers['content-type'] ?? '').toLowerCase().contains('application/json');

  /// Faz POST JSON para a API
  static Future<http.Response> _postJson(
    String path,
    Map<String, dynamic> body, {
    Map<String, String>? headers,
  }) {
    final uri = Uri.parse(_fullUrl(path));
    return http.post(
      uri,
      headers: AuditClientHeaders.merge(
        {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://api.garca.sp.gov.br',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
          ...?headers,
        },
        module: 'auth',
        screen: 'auth/login',
      ),
      body: jsonEncode(body),
    );
  }

  /// Realiza login usando o endpoint /users/login
  /// Retorna um Map com os dados do usuário ou lança exceção em caso de erro
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    // Debug: mostra o que está sendo enviado
    print('🔐 Tentando login...');
    print('   Email: ${email.trim()}');
    print('   URL: ${_fullUrl('/users/login')}');

    final resp = await _postJson('/users/login', {
      'email': email.trim(),
      'password': password,
    });

    // Debug: mostra a resposta
    print('📥 Resposta recebida:');
    print('   Status: ${resp.statusCode}');
    print('   Content-Type: ${resp.headers['content-type']}');

    if (!_isJson(resp)) {
      final snippet = resp.body.length > 200 ? resp.body.substring(0, 200) : resp.body;
      print('❌ Resposta não é JSON!');
      print('   Body: $snippet');

      // Verifica se é erro de CORS
      if (resp.body.toLowerCase().contains('cors') ||
          resp.body.toLowerCase().contains('cross-origin')) {
        throw 'ERRO DE CORS: O servidor está bloqueando requisições do navegador.\n\n'
            'SOLUÇÃO: Use o aplicativo mobile (Android/iOS) ao invés da versão web.\n'
            'A versão web é apenas para atendentes e gerentes que já têm acesso configurado no servidor.';
      }

      throw 'A URL não aponta para a API JSON (status ${resp.statusCode}). '
          'Verifique host/porta/caminho. Corpo (início): $snippet';
    }

    final Map<String, dynamic> body =
        resp.body.isNotEmpty ? jsonDecode(resp.body) as Map<String, dynamic> : {};

    print('   Body: ${resp.body.length > 200 ? resp.body.substring(0, 200) + '...' : resp.body}');

    if (resp.statusCode == 200) {
      final token = (body['token'] ?? '') as String;
      final userId = (body['userId'] ?? '') as String;
      // Normaliza o role para garantir consistência (trim + lowercase)
      // Usa var em vez de final para permitir atualização se necessário
      var role = ((body['role'] ?? 'usuario') as String).trim().toLowerCase();

      if (token.isEmpty || userId.isEmpty) {
        throw 'Resposta inválida do servidor (sem token ou userId).';
      }

      print('✅ Login bem-sucedido!');
      print('   Token: ${token.substring(0, 20)}...');
      print('   UserId: $userId');
      print('   Role (normalizado): "$role"');
      print('   Role original do body: "${body['role']}"');

      // Tenta extrair o nome do usuário e dados completos
      String userName = '';
      String userEmail = email.trim();
      String userPhone = '';
      String userCpf = '';
      Map<String, dynamic>? fullUserData;

      final dynamic userObj = body['user'];
      if (userObj is Map) {
        fullUserData = Map<String, dynamic>.from(userObj);
        userName = (userObj['name'] ?? userObj['nome'] ?? '').toString();
        userEmail = (userObj['email'] ?? email.trim()).toString();
        userPhone = (userObj['phone'] ?? userObj['telefone'] ?? '').toString();
        userCpf = (userObj['cpf'] ?? '').toString();
      }
      if (userName.isEmpty) {
        userName = (body['name'] ?? body['userName'] ?? '').toString();
      }

      // Se ainda não tem dados completos, tenta buscar via /users/checkuser
      if (userName.isEmpty || fullUserData == null) {
        try {
          print('🔍 Buscando dados completos do usuário...');
          final check = await http.get(
            Uri.parse(_fullUrl('/users/checkuser')),
            headers: AuditClientHeaders.merge(
              {
                'Accept': 'application/json',
                'Authorization': 'Bearer $token',
              },
              module: 'auth',
              screen: 'auth/checkuser',
            ),
          );
          if (check.statusCode == 200 && (check.body.isNotEmpty)) {
            final c = jsonDecode(check.body);
            if (c is Map) {
              // O endpoint retorna role normalizado no nível raiz e também no objeto user
              // Preferimos usar o role normalizado do nível raiz (ou do login)
              final normalizedRole = (c['role'] as String? ?? role).trim().toLowerCase();
              
              final cu = c['user'];
              if (cu is Map) {
                fullUserData = Map<String, dynamic>.from(cu);
                // IMPORTANTE: Sobrescreve o role do banco com o role normalizado
                // para evitar conflitos (banco pode ter "Admin" mas precisamos "admin")
                fullUserData['role'] = normalizedRole;
                
                userName = (cu['name'] ?? cu['nome'] ?? userName).toString();
                userEmail = (cu['email'] ?? userEmail).toString();
                userPhone = (cu['phone'] ?? cu['telefone'] ?? userPhone).toString();
                userCpf = (cu['cpf'] ?? userCpf).toString();
                
                // Atualiza o role local também
                role = normalizedRole;
                
                print('✅ Dados completos obtidos do /checkuser');
                print('   Role normalizado: $normalizedRole');
              } else {
                userName = (c['name'] ?? c['nome'] ?? userName).toString();
                // Se não tem objeto user, usa o role normalizado do nível raiz
                if (normalizedRole.isNotEmpty) {
                  role = normalizedRole;
                }
              }
            }
          }
        } catch (e) {
          print('⚠️  Erro ao buscar dados completos: $e');
        }
      }

      // Cria objeto user completo se não existir
      if (fullUserData == null) {
        fullUserData = {
          'id': userId,
          '_id': userId, // MongoDB usa _id
          'name': userName,
          'email': userEmail,
          'phone': userPhone,
          'cpf': userCpf,
          'role': role,
        };
      } else {
        // Garante que tem os campos essenciais
        // MongoDB retorna _id, mas também salvamos como id para compatibilidade
        final mongoId = fullUserData['_id']?.toString() ?? userId;
        fullUserData['id'] = mongoId;
        fullUserData['_id'] = mongoId;
        fullUserData['name'] = fullUserData['name'] ?? userName;
        fullUserData['email'] = fullUserData['email'] ?? userEmail;
        // IMPORTANTE: Sempre usa o role normalizado do login, não o do banco
        // Isso garante consistência mesmo se o banco tiver "Admin" em vez de "admin"
        fullUserData['role'] = role.trim().toLowerCase();
      }

      print('👤 Dados do usuário:');
      print('   Nome: $userName');
      print('   Email: $userEmail');
      print('   Telefone: $userPhone');
      print('   CPF: $userCpf');
      print('   Role final (normalizado): "$role"');
      print('   Role no fullUserData: "${fullUserData['role']}"');

      // Salva no SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      await prefs.setString('auth_token', token);
      await prefs.setString('userId', userId);
      await prefs.setString('auth_user_id', userId);
      // IMPORTANTE: Sempre salva o role normalizado
      await prefs.setString('role', role);
      // Garante que o objeto user também tem o role normalizado
      fullUserData['role'] = role;
      await prefs.setString('user', jsonEncode(fullUserData)); // SEMPRE salva o objeto user completo
      if (userName.isNotEmpty) {
        await prefs.setString('auth_user_name', userName);
      }

      print('💾 Dados salvos no SharedPreferences');
      print('   role salvo: "$role"');
      print('   role no objeto user: "${fullUserData['role']}"');
      print('   user completo: ${jsonEncode(fullUserData)}');

      return {
        'success': true,
        'token': token,
        'userId': userId,
        'role': role,
        'userName': userName,
        'userEmail': userEmail,
        'userPhone': userPhone,
        'userCpf': userCpf,
        'message': body['message'] ?? 'Login realizado com sucesso.',
      };
    } else if (resp.statusCode == 403 &&
        (body['message']?.toString().toLowerCase().contains('verifique seu e-mail') ?? false)) {
      // E-mail não verificado
      throw {
        'code': 'email_not_verified',
        'message': body['message'].toString(),
        'email': email,
      };
    } else {
      // Tratamento detalhado de erro para debug
      final errMsg = body['message'] ?? 'Erro ${resp.statusCode}: ${resp.reasonPhrase ?? 'Falha no login'}';

      // Se for erro 500, adiciona mais detalhes para debug
      if (resp.statusCode == 500) {
        final bodySnippet = resp.body.length > 500 ? resp.body.substring(0, 500) : resp.body;
        print('═══════════════════════════════════════════════════');
        print('ERRO 500 - Detalhes do Login:');
        print('═══════════════════════════════════════════════════');
        print('URL: ${_fullUrl('/users/login')}');
        print('Status: ${resp.statusCode}');
        print('Mensagem: $errMsg');
        print('Body completo: $bodySnippet');
        print('═══════════════════════════════════════════════════');
        throw 'Erro no servidor (500): $errMsg\n\nVerifique o console para mais detalhes.';
      }

      throw errMsg;
    }
  }

  /// Verifica se o usuário está autenticado
  static Future<bool> isAuthenticated() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? prefs.getString('auth_token');
    return token != null && token.isNotEmpty;
  }

  /// Obtém o token do usuário logado
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token') ?? prefs.getString('auth_token');
  }

  /// Obtém o ID do usuário logado
  static Future<String?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('userId') ?? prefs.getString('auth_user_id');
  }

  /// Obtém o nome do usuário logado
  static Future<String?> getUserName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_user_name');
  }

  /// Obtém o role do usuário logado
  static Future<String?> getUserRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('role');
  }

  /// Verifica se o usuário é admin
  static Future<bool> isAdmin() async {
    final role = await getUserRole();
    return role == 'admin';
  }

  /// Faz logout (limpa SharedPreferences)
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  /// Reenvia e-mail de verificação
  static Future<String> resendVerification(String email) async {
    final r = await _postJson('/users/resend-verification', {'email': email.trim()});
    final msg = _isJson(r)
        ? (jsonDecode(r.body)['message'] ?? 'Se o e-mail existir, reenviamos o link.')
        : 'Se o e-mail existir, reenviamos o link.';
    return msg.toString();
  }

  /// Solicita recuperação de senha
  static Future<String> forgotPassword(String email) async {
    final r = await _postJson('/users/forgot-password', {'email': email.trim()});
    final msg = _isJson(r)
        ? (jsonDecode(r.body)['message'] ?? 'Se o e-mail existir, enviaremos instruções.')
        : 'Se o e-mail existir, enviaremos instruções.';
    return msg.toString();
  }
}

