class AgendaUnitSummary {
  const AgendaUnitSummary({
    required this.id,
    required this.name,
    this.timezone = 'America/Sao_Paulo',
    this.address,
  });

  final String id;
  final String name;
  final String timezone;
  final String? address;

  factory AgendaUnitSummary.fromJson(Map<String, dynamic> json) {
    return AgendaUnitSummary(
      id: _id(json),
      name: json['name']?.toString() ?? '',
      timezone: json['timezone']?.toString() ?? 'America/Sao_Paulo',
      address: json['address']?.toString(),
    );
  }
}

class AgendaServiceSummary {
  const AgendaServiceSummary({
    required this.id,
    required this.name,
    required this.durationMinutes,
    required this.unit,
    this.description,
  });

  final String id;
  final String name;
  final String? description;
  final int durationMinutes;
  final AgendaUnitSummary unit;

  factory AgendaServiceSummary.fromJson(Map<String, dynamic> json) {
    return AgendaServiceSummary(
      id: _id(json),
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      durationMinutes: _int(json['durationMinutes']),
      unit: AgendaUnitSummary.fromJson(_map(json['unitId'])),
    );
  }
}

class AgendaSlot {
  const AgendaSlot({
    required this.time,
    required this.startsAt,
    required this.available,
    required this.remainingCapacity,
    required this.blocked,
  });

  final String time;
  final DateTime startsAt;
  final bool available;
  final int remainingCapacity;
  final bool blocked;

  factory AgendaSlot.fromJson(Map<String, dynamic> json) => AgendaSlot(
    time: json['time']?.toString() ?? '',
    startsAt: DateTime.parse(json['startsAt'].toString()),
    available: json['available'] == true,
    remainingCapacity: _int(json['remainingCapacity']),
    blocked: json['blocked'] == true,
  );
}

class AgendaAvailability {
  const AgendaAvailability({required this.date, required this.slots});

  final String date;
  final List<AgendaSlot> slots;

  factory AgendaAvailability.fromJson(Map<String, dynamic> json) {
    return AgendaAvailability(
      date: json['date']?.toString() ?? '',
      slots: _list(
        json['slots'],
      ).map((item) => AgendaSlot.fromJson(_map(item))).toList(),
    );
  }
}

class AgendaAppointment {
  const AgendaAppointment({
    required this.id,
    required this.protocol,
    required this.status,
    required this.startsAt,
    this.endsAt,
    this.serviceName,
    this.unitName,
    this.serviceId,
    this.unitId,
  });

  final String id;
  final String protocol;
  final String status;
  final DateTime startsAt;
  final DateTime? endsAt;
  final String? serviceName;
  final String? unitName;
  final String? serviceId;
  final String? unitId;

  factory AgendaAppointment.fromJson(Map<String, dynamic> json) {
    final service = _map(json['serviceId']);
    final unit = _map(json['unitId']);
    return AgendaAppointment(
      id: _id(json),
      protocol: json['protocol']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      startsAt: DateTime.parse(json['startsAt'].toString()),
      endsAt: DateTime.tryParse(json['endsAt']?.toString() ?? ''),
      serviceName: service['name']?.toString(),
      unitName: unit['name']?.toString(),
      serviceId: _id(service),
      unitId: _id(unit),
    );
  }
}

Map<String, dynamic> _map(dynamic value) =>
    value is Map<String, dynamic> ? value : <String, dynamic>{};

List<dynamic> _list(dynamic value) => value is List ? value : const [];

String _id(Map<String, dynamic> json) =>
    (json['_id'] ?? json['id'] ?? '').toString();

int _int(dynamic value) => value is int ? value : int.tryParse('$value') ?? 0;
