import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_api.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_exception.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/features/memorial/presentation/pages/memorial_detail_page.dart';
import 'package:prefeitura_app/features/memorial/presentation/theme/memorial_colors.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/memorial_public_scaffold.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/sepultado_card.dart';

/// Lista de sepultados do concessionário (operacional, sem funções de admin).
class MemorialMyMemorialPage extends StatefulWidget {
  const MemorialMyMemorialPage({super.key});

  @override
  State<MemorialMyMemorialPage> createState() => _MemorialMyMemorialPageState();
}

class _MemorialMyMemorialPageState extends State<MemorialMyMemorialPage> {
  final _api = MemorialApi();
  final _searchCtrl = TextEditingController();
  final List<SepultadoModel> _items = [];
  bool _loading = true;
  String? _error;
  int _page = 1;
  int _pages = 1;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load({int page = 1, String? query}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _api.fetchMySepultados(
        page: page,
        limit: 20,
        query: query,
      );
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
        _error = 'Falha de conexão.';
        _loading = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return MemorialPublicScaffold(
      backgroundColor: MemorialColors.background,
      appBar: AppBar(
        backgroundColor: MemorialColors.primary,
        foregroundColor: Colors.white,
        title: const Text('Meu Memorial'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Filtrar por nome, rua, quadra...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      isDense: true,
                    ),
                    onSubmitted: (v) => _load(query: v),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => _load(query: _searchCtrl.text),
                  icon: const Icon(Icons.search),
                  color: MemorialColors.primary,
                ),
              ],
            ),
          ),
          Expanded(child: _buildList()),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: MemorialColors.primary));
    }
    if (_error != null) {
      return Center(child: Text(_error!));
    }
    if (_items.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Nenhum sepultado vinculado à sua conta.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return ListView.builder(
      itemCount: _items.length + (_pages > 1 ? 1 : 0),
      itemBuilder: (context, index) {
        if (index < _items.length) {
          final sep = _items[index];
          return SepultadoCard(
            sepultado: sep,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => MemorialDetailPage(sepultadoId: sep.id)),
              );
            },
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
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('$_page / $_pages'),
              ),
              OutlinedButton(
                onPressed: _page < _pages ? () => _load(page: _page + 1) : null,
                child: const Text('Próxima'),
              ),
            ],
          ),
        );
      },
    );
  }
}
