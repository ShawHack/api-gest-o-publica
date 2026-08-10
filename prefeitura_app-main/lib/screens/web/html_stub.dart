// Stub para dart:html quando rodando em plataformas não-web (mobile, desktop)
// Este arquivo é usado apenas quando dart:html não está disponível

class Blob {
  final List<dynamic> data;
  final String mimeType;
  
  Blob(this.data, this.mimeType);
}

class Url {
  static String createObjectUrlFromBlob(Blob blob) {
    throw UnsupportedError('createObjectUrlFromBlob não está disponível nesta plataforma');
  }
  
  static void revokeObjectUrl(String url) {
    // No-op em plataformas não-web
  }
}

class AnchorElement {
  String? href;
  
  AnchorElement({this.href});
  
  void setAttribute(String name, String value) {
    // No-op em plataformas não-web
  }
  
  void click() {
    // No-op em plataformas não-web
  }
}







