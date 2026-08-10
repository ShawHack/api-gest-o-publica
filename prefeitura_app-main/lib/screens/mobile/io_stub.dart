// Stub para dart:io quando rodando na web
// Este arquivo é usado quando dart:html está disponível (web)

/// Stub para File do dart:io na web
/// Na web, não podemos criar File desta forma, então retornamos um objeto dinâmico
class File {
  final String path;
  
  File(this.path);
  
  // Métodos stub que nunca serão chamados na web
  Future<bool> exists() async => false;
  Future<int> length() async => 0;
  Stream<List<int>> openRead() => const Stream.empty();
}






