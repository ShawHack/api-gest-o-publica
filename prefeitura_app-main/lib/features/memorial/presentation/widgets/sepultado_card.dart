import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/features/memorial/presentation/theme/memorial_colors.dart';
import 'package:prefeitura_app/features/memorial/presentation/utils/memorial_image_url.dart';

class SepultadoCard extends StatelessWidget {
  const SepultadoCard({
    super.key,
    required this.sepultado,
    required this.onTap,
    this.highlight,
  });

  final SepultadoModel sepultado;
  final VoidCallback onTap;
  final String? highlight;

  @override
  Widget build(BuildContext context) {
    final imageUrl = memorialSepultadoImageUrl(sepultado.images);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: MemorialColors.primary.withValues(alpha: 0.15),
                  alignment: Alignment.center,
                  child: const Icon(Icons.image_not_supported_outlined, size: 48),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    sepultado.nome,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: MemorialColors.cardText,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Informações da sepultura',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: MemorialColors.primary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _infoRow('Rua', sepultado.rua),
                  _infoRow('Quadra', sepultado.quadra),
                  _infoRow('Placa', sepultado.chapa),
                  const SizedBox(height: 12),
                  const Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      'Mais detalhes',
                      style: TextStyle(
                        color: MemorialColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(color: MemorialColors.cardText, fontSize: 14),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            TextSpan(text: value?.isNotEmpty == true ? value! : 'Inform. desconhecida'),
          ],
        ),
      ),
    );
  }
}
