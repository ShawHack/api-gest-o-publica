import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart' as android_webview;
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:convert';
import 'dart:io';

class WebViewScreen extends StatefulWidget {
  final String url;
  final String? title;
  /// Token JWT do Prefeitura App — injeta sessão no Garça Cidadão antes de abrir a URL.
  final String? prefeituraAuthToken;

  const WebViewScreen({
    Key? key,
    required this.url,
    this.title,
    this.prefeituraAuthToken,
  }) : super(key: key);

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _initializeWebView();
  }

  void _initializeWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..enableZoom(true) // Habilita zoom para melhor usabilidade
      // Define um User-Agent de navegador "real" para enganar a verificação de segurança do Google (Erro 403)
      ..setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36')
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
              _hasError = false;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            setState(() {
              _isLoading = false;
              _hasError = true;
              _errorMessage = 'Erro ao carregar a página: ${error.description}';
            });
          },
          onNavigationRequest: (NavigationRequest request) {
            final isLoginRoute = request.url.contains('/garca-cidadao/login');
            if (widget.prefeituraAuthToken != null && isLoginRoute) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Sessão indisponível. Feche e abra o Boca no Trombone novamente pelo menu do aplicativo.',
                    ),
                  ),
                );
              }
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      );

    // Configuração específica para Android - suporte a upload
    if (Platform.isAndroid) {
      _setupAndroidFileUpload();
    }

    _loadUrl();
  }

  void _setupAndroidFileUpload() {
    if (_controller.platform is android_webview.AndroidWebViewController) {
      final androidController = _controller.platform as android_webview.AndroidWebViewController;

      androidController.setOnShowFileSelector((params) async {
        return await _showFilePicker(params);
      });
    }
  }

  Future<List<String>> _showFilePicker(
      android_webview.FileSelectorParams params,
      ) async {
    try {
      // Se a página solicitar captura direta (ex: accept="image/*" capture)
      final accepts = params.acceptTypes;
      final allowsMultiple = params.mode == android_webview.FileSelectorMode.openMultiple;
      final wantsImages = accepts.any((t) => t.contains('image'));
      final wantsVideo = accepts.any((t) => t.contains('video'));
      final wantsAudio = accepts.any((t) => t.contains('audio'));

      if (params.isCaptureEnabled == true && wantsImages) {
        final XFile? photo = await _picker.pickImage(source: ImageSource.camera);
        if (photo != null) {
          final String p = photo.path;
          final String uri = p.startsWith('content://')
              ? p
              : Uri.file(p).toString();
          return [uri];
        }
        return [];
      }

      // Mapear tipos aceitos para o FilePicker
      FileType fileType = FileType.any;
      List<String>? allowedExtensions;

      if (accepts.isNotEmpty) {
        // Se aceitar extensões específicas (ex: .pdf, .docx)
        final extensionTokens = accepts
            .where((t) => t.startsWith('.'))
            .map((t) => t.substring(1))
            .toList();

        if (extensionTokens.isNotEmpty) {
          fileType = FileType.custom;
          allowedExtensions = extensionTokens;
        } else if (wantsImages) {
          fileType = FileType.image;
        } else if (wantsVideo) {
          fileType = FileType.video;
        } else if (wantsAudio) {
          fileType = FileType.audio;
        } else {
          fileType = FileType.any;
        }
      }

      final result = await FilePicker.platform.pickFiles(
        allowMultiple: allowsMultiple,
        type: fileType,
        allowedExtensions: allowedExtensions,
        withData: false,
      );

      if (result != null && result.files.isNotEmpty) {
        final uris = result.files
            .map((f) => f.path)
            .whereType<String>()
            .map((p) => p.startsWith('content://') ? p : Uri.file(p).toString())
            .toList(growable: false);
        return uris;
      }
    } catch (e) {
      debugPrint('Erro ao selecionar arquivo: $e');
      _showErrorSnackBar('Erro ao selecionar arquivo');
    }

    return [];
  }

  void _loadUrl() {
    try {
      final token = widget.prefeituraAuthToken;
      if (token != null && token.isNotEmpty) {
        _bootstrapPrefeituraSession(token);
        return;
      }
      _controller.loadRequest(Uri.parse(widget.url));
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = 'URL inválida: ${widget.url}';
      });
    }
  }

  Future<void> _bootstrapPrefeituraSession(String token) async {
    final tokenJs = jsonEncode(token);
    final targetJs = jsonEncode(widget.url);
    try {
      await _controller.loadHtmlString(
        '''
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>Carregando...</title></head>
          <body>
            <script>
              (function () {
                try {
                  var t = $tokenJs;
                  localStorage.setItem('govToken', t);
                  localStorage.setItem('token', t);
                  localStorage.setItem('auth_token', t);
                  localStorage.removeItem('govForceLogin');
                  sessionStorage.setItem('govEmbedded', '1');
                } catch (e) {}
                window.location.replace($targetJs);
              })();
            </script>
          </body>
        </html>
        ''',
        baseUrl: 'https://api.garca.sp.gov.br',
      );
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = 'Não foi possível iniciar a sessão do Garça Cidadão.';
      });
    }
  }

  void _retry() {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });
    _loadUrl();
  }

  void _showErrorSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title ?? 'Acesso ao Serviço'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _retry,
            tooltip: 'Recarregar página',
          ),
        ],
      ),
      body: Stack(
        children: [
          if (!_hasError) WebViewWidget(controller: _controller),

          // Loading indicator
          if (_isLoading)
            Container(
              color: Colors.white,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(),
                    const SizedBox(height: 16),
                    Text(
                      widget.prefeituraAuthToken != null
                          ? 'Abrindo Boca no Trombone...'
                          : 'Carregando serviço...',
                      style: const TextStyle(
                        fontSize: 16,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Error state
          if (_hasError && !_isLoading)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Colors.red.shade300,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Ops! Algo deu errado',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.grey.shade800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _errorMessage,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: _retry,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Tentar novamente'),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Voltar'),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}