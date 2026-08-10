import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
// Mobile screens
import 'package:prefeitura_app/screens/mobile/home_screen.dart';
import 'package:prefeitura_app/screens/mobile/signup_screen.dart';
import 'package:prefeitura_app/screens/mobile/login_screen.dart';
import 'package:prefeitura_app/screens/mobile/profile_screen.dart';
// Web/Agendamento screens
import 'package:prefeitura_app/screens/web/attendant_web_screen.dart';
import 'package:prefeitura_app/screens/web/manager_web_screen.dart';
import 'package:prefeitura_app/screens/web/web_home_screen.dart';
import 'package:prefeitura_app/screens/web/user_web_screen.dart';
import 'package:prefeitura_app/screens/web/new_appointment_screen.dart';
import 'package:prefeitura_app/screens/web/my_appointments_screen.dart';
import 'package:prefeitura_app/screens/web/signup_web_screen.dart';
import 'package:prefeitura_app/screens/web/home_semit.dart';
// Forms Garça - imports condicionais (apenas na web)
import 'package:prefeitura_app/screens/web/forms_garca_login_screen_export.dart' as forms_garca;
import 'package:prefeitura_app/screens/web/forms_garca_screen_export.dart' as forms_garca_screen;
import 'package:prefeitura_app/screens/mobile/inscriptions_list_screen.dart';
import 'package:prefeitura_app/widgets/route_observer.dart';
import 'package:intl/date_symbol_data_local.dart';

// Iluminação Pública
import 'package:prefeitura_app/features/iluminacao_publica/presentation/pages/iluminacao_home_page.dart';
import 'package:prefeitura_app/features/iluminacao_publica/presentation/pages/qr_scanner_page.dart';
import 'package:prefeitura_app/features/iluminacao_publica/presentation/pages/report_problem_page.dart';
import 'package:prefeitura_app/features/iluminacao_publica/presentation/pages/iluminacao_admin_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/garca_pet_shell_page.dart';

import 'firebase_options.dart';

