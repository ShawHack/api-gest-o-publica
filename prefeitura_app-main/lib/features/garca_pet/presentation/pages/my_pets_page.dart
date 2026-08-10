import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/repositories/garca_pet_repository.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/pet_adoption_queue_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/pet_detail_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/pet_form_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/approved_adoption_banner.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_error_handler.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/pet_card.dart';

class MyPetsPage extends StatefulWidget {
  const MyPetsPage({super.key});

  @override
  State<MyPetsPage> createState() => MyPetsPageState();
}

class MyPetsPageState extends State<MyPetsPage> {
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
      final pets = await _repository.getMyPets();
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
        _error = 'Falha ao carregar seus pets.';
        _loading = false;
      });
    }
  }

  Future<void> _confirmDelete(PetModel pet) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Excluir pet?'),
        content: Text('Remover o anúncio de "${pet.name}"? Esta ação não pode ser desfeita.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: GarcaPetColors.error),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    try {
      await _repository.deletePet(pet.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pet removido.'), backgroundColor: GarcaPetColors.primary),
      );
      _load();
    } on GarcaPetException catch (e) {
      if (!mounted) return;
      if (!await GarcaPetErrorHandler.handle(context, e)) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  void _openEdit(PetModel pet) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PetFormPage(
          petId: pet.id,
          onSaved: _load,
        ),
      ),
    );
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
            Icon(Icons.inventory_2_outlined, size: 56, color: GarcaPetColors.primary),
            SizedBox(height: 12),
            Text(
              'Você ainda não cadastrou pets',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            SizedBox(height: 8),
            Text(
              'Use a aba Cadastrar Pet para publicar um anúncio.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: GarcaPetColors.primary,
      onRefresh: _load,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          if (_pets.any((p) => p.isApprovedForAdoption))
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: GarcaPetColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: GarcaPetColors.accent.withValues(alpha: 0.5)),
                  ),
                  child: Text(
                    '${_pets.where((p) => p.isApprovedForAdoption).length} pet(s) com adoção aprovada aguardando conclusão.',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: GarcaPetColors.primary,
                    ),
                  ),
                ),
              ),
            ),
          SliverPadding(
            padding: const EdgeInsets.all(12),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.58,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final pet = _pets[index];
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (pet.isApprovedForAdoption)
                        ApprovedAdoptionBanner(
                          pet: pet,
                          onManage: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => PetAdoptionQueuePage(
                                  petId: pet.id,
                                  petName: pet.name,
                                ),
                              ),
                            ).then((_) => _load());
                          },
                        ),
                      Expanded(
                        child: PetCard(
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
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (pet.applicantsCount > 0 || pet.isApprovedForAdoption)
                            IconButton(
                              tooltip: pet.isApprovedForAdoption
                                  ? 'Adoção aprovada — gerenciar'
                                  : 'Fila de pretendentes',
                              icon: Icon(
                                pet.isApprovedForAdoption
                                    ? Icons.verified_outlined
                                    : Icons.people_outline,
                                size: 20,
                              ),
                              color: pet.isApprovedForAdoption
                                  ? const Color(0xFF065F46)
                                  : GarcaPetColors.accent,
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => PetAdoptionQueuePage(
                                      petId: pet.id,
                                      petName: pet.name,
                                    ),
                                  ),
                                ).then((_) => _load());
                              },
                            ),
                          IconButton(
                            tooltip: 'Editar',
                            icon: const Icon(Icons.edit_outlined, size: 20),
                            color: GarcaPetColors.primary,
                            onPressed: () => _openEdit(pet),
                          ),
                          IconButton(
                            tooltip: 'Excluir',
                            icon: const Icon(Icons.delete_outline, size: 20),
                            color: GarcaPetColors.error,
                            onPressed: () => _confirmDelete(pet),
                          ),
                        ],
                      ),
                    ],
                  );
                },
                childCount: _pets.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
