class AdoptionChatMessage {
  const AdoptionChatMessage({
    required this.role,
    required this.message,
    this.createdAt,
  });

  final String role;
  final String message;
  final DateTime? createdAt;

  bool get isSystem => role == 'system';

  factory AdoptionChatMessage.fromJson(Map<String, dynamic> json) {
    DateTime? createdAt;
    final raw = json['createdAt'];
    if (raw is String) createdAt = DateTime.tryParse(raw);

    return AdoptionChatMessage(
      role: (json['role'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      createdAt: createdAt,
    );
  }
}

class AdoptionChatPresence {
  const AdoptionChatPresence({
    this.online = false,
    this.lastSeenAt,
  });

  final bool online;
  final DateTime? lastSeenAt;

  factory AdoptionChatPresence.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AdoptionChatPresence();
    DateTime? lastSeenAt;
    final raw = json['lastSeenAt'];
    if (raw is String) lastSeenAt = DateTime.tryParse(raw);
    return AdoptionChatPresence(
      online: json['online'] == true,
      lastSeenAt: lastSeenAt,
    );
  }
}

class AdoptionChatSnapshot {
  const AdoptionChatSnapshot({
    required this.requestId,
    required this.petName,
    required this.status,
    required this.viewerRole,
    required this.otherPartyName,
    required this.messages,
    required this.otherPresence,
  });

  final String requestId;
  final String petName;
  final String status;
  final String viewerRole;
  final String otherPartyName;
  final List<AdoptionChatMessage> messages;
  final AdoptionChatPresence otherPresence;

  List<AdoptionChatMessage> get visibleMessages =>
      messages.where((m) => !m.isSystem && m.message.trim().isNotEmpty).toList();

  factory AdoptionChatSnapshot.fromJson(Map<String, dynamic> json) {
    final rawMessages = json['messages'];
    final messages = <AdoptionChatMessage>[];
    if (rawMessages is List) {
      for (final item in rawMessages) {
        if (item is Map) {
          messages.add(AdoptionChatMessage.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }

    final presenceRaw = json['presence'];
    AdoptionChatPresence otherPresence = const AdoptionChatPresence();
    if (presenceRaw is Map) {
      final presence = Map<String, dynamic>.from(presenceRaw);
      final other = presence['other'];
      if (other is Map) {
        otherPresence = AdoptionChatPresence.fromJson(Map<String, dynamic>.from(other));
      }
    }

    return AdoptionChatSnapshot(
      requestId: (json['adoptionRequestId'] ?? '').toString(),
      petName: (json['petName'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      viewerRole: (json['viewerRole'] ?? '').toString(),
      otherPartyName: (json['otherPartyName'] ?? 'Contato').toString(),
      messages: messages,
      otherPresence: otherPresence,
    );
  }
}
