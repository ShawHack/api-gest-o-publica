import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/adoption_request_model.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';

class AdoptionStatusChip extends StatelessWidget {
  const AdoptionStatusChip({
    super.key,
    required this.status,
    this.label,
  });

  final String status;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final text = label ?? AdoptionStatusLabels.label(status);
    final colors = _colorsFor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: colors.foreground,
        ),
      ),
    );
  }

  _ChipColors _colorsFor(String status) {
    switch (status) {
      case 'aprovada':
      case 'concluida':
        return const _ChipColors(Color(0xFFDCFCE7), Color(0xFF14532D));
      case 'em_analise':
        return const _ChipColors(Color(0xFFFFEDD5), Color(0xFF7C2D12));
      case 'recusada':
      case 'cancelada_adotante':
      case 'cancelada_doador':
        return const _ChipColors(Color(0xFFFEE2E2), Color(0xFF991B1B));
      default:
        return _ChipColors(
          GarcaPetColors.accent.withValues(alpha: 0.2),
          GarcaPetColors.primary,
        );
    }
  }
}

class _ChipColors {
  const _ChipColors(this.background, this.foreground);
  final Color background;
  final Color foreground;
}