Future<void> main() async {
  // Cor Primária: #384D9C (RGB: 56, 77, 156)
  // Cor Secundária: #FFFFFF (branco)

  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // IMPORTANTE: Faz login automático com conta técnica para acesso ao Firestore
  try {
    debugPrint('🔐 Iniciando login automático com conta técnica...');
    final auth = FirebaseAuth.instance;
    
    // Se já estiver logado com outra conta, faz logout primeiro
    if (auth.currentUser != null && auth.currentUser!.email != 'tecnico@gmail.com') {
      debugPrint('🔓 Fazendo logout da conta atual: ${auth.currentUser!.email}');
      await auth.signOut();
    }
    
    // Faz login com a conta técnica
    if (auth.currentUser == null || auth.currentUser!.email != 'tecnico@gmail.com') {
      await auth.signInWithEmailAndPassword(
        email: 'tecnico@gmail.com',
        password: const String.fromEnvironment('API_BASIC_AUTH_PASSWORD'),
      );
      debugPrint('✅ Login automático realizado com sucesso!');
      debugPrint('   UID: ${auth.currentUser?.uid}');
      debugPrint('   Email: ${auth.currentUser?.email}');
    } else {
      debugPrint('✅ Já está logado com a conta técnica');
    }
  } catch (e) {
    debugPrint('❌ ERRO CRÍTICO no login automático: $e');
    debugPrint('   O app pode ter problemas de permissão no Firestore!');
  }

  // Inicializa localização em português
  await initializeDateFormatting('pt_BR', null);

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  static const Color primaryBlue = Color(0xFF384D9C); // RGB(56, 77, 156)

  // Verifica a rota inicial na web
  Widget _getInitialRoute() {
    if (!kIsWeb) {
      return HomeScreen();
    }

    // Verifica se há hash na URL para rotas específicas
    try {
      final uri = Uri.base;
      final hash = uri.fragment;
      final port = uri.port;
      final uriString = uri.toString();
      final host = uri.host;
      
      debugPrint('🔍 Verificando rota inicial - Hash: $hash');
      debugPrint('🔍 URI completa: $uriString');
      debugPrint('🔍 Porta: $port');
      debugPrint('🔍 Host: $host');
      
      // Verifica se está na porta 7500 (múltiplas formas de detecção)
      final isPort7500 = port == 7500 || 
                        uriString.contains(':7500') ||
                        (host == 'localhost' && port == 0 && uriString.contains('7500')) ||
                        (host.isEmpty && uriString.contains('7500'));
      
      debugPrint('🔍 É porta 7500? $isPort7500');
      
      // Se estiver na porta 7500, sempre abre Home SEMIT (a menos que haja hash específico)
      if (isPort7500) {
        // Verifica se há hash específico que deve ser respeitado
        if (hash.isNotEmpty) {
          if (hash.contains('forms-garca') && !hash.contains('forms-garca-login')) {
            debugPrint('✅ Porta 7500 com hash forms-garca - Redirecionando para Forms Garça');
            return const forms_garca_screen.FormsGarcaScreen();
          }
          if (hash.contains('forms-garca-login')) {
            debugPrint('✅ Porta 7500 com hash forms-garca-login - Redirecionando para Forms Garça Login');
            return const forms_garca.FormsGarcaLoginScreen();
          }
          if (hash.contains('attendant')) {
            debugPrint('✅ Porta 7500 com hash attendant - Redirecionando para Atendente');
            return const AttendantWebScreen();
          }
          if (hash.contains('manager')) {
            debugPrint('✅ Porta 7500 com hash manager - Redirecionando para Gerente');
            return const ManagerWebScreen();
          }
          // Removido o redirecionamento para user-web na porta 7500
          // Se houver hash user-web na porta 7500, também vai para Home SEMIT
        }
        // Porta 7500 sem hash ou com hash não reconhecido: SEMPRE Home SEMIT
        debugPrint('✅ Porta 7500 detectada - Redirecionando para Home SEMIT');
        return const HomeSemitScreen();
      }
      
      // Para outras portas, verifica hash normalmente
      if (hash.isNotEmpty) {
        // Verifica rotas específicas por hash
        if (hash.contains('forms-garca') && !hash.contains('forms-garca-login')) {
          debugPrint('✅ Redirecionando para Forms Garça');
          return const forms_garca_screen.FormsGarcaScreen();
        }
        if (hash.contains('forms-garca-login')) {
          debugPrint('✅ Redirecionando para Forms Garça Login');
          return const forms_garca.FormsGarcaLoginScreen();
        }
        if (hash.contains('attendant')) {
          debugPrint('✅ Redirecionando para Atendente');
          return const AttendantWebScreen();
        }
        if (hash.contains('manager')) {
          debugPrint('✅ Redirecionando para Gerente');
          return const ManagerWebScreen();
        }
        if (hash.contains('user-web')) {
          debugPrint('✅ Redirecionando para Agendamentos');
          return const UserWebScreen();
        }
      }
    } catch (e) {
      debugPrint('❌ Erro ao verificar rota inicial: $e');
    }

    // Tela inicial padrão na web: Forms Garça Login
    return const forms_garca.FormsGarcaLoginScreen();
  }

  @override
  Widget build(BuildContext context) {
    final initialRoute = _getInitialRoute();
    
    return MaterialApp(
      title: 'Prefeitura Online',
      debugShowCheckedModeBanner: false,

      // Configuração de localização
      localizationsDelegates: [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('pt', 'BR'),
      ],
      locale: const Locale('pt', 'BR'),

      // Se for web, verifica a rota inicial; se for mobile, mostra HomeScreen normal
      home: initialRoute,

      // ✅ registra as rotas que você chama por nome
      routes: {
        '/login': (context) => const LoginScreen(),
        '/signup': (context) => const SignupScreen(),
        '/signup-web': (context) => const SignupWebScreen(),
        '/home': (context) => HomeScreen(),
        '/profile': (context) => const ProfileScreen(),
        '/attendant': (context) => const AttendantWebScreen(),
        '/manager': (context) => const ManagerWebScreen(),
        '/web': (context) => const WebHomeScreen(),
        '/user-web': (context) => const UserWebScreen(),
        '/new-appointment': (context) => const NewAppointmentScreen(),
        '/my-appointments': (context) => const MyAppointmentsScreen(),
        '/forms-garca': (context) => const forms_garca_screen.FormsGarcaScreen(),
        '/forms-garca-login': (context) => const forms_garca.FormsGarcaLoginScreen(),
        '/inscriptions': (context) => const InscriptionsListScreen(),
        '/home-semit': (context) => const HomeSemitScreen(),
        // Iluminação Pública Routes
        '/iluminacao': (context) => const IluminacaoHomePage(),
        '/iluminacao/scan': (context) => const QRCodeScannerPage(),
        '/iluminacao/admin': (context) => const IluminacaoAdminPage(),
        '/garca-pet': (context) => const GarcaPetShellPage(),

      },

      onUnknownRoute: (s) {
        // Tenta extrair a rota da URL hash
        final routeName = s.name ?? '';
        if (!kIsWeb &&
            (routeName == '/memorial' || routeName.contains('memorial'))) {
          return MaterialPageRoute(builder: (_) => const HomeScreen());
        }
        if (routeName.isNotEmpty) {
          try {
            final uri = Uri.parse(routeName);
            final path = uri.path;
            
            // Se for uma rota conhecida, redireciona
            if (path == '/forms-garca-login' || path.contains('forms-garca-login')) {
              return MaterialPageRoute(
                builder: (_) => const forms_garca.FormsGarcaLoginScreen(),
              );
            }
            if (path.startsWith('/iluminacao/report/')) {
              // Decodifica o componente da URL para transformar %2B de volta em +
              final poleId = Uri.decodeComponent(path.split('/').last);
              final fromQrScan = uri.queryParameters['fromQr'] == '1';
              return MaterialPageRoute(
                builder: (_) => ReportProblemPage(poleId: poleId, fromQrScan: fromQrScan),
              );
            }
          } catch (e) {
            debugPrint('Erro ao processar rota: $e');
          }
        }
        
        return MaterialPageRoute(
          builder: (_) => kIsWeb ? const WebHomeScreen() : HomeScreen(),
        );
      },

      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: MyApp.primaryBlue,
          brightness: Brightness.light,
        ),
        primaryColor: MyApp.primaryBlue,
        appBarTheme: const AppBarTheme(
          backgroundColor: MyApp.primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
          iconTheme: IconThemeData(color: Colors.white, size: 24),
          actionsIconTheme: IconThemeData(color: Colors.white, size: 24),
          titleTextStyle: TextStyle(
              color: Colors.white, fontSize: 20, fontWeight: FontWeight.w600),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12.0),
            borderSide: BorderSide(color: Color(0xFFBDBDBD), width: 1.5),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12.0),
            borderSide: BorderSide(color: Color(0xFFBDBDBD), width: 1.5),
          ),
          focusedBorder: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(12.0)),
            borderSide: BorderSide(color: MyApp.primaryBlue, width: 2.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12.0),
            borderSide: BorderSide(color: Colors.red, width: 1.5),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12.0),
            borderSide: BorderSide(color: Colors.red, width: 2.5),
          ),
          disabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12.0),
            borderSide: BorderSide(color: Color(0xFFE0E0E0), width: 1.0),
          ),
          contentPadding: const EdgeInsets.symmetric(
              horizontal: 16.0, vertical: 18.0),
          floatingLabelStyle: const TextStyle(
              color: MyApp.primaryBlue, fontSize: 14.0, fontWeight: FontWeight.w600),
          filled: true,
          fillColor: Color(0xFFFAFAFA),
          prefixIconColor: MyApp.primaryBlue,
          suffixIconColor: Colors.grey,
        ),
        // Button themes removed temporarily due to const expression conflicts
        scaffoldBackgroundColor: Colors.white,
        dividerColor: const Color(0xFFE0E0E0),
      ),
    );
  }
}
