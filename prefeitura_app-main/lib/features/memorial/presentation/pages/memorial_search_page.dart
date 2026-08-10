import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_api.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_exception.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/features/memorial/presentation/pages/memorial_detail_page.dart';
import 'package:prefeitura_app/features/memorial/presentation/theme/memorial_colors.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/memorial_public_scaffold.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/sepultado_card.dart';

class MemorialSearchPage extends StatefulWidget {
  const MemorialSearchPage({super.key, required this.query});

  final String query;

  @override
  State<MemorialSearchPage> createState() => _MemorialSearchPageState();
}

class _MemorialSearchPageState extends State<MemorialSearchPage> {
  final _api = MemorialApi();
  List<SepultadoModel> _results = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _search();
  }

  Future<void> _search() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await _api.search(widget.query);
      if (!mounted) return;
      setState(() {
        _results = items;
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

  @override
  Widget build(BuildContext context) {
    return MemorialPublicScaffold(
      backgroundColor: MemorialColors.background,
      appBar: AppBar(
        backgroundColor: MemorialColors.primary,
        foregroundColor: Colors.white,
        title: Text('Resultados: "${widget.query}"'),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: MemorialColors.primary));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _search,
                style: FilledButton.styleFrom(backgroundColor: MemorialColors.primary),
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      );
    }
    if (_results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Nenhum sepultado encontrado para "${widget.query}".',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, color: MemorialColors.muted),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _results.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              '${_results.length} resultado(s) encontrado(s)',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: MemorialColors.cardText,
              ),
            ),
          );
        }
        final sep = _results[index - 1];
        return SepultadoCard(
          sepultado: sep,
          highlight: widget.query,
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => MemorialDetailPage(sepultadoId: sep.id)),
            );
          },
        );
      },
    );
  }
}
