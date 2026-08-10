import 'package:cloud_firestore/cloud_firestore.dart';

/// Status do agendamento
enum AppointmentStatus {
  pending, // Aguardando atendimento
  attended, // Atendido
  noShow, // Não compareceu
  cancelled, // Cancelado
  changeRequested, // Solicitação de troca pendente
  changeApproved, // Troca aprovada
  changeDenied, // Troca negada
}

/// Tipo de solicitação
enum RequestType {
  cancellation, // Cancelamento
  reschedule, // Reagendamento
}

/// Modelo de agendamento
class Appointment {
  final String? id;
  final String userId;
  final String userName;
  final String userEmail;
  final String userPhone;
  final String userCpf;
  final DateTime date;
  final String timeSlot; // Ex: "08:00-08:20"
  final AppointmentStatus status;
  final DateTime createdAt;
  final DateTime? updatedAt;

  // Campos do serviço
  final String? serviceId;
  final String? serviceName;

  // Campos para solicitação de mudança
  final RequestType? requestType;
  final DateTime? requestedDate;
  final String? requestedTimeSlot;
  final String? requestMessage;
  final String? managerResponse;
  final DateTime? requestedAt;
  final DateTime? respondedAt;
  final String? respondedBy;
  
  // Campo para rastrear se o lembrete foi enviado
  final bool reminderSent;

  Appointment({
    this.id,
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.userPhone,
    required this.userCpf,
    required this.date,
    required this.timeSlot,
    this.status = AppointmentStatus.pending,
    required this.createdAt,
    this.updatedAt,
    this.serviceId,
    this.serviceName,
    this.requestType,
    this.requestedDate,
    this.requestedTimeSlot,
    this.requestMessage,
    this.managerResponse,
    this.requestedAt,
    this.respondedAt,
    this.respondedBy,
    this.reminderSent = false,
  });

  /// Converte para Map para salvar no Firestore
  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      'userEmail': userEmail,
      'userPhone': userPhone,
      'userCpf': userCpf,
      'date': Timestamp.fromDate(date),
      'timeSlot': timeSlot,
      'status': status.name,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      'serviceId': serviceId,
      'serviceName': serviceName,
      'requestType': requestType?.name,
      'requestedDate': requestedDate != null ? Timestamp.fromDate(requestedDate!) : null,
      'requestedTimeSlot': requestedTimeSlot,
      'requestMessage': requestMessage,
      'managerResponse': managerResponse,
      'requestedAt': requestedAt != null ? Timestamp.fromDate(requestedAt!) : null,
      'respondedAt': respondedAt != null ? Timestamp.fromDate(respondedAt!) : null,
      'respondedBy': respondedBy,
      'reminderSent': reminderSent,
    };
  }

  /// Cria Appointment a partir de documento do Firestore
  factory Appointment.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;

    return Appointment(
      id: doc.id,
      userId: data['userId'] ?? '',
      userName: data['userName'] ?? '',
      userEmail: data['userEmail'] ?? '',
      userPhone: data['userPhone'] ?? '',
      userCpf: data['userCpf'] ?? '',
      date: (data['date'] as Timestamp).toDate(),
      timeSlot: data['timeSlot'] ?? '',
      status: AppointmentStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => AppointmentStatus.pending,
      ),
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: data['updatedAt'] != null ? (data['updatedAt'] as Timestamp).toDate() : null,
      serviceId: data['serviceId'],
      serviceName: data['serviceName'],
      requestType: data['requestType'] != null
          ? RequestType.values.firstWhere((e) => e.name == data['requestType'])
          : null,
      requestedDate: data['requestedDate'] != null
          ? (data['requestedDate'] as Timestamp).toDate()
          : null,
      requestedTimeSlot: data['requestedTimeSlot'],
      requestMessage: data['requestMessage'],
      managerResponse: data['managerResponse'],
      requestedAt: data['requestedAt'] != null
          ? (data['requestedAt'] as Timestamp).toDate()
          : null,
      respondedAt: data['respondedAt'] != null
          ? (data['respondedAt'] as Timestamp).toDate()
          : null,
      respondedBy: data['respondedBy'],
      reminderSent: data['reminderSent'] ?? false,
    );
  }

  /// Cria cópia com campos modificados
  Appointment copyWith({
    String? id,
    String? userId,
    String? userName,
    String? userEmail,
    String? userPhone,
    String? userCpf,
    DateTime? date,
    String? timeSlot,
    AppointmentStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? serviceId,
    String? serviceName,
    RequestType? requestType,
    DateTime? requestedDate,
    String? requestedTimeSlot,
    String? requestMessage,
    String? managerResponse,
    DateTime? requestedAt,
    DateTime? respondedAt,
    String? respondedBy,
    bool? reminderSent,
  }) {
    return Appointment(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
      userPhone: userPhone ?? this.userPhone,
      userCpf: userCpf ?? this.userCpf,
      date: date ?? this.date,
      timeSlot: timeSlot ?? this.timeSlot,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      serviceId: serviceId ?? this.serviceId,
      serviceName: serviceName ?? this.serviceName,
      requestType: requestType ?? this.requestType,
      requestedDate: requestedDate ?? this.requestedDate,
      requestedTimeSlot: requestedTimeSlot ?? this.requestedTimeSlot,
      requestMessage: requestMessage ?? this.requestMessage,
      managerResponse: managerResponse ?? this.managerResponse,
      requestedAt: requestedAt ?? this.requestedAt,
      respondedAt: respondedAt ?? this.respondedAt,
      respondedBy: respondedBy ?? this.respondedBy,
      reminderSent: reminderSent ?? this.reminderSent,
    );
  }
}

/// Modelo para representar um slot de horário
class TimeSlot {
  final String time;
  final bool isAvailable;
  final String? appointmentId;

  TimeSlot({
    required this.time,
    required this.isAvailable,
    this.appointmentId,
  });

  /// Retorna apenas a hora de início (ex: "08:00" de "08:00-08:20")
  String get startTime => time.split('-')[0];

  /// Retorna apenas a hora de fim (ex: "08:20" de "08:00-08:20")
  String get endTime => time.split('-')[1];
}

