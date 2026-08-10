class MemorialCommentModel {
  MemorialCommentModel({
    required this.id,
    required this.texto,
    this.autor,
    this.userId,
    this.createdAt,
    this.emojis = const [],
    this.imagem,
  });

  final String id;
  final String texto;
  final String? autor;
  final String? userId;
  final DateTime? createdAt;
  final List<String> emojis;
  final String? imagem;

  factory MemorialCommentModel.fromJson(Map<String, dynamic> json) {
    DateTime? created;
    final rawDate = json['createdAt'] ?? json['data'];
    if (rawDate != null) {
      created = DateTime.tryParse(rawDate.toString());
    }

    final emojis = <String>[];
    final rawEmojis = json['emojis'];
    if (rawEmojis is List) {
      for (final e in rawEmojis) {
        emojis.add(e.toString());
      }
    }

    return MemorialCommentModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      texto: (json['texto'] ?? json['mensagem'] ?? '').toString(),
      autor: json['autor']?.toString(),
      userId: json['user']?.toString(),
      createdAt: created,
      emojis: emojis,
      imagem: json['imagem']?.toString(),
    );
  }
}
