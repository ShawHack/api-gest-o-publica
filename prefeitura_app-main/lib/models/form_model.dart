import 'package:cloud_firestore/cloud_firestore.dart';

/// Status do formulário
enum FormStatus {
  aberto,      // Formulário aberto/novo
  emAndamento, // Em processamento
  concluido,   // Concluído
}

/// Tipo de campo customizável
enum FieldType {
  text,        // Campo de texto
  number,      // Campo numérico
  date,        // Campo de data
  email,       // Campo de email
  phone,       // Campo de telefone
  textarea,    // Área de texto (múltiplas linhas)
  select,      // Campo de seleção (dropdown)
  checkbox,    // Checkbox
  file,        // Upload de arquivo
}

/// Modelo de campo customizável
class CustomFormField {
  final String id;
  final String label;
  final FieldType type;
  final bool required;
  final String? value;
  final List<String>? options; // Para campos do tipo select

  CustomFormField({
    required this.id,
    required this.label,
    required this.type,
    this.required = false,
    this.value,
    this.options,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'label': label,
      'type': type.name,
      'required': required,
      'value': value,
      'options': options,
    };
  }

  factory CustomFormField.fromMap(Map<String, dynamic> map) {
    return CustomFormField(
      id: map['id'] as String,
      label: map['label'] as String,
      type: FieldType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => FieldType.text,
      ),
      required: map['required'] as bool? ?? false,
      value: map['value'] as String?,
      options: map['options'] != null
          ? List<String>.from(map['options'] as List)
          : null,
    );
  }

  CustomFormField copyWith({
    String? id,
    String? label,
    FieldType? type,
    bool? required,
    String? value,
    List<String>? options,
  }) {
    return CustomFormField(
      id: id ?? this.id,
      label: label ?? this.label,
      type: type ?? this.type,
      required: required ?? this.required,
      value: value ?? this.value,
      options: options ?? this.options,
    );
  }
}

/// Modelo de formulário
class FormModel {
  final String? id;
  final String titulo;
  final String? descricao;
  final DateTime dataEvento;
  final String? idSolicitacao1Doc; // ID da solicitação via 1Doc
  final FormStatus status;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? createdBy; // ID do admin que criou
  final String? updatedBy; // ID do admin que atualizou
  final List<CustomFormField> campos; // Campos customizáveis

  FormModel({
    this.id,
    required this.titulo,
    this.descricao,
    required this.dataEvento,
    this.idSolicitacao1Doc,
    this.status = FormStatus.aberto,
    required this.createdAt,
    this.updatedAt,
    this.createdBy,
    this.updatedBy,
    this.campos = const [],
  });

  /// Converte para Map para salvar no Firestore
  Map<String, dynamic> toMap() {
    return {
      'titulo': titulo,
      'descricao': descricao,
      'dataEvento': Timestamp.fromDate(dataEvento),
      'idSolicitacao1Doc': idSolicitacao1Doc,
      'status': status.name,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      'createdBy': createdBy,
      'updatedBy': updatedBy,
      'campos': campos.map((c) => c.toMap()).toList(),
    };
  }

  /// Cria a partir de um documento do Firestore
  factory FormModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return FormModel(
      id: doc.id,
      titulo: data['titulo'] as String,
      descricao: data['descricao'] as String?,
      dataEvento: (data['dataEvento'] as Timestamp).toDate(),
      idSolicitacao1Doc: data['idSolicitacao1Doc'] as String?,
      status: FormStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => FormStatus.aberto,
      ),
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: data['updatedAt'] != null
          ? (data['updatedAt'] as Timestamp).toDate()
          : null,
      createdBy: data['createdBy'] as String?,
      updatedBy: data['updatedBy'] as String?,
      campos: (data['campos'] as List<dynamic>?)
              ?.map((c) => CustomFormField.fromMap(c as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  FormModel copyWith({
    String? id,
    String? titulo,
    String? descricao,
    DateTime? dataEvento,
    String? idSolicitacao1Doc,
    FormStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? createdBy,
    String? updatedBy,
    List<CustomFormField>? campos,
  }) {
    return FormModel(
      id: id ?? this.id,
      titulo: titulo ?? this.titulo,
      descricao: descricao ?? this.descricao,
      dataEvento: dataEvento ?? this.dataEvento,
      idSolicitacao1Doc: idSolicitacao1Doc ?? this.idSolicitacao1Doc,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      createdBy: createdBy ?? this.createdBy,
      updatedBy: updatedBy ?? this.updatedBy,
      campos: campos ?? this.campos,
    );
  }
}

