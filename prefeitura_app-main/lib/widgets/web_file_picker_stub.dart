// Stub para WebFilePicker em plataformas não-web (mobile, desktop)
import 'package:flutter/material.dart';

/// Widget stub para seleção de arquivos (não disponível em mobile)
/// Este widget nunca será usado no mobile, mas é necessário para compilação
class WebFilePicker extends StatelessWidget {
  final Function(List<dynamic>) onFilesSelected;
  final bool allowMultiple;
  final String? accept;
  final Widget child;

  const WebFilePicker({
    super.key,
    required this.onFilesSelected,
    this.allowMultiple = true,
    this.accept,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    // No mobile, apenas retorna o child sem funcionalidade
    return child;
  }
}

