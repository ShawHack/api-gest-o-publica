import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';

/// Exibe motivo de bloqueio com base nas flags da API (sem reimplementar regras).
class AdoptionBlockBanner extends StatelessWidget {
  const AdoptionBlockBanner({super.key, required this.pet});

  final PetModel pet;

  String? _message() {
    if (pet.isOwnPet) {
      return 'Este é o seu anúncio. Gerencie pretendentes em Meus Pets.';
    }
    if (pet.blockReason == 'adoption_approved' || pet.isApprovedForAdoption) {
      return null;
    }
    switch (pet.blockReason) {
      case 'login_required':
        return 'Faça login para solicitar adoção.';
      case 'not_available':
        return 'Este pet não está disponível para adoção.';
      case 'already_in_queue':
        return 'Você já está na fila para este pet.';
      case 'own_pet':
        return 'Você não pode adotar o seu próprio pet.';
      default:
        return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final message = _message();
    if (message == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: GarcaPetColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: GarcaPetColors.accent.withValues(alpha: 0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, color: GarcaPetColors.primary, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 13, height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}
