import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const EstradasRuraisApp());
}

class EstradasRuraisApp extends StatelessWidget {
  const EstradasRuraisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Estradas Rurais Garça',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff0b4b35)),
      ),
      home: const RuralSplashPage(),
    );
  }
}

class RuralSplashPage extends StatefulWidget {
  const RuralSplashPage({super.key});

  @override
  State<RuralSplashPage> createState() => _RuralSplashPageState();
}

class _RuralSplashPageState extends State<RuralSplashPage> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(milliseconds: 1200), () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(builder: (_) => const RuralMapPage()),
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xff062f24),
      body: Center(
        child: Image.asset(
          'assets/capa.png',
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}

class RuralMapPage extends StatefulWidget {
  const RuralMapPage({super.key});

  @override
  State<RuralMapPage> createState() => _RuralMapPageState();
}

class _RuralMapPageState extends State<RuralMapPage> {
  static final Uri _mapUri = Uri.parse(
    'https://api.garca.sp.gov.br/rotas-rurais/mapa',
  );

  late final WebViewController _controller;
  int _progress = 0;
  bool _failed = false;
  String _failureMessage = '';

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xfff4f7f1))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (mounted) setState(() => _progress = progress);
          },
          onPageStarted: (_) {
            if (mounted) setState(() => _failed = false);
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == false) return;
            if (mounted) {
              setState(() {
                _failed = true;
                _failureMessage = error.description;
              });
            }
          },
          onNavigationRequest: (request) async {
            final uri = Uri.tryParse(request.url);
            if (uri == null) return NavigationDecision.prevent;
            final isOwnPage = uri.host == 'api.garca.sp.gov.br';
            if (isOwnPage) return NavigationDecision.navigate;

            if (await canLaunchUrl(uri)) {
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            }
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(_mapUri);
  }

  Future<bool> _handleBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _handleBack() && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              Positioned.fill(child: WebViewWidget(controller: _controller)),
              if (_progress < 100 && !_failed)
                Align(
                  alignment: Alignment.topCenter,
                  child: LinearProgressIndicator(
                    value: _progress / 100,
                    minHeight: 3,
                    color: const Color(0xff86aa3d),
                    backgroundColor: const Color(0xff0b4b35),
                  ),
                ),
              if (_failed)
                Positioned.fill(
                  child: ColoredBox(
                    color: const Color(0xfff4f7f1),
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(28),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Image.asset(
                              'assets/logo-estradas-rurais-garca.png',
                              height: 180,
                            ),
                            const SizedBox(height: 24),
                            const Text(
                              'Não foi possível carregar o mapa',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _failureMessage,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.black54),
                            ),
                            const SizedBox(height: 20),
                            FilledButton.icon(
                              onPressed: () => _controller.loadRequest(_mapUri),
                              icon: const Icon(Icons.refresh),
                              label: const Text('Tentar novamente'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
