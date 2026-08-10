import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../widgets/custom_app_bar.dart';
import '../../widgets/copyright_footer.dart';
import '../../widgets/news_carousel.dart';
import 'dart:convert';
import '../../services/auth_service.dart';
import '../mobile/cemitery_screen.dart';

/// Landing Page moderna da SEMIT com galeria de fotos
class HomeSemitScreen extends StatefulWidget {
  const HomeSemitScreen({super.key});

  @override
  State<HomeSemitScreen> createState() => _HomeSemitScreenState();
}

class _HomeSemitScreenState extends State<HomeSemitScreen>
    with SingleTickerProviderStateMixin {
  String? _userName;
  String? _userEmail;
  int _servicesCount = 0;
  bool _loadingServices = true;
  String? _authToken;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  // Cores do design
  static const Color _azul = Color.fromRGBO(56, 77, 156, 1.0);
  static const Color _laranja = Color.fromRGBO(238, 112, 112, 1.0);

  // Lista de fotos da secretaria (placeholder - pode ser substituído por URLs reais)
  final List<String> _secretaryPhotos = [
    'assets/logo_app.png',
    'assets/garca.png',
  ];

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    _animationController.forward();
    _loadUserData();
    _loadServicesCount();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');
    final token = prefs.getString('auth_token') ?? prefs.getString('token');

    if (userJson != null) {
      final user = jsonDecode(userJson);
      setState(() {
        _userName = user['name'] ?? user['nome'] ?? 'Usuário';
        _userEmail = user['email'] ?? '';
        _authToken = token;
      });
    }
  }

  Future<void> _loadServicesCount() async {
    setState(() => _loadingServices = true);
    try {
      final snapshot1 = await FirebaseFirestore.instance
          .collection('services')
          .get();

      if (snapshot1.docs.isNotEmpty) {
        setState(() {
          _servicesCount = snapshot1.docs.length;
          _loadingServices = false;
        });
        return;
      }

      final snapshot2 = await FirebaseFirestore.instance
          .collection('Services')
          .get();

      setState(() {
        _servicesCount = snapshot2.docs.length;
        _loadingServices = false;
      });
    } catch (e) {
      debugPrint('Erro ao carregar contagem de serviços: $e');
      setState(() {
        _servicesCount = 0;
        _loadingServices = false;
      });
    }
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Sair'),
        content: const Text('Deseja realmente sair?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Sair'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await AuthService.logout();
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/web');
      }
    }
  }

  void _navigateToCemetery() {
    if (_authToken == null || _authToken!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Você precisa estar logado para acessar o cemitério.'),
          backgroundColor: _laranja,
        ),
      );
      Navigator.pushNamed(context, '/web');
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CemiterioScreen(authToken: _authToken!),
      ),
    );
  }

  // Hero Section com imagem home_semit.png
  Widget _buildHeroSection() {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          width: double.infinity,
          child: Image.asset(
            'home_semit.png',
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return Container(
                height: constraints.maxWidth > 600 ? 400 : 250,
                color: _azul,
                child: const Center(
                  child: Icon(
                    Icons.image,
                    size: 60,
                    color: Colors.white,
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  // Galeria de fotos da secretaria
  Widget _buildSecretaryGallery() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final isTablet = constraints.maxWidth >= 600 && constraints.maxWidth < 900;
        
        return Container(
          width: double.infinity,
          padding: EdgeInsets.symmetric(
            vertical: isMobile ? 40 : isTablet ? 60 : 80,
            horizontal: isMobile ? 16 : 24,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
          ),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 1200),
            margin: EdgeInsets.symmetric(horizontal: isMobile ? 8 : 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      'Nossa Secretaria',
                      style: GoogleFonts.robotoSlab(
                        fontSize: isMobile ? 32 : isTablet ? 40 : 48,
                        fontWeight: FontWeight.bold,
                        color: _azul,
                      ),
                    ),
                    SizedBox(width: isMobile ? 8 : 16),
                    Container(
                      width: isMobile ? 60 : 80,
                      height: 4,
                      decoration: BoxDecoration(
                        color: _laranja,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: isMobile ? 32 : 48),
                // Cards de perfil da equipe
                Text(
                  ' Administração Atual',
                  style: GoogleFonts.robotoSlab(
                    fontSize: isMobile ? 24 : isTablet ? 30 : 36,
                    fontWeight: FontWeight.bold,
                    color: _azul,
                  ),
                ),
                SizedBox(height: isMobile ? 24 : 32),
                LayoutBuilder(
                  builder: (context, innerConstraints) {
                    final crossAxisCount = innerConstraints.maxWidth > 900 ? 3 : 
                                          innerConstraints.maxWidth > 600 ? 2 : 1;
                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        crossAxisSpacing: isMobile ? 16 : 24,
                        mainAxisSpacing: isMobile ? 16 : 24,
                        childAspectRatio: 1.0,
                      ),
                      itemCount: 3,
                      itemBuilder: (context, index) {
                        final profiles = [
                          {
                            'name': 'Fabiano Ogawa',
                            'role': 'Secretário',
                            'photo': 'fabiano.png',
                          },
                          {
                            'name': 'Adriano Manzano',
                            'role': 'Diretor - DITD',
                            'photo': 'adriano.jpg',
                          },
                          {
                            'name': 'Ricardo Sartori',
                            'role': 'Diretor - DISD',
                            'photo': 'ricardo.jpg',
                          },
                        ];
                        final profile = profiles[index];
                        return _buildProfileCard(
                          name: profile['name'] as String,
                          role: profile['role'] as String,
                          photo: profile['photo'] as String,
                        );
                      },
                    );
                  },
                ),
          ],
        ),
      ),
    );
      },
    );
  }

  Widget _buildPhotoCard({
    required String imagePath,
    required String title,
    required String subtitle,
    bool showOverlay = true,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Imagem
            Image.asset(
              imagePath,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  color: _azul.withValues(alpha: 0.1),
                  child: const Icon(
                    Icons.image,
                    size: 60,
                    color: _azul,
                  ),
                );
              },
            ),
            // Overlay gradiente (apenas se showOverlay for true)
            if (showOverlay)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.7),
                      ],
                    ),
                  ),
                ),
              ),
            // Texto
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.robotoSlab(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: showOverlay ? Colors.white : _azul,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: GoogleFonts.robotoSlab(
                        fontSize: 14,
                        color: showOverlay 
                            ? Colors.white.withValues(alpha: 0.9)
                            : Colors.grey[700],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Card de perfil da equipe
  Widget _buildProfileCard({
    required String name,
    required String role,
    required String photo,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final isTablet = constraints.maxWidth >= 600 && constraints.maxWidth < 900;
        
        // Calcula o tamanho da foto baseado no espaço disponível
        final photoSize = isMobile 
            ? constraints.maxWidth * 0.6 
            : isTablet 
                ? constraints.maxWidth * 0.4 
                : 350.0;
        
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(isMobile ? 12 : 16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 15,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Padding(
            padding: EdgeInsets.all(isMobile ? 12 : 16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Foto de perfil quadrada com borda
                Container(
                  width: photoSize,
                  height: photoSize,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(isMobile ? 8 : 12),
                    border: Border.all(
                      color: const Color.fromRGBO(56, 77, 156, 1.0),
                      width: isMobile ? 3 : 5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: _azul.withValues(alpha: 0.2),
                        blurRadius: 15,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(isMobile ? 5 : 7),
                    child: Image.asset(
                      photo,
                      width: photoSize,
                      height: photoSize,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          color: _azul.withValues(alpha: 0.1),
                          child: Icon(
                            Icons.person,
                            size: photoSize * 0.5,
                            color: _azul,
                          ),
                        );
                      },
                    ),
                  ),
                ),
                SizedBox(height: isMobile ? 12 : 20),
                // Nome
                Text(
                  name,
                  style: GoogleFonts.robotoSlab(
                    fontSize: isMobile ? 16 : isTablet ? 20 : 24,
                    fontWeight: FontWeight.bold,
                    color: _azul,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: isMobile ? 4 : 6),
                // Cargo
                Text(
                  role,
                  style: GoogleFonts.robotoSlab(
                    fontSize: isMobile ? 12 : isTablet ? 13 : 14,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        );
      },
    );
  }


  // Seção sobre a SEMIT com fotos dos setores
  Widget _buildAboutSection() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final isTablet = constraints.maxWidth >= 600 && constraints.maxWidth < 900;
        
        final sectors = [
          {
            'name': 'DITD',
            'icon': Icons.code_rounded,
            'color': _azul,
            'photo': 'ditd.png',
            'description': 'Departamento de Inovação e Transformação Digital',
            'activities': 'Focado na inovação digital, este setor é responsável pelo desenvolvimento de ferramentas online personalizadas e pelo suporte técnico especializado em sistemas e software.',
          },
          {
            'name': 'DISD',
            'icon': Icons.build_rounded,
            'color': _laranja,
            'photo': 'infra.png',
            'description': 'Departamento de Informática e Segurança de Dados',
            'activities': 'Garante a operação física da tecnologia. Realiza a instalação, configuração e manutenção de computadores, impressoras e demais equipamentos.',
          },
          {
            'name': 'CV',
            'icon': Icons.camera_alt_rounded,
            'color': Colors.green,
            'photo': 'monitoramento.png',
            'description': 'Central de Videomonitoramento',
            'activities': 'Responsável pela segurança patrimonial e urbana. Realiza o monitoramento de câmeras em prédios públicos e vias da cidade, com operação 24 horas por dia.',
          },
        ];

        return Container(
          width: double.infinity,
          padding: EdgeInsets.symmetric(
            vertical: isMobile ? 40 : isTablet ? 60 : 80,
            horizontal: isMobile ? 16 : 24,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
          ),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 1200),
            margin: EdgeInsets.symmetric(horizontal: isMobile ? 8 : 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      'Sobre a SEMIT',
                      style: GoogleFonts.robotoSlab(
                        fontSize: isMobile ? 32 : isTablet ? 40 : 48,
                        fontWeight: FontWeight.bold,
                        color: _azul,
                      ),
                    ),
                    SizedBox(width: isMobile ? 8 : 16),
                    Container(
                      width: isMobile ? 60 : 80,
                      height: 4,
                      decoration: BoxDecoration(
                        color: _laranja,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: isMobile ? 24 : 32),
                Text(
                  'A Secretaria Municipal de Inovação e Tecnologia tem como missão conduzir a transformação digital e a modernização da administração pública de Garça. Responsável por articular o Governo Digital, a pasta gerencia desde o planejamento estratégico de TI e a governança de dados (LGPD) até a infraestrutura de telefonia e equipamentos.',
                  style: GoogleFonts.robotoSlab(
                    fontSize: isMobile ? 14 : isTablet ? 16 : 18,
                    height: 1.8,
                    color: Colors.grey[700],
                  ),
                ),
                SizedBox(height: isMobile ? 16 : 24),
                Text(
                  'Além de fornecer suporte tecnológico aos órgãos de segurança e demais secretarias, somos responsáveis pela gestão do Atende Fácil, centralizando e otimizando o relacionamento entre a Prefeitura e o cidadão com foco na agilidade e transparência.',
                  style: GoogleFonts.robotoSlab(
                    fontSize: isMobile ? 14 : isTablet ? 16 : 18,
                    height: 1.8,
                    color: Colors.grey[700],
                  ),
                ),
                SizedBox(height: isMobile ? 40 : isTablet ? 50 : 64),
                Text(
                  'Nossos Setores',
                  style: GoogleFonts.robotoSlab(
                    fontSize: isMobile ? 24 : isTablet ? 30 : 36,
                    fontWeight: FontWeight.bold,
                    color: _azul,
                  ),
                ),
                SizedBox(height: isMobile ? 24 : 40),
                LayoutBuilder(
                  builder: (context, innerConstraints) {
                    final crossAxisCount = innerConstraints.maxWidth > 900 ? 3 : 
                                          innerConstraints.maxWidth > 600 ? 2 : 1;
                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        crossAxisSpacing: isMobile ? 16 : 24,
                        mainAxisSpacing: isMobile ? 16 : 24,
                        childAspectRatio: crossAxisCount == 1 ? 0.9 : 0.85,
                      ),
                  itemCount: sectors.length,
                  itemBuilder: (context, index) {
                    final sector = sectors[index];
                    return _buildSectorCard(
                      name: sector['name'] as String,
                      icon: sector['icon'] as IconData,
                      color: sector['color'] as Color,
                      photo: sector['photo'] as String,
                      description: sector['description'] as String,
                      activities: sector['activities'] as String,
                    );
                  },
                );
              },
            ),
                SizedBox(height: isMobile ? 40 : isTablet ? 50 : 64),
                // Cards de perfil da equipe
                Text(
                  'Administração Atual',
                  style: GoogleFonts.robotoSlab(
                    fontSize: isMobile ? 24 : isTablet ? 30 : 36,
                    fontWeight: FontWeight.bold,
                    color: _azul,
                  ),
                ),
                SizedBox(height: isMobile ? 24 : 32),
            LayoutBuilder(
              builder: (context, constraints) {
                final crossAxisCount = constraints.maxWidth > 900 ? 3 : 
                                      constraints.maxWidth > 600 ? 2 : 1;
                return GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    crossAxisSpacing: 24,
                    mainAxisSpacing: 24,
                    childAspectRatio: 1.0,
                  ),
                  itemCount: 3,
                  itemBuilder: (context, index) {
                    final profiles = [
                      {
                        'name': 'Fabiano Ogawa',
                        'role': 'Secretário',
                        'photo': 'fabiano.png',
                      },
                      {
                        'name': 'Adriano Manzano',
                        'role': 'Diretor - DITD',
                        'photo': 'adriano.jpg',
                      },
                      {
                        'name': 'Ricardo Sartori',
                        'role': 'Diretor - DISD',
                        'photo': 'ricardo.jpg',
                      },
                    ];
                    final profile = profiles[index];
                    return _buildProfileCard(
                      name: profile['name'] as String,
                      role: profile['role'] as String,
                      photo: profile['photo'] as String,
                    );
                  },
                );
              },
            ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSectorCard({
    required String name,
    required IconData icon,
    required Color color,
    required String photo,
    required String description,
    required String activities,
    bool showOverlay = true,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(isMobile ? 16 : 24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(isMobile ? 16 : 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Foto do setor
                Expanded(
                  flex: 3,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.asset(
                        photo,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: color.withValues(alpha: 0.1),
                            child: Icon(icon, size: isMobile ? 40 : 60, color: color),
                          );
                        },
                      ),
                      if (showOverlay)
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                color.withValues(alpha: 0.3),
                              ],
                            ),
                          ),
                        ),
                      // Ícone no canto
                      Positioned(
                        top: isMobile ? 12 : 20,
                        right: isMobile ? 12 : 20,
                        child: Container(
                          padding: EdgeInsets.all(isMobile ? 8 : 12),
                          decoration: BoxDecoration(
                            color: color,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: color.withValues(alpha: 0.4),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Icon(icon, size: isMobile ? 24 : 32, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
                // Conteúdo
                Expanded(
                  flex: 2,
                  child: Padding(
                    padding: EdgeInsets.all(isMobile ? 16 : 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: EdgeInsets.all(isMobile ? 6 : 8),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(icon, size: isMobile ? 20 : 24, color: color),
                            ),
                            SizedBox(width: isMobile ? 8 : 12),
                            Expanded(
                              child: Text(
                                name,
                                style: GoogleFonts.robotoSlab(
                                  fontSize: isMobile ? 16 : 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey[800],
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: isMobile ? 8 : 12),
                        Text(
                          description,
                          style: GoogleFonts.robotoSlab(
                            fontSize: isMobile ? 13 : 15,
                            color: Colors.grey[600],
                            height: 1.4,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        SizedBox(height: isMobile ? 6 : 8),
                        Text(
                          activities,
                          style: GoogleFonts.robotoSlab(
                            fontSize: isMobile ? 12 : 14,
                            color: Colors.grey[600],
                            height: 1.5,
                          ),
                          maxLines: 4,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // Seção de serviços moderna com fotos
  Widget _buildServicesSection() {
    final services = [
      {
        'title': 'Agenda Garça',
        'description':
            'Agende seus atendimentos de forma rápida e prática. Gerencie seus compromissos com a prefeitura de forma digital e eficiente.',
        'icon': Icons.calendar_today_rounded,
        'gradient': LinearGradient(
          colors: [_azul, _azul.withValues(alpha: 0.8)],
        ),
        'photo': 'agenda.png',
        'url': 'https://api.garca.sp.gov.br/agendamentos/',
        'isComingSoon': false,
      },
      {
        'title': 'Gestão de Formulários',
        'description':
            'Acesse e preencha formulários online. Inscrições para processos seletivos da Prefeitura em um só lugar.',
        'icon': Icons.description_rounded,
        'gradient': LinearGradient(
          colors: [_laranja, _laranja.withValues(alpha: 0.8)],
        ),
        'photo': 'forms_garca.png',
        'url': 'https://api.garca.sp.gov.br/formularios/',
        'isComingSoon': false,
      },
      {
        'title': 'Memorial Santa Faustina',
        'description':
            'Um portal dedicado à memória dos nossos amigos e familiares.',
        'icon': Icons.place_rounded,
        'gradient': LinearGradient(
          colors: [Colors.brown, Colors.brown.shade700],
        ),
        'photo': 'cemiterio.png',
        'url': 'https://api.garca.sp.gov.br/',
        'isComingSoon': false,
      },
      {
        'title': 'Estradas Rurais',
        'description':
            'Serviço utilizado por Bombeiros, Samu e Polícia Civil e Militar que garante assistência aos cidadãos da Zona Rural de Garça com o sistema de geolocalização.',
        'icon': Icons.map_rounded,
        'gradient': LinearGradient(
          colors: [Colors.green, Colors.green.shade700],
        ),
        'photo': 'estradas_rurais.png',
        'url': null,
        'isComingSoon': true,
      },
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final isTablet = constraints.maxWidth >= 600 && constraints.maxWidth < 900;
        
        return Container(
          width: double.infinity,
          padding: EdgeInsets.symmetric(
            vertical: isMobile ? 40 : isTablet ? 60 : 80,
            horizontal: isMobile ? 16 : 24,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
          ),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 1200),
            margin: EdgeInsets.symmetric(horizontal: isMobile ? 8 : 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      'Nossos Serviços',
                      style: GoogleFonts.robotoSlab(
                        fontSize: isMobile ? 32 : isTablet ? 40 : 48,
                        fontWeight: FontWeight.bold,
                        color: _azul,
                      ),
                    ),
                    SizedBox(width: isMobile ? 8 : 16),
                    Container(
                      width: isMobile ? 60 : 80,
                      height: 4,
                      decoration: BoxDecoration(
                        color: _laranja,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: isMobile ? 32 : 48),
                LayoutBuilder(
                  builder: (context, innerConstraints) {
                    // Sempre 4 colunas em telas grandes, responsivo em telas menores
                    final crossAxisCount = innerConstraints.maxWidth > 1200 ? 4 : 
                                          innerConstraints.maxWidth > 900 ? 3 :
                                          innerConstraints.maxWidth > 600 ? 2 : 1;
                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        crossAxisSpacing: isMobile ? 16 : 24,
                        mainAxisSpacing: isMobile ? 16 : 24,
                        childAspectRatio: crossAxisCount == 4 ? 0.75 : 
                                         crossAxisCount == 3 ? 0.85 :
                                         crossAxisCount == 2 ? 1.0 : 1.2,
                      ),
                  itemCount: services.length,
                  itemBuilder: (context, index) {
                    final service = services[index];
                    return _buildModernServiceCard(
                      title: service['title'] as String,
                      description: service['description'] as String,
                      icon: service['icon'] as IconData,
                      gradient: service['gradient'] as Gradient,
                      photo: service['photo'] as String,
                      url: service['url'] as String?,
                      isComingSoon: service['isComingSoon'] as bool,
                    );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      );
      },
    );
  }

  Widget _buildModernServiceCard({
    required String title,
    required String description,
    required IconData icon,
    required Gradient gradient,
    required String photo,
    String? url,
    bool isComingSoon = false,
  }) {
    Future<void> _launchURL(String urlString) async {
      final uri = Uri.parse(urlString);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Não foi possível abrir o link',
                style: GoogleFonts.robotoSlab(),
              ),
              backgroundColor: _laranja,
            ),
          );
        }
      }
    }

    return MouseRegion(
      cursor: isComingSoon ? SystemMouseCursors.basic : SystemMouseCursors.click,
      child: GestureDetector(
        onTap: isComingSoon ? null : () {
          if (url != null) {
            _launchURL(url);
          }
        },
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 20,
                offset: const Offset(0, 10),
                spreadRadius: 0,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Foto do serviço
                Expanded(
                  flex: 3,
                  child: Container(
                    color: Colors.white,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        // Imagem com fundo branco
                        Center(
                          child: Image.asset(
                            photo,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                decoration: BoxDecoration(gradient: gradient),
                                child: const Icon(
                                  Icons.image,
                                  size: 60,
                                  color: Colors.white,
                                ),
                              );
                            },
                          ),
                        ),
                        // Ícone no canto
                        Positioned(
                          top: 20,
                          right: 20,
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: _azul.withValues(alpha: 0.9),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white,
                                width: 2,
                              ),
                            ),
                            child: Icon(icon, size: 32, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // Conteúdo
                Expanded(
                  flex: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: GoogleFonts.robotoSlab(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: _azul,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Expanded(
                          child: Text(
                            description,
                            style: GoogleFonts.robotoSlab(
                              fontSize: 15,
                              height: 1.6,
                              color: Colors.grey[700],
                            ),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            if (isComingSoon)
                              Text(
                                'EM BREVE!',
                                style: GoogleFonts.robotoSlab(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[600],
                                ),
                              )
                            else ...[
                              Text(
                                'Acessar',
                                style: GoogleFonts.robotoSlab(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: _azul,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Icon(Icons.arrow_forward_rounded,
                                  size: 20, color: _azul),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Seção de contato
  Widget _buildContactSection() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final isTablet = constraints.maxWidth >= 600 && constraints.maxWidth < 900;
        
        return Container(
          width: double.infinity,
          padding: EdgeInsets.symmetric(
            vertical: isMobile ? 40 : isTablet ? 60 : 80,
            horizontal: isMobile ? 16 : 24,
          ),
          decoration: BoxDecoration(
            color: _azul.withValues(alpha: 0.05),
          ),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 1200),
            margin: EdgeInsets.symmetric(horizontal: isMobile ? 8 : 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      'Contato',
                      style: GoogleFonts.robotoSlab(
                        fontSize: isMobile ? 32 : isTablet ? 40 : 48,
                        fontWeight: FontWeight.bold,
                        color: _azul,
                      ),
                    ),
                    SizedBox(width: isMobile ? 8 : 16),
                    Container(
                      width: isMobile ? 60 : 80,
                      height: 4,
                      decoration: BoxDecoration(
                        color: _laranja,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: isMobile ? 32 : 48),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildContactItem(
                      icon: Icons.location_on_rounded,
                      label: 'Endereço',
                      value: 'Rua Coronel Joaquim Piza, 192',
                      isMobile: isMobile,
                    ),
                    SizedBox(height: isMobile ? 24 : 32),
                    _buildContactItem(
                      icon: Icons.phone_rounded,
                      label: 'Telefone',
                      value: '(14) 3407-6618',
                      isMobile: isMobile,
                    ),
                    SizedBox(height: isMobile ? 24 : 32),
                    _buildContactItem(
                      icon: Icons.access_time_rounded,
                      label: 'Funcionamento',
                      value: '08:00 às 11:00 e das 13:00 às 17:00 h',
                      isMobile: isMobile,
                    ),
                    SizedBox(height: isMobile ? 24 : 32),
                    _buildContactItem(
                      icon: Icons.email_rounded,
                      label: 'E-mail',
                      value: 'semit@garca.sp.gov.br',
                      isMobile: isMobile,
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildContactItem({
    required IconData icon,
    required String label,
    required String value,
    required bool isMobile,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: EdgeInsets.all(isMobile ? 10 : 12),
          decoration: BoxDecoration(
            color: _azul.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: isMobile ? 20 : 24, color: _azul),
        ),
        SizedBox(width: isMobile ? 16 : 20),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.robotoSlab(
                  fontSize: isMobile ? 14 : 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[600],
                ),
              ),
              SizedBox(height: isMobile ? 4 : 6),
              Text(
                value,
                style: GoogleFonts.robotoSlab(
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: FontWeight.w500,
                  color: _azul,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: const Color.fromRGBO(56, 77, 156, 1.0),
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        automaticallyImplyLeading: false,
        title: LayoutBuilder(
          builder: (context, constraints) {
            final isMobile = constraints.maxWidth < 600;
            return Text(
              isMobile ? 'SEMIT' : 'SEMIT - Secretaria Municipal de Inovação e Tecnologia',
              style: GoogleFonts.zillaSlab(
                color: Colors.white,
                fontSize: isMobile ? 14 : 18,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            );
          },
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeroSection(),
            const NewsCarousel(limit: 5, height: 400),
            _buildAboutSection(),
            _buildServicesSection(),
            _buildContactSection(),
            const SizedBox(height: 60),
            const CopyrightFooter(),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
