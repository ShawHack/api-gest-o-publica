// login.dart
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// ========================
// CONFIGURAÇÃO
// ========================
// Base da API (sem barra final)
const String kApiBase = 'https://api.garca.sp.gov.br/api';

String _fullUrl(String path) {
  if (path.isEmpty) return kApiBase;
  if (path.startsWith('/')) {
    return '$kApiBase$path';
  } else {
    return '$kApiBase/$path';
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  bool _loading = false;

  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();

  // controle para exibir/ocultar senha
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  // ===== helpers HTTP =====
  Future<http.Response> _postJson(String path, Map<String, dynamic> body,
      {Map<String, String>? headers}) {
    final uri = Uri.parse(_fullUrl(path));
    return http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...?headers,
      },
      body: jsonEncode(body),
    );
  }

  bool _isJson(http.Response r) =>
      (r.headers['content-type'] ?? '').toLowerCase().contains('application/json');

  // ===== fluxos auxiliares =====
  Future<void> _resendVerification(String email) async {
    if (email.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Informe o e-mail para reenviar a verificação.')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final r = await _postJson('/users/resend-verification', {'email': email.trim()});
      final msg = _isJson(r)
          ? (jsonDecode(r.body)['message'] ?? 'Se o e-mail existir, reenviamos o link.')
          : 'Se o e-mail existir, reenviamos o link.';
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString())));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _forgotPassword(String email) async {
    if (email.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Informe o e-mail para recuperar a senha.')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final r = await _postJson('/users/forgot-password', {'email': email.trim()});
      final msg = _isJson(r)
          ? (jsonDecode(r.body)['message'] ?? 'Se o e-mail existir, enviaremos instruções.')
          : 'Se o e-mail existir, enviaremos instruções.';
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString())));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ===== login =====
  Future<void> _login() async {
    if (!_form.currentState!.validate()) return;

    setState(() => _loading = true);
    try {
      final resp = await _postJson('/users/login', {
        'email': _emailCtrl.text.trim(),
        'password': _passCtrl.text,
      });

      if (!_isJson(resp)) {
        final snippet = resp.body.length > 200 ? resp.body.substring(0, 200) : resp.body;
        throw 'A URL não aponta para a API JSON (status ${resp.statusCode}). '
            'Verifique host/porta/caminho. Corpo (início): $snippet';
      }

      final Map<String, dynamic> body =
      resp.body.isNotEmpty ? jsonDecode(resp.body) as Map<String, dynamic> : {};

      if (resp.statusCode == 200) {
        final token = (body['token'] ?? '') as String;
        final userId = (body['userId'] ?? '') as String;
        final role = (body['role'] ?? 'usuario') as String;
        if (token.isEmpty || userId.isEmpty) {
          throw 'Resposta inválida do servidor (sem token ou userId).';
        }

        String userName = '';
        Map<String, dynamic>? userData;
        final dynamic userObj = body['user'];
        
        if (userObj is Map) {
          userData = Map<String, dynamic>.from(userObj);
          userName = (userObj['name'] ?? userObj['nome'] ?? '').toString();
          // Garante que tem id e _id
          if (userData['id'] == null) {
            userData['id'] = userId;
          }
          if (userData['_id'] == null) {
            userData['_id'] = userId;
          }
        }
        
        if (userName.isEmpty) {
          userName = (body['name'] ?? body['userName'] ?? '').toString();
        }

        // Se não tem dados do usuário, busca do servidor
        if (userData == null || userName.isEmpty) {
          final check = await http.get(
            Uri.parse(_fullUrl('/users/checkuser')),
            headers: {'Accept': 'application/json', 'Authorization': 'Bearer $token'},
          );
          if (check.statusCode == 200 && (check.body?.isNotEmpty ?? false)) {
            try {
              final c = jsonDecode(check.body);
              if (c is Map) {
                final cu = c['user'];
                if (cu is Map) {
                  userData = Map<String, dynamic>.from(cu);
                  userName = (cu['name'] ?? cu['nome'] ?? '').toString();
                  // Garante que tem id e _id
                  if (userData!['id'] == null) {
                    userData!['id'] = userId;
                  }
                  if (userData!['_id'] == null) {
                    userData!['_id'] = userId;
                  }
                } else {
                  userData = Map<String, dynamic>.from(c);
                  userName = (c['name'] ?? c['nome'] ?? '').toString();
                  if (userData!['id'] == null) {
                    userData!['id'] = userId;
                  }
                  if (userData!['_id'] == null) {
                    userData!['_id'] = userId;
                  }
                }
              }
            } catch (_) {}
          }
        }

        // Se ainda não tem userData, cria um objeto básico
        if (userData == null) {
          userData = {
            'id': userId,
            '_id': userId,
            'name': userName,
            'email': body['userEmail'] ?? '',
            'phone': body['userPhone'] ?? '',
            'cpf': body['userCpf'] ?? '',
            'role': role,
          };
        }

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', token);
        await prefs.setString('auth_token', token);
        await prefs.setString('userId', userId);
        await prefs.setString('auth_user_id', userId);
        await prefs.setString('role', role);
        // IMPORTANTE: Salva o objeto user completo
        await prefs.setString('user', jsonEncode(userData));
        if (userName.isNotEmpty) {
          await prefs.setString('auth_user_name', userName);
        }

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(body['message'] ?? 'Login realizado com sucesso.')),
        );

        // Sempre zera a pilha e abre a Home do hub (Notícias/Serviços).
        // Evita ficar preso em /iluminacao se o login veio do drawer ou de outra tela.
        Navigator.of(context).pushNamedAndRemoveUntil('/home', (route) => false);
      } else if (resp.statusCode == 403 &&
          (body['message']?.toString().toLowerCase().contains('verifique seu e-mail') ?? false)) {
        if (!mounted) return;
        final reenviar = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Verificação pendente'),
            content: Text(body['message'].toString()),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Agora não')),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Reenviar e-mail')),
            ],
          ),
        );
        if (reenviar == true) {
          await _resendVerification(_emailCtrl.text.trim());
        }
      } else {
        final errMsg = body['message'] ?? 'Erro ${resp.statusCode}: ${resp.reasonPhrase ?? 'Falha no login'}';
        throw errMsg;
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Entrar')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: _emailCtrl,
                    decoration: const InputDecoration(labelText: 'E-mail'),
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Informe o e-mail' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _passCtrl,
                    decoration: InputDecoration(
                      labelText: 'Senha',
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off : Icons.visibility,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                    ),
                    obscureText: _obscurePassword,
                    validator: (v) => (v == null || v.isEmpty) ? 'Informe a senha' : null,
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _loading ? null : _login,
                      child: _loading
                          ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                          : const Text('Entrar'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton(
                        onPressed: _loading ? null : () => _forgotPassword(_emailCtrl.text),
                        child: const Text('Esqueci minha senha'),
                      ),
                      TextButton(
                        onPressed: _loading ? null : () => _resendVerification(_emailCtrl.text),
                        child: const Text('Reenviar verificação'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, '/signup'),
                    child: const Text('Criar conta'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
