import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:html/parser.dart' as html_parser;
import 'package:html/dom.dart' as dom;
import 'package:google_fonts/google_fonts.dart';
import '../screens/mobile/article_webview.dart';

/// Página de listagem oficial
const String kNewsListUrl = 'https://www.garca.sp.gov.br/portal/noticias';

class NewsItem {
  final String url;
  final String image;
  final String? title;

  const NewsItem({
    required this.url,
    required this.image,
    this.title,
  });
}

class NewsCarousel extends StatefulWidget {
  final int limit;
  final double height;

  const NewsCarousel({
    super.key,
    this.limit = 5,
    this.height = 400,
  });

  @override
  State<NewsCarousel> createState() => _NewsCarouselState();
}

class _NewsCarouselState extends State<NewsCarousel> {
  late Future<List<NewsItem>> _future;
  final PageController _pageController = PageController();
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _future = _fetchNewsList(widget.limit);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<NewsItem>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return _buildSkeleton();
        }
        if (snap.hasError) {
          return _buildError(snap.error.toString());
        }

        final items = snap.data ?? [];
        if (items.isEmpty) {
          return const SizedBox.shrink();
        }

        return LayoutBuilder(
          builder: (context, constraints) {
            final isMobile = constraints.maxWidth < 600;
            final carouselHeight = isMobile ? widget.height * 0.7 : widget.height;

            return Container(
              height: carouselHeight,
              margin: EdgeInsets.symmetric(
                horizontal: isMobile ? 16 : 24,
                vertical: 20,
              ),
              child: Column(
                children: [
                  Expanded(
                    child: PageView.builder(
                      controller: _pageController,
                      onPageChanged: (index) {
                        setState(() {
                          _currentPage = index;
                        });
                      },
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        return _buildNewsCard(items[index], isMobile);
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildPageIndicator(items.length),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildNewsCard(NewsItem item, bool isMobile) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ArticleWebView(url: item.url, title: 'Notícia'),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
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
              // Imagem de fundo
              Image.network(
                item.image,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: Colors.grey[300],
                    child: const Icon(Icons.image, size: 60, color: Colors.grey),
                  );
                },
              ),
              // Overlay gradiente
              Positioned.fill(
                child: DecoratedBox(
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
              // Conteúdo
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Padding(
                  padding: EdgeInsets.all(isMobile ? 20 : 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: const Color.fromRGBO(56, 77, 156, 1.0),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              'NOTÍCIAS',
                              style: GoogleFonts.robotoSlab(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (item.title != null)
                        Text(
                          item.title!,
                          style: GoogleFonts.robotoSlab(
                            fontSize: isMobile ? 18 : 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Text(
                            'Ler mais',
                            style: GoogleFonts.robotoSlab(
                              fontSize: isMobile ? 14 : 16,
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(
                            Icons.arrow_forward_rounded,
                            color: Colors.white,
                            size: 18,
                          ),
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
    );
  }

  Widget _buildPageIndicator(int count) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(
        count,
        (index) => Container(
          width: _currentPage == index ? 24 : 8,
          height: 8,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            color: _currentPage == index
                ? const Color.fromRGBO(56, 77, 156, 1.0)
                : Colors.grey[300],
          ),
        ),
      ),
    );
  }

  Widget _buildSkeleton() {
    return Container(
      height: widget.height,
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }

  Widget _buildError(String error) {
    return Container(
      height: widget.height,
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.red[300]!),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 16),
            Text(
              'Erro ao carregar notícias',
              style: GoogleFonts.robotoSlab(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.red[700],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
          ],
        ),
      ),
    );
  }

  /// Busca notícias do site
  Future<List<NewsItem>> _fetchNewsList(int limit) async {
    final headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'PrefeituraApp/1.0 (Flutter)',
    };

    late http.Response res;
    try {
      res = await http
          .get(Uri.parse(kNewsListUrl), headers: headers)
          .timeout(const Duration(seconds: 30));
    } on TimeoutException {
      throw Exception('O servidor de notícias está demorando para responder. Tente novamente mais tarde.');
    } catch (e) {
      throw Exception('Não foi possível conectar ao servidor de notícias. Verifique sua conexão com a internet.');
    }

    if (res.statusCode != 200) {
      throw Exception('Erro ao acessar notícias (código ${res.statusCode})');
    }

    final doc = html_parser.parse(utf8.decode(res.bodyBytes));
    final out = <NewsItem>[];

    // Busca notícias
    final anchors = doc.querySelectorAll('a').where((a) {
      final href = a.attributes['href'] ?? '';
      return href.contains('/portal/noticias/') && !href.endsWith('/portal/noticias');
    });

    for (final a in anchors) {
      final hrefAbs = _absUrl(kNewsListUrl, a.attributes['href'] ?? '');
      if (hrefAbs == null) continue;

      String? img;
      final imgInA = a.querySelector('img');
      if (imgInA != null) {
        img = _absUrl(kNewsListUrl, imgInA.attributes['src'] ?? '');
      }
      img ??= _findImageInAncestor(a, kNewsListUrl);

      // Tenta extrair título
      String? title;
      final titleEl = a.querySelector('h2') ?? 
                      a.querySelector('h3') ?? 
                      a.querySelector('.title') ??
                      (a.text.trim().isNotEmpty ? a : null);
      if (titleEl != null) {
        title = titleEl.text.trim();
        if (title.length > 100) title = '${title.substring(0, 100)}...';
      }

      if (img != null && img.isNotEmpty) {
        out.add(NewsItem(url: hrefAbs, image: img, title: title));
        if (out.length >= limit) break;
      }
    }

    // Fallback
    if (out.isEmpty) {
      final articles = doc.querySelectorAll('article');
      for (final art in articles) {
        final a = art.querySelector('h2 a') ?? art.querySelector('a');
        final imgEl = art.querySelector('img');
        if (a == null || imgEl == null) continue;
        final hrefAbs = _absUrl(kNewsListUrl, a.attributes['href'] ?? '');
        final imgAbs = _absUrl(kNewsListUrl, imgEl.attributes['src'] ?? '');
        if (hrefAbs != null && imgAbs != null) {
          final title = a.text.trim();
          out.add(NewsItem(url: hrefAbs, image: imgAbs, title: title));
          if (out.length >= limit) break;
        }
      }
    }

    // Remove duplicatas
    final seen = <String>{};
    final dedup = <NewsItem>[];
    for (final n in out) {
      if (seen.add(n.url)) dedup.add(n);
    }
    return dedup;
  }

  String? _absUrl(String base, String rel) {
    if (rel.isEmpty) return null;
    final uri = Uri.parse(rel);
    if (uri.hasScheme) return uri.toString();
    return Uri.parse(base).resolve(rel).toString();
  }

  dom.Element? _findCardAncestor(dom.Element el) {
    dom.Element? cur = el.parent;
    while (cur != null) {
      final tag = cur.localName ?? '';
      final classes = cur.classes;
      final isCard = tag == 'article' ||
          tag == 'li' ||
          classes.contains('card') ||
          classes.contains('noticia') ||
          classes.contains('grid-item') ||
          classes.contains('col');
      if (isCard) return cur;
      cur = cur.parent;
    }
    return null;
  }

  String? _findImageInAncestor(dom.Element el, String baseUrl) {
    final card = _findCardAncestor(el);
    final img = card?.querySelector('img');
    if (img == null) return null;
    return _absUrl(baseUrl, img.attributes['src'] ?? '');
  }
}

