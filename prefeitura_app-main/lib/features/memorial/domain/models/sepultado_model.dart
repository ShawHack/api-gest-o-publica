class SepultadoModel {
  SepultadoModel({
    required this.id,
    required this.nome,
    this.rua,
    this.quadra,
    this.chapa,
    this.idade,
    this.dtFal,
    this.dtNasc,
    this.mae,
    this.pai,
    this.nacionalidade,
    this.cemiterio,
    this.quadraNome,
    this.plusCodeQuadra,
    this.plusCodePreciso,
    this.latitude,
    this.longitude,
    this.images = const [],
    this.raw = const {},
  });

  final String id;
  final String nome;
  final String? rua;
  final String? quadra;
  final String? chapa;
  final String? idade;
  final String? dtFal;
  final String? dtNasc;
  final String? mae;
  final String? pai;
  final String? nacionalidade;
  final String? cemiterio;
  final String? quadraNome;
  final String? plusCodeQuadra;
  final String? plusCodePreciso;
  final double? latitude;
  final double? longitude;
  final List<String> images;
  final Map<String, dynamic> raw;

  bool get hasCoordinates => latitude != null && longitude != null;

  factory SepultadoModel.fromJson(Map<String, dynamic> json) {
    final id = (json['_id'] ?? json['id'] ?? '').toString();
    final imgs = <String>[];
    final rawImages = json['images'];
    if (rawImages is List) {
      for (final item in rawImages) {
        if (item == null) continue;
        if (item is String) {
          imgs.add(item);
        } else if (item is Map) {
          final name = item['filename'] ?? item['name'] ?? item['path'];
          if (name != null) imgs.add(name.toString());
        }
      }
    }

    double? lat;
    double? lng;
    final location = json['location'];
    if (location is Map) {
      final coords = location['coordinates'];
      if (coords is List && coords.length >= 2) {
        final a = coords[0];
        final b = coords[1];
        if (a is num && b is num) {
          lng = a.toDouble();
          lat = b.toDouble();
        }
      }
    }

    return SepultadoModel(
      id: id,
      nome: (json['nome'] ?? '').toString(),
      rua: json['rua']?.toString(),
      quadra: json['quadra']?.toString(),
      chapa: json['chapa']?.toString(),
      idade: json['idade']?.toString(),
      dtFal: json['dtFal']?.toString(),
      dtNasc: json['dtNasc']?.toString(),
      mae: json['mae']?.toString(),
      pai: json['pai']?.toString(),
      nacionalidade: json['nacionalidade']?.toString(),
      cemiterio: json['cemiterio']?.toString(),
      quadraNome: json['quadraNome']?.toString(),
      plusCodeQuadra: json['plusCodeQuadra']?.toString(),
      plusCodePreciso: json['plusCodePreciso']?.toString(),
      latitude: lat,
      longitude: lng,
      images: imgs,
      raw: Map<String, dynamic>.from(json),
    );
  }
}
