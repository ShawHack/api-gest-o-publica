import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/auth_service.dart';
// Import condicional para FormsGarcaScreen (apenas na web)
// Como este arquivo só é usado na web, podemos importar diretamente
import 'forms_garca_screen.dart';

/// Tela de login para o Forms Garça
/// Usa a mesma API de autenticação do agendamento
class FormsGarcaLoginScreen extends StatefulWidget {
  const FormsGarcaLoginScreen({super.key});

  @override
  State<FormsGarcaLoginScreen> createState() => _FormsGarcaLoginScreenState();
}

class _FormsGarcaLoginScreenState extends State<FormsGarcaLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;

  // Cores do design
  static const Color _azul = Color.fromRGBO(56, 77, 156, 1.0);
  static const Color _laranja = Color.fromRGBO(238, 112, 112, 1.0);

  @override
  void initState() {
    super.initState();
    debugPrint('✅ Forms Garça Login Screen inicializada');
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    try {
      final result = await AuthService.login(
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
      );

      final role = (result['role'] as String? ?? '').trim().toLowerCase();
      
      debugPrint('🔐 Role recebido do login: "$role"');
      debugPrint('🔐 Result completo: $result');

      // Verifica se é admin (case-insensitive)
      if (role != 'admin') {
        debugPrint('❌ Acesso negado. Role: "$role" (esperado: "admin")');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Acesso negado. Apenas administradores podem acessar o Forms Garça.\nRole atual: $role'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 5),
            ),
          );
        }
        return;
      }
      
      debugPrint('✅ Login bem-sucedido como admin');

      // Login bem-sucedido - redireciona para o Forms Garça
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const FormsGarcaScreen()),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao fazer login: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('🔨 Build Forms Garça Login Screen');
    
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
                // Logo Forms Garça (sobre o fundo azul)
                Padding(
                  padding: const EdgeInsets.only(left: 40, top: 40),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Image.asset(
                      'Logo_form.png',
                      height: 120,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) {
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
                              // Título "Login"
                              Text(
                                'Login',
                                style: GoogleFonts.robotoSlab(
                                  fontSize: 36,
                                  fontWeight: FontWeight.bold,
                                  color: _laranja,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 32),

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
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'O e-mail é obrigatório';
                                  }
                                  if (!value.contains('@')) {
                                    return 'E-mail inválido';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 20),

                              // Campo de senha
                              TextFormField(
                                controller: _passCtrl,
                                obscureText: _obscurePassword,
                                textInputAction: TextInputAction.done,
                                onFieldSubmitted: (_) {
                                  if (_formKey.currentState!.validate()) {
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
                                    onPressed: () {
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
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'A senha é obrigatória';
                                  }
                                  return null;
                                },
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

/// CustomPainter para criar o fundo azul diagonal exatamente como na foto
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
