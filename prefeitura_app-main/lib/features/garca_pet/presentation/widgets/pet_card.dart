import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/pet_network_image.dart';

class PetCard extends StatelessWidget {
  const PetCard({
    super.key,
    required this.pet,
    this.onTap,
  });

  final PetModel pet;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: PetNetworkImage(url: pet.primaryImageUrl),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    pet.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${pet.type} · ${pet.size}',
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                  ),
                  if (pet.applicantsCount > 0) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: GarcaPetColors.accent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${pet.applicantsCount} na fila',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: GarcaPetColors.primary,
                        ),
                      ),
                    ),
                  ],
                  if (pet.isOwnPet) ...[
                    const SizedBox(height: 6),
                    const Text(
                      'Seu anúncio',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: GarcaPetColors.primary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
