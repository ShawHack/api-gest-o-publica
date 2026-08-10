import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import '../screens/web/web_home_screen.dart';

// Import condicional para telas do Forms Garça (apenas na web)
import '../screens/web/forms_garca_login_screen_export.dart' as forms_garca;
import '../screens/web/forms_garca_screen_export.dart' as forms_garca_screen;

/// Widget que observa mudanças na URL e redireciona adequadamente
class RouteObserverWidget extends StatefulWidget {
  final Widget child;

  const RouteObserverWidget({super.key, required this.child});

  @override
  State<RouteObserverWidget> createState() => _RouteObserverWidgetState();
}

class _RouteObserverWidgetState extends State<RouteObserverWidget> {
  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _checkAndRedirect();
      });
    }
  }

  void _checkAndRedirect() {
    if (!kIsWeb || !mounted) return;

    try {
      final uri = Uri.base;
      final hash = uri.fragment;
      
      debugPrint('🔍 RouteObserver - Hash: $hash');
      debugPrint('🔍 RouteObserver - URI completa: ${uri.toString()}');

      if (hash.isNotEmpty) {
        if (hash.contains('forms-garca-login') || hash == 'forms-garca-login') {
          debugPrint('✅ RouteObserver - Redirecionando para Forms Garça Login');
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => const forms_garca.FormsGarcaLoginScreen(),
            ),
          );
          return;
        }
        if (hash.contains('forms-garca') && !hash.contains('forms-garca-login')) {
          debugPrint('✅ RouteObserver - Redirecionando para Forms Garça');
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => const forms_garca_screen.FormsGarcaScreen(),
            ),
          );
          return;
        }
      }
    } catch (e) {
      debugPrint('❌ RouteObserver - Erro: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}

