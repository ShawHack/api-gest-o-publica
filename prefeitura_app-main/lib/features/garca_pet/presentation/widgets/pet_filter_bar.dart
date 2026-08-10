import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';

class PetFilterBar extends StatelessWidget {
  const PetFilterBar({
    super.key,
    required this.selectedType,
    required this.selectedSize,
    required this.selectedGender,
    required this.onTypeChanged,
    required this.onSizeChanged,
    required this.onGenderChanged,
    required this.onClear,
  });

  final String? selectedType;
  final String? selectedSize;
  final String? selectedGender;
  final ValueChanged<String?> onTypeChanged;
  final ValueChanged<String?> onSizeChanged;
  final ValueChanged<String?> onGenderChanged;
  final VoidCallback onClear;

  static const types = ['Cachorro', 'Gato', 'Outros'];
  static const sizes = ['Pequeno', 'Médio', 'Grande'];
  static const genders = ['Macho', 'Fêmea'];

  @override
  Widget build(BuildContext context) {
    final hasFilter =
        selectedType != null || selectedSize != null || selectedGender != null;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: Row(
        children: [
          _FilterChip(
            label: 'Tipo',
            value: selectedType,
            options: types,
            onChanged: onTypeChanged,
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: 'Porte',
            value: selectedSize,
            options: sizes,
            onChanged: onSizeChanged,
          ),
          const SizedBox(width: 8),
          _FilterChip(
            label: 'Sexo',
            value: selectedGender,
            options: genders,
            onChanged: onGenderChanged,
          ),
          if (hasFilter) ...[
            const SizedBox(width: 8),
            ActionChip(
              label: const Text('Limpar'),
              onPressed: onClear,
              backgroundColor: GarcaPetColors.surface,
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  final String label;
  final String? value;
  final List<String> options;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final display = value ?? label;
    return FilterChip(
      label: Text(display),
      selected: value != null,
      selectedColor: GarcaPetColors.accent.withValues(alpha: 0.35),
      checkmarkColor: GarcaPetColors.primary,
      onSelected: (_) async {
        final picked = await showModalBottomSheet<String?>(
          context: context,
          showDragHandle: true,
          builder: (ctx) {
            return SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ListTile(
                    title: Text('Todos — $label'),
                    onTap: () => Navigator.pop(ctx, null),
                  ),
                  for (final opt in options)
                    ListTile(
                      title: Text(opt),
                      trailing: value == opt ? const Icon(Icons.check) : null,
                      onTap: () => Navigator.pop(ctx, opt),
                    ),
                ],
              ),
            );
          },
        );
        onChanged(picked);
      },
    );
  }
}
