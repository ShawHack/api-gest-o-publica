// profile_screen.dart
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';

// ====== API ======
// use '/users' — é o prefixo que o backend monta no index.js
const String kApiBase = 'https://api.garca.sp.gov.br/api';
const String kApiPrefix = '/users';

Uri api(String path) {
  // monta de forma segura: aceita path com ou sem leading slash
  final cleanPath = path.startsWith('/') ? path : '/$path';
  return Uri.parse('$kApiBase$kApiPrefix$cleanPath');
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _loading = true;
  bool _saving = false;

  final _form = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  String? _token;
  String? _userId;
  String? _role;
  String? _imageFileName; // nome salvo no backend
  File? _pickedImage;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token') ?? prefs.getString('auth_token');
    _userId = prefs.getString('userId') ?? prefs.getString('auth_user_id');
    _role = prefs.getString('role');

    if (_token == null || _token!.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sessão expirada. Faça login.')),
      );
      Navigator.pushReplacementNamed(context, '/login');
      return;
    }

    await _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    setState(() => _loading = true);
    try {
      final resp = await http.get(
        api('/checkuser'), // -> GET /users/checkuser
        headers: {
          'Authorization': 'Bearer ${_token!}',
          'Accept': 'application/json',
        },
      );

      if (resp.statusCode != 200) {
        final body = resp.body.isNotEmpty ? jsonDecode(resp.body) : {};
        throw body is Map && body['message'] != null
            ? body['message']
            : 'Erro ${resp.statusCode}';
      }

      final raw = resp.body.isNotEmpty ? jsonDecode(resp.body) : {};
      // Pode vir direto {...} ou { user: {...} }
      final Map<String, dynamic> user = (raw is Map && raw['user'] is Map)
          ? (raw['user'] as Map).cast<String, dynamic>()
          : (raw is Map ? raw.cast<String, dynamic>() : <String, dynamic>{});

      _userId ??= (user['_id'] ?? user['id'] ?? '').toString();

      _nameCtrl.text = (user['name'] ?? user['nome'] ?? '').toString();
      _emailCtrl.text = (user['email'] ?? '').toString();
      _phoneCtrl.text = (user['phone'] ?? '').toString();

      final img = (user['image'] ?? '').toString().trim();
      _imageFileName = img.isEmpty ? null : img;

      // salva nome no SharedPreferences para usar no Drawer
      try {
        final prefs = await SharedPreferences.getInstance();
        final savedName = prefs.getString('auth_user_name') ?? '';
        if ((_nameCtrl.text.isNotEmpty) && savedName != _nameCtrl.text) {
          await prefs.setString('auth_user_name', _nameCtrl.text);
        }
        if (_userId != null && _userId!.isNotEmpty) {
          await prefs.setString('userId', _userId!);
          await prefs.setString('auth_user_id', _userId!);
        }
      } catch (_) {
        // não fatal se não conseguir salvar prefs
      }

      if (mounted) setState(() {});
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao carregar perfil: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _notEmpty(String? v, String msg) =>
      (v == null || v.trim().isEmpty) ? msg : null;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final x = await picker.pickImage(
        source: ImageSource.gallery, imageQuality: 85, maxWidth: 1600);
    if (x != null) setState(() => _pickedImage = File(x.path));
  }

  Future<void> _save() async {
    if (_userId == null || _token == null) return;
    if (!_form.currentState!.validate()) return;

    setState(() => _saving = true);
    try {
      final hasImage = _pickedImage != null;

      if (hasImage) {
        // PATCH multipart -> /users/edit/:id (rota definida como /edit/:id)
        final req = http.MultipartRequest('PATCH', api('/edit/$_userId'));
        req.headers['Authorization'] = 'Bearer ${_token!}';
        req.headers['Accept'] = 'application/json';

        req.fields['name'] = _nameCtrl.text.trim();
        req.fields['email'] = _emailCtrl.text.trim();
        req.fields['phone'] = _phoneCtrl.text.trim();

        req.files.add(await http.MultipartFile.fromPath(
          'image',
          _pickedImage!.path,
          filename: p.basename(_pickedImage!.path),
        ));

        final streamed = await req.send();
        final resp = await http.Response.fromStream(streamed);
        final body = resp.body.isNotEmpty ? jsonDecode(resp.body) : {};

        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          // backend retorna { message, user }
          if (body is Map && body['user'] is Map) {
            _imageFileName = (body['user']['image'] ?? _imageFileName).toString();
            // atualizar prefs com novo user
            try {
              final prefs = await SharedPreferences.getInstance();
              await prefs.setString('user', jsonEncode(body['user']));
              await prefs.setString('auth_user_name',
                  (body['user']['name'] ?? body['user']['nome'] ?? '').toString());
            } catch (_) {}
          }
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text((body is Map ? (body['message'] ?? 'Salvo com sucesso!') : 'Salvo com sucesso!').toString())),
            );
            setState(() => _pickedImage = null);
          }
        } else {
          throw (body is Map && body['message'] != null) ? body['message'] : 'Erro ${resp.statusCode}';
        }
      } else {
        // PATCH JSON -> /users/edit/:id
        final resp = await http.patch(
          api('/edit/$_userId'),
          headers: {
            'Authorization': 'Bearer ${_token!}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: jsonEncode({
            'name': _nameCtrl.text.trim(),
            'email': _emailCtrl.text.trim(),
            'phone': _phoneCtrl.text.trim(),
          }),
        );

        final body = resp.body.isNotEmpty ? jsonDecode(resp.body) : {};
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          // atualiza prefs
          try {
            final prefs = await SharedPreferences.getInstance();
            if (body is Map && body['user'] is Map) {
              await prefs.setString('user', jsonEncode(body['user']));
              await prefs.setString('auth_user_name',
                  (body['user']['name'] ?? body['user']['nome'] ?? '').toString());
            } else if (_nameCtrl.text.isNotEmpty) {
              await prefs.setString('auth_user_name', _nameCtrl.text);
            }
          } catch (_) {}
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text((body is Map ? (body['message'] ?? 'Salvo!') : 'Salvo!').toString())),
            );
          }
        } else {
          throw (body is Map && body['message'] != null) ? body['message'] : 'Erro ${resp.statusCode}';
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String? get _avatarUrl {
    // backend serve 'public/images' estaticamente -> /images/users/<arquivo>
    if (_pickedImage != null) return null; // mostra preview local
    if (_imageFileName == null || _imageFileName!.isEmpty) return null;

    final raw = _imageFileName!;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    final clean = raw.replaceAll('\\', '/');
    final path = clean.contains('/') ? clean : 'images/users/$clean';
    return '$kApiBase/$path';
  }

  Widget _avatar() {
    const radius = 44.0;
    if (_pickedImage != null) {
      return CircleAvatar(radius: radius, backgroundImage: FileImage(_pickedImage!));
    }
    final url = _avatarUrl;
    if (url != null) {
      return CircleAvatar(radius: radius, backgroundImage: NetworkImage(url));
    }
    return const CircleAvatar(radius: radius, child: Icon(Icons.person, size: 42));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Meu Perfil')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 540),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _form,
              child: ListView(
                children: [
                  Center(
                    child: Stack(
                      children: [
                        _avatar(),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: IconButton.filled(
                            onPressed: _saving ? null : _pickImage,
                            icon: const Icon(Icons.camera_alt),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(labelText: 'Nome'),
                    validator: (v) => _notEmpty(v, 'Informe o nome'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _emailCtrl,
                    decoration: const InputDecoration(labelText: 'E-mail'),
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => _notEmpty(v, 'Informe o e-mail'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phoneCtrl,
                    decoration: const InputDecoration(labelText: 'Telefone'),
                    keyboardType: TextInputType.phone,
                    validator: (v) => _notEmpty(v, 'Informe o telefone'),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Salvar alterações'),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
