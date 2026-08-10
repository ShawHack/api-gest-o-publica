import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:url_launcher/url_launcher.dart';

class ApprovedAdoptionAdopterBanner extends StatelessWidget {
  const ApprovedAdoptionAdopterBanner({
    super.key,
    required this.pet,
    this.onContact,
    this.compact = false,
  });

  final PetModel pet;
  final VoidCallback? onContact;
  final bool compact;

  Future<void> _openWhatsApp(BuildContext context) async {
    final phone = _digitsOnly(pet.donorPhone);
    if (phone.isEmpty) return;
    final uri = Uri.parse(
      'https://wa.me/55$phone?text=${Uri.encodeComponent('Olá! Minha adoção de ${pet.name} foi aprovada. Podemos combinar a entrega?')}',
    );
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível abrir o WhatsApp.')),
      );
    }
  }

  Future<void> _callDonor(BuildContext context) async {
    final phone = _digitsOnly(pet.donorPhone);
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (!await launchUrl(uri)) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível iniciar a ligação.')),
      );
    }
  }

  String _digitsOnly(String? value) {
    if (value == null) return '';
    return value.replaceAll(RegExp(r'\D'), '');
  }

  @override
  Widget build(BuildContext context) {
    final donorLabel = pet.donorName ?? 'o doador';

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(compact ? 10 : 14),
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
              Icon(Icons.celebration_outlined, size: 18, color: Color(0xFF065F46)),
              SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Adoção aprovada',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF065F46),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Parabéns! Seu pedido foi aceito.',
            style: TextStyle(
              fontSize: compact ? 14 : 16,
              fontWeight: FontWeight.w700,
              color: Colors.grey.shade900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '$donorLabel aprovou sua solicitação para adotar ${pet.name}. '
            'Agora vocês podem combinar a entrega do pet.',
            style: TextStyle(
              fontSize: compact ? 12 : 13,
              height: 1.4,
              color: Colors.grey.shade800,
            ),
          ),
          if (pet.donorName != null && pet.donorName!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              'Responsável: ${pet.donorName}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ],
          if (pet.donorPhone != null && pet.donorPhone!.isNotEmpty)
            Text('Telefone: ${pet.donorPhone}', style: const TextStyle(fontSize: 12)),
          if (pet.donorEmail != null && pet.donorEmail!.isNotEmpty)
            Text('E-mail: ${pet.donorEmail}', style: const TextStyle(fontSize: 12)),
          const SizedBox(height: 12),
          if (onContact != null)
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onContact,
                icon: const Icon(Icons.chat_bubble_outline, size: 18),
                label: const Text('Entrar em contato com o doador'),
                style: FilledButton.styleFrom(
                  backgroundColor: GarcaPetColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          if (_digitsOnly(pet.donorPhone).isNotEmpty) ...[
            if (onContact != null) const SizedBox(height: 8),
            Row(
              children: [
                if (_digitsOnly(pet.donorPhone).length >= 10)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _openWhatsApp(context),
                      icon: const Icon(Icons.chat, size: 16),
                      label: const Text('WhatsApp'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF065F46),
                        side: const BorderSide(color: Color(0xFF6EE7B7)),
                      ),
                    ),
                  ),
                if (_digitsOnly(pet.donorPhone).length >= 10) const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _callDonor(context),
                    icon: const Icon(Icons.phone_outlined, size: 16),
                    label: const Text('Ligar'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: GarcaPetColors.primary,
                      side: const BorderSide(color: GarcaPetColors.primary),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
