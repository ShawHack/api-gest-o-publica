class AdopterInfo {
  const AdopterInfo({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.userType,
    this.instituteName,
  });

  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? userType;
  final String? instituteName;

  factory AdopterInfo.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const AdopterInfo(id: '', name: 'Sem nome');
    }
    return AdopterInfo(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Sem nome').toString(),
      phone: json['phone']?.toString(),
      email: json['email']?.toString(),
      userType: json['userType']?.toString(),
      instituteName: json['instituteName']?.toString(),
    );
  }
}

class AdoptionRequestModel {
  const AdoptionRequestModel({
    required this.id,
    required this.status,
    this.legacyStatus,
    this.initialMessage,
    this.queuePosition,
    this.total,
    this.adopter,
    this.createdAt,
  });

  final String id;
  final String status;
  final String? legacyStatus;
  final String? initialMessage;
  final int? queuePosition;
  final int? total;
  final AdopterInfo? adopter;
  final DateTime? createdAt;

  bool get isActiveInQueue =>
      status == 'enviada' || status == 'em_analise' || status == 'aprovada';

  String get displayStatus => legacyStatus ?? AdoptionStatusLabels.label(status);

  factory AdoptionRequestModel.fromJson(Map<String, dynamic> json) {
    DateTime? createdAt;
    final rawDate = json['createdAt'];
    if (rawDate is String) {
      createdAt = DateTime.tryParse(rawDate);
    }

    final adopterRaw = json['adopter'];
    AdopterInfo? adopter;
    if (adopterRaw is Map) {
      adopter = AdopterInfo.fromJson(Map<String, dynamic>.from(adopterRaw));
    }

    return AdoptionRequestModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      legacyStatus: json['legacyStatus']?.toString(),
      initialMessage: json['initialMessage']?.toString(),
      queuePosition: _asInt(json['queuePosition'] ?? json['position']),
      total: _asInt(json['total'] ?? json['applicantsCount']),
      adopter: adopter,
      createdAt: createdAt,
    );
  }

  static int? _asInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }
}

abstract final class AdoptionStatusLabels {
  static const _map = {
    'enviada': 'Pendente',
    'em_analise': 'Em análise',
    'aprovada': 'Aprovado',
    'recusada': 'Recusado',
    'concluida': 'Finalizado',
    'cancelada_adotante': 'Cancelado pelo adotante',
    'cancelada_doador': 'Cancelado pelo doador',
  };

  static String label(String status) => _map[status] ?? status;
}
