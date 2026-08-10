import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/utils/memorial_phone_utils.dart';
import 'package:url_launcher/url_launcher.dart';

/// Botão flutuante esquerdo — WhatsApp do cemitério (mesmo número do Memorial Web).
class MemorialWhatsAppFab extends StatelessWidget {
  const MemorialWhatsAppFab({super.key});

  Future<void> _openWhatsApp(BuildContext context) async {
    final uri = Uri.parse('https://wa.me/$memorialCemeteryWhatsAppDigits');
    if (!await canLaunchUrl(uri)) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível abrir o WhatsApp.')),
      );
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 16,
      bottom: 16,
      child: SafeArea(
        child: Material(
          elevation: 6,
          shadowColor: const Color(0xFF25D366).withValues(alpha: 0.45),
          shape: const CircleBorder(),
          color: const Color(0xFF25D366),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: () => _openWhatsApp(context),
            child: Semantics(
              button: true,
              label: 'Conversar no WhatsApp',
              child: Tooltip(
                message: 'Fale conosco pelo WhatsApp',
                child: Container(
                  width: 56,
                  height: 56,
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.chat_rounded,
                    color: Colors.white,
                    size: 30,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
