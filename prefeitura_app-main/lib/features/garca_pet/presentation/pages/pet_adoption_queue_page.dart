import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/adoption_request_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/repositories/garca_pet_repository.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_error_handler.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/adoption_queue_item.dart';

class PetAdoptionQueuePage extends StatefulWidget {
  const PetAdoptionQueuePage({
    super.key,
    required this.petId,
    required this.petName,
  });

  final String petId;
  final String petName;

  @override
  State<PetAdoptionQueuePage> createState() => _PetAdoptionQueuePageState();
}

class _PetAdoptionQueuePageState extends State<PetAdoptionQueuePage> {
  final _repository = GarcaPetRepository();
  List<AdoptionRequestModel> _queue = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final all = await _repository.getAdoptionQueue(widget.petId);
      if (!mounted) return;
      setState(() {
        _queue = all.where((r) => r.isActiveInQueue).toList();
        _loading = false;
      });
    } on GarcaPetException catch (e) {
      if (!mounted) return;
      if (!await GarcaPetErrorHandler.handle(context, e)) {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Falha ao carregar a fila.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: GarcaPetColors.primary,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Fila de pretendentes', style: TextStyle(fontSize: 13)),
            Text(widget.petName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: GarcaPetColors.primary));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _load,
                style: FilledButton.styleFrom(backgroundColor: GarcaPetColors.primary),
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      );
    }
    if (_queue.isEmpty) {
      return RefreshIndicator(
        color: GarcaPetColors.primary,
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: const [
            Icon(Icons.people_outline, size: 56, color: GarcaPetColors.primary),
            SizedBox(height: 12),
            Text(
              'Nenhum pretendente na fila',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            SizedBox(height: 8),
            Text(
              'Quando alguém solicitar adoção, aparecerá aqui por ordem de chegada.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: GarcaPetColors.primary,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            '${_queue.length} pretendente(s) — escolha quem analisar ou aprovar.',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.35),
          ),
          const SizedBox(height: 8),
          const Text(
            'Ao aprovar um pretendente, os demais são encerrados automaticamente.',
            style: TextStyle(fontSize: 12, height: 1.35),
          ),
          const SizedBox(height: 16),
          ..._queue.map(
            (req) => AdoptionQueueItem(
              request: req,
              onChanged: _load,
            ),
          ),
        ],
      ),
    );
  }
}
