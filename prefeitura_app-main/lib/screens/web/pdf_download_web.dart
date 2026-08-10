// Arquivo para download de PDF apenas na web
// Este arquivo só deve ser usado na web
import 'dart:html' as html;
import 'dart:typed_data';
import 'dart:async';

void downloadPdfFile(List<int> bytes, String fileName) {
  // Converte List<int> para Uint8List
  final uint8List = Uint8List.fromList(bytes);
  
  // Cria o blob
  final blob = html.Blob([uint8List], 'application/pdf');
  final url = html.Url.createObjectUrlFromBlob(blob);
  
  // Cria e configura o elemento anchor
  final anchor = html.AnchorElement()
    ..href = url
    ..download = fileName
    ..style.display = 'none';
  
  // Adiciona ao body
  html.document.body!.children.add(anchor);
  
  // Dispara o download
  anchor.click();
  
  // Remove o elemento e revoga a URL
  Timer(const Duration(milliseconds: 100), () {
    anchor.remove();
    html.Url.revokeObjectUrl(url);
  });
}

