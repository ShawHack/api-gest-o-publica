// lib/screens/minhas_solicitacoes_webview.dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class MinhasSolicitacoesWebView extends StatefulWidget {
  const MinhasSolicitacoesWebView({super.key});

  @override
  State<MinhasSolicitacoesWebView> createState() => _MinhasSolicitacoesWebViewState();
}

class _MinhasSolicitacoesWebViewState extends State<MinhasSolicitacoesWebView> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) {
            setState(() {
              _isLoading = false;
            });
          },
        ),
      )
      ..loadRequest(Uri.parse('https://garca.1doc.com.br/b.php?pg=o/login&n=3'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Minhas Solicitações"),
        backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(child: CircularProgressIndicator()),
        ],
      ),
    );
  }
}
