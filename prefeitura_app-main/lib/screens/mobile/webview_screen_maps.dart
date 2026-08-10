import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class WebViewScreenMaps extends StatefulWidget {
  final String url;

  const WebViewScreenMaps({Key? key, required this.url}) : super(key: key);

  @override
  State<WebViewScreenMaps> createState() => _WebViewScreenMapsState();
}

class _WebViewScreenMapsState extends State<WebViewScreenMaps> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();

    // Cria o controller e configura o JavaScript e a URL inicial
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Localização"),
        backgroundColor: const Color(0xFF7B75E8),
      ),
      body: WebViewWidget(controller: _controller),
    );
  }
}
