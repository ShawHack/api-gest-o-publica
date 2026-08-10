import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/form_model.dart';
import '../../services/inscription_service.dart';
import 'form_fill_screen.dart';

/// Tela que mostra os detalhes de um formulário e permite inscrição
class FormDetailScreen extends StatefulWidget {
  final FormModel form;
  final String userId;

  const FormDetailScreen({
    super.key,
    required this.form,
    required this.userId,
  });

  @override
  State<FormDetailScreen> createState() => _FormDetailScreenState();
}

class _FormDetailScreenState extends State<FormDetailScreen> {
  final InscriptionService _inscriptionService = InscriptionService();
  bool _isInscribed = false;
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    _checkInscription();
  }

  Future<void> _checkInscription() async {
    try {
      final isInscribed = await _inscriptionService.isUserInscribed(
        widget.form.id!,
        widget.userId,
      );
      if (mounted) {
        setState(() {
          _isInscribed = isInscribed;
          _checking = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _checking = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Detalhes do Formulário',
          style: TextStyle(color: Color.fromRGBO(238, 112, 112, 1.0)),
        ),
        backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
        foregroundColor: Colors.white,
      ),
      body: _checking
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Título
                  Text(
                    widget.form.titulo,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Descrição
                  if (widget.form.descricao != null && widget.form.descricao!.isNotEmpty) ...[
                    Text(
                      widget.form.descricao!,
                      style: TextStyle(fontSize: 16, color: Colors.grey[700]),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Data do evento
                  _buildInfoRow(
                    Icons.calendar_today,
                    'Data do Evento',
                    DateFormat('dd/MM/yyyy').format(widget.form.dataEvento),
                  ),
                  const SizedBox(height: 12),

                  // Campos do formulário
                  _buildInfoRow(
                    Icons.article,
                    'Campos do Formulário',
                    '${widget.form.campos.length} campo(s)',
                  ),
                  const SizedBox(height: 24),

                  // Lista de campos
                  if (widget.form.campos.isNotEmpty) ...[
                    const Text(
                      'Campos que serão preenchidos:',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...widget.form.campos.map((field) => _buildFieldPreview(field)),
                    const SizedBox(height: 24),
                  ],

                  // Status de inscrição
                  if (_isInscribed)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.green[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.green[200]!),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green[700]),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Você já está inscrito neste formulário.',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.green[900],
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => FormFillScreen(
                                form: widget.form,
                                userId: widget.userId,
                              ),
                            ),
                          ).then((_) => _checkInscription());
                        },
                        icon: const Icon(Icons.edit),
                        label: const Text(
                          'Fazer Inscrição',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey[600]),
        const SizedBox(width: 12),
        Text(
          '$label: ',
          style: TextStyle(fontSize: 14, color: Colors.grey[600]),
        ),
        Text(
          value,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _buildFieldPreview(CustomFormField field) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Icon(_getFieldIcon(field.type), size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  field.label,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                if (field.required)
                  Text(
                    'Obrigatório',
                    style: TextStyle(fontSize: 12, color: Colors.red[600]),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _getFieldIcon(FieldType type) {
    switch (type) {
      case FieldType.text:
      case FieldType.textarea:
        return Icons.text_fields;
      case FieldType.number:
        return Icons.numbers;
      case FieldType.date:
        return Icons.calendar_today;
      case FieldType.email:
        return Icons.email;
      case FieldType.phone:
        return Icons.phone;
      case FieldType.select:
        return Icons.arrow_drop_down;
      case FieldType.checkbox:
        return Icons.check_box;
      case FieldType.file:
        return Icons.upload_file;
    }
  }
}

