import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

// Emulador Android: http://10.0.2.2:5000
// Dispositivo físico: http://IP_DA_MAQUINA:5000
const String kBaseUrl = 'https://api.garca.sp.gov.br/api';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _form = GlobalKey<FormState>();
  bool _loading = false;

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _cpfCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confCtrl = TextEditingController();

  // novo: controle do checkbox de termos
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
      // ignore: avoid_print
      print('URL: $uri');
      // ignore: avoid_print
      print('STATUS: ${resp.statusCode}');
      // ignore: avoid_print
      print('HEADERS: ${resp.headers}');
      // ignore: avoid_print
      print('BODY: ${resp.body.substring(0, previewLen)}');

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
    return Scaffold(
      appBar: AppBar(title: const Text('Criar conta')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 540),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _form,
              child: ListView(
                children: [
                  TextFormField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(labelText: 'Nome completo'),
                    validator: (v) => _notEmpty(v, 'Informe o nome'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _emailCtrl,
                    decoration: const InputDecoration(labelText: 'E-mail'),
                    keyboardType: TextInputType.emailAddress,
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
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phoneCtrl,
                    decoration: const InputDecoration(labelText: 'Telefone'),
                    keyboardType: TextInputType.phone,
                    validator: (v) => _notEmpty(v, 'Informe o telefone'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _cpfCtrl,
                    decoration: const InputDecoration(labelText: 'CPF'),
                    keyboardType: TextInputType.number,
                    validator: (v) => _notEmpty(v, 'Informe o CPF'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _passCtrl,
                    decoration: InputDecoration(
                      labelText: 'Senha',
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                    ),
                    obscureText: _obscurePassword,
                    validator: (v) => _notEmpty(v, 'Informe a senha'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _confCtrl,
                    decoration: InputDecoration(
                      labelText: 'Confirmar senha',
                      suffixIcon: IconButton(
                        icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility),
                        onPressed: () {
                          setState(() {
                            _obscureConfirm = !_obscureConfirm;
                          });
                        },
                      ),
                    ),
                    obscureText: _obscureConfirm,
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Confirme a senha';
                      if (v != _passCtrl.text) return 'As senhas não conferem';
                      return null;
                    },
                  ),

                  const SizedBox(height: 16),

                  // novo: checkbox para aceite dos termos
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Checkbox(
                        value: _agreeTerms,
                        onChanged: (v) {
                          setState(() => _agreeTerms = v ?? false);
                        },
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
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
                                  style: const TextStyle(decoration: TextDecoration.underline),
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

                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _loading ? null : _signup,
                      child: _loading
                          ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                          : const Text('Cadastrar'),
                    ),
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
