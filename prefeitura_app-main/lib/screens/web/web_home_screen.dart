import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:google_fonts/google_fonts.dart';
import 'package:prefeitura_app/services/auth_service.dart';
import '../../widgets/copyright_footer.dart';
import '../../models/service.dart';

/// Tela inicial para versão WEB - login de atendente/gerente
class WebHomeScreen extends StatefulWidget {
  const WebHomeScreen({super.key});

  @override
  State<WebHomeScreen> createState() => _WebHomeScreenState();
}

class _WebHomeScreenState extends State<WebHomeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  bool _loading = false;
  bool _obscurePassword = true;
  String? _selectedRole; // 'user', 'attendant' ou 'manager'

  // Cores do design
  static const Color _azul = Color.fromRGBO(56, 77, 156, 1.0);
  static const Color _laranja = Color.fromRGBO(238, 112, 112, 1.0);

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  // Métodos auxiliares (igual login_screen.dart)
  Future<void> _resendVerification(String email) async {
    if (email.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Informe o e-mail para reenviar a verificação.')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final msg = await AuthService.resendVerification(email.trim());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
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
      final msg = await AuthService.forgotPassword(email.trim());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Normaliza CPF removendo formatação (pontos e traços)
  String _normalizeCpf(String? cpf) {
    if (cpf == null || cpf.isEmpty) return '';
    return cpf.replaceAll(RegExp(r'[^\d]'), '');
  }

  /// Verifica se o usuário está cadastrado em algum serviço
  Future<bool> _checkUserHasService(String? userCpf, String? userId) async {
    if (userCpf == null && userId == null) {
      return false;
    }

    try {
      List<String> searchValues = [];
      
      // Adiciona CPF normalizado
      if (userCpf != null && userCpf.isNotEmpty) {
        final normalizedCpf = _normalizeCpf(userCpf);
        if (normalizedCpf.isNotEmpty) {
          searchValues.add(normalizedCpf);
        }
        if (userCpf != normalizedCpf) {
          searchValues.add(userCpf);
        }
      }
      
      // Adiciona ID do usuário
      if (userId != null && userId.isNotEmpty) {
        searchValues.add(userId);
      }

      searchValues = searchValues.toSet().toList();

      if (searchValues.isEmpty) {
        return false;
      }

      // Busca serviços que contenham o usuário
      Set<String> foundServiceIds = {};
      for (String searchValue in searchValues) {
        final snapshot = await _firestore
            .collection('services')
            .where('attendants', arrayContains: searchValue)
            .get();

        for (var doc in snapshot.docs) {
          if (!foundServiceIds.contains(doc.id)) {
            foundServiceIds.add(doc.id);
          }
        }
      }

      return foundServiceIds.isNotEmpty;
    } catch (e) {
      debugPrint('❌ Erro ao verificar serviços do usuário: $e');
      return false;
    }
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedRole == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione o tipo de acesso')),
      );
      return;
    }

    setState(() => _loading = true);

    try {
      final result = await AuthService.login(
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
      );

      final role = result['role'] as String;
      final userObj = result['user'];
      String? userCpf;
      String? userId = result['userId']?.toString();

      // Extrai CPF e ID do usuário
      if (userObj != null && userObj is Map) {
        userCpf = userObj['cpf']?.toString();
        userId = userObj['id']?.toString() ?? 
                 userObj['_id']?.toString() ?? 
                 userId;
      }

      // Validação para gerente: deve ser admin
      if (_selectedRole == 'manager') {
        if (role != 'admin') {
          debugPrint('⚠️ Usuário tentou login como gerente mas não é admin. Redirecionando para cidadão.');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Você não tem permissão de gerente. Acessando como cidadão.'),
                backgroundColor: Colors.orange,
              ),
            );
            Navigator.pushReplacementNamed(context, '/user-web');
          }
          return;
        }
      }

      // Validação para atendente: deve estar em algum serviço
      if (_selectedRole == 'attendant') {
        final hasService = await _checkUserHasService(userCpf, userId);
        if (!hasService) {
          debugPrint('⚠️ Usuário tentou login como atendente mas não está em nenhum serviço. Redirecionando para cidadão.');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Você não está atribuído a nenhum serviço. Acessando como cidadão.'),
                backgroundColor: Colors.orange,
              ),
            );
            Navigator.pushReplacementNamed(context, '/user-web');
          }
          return;
        }
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'] ?? 'Login realizado com sucesso!')),
      );

      // Redireciona para a tela apropriada
      if (_selectedRole == 'user') {
        Navigator.pushReplacementNamed(context, '/user-web');
      } else if (_selectedRole == 'attendant') {
        Navigator.pushReplacementNamed(context, '/attendant');
      } else {
        Navigator.pushReplacementNamed(context, '/manager');
      }
    } catch (e) {
      if (!mounted) return;

      // Verifica se é erro de e-mail não verificado (igual login_screen.dart)
      if (e is Map && e['code'] == 'email_not_verified') {
        final reenviar = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Verificação pendente'),
            content: Text(e['message'].toString()),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Agora não'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Reenviar e-mail'),
              ),
            ],
          ),
        );

        if (reenviar == true) {
          await _resendVerification(_emailCtrl.text.trim());
        }
      } else if (e.toString().contains('CORS')) {
        // Erro de CORS - mostra diálogo explicativo
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.warning, color: Colors.orange),
                SizedBox(width: 8),
                Text('Erro de CORS'),
              ],
            ),
            content: const SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'O servidor está bloqueando requisições do navegador por questões de segurança (CORS).',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 16),
                  Text('Soluções possíveis:'),
                  SizedBox(height: 8),
                  Text('1. Use o aplicativo mobile (Android/iOS) - não tem esse problema'),
                  SizedBox(height: 4),
                  Text('2. Peça ao administrador do servidor para configurar CORS'),
                  SizedBox(height: 4),
                  Text('3. Configure um proxy reverso'),
                  SizedBox(height: 16),
                  Text(
                    'Nota: A versão web é destinada apenas para atendentes e gerentes com acesso configurado no servidor.',
                    style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),
            actions: [
              FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Entendi'),
              ),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Se não for web, redireciona para home mobile
    if (!kIsWeb) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/home');
      });
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }


    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Fundo azul diagonal cobrindo todo o topo
          Positioned.fill(
            child: CustomPaint(
              painter: _DiagonalPainter(),
            ),
          ),
          
          // Conteúdo principal
          SafeArea(
            child: Column(
              children: [
                // Logo de agendamentos (sobre o fundo azul)
                Padding(
                  padding: const EdgeInsets.only(left: 40, top: 40),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Image.asset(
                      'Logo_agenda.png',
                      height: 120,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) {
                        debugPrint('Erro ao carregar logo: $error');
                        return const SizedBox(height: 120);
                      },
                    ),
                  ),
                ),
                
                Expanded(
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                      child: Container(
                        constraints: const BoxConstraints(maxWidth: 450),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Seleção de tipo de acesso
                              Text(
                                'Tipo de Acesso',
                                style: GoogleFonts.robotoSlab(
                                  fontSize: 36,
                                  fontWeight: FontWeight.w600,
                                  color: _laranja,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 12),

                              Column(
                                children: [
                                  RadioListTile<String>(
                                    title: Text(
                                      'Atendente',
                                      style: GoogleFonts.robotoSlab(),
                                    ),
                                    subtitle: Text(
                                      'Gerenciar atendimentos',
                                      style: GoogleFonts.robotoSlab(fontSize: 12),
                                    ),
                                    value: 'attendant',
                                    groupValue: _selectedRole,
                                    onChanged: _loading ? null : (value) {
                                      setState(() => _selectedRole = value);
                                    },
                                    activeColor: _azul,
                                  ),
                                  RadioListTile<String>(
                                    title: Text(
                                      'Gerente',
                                      style: GoogleFonts.robotoSlab(),
                                    ),
                                    subtitle: Text(
                                      'Administração completa',
                                      style: GoogleFonts.robotoSlab(fontSize: 12),
                                    ),
                                    value: 'manager',
                                    groupValue: _selectedRole,
                                    onChanged: _loading ? null : (value) {
                                      setState(() => _selectedRole = value);
                                    },
                                    activeColor: _azul,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 24),

                              // Campo de email
                              TextFormField(
                                controller: _emailCtrl,
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                style: GoogleFonts.robotoSlab(),
                                decoration: InputDecoration(
                                  labelText: 'E-mail',
                                  labelStyle: GoogleFonts.robotoSlab(),
                                  hintText: 'Digite seu e-mail',
                                  hintStyle: GoogleFonts.robotoSlab(),
                                  prefixIcon: const Icon(
                                    Icons.email,
                                    color: _azul,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(color: Colors.grey[300]!),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(color: Colors.grey[300]!),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: const BorderSide(color: _azul, width: 2),
                                  ),
                                ),
                                enabled: !_loading,
                                validator: (v) => (v == null || v.trim().isEmpty)
                                    ? 'Informe o e-mail'
                                    : null,
                              ),
                              const SizedBox(height: 20),

                              // Campo de senha
                              TextFormField(
                                controller: _passCtrl,
                                obscureText: _obscurePassword,
                                textInputAction: TextInputAction.done,
                                onFieldSubmitted: (_) {
                                  if (_formKey.currentState!.validate() && _selectedRole != null) {
                                    _handleLogin();
                                  }
                                },
                                style: GoogleFonts.robotoSlab(),
                                decoration: InputDecoration(
                                  labelText: 'Senha',
                                  labelStyle: GoogleFonts.robotoSlab(),
                                  hintText: 'Digite sua senha',
                                  hintStyle: GoogleFonts.robotoSlab(),
                                  prefixIcon: const Icon(
                                    Icons.lock,
                                    color: _azul,
                                  ),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscurePassword ? Icons.visibility : Icons.visibility_off,
                                      color: Colors.grey[600],
                                    ),
                                    onPressed: _loading ? null : () {
                                      setState(() => _obscurePassword = !_obscurePassword);
                                    },
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(color: Colors.grey[300]!),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(color: Colors.grey[300]!),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: const BorderSide(color: _azul, width: 2),
                                  ),
                                ),
                                enabled: !_loading,
                                validator: (v) => (v == null || v.isEmpty)
                                    ? 'Informe a senha'
                                    : null,
                              ),
                              const SizedBox(height: 32),

                              // Botão de login
                              ElevatedButton(
                                onPressed: _loading ? null : _handleLogin,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _azul,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  elevation: 2,
                                ),
                                child: _loading
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : Text(
                                        'Entrar',
                                        style: GoogleFonts.robotoSlab(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                              ),
                              const SizedBox(height: 16),

                              // Botões auxiliares
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  TextButton(
                                    onPressed: _loading ? null : () => _forgotPassword(_emailCtrl.text),
                                    child: Text(
                                      'Esqueci minha senha',
                                      style: GoogleFonts.robotoSlab(fontSize: 12),
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: _loading ? null : () => _resendVerification(_emailCtrl.text),
                                    child: Text(
                                      'Reenviar verificação',
                                      style: GoogleFonts.robotoSlab(fontSize: 12),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),

                              // Link para criar conta
                              TextButton(
                                onPressed: _loading ? null : () {
                                  Navigator.pushNamed(context, '/signup-web');
                                },
                                child: Text(
                                  'Não tem uma conta? Criar conta',
                                  style: GoogleFonts.robotoSlab(fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                
                // Logo SEMIT centralizada no rodapé
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Image.asset(
                          'assets/logo_semit2.png',
                          height: 80,
                          width: 80,
                          errorBuilder: (context, error, stackTrace) {
                            return const SizedBox(height: 80, width: 80);
                          },
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '© SEMIT 2025 - Secretaria Municipal de Inovação e Tecnologia',
                          style: GoogleFonts.robotoSlab(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// CustomPainter para criar o fundo azul diagonal exatamente como no Forms Garça
/// O diagonal vai do topo direito até o canto inferior esquerdo
class _DiagonalPainter extends CustomPainter {
  static const Color _azul = Color.fromRGBO(56, 77, 156, 1.0);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = _azul;
    
    // Azul invertido horizontalmente (agora no lado esquerdo)
    // Mantém as mesmas proporções mas invertido
    final rightHeight = size.height * 0.25;  // Lado direito sobe
    final leftHeight = size.height * 0.15;  // Ponta esquerda sobe bastante
    
    final path = Path()
      ..moveTo(0, 0)  // Canto superior esquerdo
      ..lineTo(size.width, 0)  // Topo direito
      ..lineTo(size.width, leftHeight)  // Lado direito sobe (invertido)
      ..lineTo(0, rightHeight)  // Lado esquerdo desce (invertido)
      ..close();
    
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

