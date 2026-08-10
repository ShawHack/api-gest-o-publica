// Widget helper para seleção de arquivos na web
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:html' as html;

/// Widget que permite selecionar arquivos na web usando um input HTML oculto
class WebFilePicker extends StatelessWidget {
  final Function(List<html.File>) onFilesSelected;
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
    return GestureDetector(
      onTap: () => _pickFiles(),
      child: child,
    );
  }

  void _pickFiles() {
    if (!kIsWeb) {
      debugPrint('WebFilePicker só funciona na web');
      return;
    }
    
    final input = html.FileUploadInputElement()
      ..accept = accept ?? '*'
      ..multiple = allowMultiple;

    input.onChange.listen((e) {
      final files = input.files;
      if (files != null && files.isNotEmpty) {
        onFilesSelected(files);
      }
    });

    input.click();
  }
}







