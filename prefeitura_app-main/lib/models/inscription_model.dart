import 'package:cloud_firestore/cloud_firestore.dart';

/// Modelo de inscrição em um formulário
class InscriptionModel {
  final String? id;
  final String formId; // ID do formulário
  final String userId; // ID do usuário que se inscreveu
  final String userName; // Nome do usuário
  final String userEmail; // Email do usuário
  final String? userPhone; // Telefone do usuário
  final String? userCpf; // CPF do usuário
  final String voucherCode; // Código único do voucher
  final DateTime createdAt;
  final Map<String, dynamic> formData; // Respostas do formulário customizado

  InscriptionModel({
    this.id,
    required this.formId,
    required this.userId,
    required this.userName,
    required this.userEmail,
    this.userPhone,
    this.userCpf,
    required this.voucherCode,
    required this.createdAt,
    required this.formData,
  });

  /// Converte para Map para salvar no Firestore
  Map<String, dynamic> toMap() {
    return {
      'formId': formId,
      'userId': userId,
      'userName': userName,
      'userEmail': userEmail,
      'userPhone': userPhone,
      'userCpf': userCpf,
      'voucherCode': voucherCode,
      'createdAt': Timestamp.fromDate(createdAt),
      'formData': formData,
    };
  }

  /// Cria a partir de um documento do Firestore
  factory InscriptionModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return InscriptionModel(
      id: doc.id,
      formId: data['formId'] as String,
      userId: data['userId'] as String,
      userName: data['userName'] as String,
      userEmail: data['userEmail'] as String,
      userPhone: data['userPhone'] as String?,
      userCpf: data['userCpf'] as String?,
      voucherCode: data['voucherCode'] as String,
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      formData: Map<String, dynamic>.from(data['formData'] as Map? ?? {}),
    );
  }

  InscriptionModel copyWith({
    String? id,
    String? formId,
    String? userId,
    String? userName,
    String? userEmail,
    String? userPhone,
    String? userCpf,
    String? voucherCode,
    DateTime? createdAt,
    Map<String, dynamic>? formData,
  }) {
    return InscriptionModel(
      id: id ?? this.id,
      formId: formId ?? this.formId,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
      userPhone: userPhone ?? this.userPhone,
      userCpf: userCpf ?? this.userCpf,
      voucherCode: voucherCode ?? this.voucherCode,
      createdAt: createdAt ?? this.createdAt,
      formData: formData ?? this.formData,
    );
  }
}







