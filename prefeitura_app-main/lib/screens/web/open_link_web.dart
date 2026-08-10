// Arquivo para abrir links apenas na web
// Este arquivo só deve ser usado na web
import 'dart:html' as html;

void openLink(String url) {
  try {
    html.window.open(url, '_blank');
  } catch (e) {
    throw Exception('Erro ao abrir link: $e');
  }
}







