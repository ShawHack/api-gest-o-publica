import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';

class ApprovedAdoptionBanner extends StatelessWidget {
  const ApprovedAdoptionBanner({
    super.key,
    required this.pet,
    this.onManage,
  });

  final PetModel pet;
  final VoidCallback? onManage;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF6EE7B7), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.verified_outlined, size: 18, color: Color(0xFF065F46)),
              SizedBox(width: 6),
              Text(
                'Adoção aprovada',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF065F46),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            pet.adopterName ?? 'Pretendente aprovado',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          if (pet.adopterPhone != null && pet.adopterPhone!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('Telefone: ${pet.adopterPhone}', style: const TextStyle(fontSize: 12)),
          ],
          if (pet.adopterEmail != null && pet.adopterEmail!.isNotEmpty)
            Text('E-mail: ${pet.adopterEmail}', style: const TextStyle(fontSize: 12)),
          const SizedBox(height: 6),
          Text(
            'Anúncio fora do catálogo público. Conclua quando a entrega for feita.',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade700, height: 1.35),
          ),
          if (onManage != null) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: onManage,
                style: FilledButton.styleFrom(
                  backgroundColor: GarcaPetColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                child: const Text('Gerenciar / concluir adoção'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
