import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/form_model.dart';
import '../../services/inscription_service.dart';

// Import condicional para FormFillWebScreen (apenas na web)
import 'form_fill_web_screen.dart'
    if (dart.library.io) 'form_fill_web_screen_stub.dart';

/// Tela que mostra os detalhes de um formulário e permite inscrição (versão web)
class FormDetailWebScreen extends StatefulWidget {
  final FormModel form;
  final String userId;

  const FormDetailWebScreen({
    super.key,
    required this.form,
    required this.userId,
  });

  @override
  State<FormDetailWebScreen> createState() => _FormDetailWebScreenState();
}

class _FormDetailWebScreenState extends State<FormDetailWebScreen> {
  final InscriptionService _inscriptionService = InscriptionService();
  bool _isInscribed = false;
  bool _checking = true;

  // Cores do design
  static const Color _azul = Color.fromRGBO(56, 77, 156, 1.0);
  static const Color _laranja = Color.fromRGBO(238, 112, 112, 1.0);

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
        title: Text(
          'Detalhes do Formulário',
          style: GoogleFonts.robotoSlab(
            color: const Color.fromRGBO(238, 112, 112, 1.0),
          ),
        ),
        backgroundColor: _azul,
        foregroundColor: Colors.white,
      ),
      body: _checking
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 800),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Título
                      Text(
                        widget.form.titulo,
                        style: GoogleFonts.robotoSlab(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: _azul,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Descrição
                      if (widget.form.descricao != null && widget.form.descricao!.isNotEmpty) ...[
                        Text(
                          widget.form.descricao!,
                          style: GoogleFonts.robotoSlab(
                            fontSize: 16,
                            color: Colors.grey[700],
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Informações do evento
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              _buildInfoRow(
                                Icons.calendar_today,
                                'Data do Evento',
                                DateFormat('dd/MM/yyyy').format(widget.form.dataEvento),
                              ),
                              const SizedBox(height: 12),
                              _buildInfoRow(
                                Icons.article,
                                'Campos do Formulário',
                                '${widget.form.campos.length} campo(s)',
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Lista de campos
                      if (widget.form.campos.isNotEmpty) ...[
                        Text(
                          'Campos que serão preenchidos:',
                          style: GoogleFonts.robotoSlab(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: _azul,
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
                                  style: GoogleFonts.robotoSlab(
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
                                  builder: (_) => FormFillWebScreen(
                                    form: widget.form,
                                    userId: widget.userId,
                                  ),
                                ),
                              ).then((_) => _checkInscription());
                            },
                            icon: const Icon(Icons.edit),
                            label: Text(
                              'Fazer Inscrição',
                              style: GoogleFonts.robotoSlab(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _laranja,
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
          style: GoogleFonts.robotoSlab( fontSize: 14, color: Colors.grey[600]),
        ),
        Text(
          value,
          style: GoogleFonts.robotoSlab(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
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
                  style: GoogleFonts.robotoSlab( fontWeight: FontWeight.w500),
                ),
                if (field.required)
                  Text(
                    'Obrigatório',
                    style: GoogleFonts.robotoSlab(
                      fontSize: 12,
                      color: Colors.red[600],
                    ),
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

