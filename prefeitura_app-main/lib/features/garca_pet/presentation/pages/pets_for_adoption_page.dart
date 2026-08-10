import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/pet_detail_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/pet_card.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/pet_filter_bar.dart';

class PetsForAdoptionPage extends StatefulWidget {
  const PetsForAdoptionPage({super.key});

  @override
  State<PetsForAdoptionPage> createState() => _PetsForAdoptionPageState();
}

class _PetsForAdoptionPageState extends State<PetsForAdoptionPage> {
  List<PetModel> _allPets = [];
  bool _loading = true;
  String? _error;

  String? _filterType;
  String? _filterSize;
  String? _filterGender;

  List<PetModel> get _filteredPets {
    return _allPets.where((pet) {
      if (_filterType != null && pet.type != _filterType) return false;
      if (_filterSize != null && pet.size != _filterSize) return false;
      if (_filterGender != null && pet.gender != _filterGender) return false;
      return true;
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    // Catálogo em preparação — inauguração em breve (sem carregar lista).
    _loading = false;
  }

  Future<void> _loadPets() async {
    setState(() {
      _loading = false;
      _error = null;
      _allPets = [];
    });
  }

  void _openDetail(PetModel pet) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PetDetailPage(petId: pet.id),
      ),
    ).then((_) => _loadPets());
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
              Icon(Icons.error_outline, size: 48, color: Colors.grey.shade600),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loadPets,
                style: FilledButton.styleFrom(backgroundColor: GarcaPetColors.primary),
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      );
    }

    final pets = _filteredPets;

    if (pets.isEmpty) {
      return RefreshIndicator(
        color: GarcaPetColors.primary,
        onRefresh: _loadPets,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
          children: [
            Icon(Icons.pets, size: 64, color: GarcaPetColors.primary),
            const SizedBox(height: 20),
            const Text(
              'Inauguração em breve',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: GarcaPetColors.primary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Estamos preparando o catálogo de adoção responsável do Garça Pet. '
              'Em breve você poderá conhecer os pets disponíveis e iniciar o processo de adoção.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, height: 1.45, color: Colors.grey.shade700),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        PetFilterBar(
          selectedType: _filterType,
          selectedSize: _filterSize,
          selectedGender: _filterGender,
          onTypeChanged: (v) => setState(() => _filterType = v),
          onSizeChanged: (v) => setState(() => _filterSize = v),
          onGenderChanged: (v) => setState(() => _filterGender = v),
          onClear: () => setState(() {
            _filterType = null;
            _filterSize = null;
            _filterGender = null;
          }),
        ),
        Expanded(
          child: RefreshIndicator(
            color: GarcaPetColors.primary,
            onRefresh: _loadPets,
            child: pets.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: const [
                      SizedBox(height: 80),
                      Icon(Icons.pets, size: 56, color: GarcaPetColors.primary),
                      SizedBox(height: 12),
                      Text(
                        'Nenhum pet encontrado',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Tente outros filtros ou volte mais tarde.',
                        textAlign: TextAlign.center,
                      ),
                    ],
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.72,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                    ),
                    itemCount: pets.length,
                    itemBuilder: (context, index) {
                      final pet = pets[index];
                      return PetCard(
                        pet: pet,
                        onTap: () => _openDetail(pet),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }
}
