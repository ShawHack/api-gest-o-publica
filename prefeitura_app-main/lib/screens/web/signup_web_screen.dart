import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import '../../widgets/copyright_footer.dart';

// Emulador Android: http://10.0.2.2:5000
// Dispositivo físico: http://IP_DA_MAQUINA:5000
const String kBaseUrl = 'https://api.garca.sp.gov.br/api';

class SignupWebScreen extends StatefulWidget {
  const SignupWebScreen({super.key});

  @override
  State<SignupWebScreen> createState() => _SignupWebScreenState();
}

class _SignupWebScreenState extends State<SignupWebScreen> {
  final _form = GlobalKey<FormState>();
  bool _loading = false;

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _cpfCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confCtrl = TextEditingController();

  // controle do checkbox de termos
  bool _agreeTerms = false;

  // controles para o "olhinho" das senhas
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _cpfCtrl.dispose();
    _passCtrl.dispose();
    _confCtrl.dispose();
    super.dispose();
  }

  Future<void> _signup() async {
    if (!_form.currentState!.validate()) return;
    if (!_agreeTerms) {
      // reforça validação antes do envio
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Você precisa aceitar os Termos de Uso.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final uri = Uri.parse('$kBaseUrl/users/register');
      final bodyJson = jsonEncode({
        'name': _nameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'cpf': _cpfCtrl.text.trim(),
        'password': _passCtrl.text,
        'confirmpassword': _confCtrl.text,
        // >>> novos campos exigidos pelo backend
        'acceptedTermsAt': DateTime.now().toIso8601String(),
        'acceptedTermsVersion': '1.0',
      });

      final resp = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: bodyJson,
      );

      // Logs de diagnóstico (remova depois)
      final previewLen = resp.body.length < 200 ? resp.body.length : 200;
      debugPrint('URL: $uri');
      debugPrint('STATUS: ${resp.statusCode}');
      debugPrint('HEADERS: ${resp.headers}');
      debugPrint('BODY: ${resp.body.substring(0, previewLen)}');

      // Backend retorna 201 no cadastro
      if (resp.statusCode == 201) {
        final data = resp.body.isNotEmpty ? jsonDecode(resp.body) : {};
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'] ?? 'Cadastro realizado! Verifique seu e-mail.')),
        );
        Navigator.of(context).pop(); // volta ao login
      } else {
        // tenta extrair JSON; se vier HTML, mostra um trecho
        try {
          final err = resp.body.isNotEmpty ? jsonDecode(resp.body) : {};
          throw err['message'] ?? 'Erro ${resp.statusCode}';
        } catch (_) {
          throw 'Erro ${resp.statusCode}: ${resp.body.substring(0, previewLen)}';
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _notEmpty(String? v, String msg) =>
      (v == null || v.trim().isEmpty) ? msg : null;

  @override
  Widget build(BuildContext context) {
    // Se não for web, redireciona para signup mobile
    if (!kIsWeb) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/signup');
      });
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFF384D9C), // RGB(56, 77, 156)
              const Color(0xFF384D9C).withValues(alpha: 0.8), // RGB(56, 77, 156)
            ],
          ),
        ),
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  child: Card(
                    elevation: 8,
                    margin: const EdgeInsets.all(32),
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 540),
                      padding: const EdgeInsets.all(48),
                      child: Form(
                        key: _form,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Logo
                            Image.asset(
                              'assets/logo_agenda.png',
                              height: 120,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) {
                                // Fallback caso a imagem não seja encontrada
                                return Container(
                                  width: 100,
                                  height: 100,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF384D9C).withValues(alpha: 0.1), // RGB(56, 77, 156)
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.person_add,
                                    size: 50,
                                    color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                                  ),
                                );
                              },
                            ),
                            const SizedBox(height: 24),

                            // Título
                            const Text(
                              'Criar Conta',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),

                            Text(
                              'Prefeitura Municipal de Garça',
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 32),

                            // Campo Nome
                            TextFormField(
                              controller: _nameCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Nome completo',
                                prefixIcon: Icon(Icons.person),
                                border: OutlineInputBorder(),
                              ),
                              enabled: !_loading,
                              validator: (v) => _notEmpty(v, 'Informe o nome'),
                            ),
                            const SizedBox(height: 16),

                            // Campo E-mail
                            TextFormField(
                              controller: _emailCtrl,
                              decoration: const InputDecoration(
                                labelText: 'E-mail',
                                prefixIcon: Icon(Icons.email),
                                border: OutlineInputBorder(),
                              ),
                              keyboardType: TextInputType.emailAddress,
                              enabled: !_loading,
                              validator: (v) {
                                final notEmpty = _notEmpty(v, 'Informe o e-mail');
                                if (notEmpty != null) return notEmpty;
                                // validação simples de e-mail
                                final email = v!.trim();
                                final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+');
                                if (!emailRegex.hasMatch(email)) return 'E-mail inválido';
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),

                            // Campo Telefone
                            TextFormField(
                              controller: _phoneCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Telefone',
                                prefixIcon: Icon(Icons.phone),
                                border: OutlineInputBorder(),
                              ),
                              keyboardType: TextInputType.phone,
                              enabled: !_loading,
                              validator: (v) => _notEmpty(v, 'Informe o telefone'),
                            ),
                            const SizedBox(height: 16),

                            // Campo CPF
                            TextFormField(
                              controller: _cpfCtrl,
                              decoration: const InputDecoration(
                                labelText: 'CPF',
                                prefixIcon: Icon(Icons.badge),
                                border: OutlineInputBorder(),
                              ),
                              keyboardType: TextInputType.number,
                              enabled: !_loading,
                              validator: (v) => _notEmpty(v, 'Informe o CPF'),
                            ),
                            const SizedBox(height: 16),

                            // Campo Senha
                            TextFormField(
                              controller: _passCtrl,
                              decoration: InputDecoration(
                                labelText: 'Senha',
                                prefixIcon: const Icon(Icons.lock),
                                border: const OutlineInputBorder(),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                  ),
                                  onPressed: _loading ? null : () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                ),
                              ),
                              obscureText: _obscurePassword,
                              enabled: !_loading,
                              validator: (v) => _notEmpty(v, 'Informe a senha'),
                            ),
                            const SizedBox(height: 16),

                            // Campo Confirmar Senha
                            TextFormField(
                              controller: _confCtrl,
                              decoration: InputDecoration(
                                labelText: 'Confirmar senha',
                                prefixIcon: const Icon(Icons.lock_outline),
                                border: const OutlineInputBorder(),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscureConfirm ? Icons.visibility_off : Icons.visibility,
                                  ),
                                  onPressed: _loading ? null : () {
                                    setState(() {
                                      _obscureConfirm = !_obscureConfirm;
                                    });
                                  },
                                ),
                              ),
                              obscureText: _obscureConfirm,
                              enabled: !_loading,
                              validator: (v) {
                                if (v == null || v.isEmpty) return 'Confirme a senha';
                                if (v != _passCtrl.text) return 'As senhas não conferem';
                                return null;
                              },
                            ),

                            const SizedBox(height: 24),

                            // Checkbox de termos
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Checkbox(
                                  value: _agreeTerms,
                                  onChanged: _loading ? null : (v) {
                                    setState(() => _agreeTerms = v ?? false);
                                  },
                                  activeColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
                                ),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: _loading ? null : () {
                                      // Apenas alterna o checkbox ao tocar no texto
                                      setState(() => _agreeTerms = !_agreeTerms);
                                    },
                                    child: RichText(
                                      text: TextSpan(
                                        style: Theme.of(context).textTheme.bodyMedium,
                                        children: [
                                          const TextSpan(text: 'Li e aceito os '),
                                          TextSpan(
                                            text: 'Termos de Uso',
                                            style: TextStyle(
                                              color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                                              decoration: TextDecoration.underline,
                                            ),
                                            // aqui você pode adicionar lógica para abrir os termos (url_launcher)
                                          ),
                                          const TextSpan(text: '.'),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 24),

                            // Botão Cadastrar
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: _loading ? null : _signup,
                                style: FilledButton.styleFrom(
                                  backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                child: _loading
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Text(
                                        'Cadastrar',
                                        style: TextStyle(fontSize: 16),
                                      ),
                              ),
                            ),

                            const SizedBox(height: 16),

                            // Link para voltar ao login
                            TextButton(
                              onPressed: _loading ? null : () {
                                Navigator.of(context).pop();
                              },
                              child: const Text('Já tem uma conta? Fazer login'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const CopyrightFooter(),
          ],
        ),
      ),
    );
  }
}


