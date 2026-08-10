import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/repositories/garca_pet_repository.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/adoption_chat_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/pet_detail_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/adoption_status_chip.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/approved_adoption_adopter_banner.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_error_handler.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/pet_card.dart';

class MyAdoptionsPage extends StatefulWidget {
  const MyAdoptionsPage({super.key});

  @override
  State<MyAdoptionsPage> createState() => MyAdoptionsPageState();
}

class MyAdoptionsPageState extends State<MyAdoptionsPage> {
  final _repository = GarcaPetRepository();
  List<PetModel> _pets = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    reload();
  }

  Future<void> reload() => _load();

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final pets = await _repository.getMyAdoptions();
      if (!mounted) return;
      setState(() {
        _pets = pets;
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
        _error = 'Falha ao carregar suas adoções.';
        _loading = false;
      });
    }
  }

  bool _canChat(PetModel pet) {
    final status = pet.adopterStatus?.toLowerCase() ?? '';
    if (status.contains('finalizado') || status.contains('recusado')) return false;
    if (status.contains('cancelado')) return false;
    return pet.adoptionRequestId != null && pet.adoptionRequestId!.isNotEmpty;
  }

  bool _canCancel(PetModel pet) {
    if (pet.isApprovedForAdoption) return false;
    final status = pet.adopterStatus?.toLowerCase() ?? '';
    return status.contains('pendente') || status.contains('análise');
  }

  void _openChat(PetModel pet) {
    final requestId = pet.adoptionRequestId;
    if (requestId == null || requestId.isEmpty) return;
    openAdoptionChat(
      context,
      requestId: requestId,
      petName: pet.name,
      viewerRoleHint: 'adopter',
    );
  }

  Future<void> _cancelRequest(PetModel pet) async {
    final requestId = pet.adoptionRequestId;
    if (requestId == null || requestId.isEmpty) return;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Desistir da solicitação?'),
        content: Text('Cancelar sua solicitação para adotar "${pet.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Voltar')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: GarcaPetColors.error),
            child: const Text('Desistir'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    try {
      final data = await _repository.cancelMyAdoption(requestId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text((data['message'] ?? 'Solicitação cancelada.').toString()),
          backgroundColor: GarcaPetColors.primary,
        ),
      );
      _load();
    } on GarcaPetException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  String _statusKeyFromLabel(String? label) {
    if (label == null) return 'enviada';
    final lower = label.toLowerCase();
    if (lower.contains('finalizado')) return 'concluida';
    if (lower.contains('aprovado')) return 'aprovada';
    if (lower.contains('recusado')) return 'recusada';
    if (lower.contains('análise')) return 'em_analise';
    if (lower.contains('cancelado')) return 'cancelada_adotante';
    return 'enviada';
  }

  @override
  Widget build(BuildContext context) {
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

    if (_pets.isEmpty) {
      return RefreshIndicator(
        color: GarcaPetColors.primary,
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 80),
            Icon(Icons.favorite_border, size: 56, color: GarcaPetColors.primary),
            SizedBox(height: 12),
            Text(
              'Você ainda não solicitou adoções',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            SizedBox(height: 8),
            Text(
              'Na aba Adoção, escolha um pet e toque em "Quero adotar".',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: GarcaPetColors.primary,
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _pets.length,
        itemBuilder: (context, index) {
          final pet = _pets[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (pet.isApprovedForAdoption)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                    child: ApprovedAdoptionAdopterBanner(
                      pet: pet,
                      compact: true,
                      onContact: _canChat(pet) ? () => _openChat(pet) : null,
                    ),
                  ),
                PetCard(
                  pet: pet,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PetDetailPage(petId: pet.id),
                      ),
                    ).then((_) => _load());
                  },
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          AdoptionStatusChip(
                            status: pet.isApprovedForAdoption
                                ? 'aprovada'
                                : _statusKeyFromLabel(pet.adopterStatus),
                            label: pet.isApprovedForAdoption
                                ? 'Adoção aprovada'
                                : pet.adopterStatus,
                          ),
                          if (!pet.isApprovedForAdoption &&
                              pet.myQueuePosition != null &&
                              pet.myQueueTotal != null)
                            Text(
                              '${pet.myQueuePosition}º de ${pet.myQueueTotal} na fila',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: GarcaPetColors.primary,
                              ),
                            ),
                        ],
                      ),
                      if (_canChat(pet)) ...[
                        const SizedBox(height: 10),
                        FilledButton.icon(
                          onPressed: () => _openChat(pet),
                          icon: const Icon(Icons.chat_bubble_outline, size: 18),
                          label: Text(
                            pet.isApprovedForAdoption
                                ? 'Entrar em contato com o doador'
                                : 'Conversar',
                          ),
                          style: FilledButton.styleFrom(
                            backgroundColor: GarcaPetColors.primary,
                          ),
                        ),
                      ],
                      if (_canCancel(pet)) ...[
                        const SizedBox(height: 10),
                        OutlinedButton.icon(
                          onPressed: () => _cancelRequest(pet),
                          icon: const Icon(Icons.cancel_outlined, size: 18),
                          label: const Text('Desistir da solicitação'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: GarcaPetColors.error,
                            side: const BorderSide(color: GarcaPetColors.error),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
