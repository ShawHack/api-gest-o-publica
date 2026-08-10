// lib/widgets/custom_drawer.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:material_design_icons_flutter/material_design_icons_flutter.dart'; // <-- IMPORTAÇÃO

import '../tiles/drawer_tile.dart';
import '../screens/mobile/login_screen.dart';
import '../screens/mobile/profile_screen.dart';
import '../screens/mobile/home_screen.dart';
import '../features/memorial/presentation/memorial_shell_page.dart';
import '../features/garca_pet/presentation/garca_pet_shell_page.dart';
import '../screens/mobile/webview_screen.dart';
import '../screens/web/new_appointment_screen.dart';
import '../screens/web/my_appointments_screen.dart';
import '../rotas/main.dart' show UpaHomePage;

// ========================
// CONFIGURAÇÃO
// ========================
const String kApiBase = 'https://api.garca.sp.gov.br/api';
const String kGarcaCidadaoUrl = 'https://api.garca.sp.gov.br/garca-cidadao';
const String kGarcaCidadaoEmbeddedUrl = 'https://api.garca.sp.gov.br/garca-cidadao?embedded=1';

String _fullUrl(String path) {
  if (path.isEmpty) return kApiBase;
  if (path.startsWith('/')) return '$kApiBase$path';
  return '$kApiBase/$path';
}

class CustomDrawer extends StatefulWidget {
  final PageController pageController;
  const CustomDrawer(this.pageController, {super.key});

  @override
  State<CustomDrawer> createState() => _CustomDrawerState();
}

class _CustomDrawerState extends State<CustomDrawer> {
  String? _userName;
  String? _authToken;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<String?> _getStoredToken(SharedPreferences prefs) async {
    return prefs.getString('auth_token') ?? prefs.getString('token');
  }

