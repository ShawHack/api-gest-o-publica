import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:html/parser.dart' as html_parser;
import 'package:html/dom.dart' as dom;

import '../screens/mobile/article_webview.dart';

/// Página de listagem oficial
const String kNewsListUrl = 'https://www.garca.sp.gov.br/portal/noticias';

class NewsItem {
  final String url;     // link absoluto da matéria
  final String image;   // url absoluta da imagem

  const NewsItem({required this.url, required this.image});
}

class NewsList extends StatefulWidget {
  final int limit;
  final EdgeInsetsGeometry padding;

  /// Mostra somente imagens clicáveis (sem texto)
  const NewsList({
    super.key,
    this.limit = 12,
    this.padding = const EdgeInsets.all(16),
  });

  @override
  State<NewsList> createState() => _NewsListState();
}

class _NewsListState extends State<NewsList> {
  late Future<List<NewsItem>> _future;

  @override
  void initState() {
    super.initState();
    _future = _fetchNewsList(widget.limit);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<NewsItem>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return _skeletonGrid();
        }
        if (snap.hasError) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Erro ao carregar notícias:\n${snap.error}',
              style: const TextStyle(color: Colors.red),
            ),
          );
        }

        final items = snap.data ?? const [];
        if (items.isEmpty) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Nenhuma notícia encontrada.'),
          );
        }

        return Padding(
          padding: widget.padding,
          child: LayoutBuilder(
            builder: (context, constraints) {
              // Responsivo simples: 2 → 3 colunas conforme largura
              int cross = 2;
              if (constraints.maxWidth >= 1000) cross = 4;
              else if (constraints.maxWidth >= 700) cross = 3;

              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: items.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: cross,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.4, // retângulo panorâmico
                ),
                itemBuilder: (_, i) => _ImageTile(item: items[i]),
              );
            },
          ),
        );
      },
    );
  }

  Widget _skeletonGrid() {
    return Padding(
      padding: widget.padding,
      child: LayoutBuilder(
        builder: (context, constraints) {
          int cross = 2;
          if (constraints.maxWidth >= 1000) cross = 4;
          else if (constraints.maxWidth >= 700) cross = 3;

          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: 8,
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: cross,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.4,
            ),
            itemBuilder: (_, __) => Container(
              decoration: BoxDecoration(
                color: const Color(0xFFE9ECF5),
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Faz download do HTML da listagem e extrai pares (link da matéria, imagem)
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

  // Padrão 1: cards com <a> contendo <img> e link para /portal/noticias/SLUG
  final anchors = doc.querySelectorAll('a').where((a) {
    final href = a.attributes['href'] ?? '';
    return href.contains('/portal/noticias/') && !href.endsWith('/portal/noticias');
  });

  for (final a in anchors) {
    final hrefAbs = _absUrl(kNewsListUrl, a.attributes['href'] ?? '');
    if (hrefAbs == null) continue;

    // imagem no próprio <a> ou em ancestrais prováveis
    String? img;
    final imgInA = a.querySelector('img');
    if (imgInA != null) {
      img = _absUrl(kNewsListUrl, imgInA.attributes['src'] ?? '');
    }
    img ??= _findImageInAncestor(a);

    if (img != null && img.isNotEmpty) {
      out.add(NewsItem(url: hrefAbs, image: img));
      if (out.length >= limit) break;
    }
  }

  // Padrão 2 (fallback): <article> com <img> e <h2><a>
  if (out.isEmpty) {
    final articles = doc.querySelectorAll('article');
    for (final art in articles) {
      final a = art.querySelector('h2 a') ?? art.querySelector('a');
      final imgEl = art.querySelector('img');
      if (a == null || imgEl == null) continue;
      final hrefAbs = _absUrl(kNewsListUrl, a.attributes['href'] ?? '');
      final imgAbs  = _absUrl(kNewsListUrl, imgEl.attributes['src'] ?? '');
      if (hrefAbs != null && imgAbs != null) {
        out.add(NewsItem(url: hrefAbs, image: imgAbs));
        if (out.length >= limit) break;
      }
    }
  }

  // Dedup por URL de matéria
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

String? _findImageInAncestor(dom.Element el) {
  final card = _findCardAncestor(el);
  final img = card?.querySelector('img');
  if (img == null) return null;
  return _absUrl(kNewsListUrl, img.attributes['src'] ?? '');
}

class _ImageTile extends StatelessWidget {
  final NewsItem item;
  const _ImageTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ArticleWebView(url: item.url, title: 'Notícia')),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Imagem da notícia (único conteúdo visual)
            Image.network(item.image, fit: BoxFit.cover),

            // Overlay suave para dar contraste quando houver imagem muito clara
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withOpacity(0.08),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
