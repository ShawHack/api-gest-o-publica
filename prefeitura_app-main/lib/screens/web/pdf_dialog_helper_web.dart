// Helper para diálogo de download de PDF na web
import 'dart:html' as html;
import 'dart:typed_data';
import 'dart:async';
import 'package:flutter/material.dart';

/// Cria um diálogo para download de PDF na web
void showPdfDownloadDialog(
  BuildContext context,
  List<int> bytes,
  String fileName,
  int count,
) {
  try {
    // Cria um blob URL para o PDF
    final blob = html.Blob([Uint8List.fromList(bytes)], 'application/pdf');
    final url = html.Url.createObjectUrlFromBlob(blob);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('PDF Gerado com Sucesso'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('$count inscrição(ões) exportada(s).'),
            const SizedBox(height: 16),
            const Text('Clique no botão abaixo para fazer o download:'),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                try {
                  final anchor = html.AnchorElement()
                    ..href = url
                    ..download = fileName
                    ..style.display = 'none';
                  html.document.body!.children.add(anchor);
                  anchor.click();
                  Timer(const Duration(milliseconds: 100), () {
                    anchor.remove();
                    html.Url.revokeObjectUrl(url);
                  });
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Download iniciado!'),
                      backgroundColor: Colors.green,
                    ),
                  );
                } catch (e) {
                  debugPrint('Erro ao fazer download: $e');
                }
              },
              icon: const Icon(Icons.download),
              label: Text('Baixar $fileName'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 48),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              html.Url.revokeObjectUrl(url);
              Navigator.pop(context);
            },
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  } catch (e) {
    debugPrint('Erro ao criar diálogo de download: $e');
  }
}







