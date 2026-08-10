import 'package:cloud_firestore/cloud_firestore.dart';

/// Model para representar um serviço
class Service {
  final String id;
  final String name;
  final List<String> attendants; // Lista de CPFs dos atendentes
  final DateTime createdAt;
  final DateTime updatedAt;

  Service({
    required this.id,
    required this.name,
    required this.attendants,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Cria um Service a partir de um documento do Firestore
  factory Service.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Service(
      id: doc.id,
      name: data['name'] ?? '',
      attendants: List<String>.from(data['attendants'] ?? []),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  /// Converte o Service para um Map para salvar no Firestore
  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'attendants': attendants,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  /// Cria uma cópia do Service com campos atualizados
  Service copyWith({
    String? id,
    String? name,
    List<String>? attendants,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Service(
      id: id ?? this.id,
      name: name ?? this.name,
      attendants: attendants ?? this.attendants,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'Service(id: $id, name: $name, attendants: $attendants)';
  }
}

