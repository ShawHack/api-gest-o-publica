import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/memorial_whatsapp_fab.dart';

/// Envolve telas públicas do memorial com o FAB de WhatsApp (canto inferior esquerdo).
class MemorialPublicScaffold extends StatelessWidget {
  const MemorialPublicScaffold({
    super.key,
    this.appBar,
    required this.body,
    this.backgroundColor,
    this.floatingActionButton,
    this.floatingActionButtonLocation,
    this.extraOverlays = const [],
  });

  final PreferredSizeWidget? appBar;
  final Widget body;
  final Color? backgroundColor;
  final Widget? floatingActionButton;
  final FloatingActionButtonLocation? floatingActionButtonLocation;
  final List<Widget> extraOverlays;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: appBar,
      body: Stack(
        fit: StackFit.expand,
        children: [
          body,
          ...extraOverlays,
          const MemorialWhatsAppFab(),
        ],
      ),
      floatingActionButton: floatingActionButton,
      floatingActionButtonLocation: floatingActionButtonLocation,
    );
  }
}
