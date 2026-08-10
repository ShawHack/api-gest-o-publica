// lib/screens/cemiterio_screen.dart
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class CemiterioScreen extends StatefulWidget {
  final String authToken;
  const CemiterioScreen({super.key, required this.authToken});

  @override
  State<CemiterioScreen> createState() => _CemiterioScreenState();
}

class _CemiterioScreenState extends State<CemiterioScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _loginAttempted = false;

  @override
  void initState() {
    super.initState();
    _initializeWebView();
  }

  void _initializeWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            debugPrint('WebView carregando: $progress%');
          },
          onPageStarted: (String url) {
            debugPrint('Página iniciada: $url');
            setState(() {
              _isLoading = true;
            });
          },
          onPageFinished: (String url) async {
            debugPrint('Página carregada: $url');

            // Aguarda um pouco para a página carregar completamente
            await Future.delayed(const Duration(milliseconds: 1500));

            // Executa login automático apenas uma vez por carregamento
            if (!_loginAttempted) {
              _loginAttempted = true;
              await _performAutoLogin();
            }

            if (mounted) {
              setState(() {
                _isLoading = false;
              });
            }
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('Erro na WebView: ${error.description}');
          },
        ),
      );

    // Carrega a URL inicial
    _loadInitialUrl();
  }

  void _loadInitialUrl() {
    debugPrint('Carregando memorial sem token na URL (sessão via localStorage)');

    const memorialUrl = 'https://api.garca.sp.gov.br/';
    final tokenJs = jsonEncode(widget.authToken);

    try {
      _controller.loadHtmlString(
        '''
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>Carregando...</title></head>
          <body>
            <script>
              (function () {
                try {
                  var t = $tokenJs;
                  localStorage.setItem('token', t);
                  localStorage.setItem('auth_token', t);
                  localStorage.setItem('isAuthenticated', 'true');
                } catch (e) {}
                window.location.replace('$memorialUrl');
              })();
            </script>
          </body>
        </html>
        ''',
        baseUrl: 'https://api.garca.sp.gov.br',
      );
    } catch (e) {
      debugPrint('Erro ao carregar memorial: $e');
      _controller.loadRequest(Uri.parse(memorialUrl));
    }
  }

  Future<void> _performAutoLogin() async {
    debugPrint('=== EXECUTANDO LOGIN AUTOMÁTICO ===');
    debugPrint('Token recebido: ${widget.authToken.substring(0, 20)}...');

    // Aguarda menos tempo para login mais rápido
    await Future.delayed(const Duration(milliseconds: 800));

    try {
      // Primeiro, verifica se a página carregou corretamente
      final pageLoaded = await _controller.runJavaScriptReturningResult("""
        document.readyState === 'complete' ? 'loaded' : 'loading'
      """);
      
      debugPrint('Estado da página: $pageLoaded');
      
      if (pageLoaded.toString() != 'loaded') {
        debugPrint('Página ainda não carregou completamente, aguardando...');
        await Future.delayed(const Duration(milliseconds: 1000));
      }

      // Abordagem simplificada e mais direta
      final token = widget.authToken;
      debugPrint('Executando login com token: ${token.substring(0, 20)}...');
      
      // 1. Limpa storage anterior
      await _controller.runJavaScript("""
        localStorage.clear();
        sessionStorage.clear();
        console.log('Storage limpo');
      """);
      
      // 2. Define o token
      await _controller.runJavaScript("""
        const token = '$token';
        localStorage.setItem('token', token);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('token', token);
        document.cookie = 'token=' + token + '; path=/';
        window.token = token;
        window.authToken = token;
        window.isAuthenticated = true;
        console.log('Token definido:', token.substring(0, 20));
      """);
      
      // 3. Aguarda um pouco e verifica
      await Future.delayed(const Duration(milliseconds: 500));
      
      // 4. Tenta disparar eventos de login se existirem
      await _controller.runJavaScript("""
        try {
          if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('authUpdate', {
              detail: { token: '$token', authenticated: true }
            }));
            console.log('Evento authUpdate disparado');
          }
        } catch(e) {
          console.log('Erro ao disparar eventos:', e);
        }
      """);

      debugPrint('JavaScript de login executado com sucesso');

      // Verifica se o token foi salvo corretamente
      await Future.delayed(const Duration(milliseconds: 1000));
      
      final tokenCheck = await _controller.runJavaScriptReturningResult("""
        localStorage.getItem('token') ? 'SUCCESS' : 'FAILED'
      """);
      
      final authCheck = await _controller.runJavaScriptReturningResult("""
        localStorage.getItem('isAuthenticated') ? 'AUTHENTICATED' : 'NOT_AUTHENTICATED'
      """);
      
      debugPrint('Verificação do token: $tokenCheck');
      debugPrint('Verificação da autenticação: $authCheck');
      
      // Se o login não foi bem-sucedido, tenta abordagem alternativa
      if (tokenCheck.toString() == 'FAILED') {
        debugPrint('Token não foi salvo, tentando abordagem alternativa...');
        await _tryAlternativeLogin();
        return;
      }

    } catch (e) {
      debugPrint('Erro ao executar login automático: $e');

      // Tenta uma abordagem mais simples se a primeira falhar
      try {
        debugPrint('Executando fallback simples...');
        await _controller.runJavaScript("""
          try {
            localStorage.setItem('token', '${widget.authToken}');
            localStorage.setItem('auth_token', '${widget.authToken}');
            sessionStorage.setItem('token', '${widget.authToken}');
            document.cookie = 'token=${widget.authToken}; path=/';
            window.token = '${widget.authToken}';
            window.authToken = '${widget.authToken}';
            console.log('Fallback executado com sucesso');
          } catch(err) {
            console.log('Erro no fallback:', err);
          }
        """);
        debugPrint('Fallback de login executado');
      } catch (fallbackError) {
        debugPrint('Erro no fallback de login: $fallbackError');
      }
    }
  }

  Future<void> _reloadPage() async {
    setState(() {
      _isLoading = true;
      _loginAttempted = false;
    });

    await _controller.reload();
  }

  Future<void> _forceLogin() async {
    _loginAttempted = false;
    await _performAutoLogin();
  }

  Future<void> _tryAlternativeLogin() async {
    debugPrint('=== TENTANDO LOGIN ALTERNATIVO ===');
    
    try {
      final token = widget.authToken;
      
      // Método 1: Tenta definir token diretamente no localStorage
      await _controller.runJavaScript("""
        try {
          localStorage.setItem('token', '$token');
          localStorage.setItem('auth_token', '$token');
          localStorage.setItem('isAuthenticated', 'true');
          console.log('Token definido via método alternativo');
        } catch(e) {
          console.log('Erro método alternativo:', e);
        }
      """);
      
      await Future.delayed(const Duration(milliseconds: 500));
      
      await _controller.loadRequest(Uri.parse('https://api.garca.sp.gov.br/'));

      await Future.delayed(const Duration(milliseconds: 2000));
      
      // Método 3: Tenta simular formulário de login se existir
      await _controller.runJavaScript("""
        try {
          // Procura por campos de login
          const tokenField = document.querySelector('input[name="token"], input[name="auth_token"], input[type="hidden"]');
          const loginForm = document.querySelector('form');
          
          if (tokenField) {
            tokenField.value = '$token';
            console.log('Token inserido em campo de formulário');
          }
          
          if (loginForm) {
            console.log('Formulário de login encontrado');
            // Não submete automaticamente, apenas prepara
          }
          
          // Tenta definir em variáveis globais específicas
          if (window.app) {
            window.app.token = '$token';
            window.app.isAuthenticated = true;
          }
          
          if (window.auth) {
            window.auth.token = '$token';
            window.auth.isAuthenticated = true;
          }
          
        } catch(e) {
          console.log('Erro no método de formulário:', e);
        }
      """);
      
      debugPrint('Login alternativo executado');
      
    } catch (e) {
      debugPrint('Erro no login alternativo: $e');
    }
  }

  Future<void> _showTokenDebug() async {
    try {
      final localStorageToken = await _controller.runJavaScriptReturningResult("localStorage.getItem('token')");
      final sessionStorageToken = await _controller.runJavaScriptReturningResult("sessionStorage.getItem('token')");
      final isAuthenticated = await _controller.runJavaScriptReturningResult("localStorage.getItem('isAuthenticated')");
      final cookies = await _controller.runJavaScriptReturningResult("document.cookie");
      final currentUrl = await _controller.runJavaScriptReturningResult("window.location.href");
      final pageTitle = await _controller.runJavaScriptReturningResult("document.title");
      final readyState = await _controller.runJavaScriptReturningResult("document.readyState");
      
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Debug Token - Cemitério'),
            content: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Token Flutter: ${widget.authToken.substring(0, 20)}...'),
                  const SizedBox(height: 8),
                  Text('localStorage.token: ${localStorageToken?.toString() ?? 'null'}'),
                  const SizedBox(height: 8),
                  Text('sessionStorage.token: ${sessionStorageToken?.toString() ?? 'null'}'),
                  const SizedBox(height: 8),
                  Text('isAuthenticated: ${isAuthenticated?.toString() ?? 'null'}'),
                  const SizedBox(height: 8),
                  Text('Cookies: ${cookies?.toString() ?? 'null'}'),
                  const SizedBox(height: 8),
                  Text('URL Atual: ${currentUrl?.toString() ?? 'null'}'),
                  const SizedBox(height: 8),
                  Text('Título da Página: ${pageTitle?.toString() ?? 'null'}'),
                  const SizedBox(height: 8),
                  Text('Estado da Página: ${readyState?.toString() ?? 'null'}'),
                  const SizedBox(height: 8),
                  Text('Login Tentado: $_loginAttempted'),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Fechar'),
              ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(context);
                  await _forceLogin();
                },
                child: const Text('Tentar Login'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint('Erro ao obter debug info: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao obter debug info: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cemitério'),
        backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),

          if (_isLoading)
            Container(
              color: Colors.white.withOpacity(0.9),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(const Color(0xFF384D9C)), // RGB(56, 77, 156)
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Carregando cemitério...',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Fazendo login automático',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _showDebugInfo() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Debug Info'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Token: ${widget.authToken.substring(0, 20)}...'),
            Text('Login Tentado: $_loginAttempted'),
            Text('Carregando: $_isLoading'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  Future<void> _clearWebViewData() async {
    try {
      await _controller.runJavaScript("""
        localStorage.clear();
        sessionStorage.clear();
        
        // Limpa cookies
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        console.log('Dados da WebView limpos');
      """);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dados limpos. Recarregando...')),
      );

      await Future.delayed(const Duration(seconds: 1));
      _reloadPage();
    } catch (e) {
      debugPrint('Erro ao limpar dados: $e');
    }
  }
}