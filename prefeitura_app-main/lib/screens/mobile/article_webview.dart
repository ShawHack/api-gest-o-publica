import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class ArticleWebView extends StatefulWidget {
  final String url;
  final String title;

  const ArticleWebView({
    super.key,
    required this.url,
    required this.title,
  });

  @override
  State<ArticleWebView> createState() => _ArticleWebViewState();
}

class _ArticleWebViewState extends State<ArticleWebView> {
  late final WebViewController _controller;
  double _progress = 0.0;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (p) => setState(() => _progress = p / 100),
          // abre todos os links dentro do próprio WebView
          onNavigationRequest: (request) => NavigationDecision.navigate,
          onPageFinished: (url) async {
            // força links com target=_blank a abrirem no mesmo WebView
            const jsFixTargetBlank = '''
              (function() {
                try {
                  const anchors = document.querySelectorAll('a[target="_blank"], a[target="_new"], a[target="_NEW"]');
                  anchors.forEach(a => { a.setAttribute('target', '_self'); });
                } catch (e) {}
              })();
            ''';
            await _controller.runJavaScript(jsFixTargetBlank);
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            tooltip: 'Voltar',
            onPressed: () async {
              if (await _controller.canGoBack()) {
                await _controller.goBack();
              }
            },
            icon: const Icon(Icons.arrow_back),
          ),
          IconButton(
            tooltip: 'Avançar',
            onPressed: () async {
              if (await _controller.canGoForward()) {
                await _controller.goForward();
              }
            },
            icon: const Icon(Icons.arrow_forward),
          ),
          IconButton(
            tooltip: 'Recarregar',
            onPressed: () => _controller.reload(),
            icon: const Icon(Icons.refresh),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(3),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            height: 3,
            child: (_progress > 0 && _progress < 1)
                ? LinearProgressIndicator(value: _progress)
                : const SizedBox.shrink(),
          ),
        ),
      ),
      body: SafeArea(
        child: WebViewWidget(controller: _controller),
      ),
    );
  }
}
