import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_fonts/google_fonts.dart';

/// AppBar customizada com logo "Agenda Garça"
class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final List<Widget>? actions;
  final bool showLogo;
  final Widget? leading;

  const CustomAppBar({
    super.key,
    this.title,
    this.actions,
    this.showLogo = true,
    this.leading,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: const Color.fromRGBO(56, 77, 156, 1.0), // RGB(56, 77, 156)
      foregroundColor: Colors.white,
      elevation: 4.0,
      shadowColor: Colors.black.withValues(alpha: 0.2),
      centerTitle: false,
      automaticallyImplyLeading: false, // Remove a seta de voltar
      leading: leading,
      title: showLogo
          ? _buildLogo()
          : title != null
              ? Text(
                  title!,
                  style: GoogleFonts.getFont('Roboto Slab',
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                )
              : null,
      actions: actions,
    );
  }

  Widget _buildLogo() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Logo "Agenda Garça" como PNG
        // Tenta primeiro o caminho padrão, depois o caminho com assets/assets (para build web)
        Builder(
          builder: (context) {
            // Para web, tenta ambos os caminhos
            if (kIsWeb) {
              return Image.asset(
                'assets/logo_agenda.png',
                height: 40,
                width: null,
                fit: BoxFit.contain,
                cacheWidth: 200,
                errorBuilder: (context, error, stackTrace) {
                  // Se falhar, tenta o caminho duplicado (assets/assets)
                  return Image.asset(
                    'assets/assets/logo_agenda.png',
                    height: 40,
                    width: null,
                    fit: BoxFit.contain,
                    cacheWidth: 200,
                    errorBuilder: (context, error2, stackTrace2) {
                      debugPrint('⚠️ Erro ao carregar logo: $error');
                      debugPrint('   Tentativa 2 também falhou: $error2');
                      return _buildFallbackLogo();
                    },
                  );
                },
              );
            } else {
              // Para mobile, usa o caminho padrão
              return Image.asset(
                'assets/logo_agenda.png',
                height: 40,
                width: null,
                fit: BoxFit.contain,
                cacheWidth: 200,
                errorBuilder: (context, error, stackTrace) {
                  debugPrint('⚠️ Erro ao carregar logo: $error');
                  return _buildFallbackLogo();
                },
              );
            }
          },
        ),
      ],
    );
  }

  Widget _buildFallbackLogo() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'garca.png',
          height: 32,
          width: 32,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) {
            return const SizedBox(height: 32, width: 32);
          },
        ),
        const SizedBox(width: 8),
        Text(
          'Sistema de Agendamento',
          style: GoogleFonts.getFont('Roboto Slab',
            color: const Color.fromRGBO(238, 112, 112, 1.0), // RGB(238, 112, 112)
            fontSize: 20,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.5,
          ),
        ),
      ],
    );
  }
}

