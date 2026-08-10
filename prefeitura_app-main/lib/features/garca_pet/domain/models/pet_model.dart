class PetModel {
  PetModel({
    required this.id,
    required this.name,
    required this.age,
    required this.type,
    required this.size,
    required this.weight,
    required this.color,
    required this.gender,
    required this.breed,
    required this.images,
    required this.available,
    this.applicantsCount = 0,
    this.canRequestAdoption,
    this.blockReason,
    this.isOwnPet = false,
    this.hasActiveRequestForMe = false,
    this.acceptingApplications = true,
    this.adoptionRequestId,
    this.myQueuePosition,
    this.myQueueTotal,
    this.adopterStatus,
    this.hasApprovedAdoption = false,
    this.adopterName,
    this.adopterPhone,
    this.adopterEmail,
    this.donorName,
    this.donorPhone,
    this.donorEmail,
    this.adoptionRequestStatus,
    this.adoptionStage,
  });

  final String id;
  final String name;
  final String age;
  final String type;
  final String size;
  final double weight;
  final String color;
  final String gender;
  final String breed;
  final List<String> images;
  final bool available;
  final int applicantsCount;
  final bool? canRequestAdoption;
  final String? blockReason;
  final bool isOwnPet;
  final bool hasActiveRequestForMe;
  final bool acceptingApplications;
  final String? adoptionRequestId;
  final int? myQueuePosition;
  final int? myQueueTotal;
  final String? adopterStatus;
  final bool hasApprovedAdoption;
  final String? adopterName;
  final String? adopterPhone;
  final String? adopterEmail;
  final String? donorName;
  final String? donorPhone;
  final String? donorEmail;
  final String? adoptionRequestStatus;
  final String? adoptionStage;

  bool get isApprovedForAdoption =>
      hasApprovedAdoption ||
      adopterStatus == 'Aprovado' ||
      adoptionRequestStatus == 'aprovada';

  bool get isHandoverPending => adoptionStage == 'handover_pending' || isApprovedForAdoption;

  static const imageBaseOrigin = 'https://api.garca.sp.gov.br';

  static String? resolveImageUrl(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return '$imageBaseOrigin$trimmed';
    return '$imageBaseOrigin/images_semit_a_pet/$trimmed';
  }

  List<String> get imageUrls =>
      images.map(resolveImageUrl).whereType<String>().toList();

  String? get primaryImageUrl {
    if (images.isEmpty) return null;
    return resolveImageUrl(images.first);
  }

  factory PetModel.fromJson(Map<String, dynamic> json) {
    final rawImages = json['images'];
    final imageList = <String>[];
    if (rawImages is List) {
      for (final item in rawImages) {
        if (item is String && item.trim().isNotEmpty) {
          imageList.add(item.trim());
        }
      }
    }

    final weightRaw = json['weight'];
    double weight = 0;
    if (weightRaw is num) {
      weight = weightRaw.toDouble();
    } else if (weightRaw is String) {
      weight = double.tryParse(weightRaw.replaceAll(',', '.')) ?? 0;
    }

    final adopterRaw = json['adopter'];
    String? adopterName;
    String? adopterPhone;
    String? adopterEmail;
    if (adopterRaw is Map) {
      adopterName = adopterRaw['name']?.toString();
      adopterPhone = adopterRaw['phone']?.toString();
      adopterEmail = adopterRaw['email']?.toString();
    }

    final donorRaw = json['user'];
    String? donorName;
    String? donorPhone;
    String? donorEmail;
    if (donorRaw is Map) {
      donorName = donorRaw['name']?.toString();
      donorPhone = donorRaw['phone']?.toString();
      donorEmail = donorRaw['email']?.toString();
    }
    donorName ??= json['donorName']?.toString();
    donorPhone ??= json['donorPhone']?.toString();
    donorEmail ??= json['donorEmail']?.toString();

    return PetModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      age: (json['age'] ?? '').toString(),
      type: (json['type'] ?? '').toString(),
      size: (json['size'] ?? '').toString(),
      weight: weight,
      color: (json['color'] ?? '').toString(),
      gender: (json['gender'] ?? '').toString(),
      breed: (json['breed'] ?? '').toString(),
      images: imageList,
      available: json['available'] != false,
      applicantsCount: _asInt(json['applicantsCount']),
      canRequestAdoption: json['canRequestAdoption'] as bool?,
      blockReason: json['blockReason']?.toString(),
      isOwnPet: json['isOwnPet'] == true,
      hasActiveRequestForMe: json['hasActiveRequestForMe'] == true,
      acceptingApplications: json['acceptingApplications'] != false,
      adoptionRequestId: json['adoptionRequestId']?.toString(),
      myQueuePosition: _asNullableInt(json['myQueuePosition']),
      myQueueTotal: _asNullableInt(json['myQueueTotal']),
      adopterStatus: json['adopterStatus']?.toString(),
      hasApprovedAdoption: json['hasApprovedAdoption'] == true,
      adopterName: adopterName,
      adopterPhone: adopterPhone,
      adopterEmail: adopterEmail,
      donorName: donorName,
      donorPhone: donorPhone,
      donorEmail: donorEmail,
      adoptionRequestStatus: json['adoptionRequestStatus']?.toString(),
      adoptionStage: json['adoptionStage']?.toString(),
    );
  }

  static int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  static int? _asNullableInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }
}
