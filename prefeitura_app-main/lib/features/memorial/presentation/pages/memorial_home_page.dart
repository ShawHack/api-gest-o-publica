import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_api.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_exception.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/features/memorial/presentation/pages/memorial_detail_page.dart';
import 'package:prefeitura_app/features/memorial/presentation/theme/memorial_colors.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/sepultado_card.dart';

class MemorialHomePage extends StatefulWidget {
  const MemorialHomePage({super.key});

  @override
  State<MemorialHomePage> createState() => _MemorialHomePageState();
}

class _MemorialHomePageState extends State<MemorialHomePage> {
  final _api = MemorialApi();
  final List<SepultadoModel> _items = [];
  bool _loading = true;
  String? _error;
  int _page = 1;
  int _pages = 1;

  @override
  void initState() {
    super.initState();
    _load(page: 1);
  }

  Future<void> _load({required int page}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _api.fetchRecent(page: page, limit: 20);
      if (!mounted) return;
      setState(() {
        _items
          ..clear()
          ..addAll(result.items);
        _page = result.page;
        _pages = result.pages;
        _loading = false;
      });
    } on MemorialException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Falha de conexão. Verifique sua internet e tente novamente.';
        _loading = false;
      });
    }
  }

  void _openDetail(SepultadoModel sep) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => MemorialDetailPage(sepultadoId: sep.id)),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: MemorialColors.primary));
    }

    if (_error != null) {
      return _MessageState(
        icon: Icons.cloud_off_outlined,
        message: _error!,
        onRetry: () => _load(page: _page),
      );
    }

    if (_items.isEmpty) {
      return const _MessageState(
        icon: Icons.inbox_outlined,
        message: 'Não há sepultados cadastrados no momento.',
      );
    }

    return RefreshIndicator(
      color: MemorialColors.primary,
      onRefresh: () => _load(page: _page),
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 4, bottom: 24),
        itemCount: _items.length + (_pages > 1 ? 1 : 0),
        itemBuilder: (context, index) {
          if (index < _items.length) {
            return SepultadoCard(
              sepultado: _items[index],
              onTap: () => _openDetail(_items[index]),
            );
          }
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(
                  onPressed: _page > 1 ? () => _load(page: _page - 1) : null,
                  child: const Text('Anterior'),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text('Página $_page de $_pages'),
                ),
                OutlinedButton(
                  onPressed: _page < _pages ? () => _load(page: _page + 1) : null,
                  child: const Text('Próxima'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MessageState extends StatelessWidget {
  const _MessageState({
    required this.icon,
    required this.message,
    this.onRetry,
  });

  final IconData icon;
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: MemorialColors.muted),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: MemorialColors.muted, fontSize: 16),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton(
                onPressed: onRetry,
                style: FilledButton.styleFrom(backgroundColor: MemorialColors.primary),
                child: const Text('Tentar novamente'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