  Future<void> _checkSession() async {
    debugPrint('=== VERIFICANDO SESSÃO ===');
    final prefs = await SharedPreferences.getInstance();
    final token = await _getStoredToken(prefs);

    debugPrint('Token encontrado no SharedPreferences: ${token != null && token.isNotEmpty}');
    if (token != null && token.isNotEmpty) {
      debugPrint('Token (primeiros 20 chars): ${token.substring(0, 20)}...');
    }

    if (token == null || token.isEmpty) {
      debugPrint('Nenhum token válido encontrado');
      if (mounted) setState(() {
        _userName = null;
        _authToken = null;
      });
      return;
    }

    try {
      final res = await http.get(
        Uri.parse(_fullUrl('/users/checkuser')),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      if (res.statusCode != 200 || res.body.isEmpty) {
        await _invalidateSession(prefs);
        return;
      }

      // tenta obter nome do SharedPreferences ou do body
      String? name = prefs.getString('auth_user_name');
      if (name == null || name.isEmpty) {
        try {
          final Map<String, dynamic> body = jsonDecode(res.body) as Map<String, dynamic>;
          // backend pode retornar o objeto diretamente ou em { user: {...} }
          if (body.containsKey('user') && body['user'] is Map) {
            final user = body['user'] as Map<String, dynamic>;
            name = (user['name'] ?? user['nome'] ?? '').toString();
            await prefs.setString('user', jsonEncode(user));
          } else {
            name = (body['name'] ?? body['nome'] ?? '').toString();
          }
        } catch (_) {
          // parsing falhou: não insiste, apenas limpa se for incoerente
          name ??= null;
        }
      }

      if (name != null && name.isNotEmpty) {
        await prefs.setString('auth_user_name', name);
      }

      if (mounted) {
        debugPrint('Definindo estado: userName=$name, authToken disponível=${token.isNotEmpty}');
        setState(() {
          _userName = name;
          _authToken = token;
        });
        debugPrint('Estado definido com sucesso');
      }
    } catch (e) {
      debugPrint('Erro ao verificar sessão: $e');
      // qualquer erro (network, parse, etc) invalida sessão localmente
      await _invalidateSession(prefs);
    }
  }

  Future<void> _invalidateSession(SharedPreferences prefs) async {
    await prefs.remove('auth_token');
    await prefs.remove('token');
    await prefs.remove('auth_user_id');
    await prefs.remove('auth_user_name');
    await prefs.remove('user');
    if (mounted) setState(() {
      _userName = null;
      _authToken = null;
    });
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await _invalidateSession(prefs);
    if (mounted) {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => HomeScreen()));
    }
  }

  void _openCemetery() {
    debugPrint('=== TENTANDO ABRIR CEMITÉRIO ===');
    debugPrint('Token disponível: ${_authToken != null}');
    debugPrint('Nome do usuário: $_userName');

    if (_authToken == null) {
      debugPrint('ERRO: Token não disponível');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Você precisa estar logado para acessar o cemitério.')),
      );
      return;
    }

    debugPrint('Token válido encontrado: ${_authToken!.substring(0, 20)}...');
    debugPrint('Navegando para MemorialShellPage...');

    Navigator.push(
      context,
      MaterialPageRoute(
        settings: const RouteSettings(name: MemorialShellPage.routeName),
        builder: (_) => const MemorialShellPage(),
      ),
    ).then((_) {
      debugPrint('Retornando da tela do cemitério');
      // Recarrega a sessão após retornar da tela do cemitério
      _checkSession();
    });
  }

  void _openGarcaPet() {
    if (_authToken == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Você precisa estar logado para acessar o Garça Pet.')),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const GarcaPetShellPage(),
      ),
    ).then((_) => _checkSession());
  }

  void _openBocaNoTrombone() {
    final token = _authToken;
    if (token == null || token.isEmpty) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Você precisa estar logado para acessar o Boca no Trombone.')),
      );
      return;
    }

    Navigator.pop(context);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => WebViewScreen(
          url: kGarcaCidadaoEmbeddedUrl,
          title: 'Boca no Trombone',
          prefeituraAuthToken: token,
        ),
      ),
    );
  }

  void _openNewAppointment() {
    debugPrint('=== ABRINDO NOVO AGENDAMENTO ===');
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const NewAppointmentScreen(),
      ),
    );
  }

  void _openMyAppointments() {
    debugPrint('=== ABRINDO MEUS AGENDAMENTOS ===');
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const MyAppointmentsScreen(),
      ),
    );
  }

  Widget _buildDrawerBack() => Container(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        colors: [
          Color(0xFF384D9C), // RGB(56, 77, 156)
          Color(0xFF4A5FA8),
          Color(0xFF5C71B4),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        stops: [0.0, 0.6, 1.0],
      ),
    ),
  );

  Widget _buildHeader() {
    return Container(
      margin: const EdgeInsets.only(bottom: 20.0),
      padding: const EdgeInsets.fromLTRB(20.0, 40.0, 20.0, 30.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Image.asset(
              "assets/logo_app.png",
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return const Icon(
                  Icons.account_balance,
                  size: 60,
                  color: Colors.white,
                );
              },
            ),
          ),
          const SizedBox(height: 30),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Colors.white.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: _userName == null
                ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Olá! 👋",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16.0,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    ).then((_) => _checkSession());
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Text(
                          "Entre ou cadastre-se",
                          style: TextStyle(
                            color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                            fontSize: 14.0,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        SizedBox(width: 6),
                        Icon(
                          Icons.arrow_forward_ios,
                          color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                          size: 12,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            )
                : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Olá, $_userName 👋",
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16.0,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                // Row para colocar os botões lado a lado
                Row(
                  children: [
                    // Botão Meu Perfil
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const ProfileScreen()),
                          ).then((_) => _checkSession());
                        },
                        icon: const Icon(Icons.person, size: 18),
                        label: const Text(
                          "Perfil",
                          style: TextStyle(fontSize: 13),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
                          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                          minimumSize: const Size(0, 36),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Botão Sair
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _logout,
                        icon: const Icon(Icons.logout, color: Colors.white, size: 18),
                        label: const Text(
                          "Sair",
                          style: TextStyle(color: Colors.white, fontSize: 13),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white),
                          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                          minimumSize: const Size(0, 36),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Stack(
        children: [
          _buildDrawerBack(),
          Column(
            children: [
              _buildHeader(),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                height: 1,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.white.withOpacity(0.0),
                      Colors.white.withOpacity(0.3),
                      Colors.white.withOpacity(0.0),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Column(
                    children: [
                      DrawerTiles(Icons.home_rounded, "Início", widget.pageController, 0),
                      const SizedBox(height: 4),

                      if (_userName != null) ...[
                        // Usuário logado: ambos habilitados e com estilo idêntico aos demais
                        DrawerTiles(Icons.miscellaneous_services_rounded, "Serviços", widget.pageController, 1),
                        const SizedBox(height: 4),
                        _CemeteryTile(onTap: _openCemetery),
                        const SizedBox(height: 4),
                        _GarcaPetTile(onTap: _openGarcaPet),
                        const SizedBox(height: 4),
                        _BocaNoTromboneTile(onTap: _openBocaNoTrombone),
                        const SizedBox(height: 4),
                        _AppointmentsTile(
                          onNewAppointment: _openNewAppointment,
                          onMyAppointments: _openMyAppointments,
                        ),
                        const SizedBox(height: 4),
                        _InscriptionsTile(
                          onTap: () {
                            Navigator.pushNamed(context, '/inscriptions');
                          },
                        ),
                        const SizedBox(height: 4),
                      ] else ...[
                        // Usuário não logado: Serviços desabilitado
                        ListTile(
                          leading: const Icon(Icons.miscellaneous_services_rounded, color: Colors.grey),
                          title: const Text(
                            "Serviços",
                            style: TextStyle(color: Colors.grey),
                          ),
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text("Você precisa estar logado para acessar os Serviços.")),
                            );
                          },
                        ),
                        const SizedBox(height: 4),

                        // Usuário não logado: Cemitério desabilitado (agora com lápide)
                        ListTile(
                          leading: Icon(MdiIcons.graveStone, color: Colors.grey), // <-- lápide desabilitada
                          title: const Text(
                            "Memorial Santa Faustina",
                            style: TextStyle(color: Colors.grey),
                          ),
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  "Você precisa estar logado para acessar o Memorial Santa Faustina.",
                                ),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 4),

                        ListTile(
                          leading: Icon(Icons.pets, color: Colors.grey),
                          title: const Text(
                            "Garça Pet",
                            style: TextStyle(color: Colors.grey),
                          ),
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text("Você precisa estar logado para acessar o Garça Pet.")),
                            );
                          },
                        ),
                        const SizedBox(height: 4),

                        ListTile(
                          leading: Icon(Icons.campaign_rounded, color: Colors.grey),
                          title: const Text(
                            "Boca no Trombone",
                            style: TextStyle(color: Colors.grey),
                          ),
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text("Você precisa estar logado para acessar o Boca no Trombone.")),
                            );
                          },
                        ),
                        const SizedBox(height: 4),

                        // Mensagem única abaixo do Cemitério mencionando ambos
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 6.0),
                          child: Row(
                            children: [
                              const Icon(Icons.info_outline, color: Colors.white70, size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  "Para acessar Serviços, Cemitério, Garça Pet e Boca no Trombone, faça login na sua conta.",
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.85),
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 4),
                      ],

                      DrawerTiles(Icons.location_on_rounded, "Secretarias", widget.pageController, 2),
                      const SizedBox(height: 4),
                      DrawerTiles(
                        Icons.playlist_add_check_rounded,
                        "Minhas Solicitações",
                        widget.pageController,
                        999, // não usado quando onTap é fornecido
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const WebViewScreen(
                                url: 'https://garca.1doc.com.br/b.php?pg=wp/inbox',
                                title: 'Minhas Solicitações',
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 4),

                      // Botão adicional com ícone agricultura chamando Rotas
                      DrawerTiles(
                        Icons.agriculture,
                        "Estradas Rurais",
                        widget.pageController,
                        999,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const UpaHomePage(),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(20),
                child: Text(
                  "v1.0.0",
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// Widget para Inscrições
class _InscriptionsTile extends StatelessWidget {
  final VoidCallback onTap;

  const _InscriptionsTile({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.description,
                      color: Color.fromRGBO(238, 112, 112, 1.0),
                      size: 24,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      "Inscrições",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                const Icon(Icons.arrow_forward_ios, color: Color.fromRGBO(238, 112, 112, 1.0), size: 14),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OnlinePill extends StatelessWidget {
  const _OnlinePill();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Color(0xFF4CAF50),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Text(
        "Online",
        style: TextStyle(
          color: Colors.white,
          fontSize: 12.0,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

// Widget customizado para manter o mesmo estilo dos DrawerTiles quando habilitado
class _CemeteryTile extends StatelessWidget {
  final VoidCallback onTap;

  const _CemeteryTile({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Ícone em um bloco com tamanho fixo para alinhar com outros tiles
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Icon(
                      MdiIcons.graveStone, // <-- ícone lápide habilitado
                      color: const Color.fromRGBO(238, 112, 112, 1.0),
                      size: 24, // mesmo tamanho que ícones padrão
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      "Memorial Santa Faustina",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                const Icon(Icons.arrow_forward_ios, color: Color.fromRGBO(238, 112, 112, 1.0), size: 14),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GarcaPetTile extends StatelessWidget {
  final VoidCallback onTap;

  const _GarcaPetTile({required this.onTap});

  static const _green = Color(0xFF446042);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Icon(Icons.pets, color: _green, size: 24),
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      "Garça Pet",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                const Icon(Icons.arrow_forward_ios, color: _green, size: 14),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BocaNoTromboneTile extends StatelessWidget {
  final VoidCallback onTap;

  const _BocaNoTromboneTile({required this.onTap});

  static const _accent = Color(0xFF384D9C);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            onTap();
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Icon(Icons.campaign_rounded, color: _accent, size: 24),
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      "Boca no Trombone",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                const Icon(Icons.arrow_forward_ios, color: _accent, size: 14),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Widget para Agendamentos com submenu
class _AppointmentsTile extends StatefulWidget {
  final VoidCallback onNewAppointment;
  final VoidCallback onMyAppointments;

  const _AppointmentsTile({
    required this.onNewAppointment,
    required this.onMyAppointments,
  });

  @override
  State<_AppointmentsTile> createState() => _AppointmentsTileState();
}

class _AppointmentsTileState extends State<_AppointmentsTile> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () {
                setState(() {
                  _isExpanded = !_isExpanded;
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.calendar_month,
                          color: Color.fromRGBO(238, 112, 112, 1.0),
                          size: 24,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          "Agendamentos",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                    Icon(
                      _isExpanded ? Icons.expand_less : Icons.expand_more,
                      color: const Color.fromRGBO(238, 112, 112, 1.0),
                      size: 20,
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_isExpanded) ...[
            Container(
              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 8),
              child: Column(
                children: [
                  _buildSubMenuItem(
                    icon: Icons.add_circle_outline,
                    title: "Novo Agendamento",
                    onTap: widget.onNewAppointment,
                  ),
                  const SizedBox(height: 4),
                  _buildSubMenuItem(
                    icon: Icons.list_alt,
                    title: "Meus Agendamentos",
                    onTap: widget.onMyAppointments,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSubMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(icon, color: const Color.fromRGBO(238, 112, 112, 1.0), size: 20),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
