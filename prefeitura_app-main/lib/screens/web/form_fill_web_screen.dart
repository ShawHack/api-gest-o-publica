// Tela para preencher o formulário de inscrição na web
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/form_model.dart';
import '../../models/inscription_model.dart';
import '../../services/inscription_service.dart';
// Import condicional para FileUploadService (versão web)
import '../../services/file_upload_service_web.dart';
import '../../widgets/web_file_picker.dart';

// Import condicional para html (apenas na web)
import 'dart:html' as html
    if (dart.library.html) 'dart:html';

/// Tela para preencher o formulário de inscrição (versão web)
class FormFillWebScreen extends StatefulWidget {
  final FormModel form;
  final String userId;

  const FormFillWebScreen({
    super.key,
    required this.form,
    required this.userId,
  });

  @override
  State<FormFillWebScreen> createState() => _FormFillWebScreenState();
}

class _FormFillWebScreenState extends State<FormFillWebScreen> {
  final _formKey = GlobalKey<FormState>();
  final InscriptionService _inscriptionService = InscriptionService();
  final FileUploadService _fileUploadService = FileUploadService();
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, bool> _checkboxValues = {};
  final Map<String, String?> _selectValues = {};
  final Map<String, List<html.File>> _fileValues = {}; // Arquivos selecionados por campo (web) - só funciona na web
  final Map<String, List<String>> _uploadedFileUrls = {}; // URLs dos arquivos enviados
  
  bool _loading = true;
  bool _saving = false;
  String? _userName;
  String? _userEmail;
  String? _userPhone;
  String? _userCpf;

  // Cores do design
  static const Color _azul = Color.fromRGBO(56, 77, 156, 1.0);
  static const Color _laranja = Color.fromRGBO(238, 112, 112, 1.0);

  @override
  void initState() {
    super.initState();
    _loadUserData();
    _initializeFields();
  }

  @override
  void dispose() {
    for (var controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _initializeFields() {
    for (var field in widget.form.campos) {
      if (field.type == FieldType.checkbox) {
        _checkboxValues[field.id] = false;
      } else if (field.type == FieldType.select) {
        _selectValues[field.id] = null;
      } else if (field.type != FieldType.file) {
        _controllers[field.id] = TextEditingController();
      }
    }
  }

  Future<void> _loadUserData() async {
    setState(() => _loading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      _userName = prefs.getString('auth_user_name') ?? prefs.getString('userName');
      _userEmail = prefs.getString('auth_user_email') ?? prefs.getString('userEmail');
      _userPhone = prefs.getString('auth_user_phone') ?? prefs.getString('userPhone');
      _userCpf = prefs.getString('auth_user_cpf') ?? prefs.getString('userCpf');
    } catch (e) {
      debugPrint('Erro ao carregar dados do usuário: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    try {
      // Coleta os dados do formulário (sem os arquivos ainda)
      final formData = <String, dynamic>{};
      
      for (var field in widget.form.campos) {
        if (field.type == FieldType.checkbox) {
          formData[field.id] = _checkboxValues[field.id] ?? false;
        } else if (field.type == FieldType.select) {
          formData[field.id] = _selectValues[field.id] ?? '';
        } else if (field.type == FieldType.file) {
          // Inicializa com lista vazia, será preenchido após upload
          formData[field.id] = [];
        } else {
          formData[field.id] = _controllers[field.id]?.text ?? '';
        }
      }

      // Cria a inscrição primeiro para obter o ID
      final inscription = InscriptionModel(
        formId: widget.form.id!,
        userId: widget.userId,
        userName: _userName ?? '',
        userEmail: _userEmail ?? '',
        userPhone: _userPhone,
        userCpf: _userCpf,
        voucherCode: '', // Será gerado no serviço
        createdAt: DateTime.now(),
        formData: formData,
      );

      final inscriptionId = await _inscriptionService.createInscription(inscription);
      
      // Agora faz upload dos arquivos usando o ID real da inscrição (versão web)
      final updatedFormData = Map<String, dynamic>.from(formData);
      for (var field in widget.form.campos) {
        if (field.type == FieldType.file && _fileValues[field.id] != null && _fileValues[field.id]!.isNotEmpty) {
          try {
            // Faz upload de múltiplos arquivos de uma vez (versão web)
            final fileLinks = await _fileUploadService.uploadFiles(
              files: _fileValues[field.id]!,
              formId: widget.form.id!,
              inscriptionId: inscriptionId,
              fieldId: field.id,
            );
            // Salva apenas os links no banco, não os arquivos
            updatedFormData[field.id] = fileLinks;
            debugPrint('✅ ${fileLinks.length} arquivo(s) enviado(s). Links salvos no banco.');
          } catch (e) {
            debugPrint('❌ Erro ao fazer upload de arquivos do campo ${field.id}: $e');
            // Continua mesmo se o upload falhar, mas não salva links inválidos
            updatedFormData[field.id] = [];
          }
        }
      }
      
      // Atualiza a inscrição com as URLs dos arquivos (se houver arquivos)
      if (updatedFormData != formData) {
        final currentInscription = await _inscriptionService.getInscriptionById(inscriptionId);
        if (currentInscription != null) {
          final updatedInscription = currentInscription.copyWith(formData: updatedFormData);
          await _inscriptionService.updateInscription(inscriptionId, updatedInscription);
        }
      }
      
      // Busca a inscrição criada para obter o voucher
      final createdInscription = await _inscriptionService.getInscriptionById(inscriptionId);
      
      if (mounted && createdInscription != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Inscrição realizada com sucesso! Voucher: ${createdInscription.voucherCode}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 5),
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao realizar inscrição: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(
          backgroundColor: _azul,
          foregroundColor: Colors.white,
          title: Text(
            widget.form.titulo,
            style: GoogleFonts.robotoSlab( color: _laranja),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: _azul,
        foregroundColor: Colors.white,
        title: Text(
          widget.form.titulo,
          style: GoogleFonts.robotoSlab( color: _laranja),
        ),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.form.descricao != null && widget.form.descricao!.isNotEmpty) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      widget.form.descricao!,
                      style: GoogleFonts.robotoSlab(),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              ...widget.form.campos.map((field) => _buildField(field)),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submitForm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _laranja,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          'Enviar Inscrição',
                          style: GoogleFonts.robotoSlab( fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(CustomFormField field) {
    switch (field.type) {
      case FieldType.text:
      case FieldType.email:
      case FieldType.phone:
      case FieldType.number:
        return _buildTextField(field);
      case FieldType.textarea:
        return _buildTextArea(field);
      case FieldType.date:
        return _buildDateField(field);
      case FieldType.select:
        return _buildSelectField(field);
      case FieldType.checkbox:
        return _buildCheckboxField(field);
      case FieldType.file:
        return _buildFileField(field);
    }
  }

  Widget _buildTextField(CustomFormField field) {
    if (!_controllers.containsKey(field.id)) {
      _controllers[field.id] = TextEditingController();
    }
    
    TextInputType? keyboardType;
    if (field.type == FieldType.email) {
      keyboardType = TextInputType.emailAddress;
    } else if (field.type == FieldType.phone) {
      keyboardType = TextInputType.phone;
    } else if (field.type == FieldType.number) {
      keyboardType = TextInputType.number;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: _controllers[field.id],
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: field.label,
          border: const OutlineInputBorder(),
        ),
        validator: field.required
            ? (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Este campo é obrigatório';
                }
                if (field.type == FieldType.email && !value.contains('@')) {
                  return 'Email inválido';
                }
                return null;
              }
            : null,
      ),
    );
  }

  Widget _buildTextArea(CustomFormField field) {
    if (!_controllers.containsKey(field.id)) {
      _controllers[field.id] = TextEditingController();
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: _controllers[field.id],
        maxLines: 5,
        decoration: InputDecoration(
          labelText: field.label,
          border: const OutlineInputBorder(),
        ),
        validator: field.required
            ? (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Este campo é obrigatório';
                }
                return null;
              }
            : null,
      ),
    );
  }

  Widget _buildDateField(CustomFormField field) {
    if (!_controllers.containsKey(field.id)) {
      _controllers[field.id] = TextEditingController();
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: DateTime.now(),
            firstDate: DateTime(1900),
            lastDate: DateTime(2100),
          );
          if (picked != null) {
            _controllers[field.id]!.text = DateFormat('dd/MM/yyyy').format(picked);
          }
        },
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: field.label,
            border: const OutlineInputBorder(),
            suffixIcon: const Icon(Icons.calendar_today),
          ),
          child: Text(
            _controllers[field.id]!.text.isEmpty
                ? 'Selecione uma data'
                : _controllers[field.id]!.text,
            style: GoogleFonts.robotoSlab(),
          ),
        ),
      ),
    );
  }

  Widget _buildSelectField(CustomFormField field) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: DropdownButtonFormField<String>(
        value: _selectValues[field.id],
        decoration: InputDecoration(
          labelText: field.label,
          border: const OutlineInputBorder(),
        ),
        items: field.options?.map((option) {
          return DropdownMenuItem(
            value: option,
            child: Text(option),
          );
        }).toList(),
        onChanged: (value) {
          setState(() {
            _selectValues[field.id] = value;
          });
        },
        validator: field.required
            ? (value) {
                if (value == null || value.isEmpty) {
                  return 'Este campo é obrigatório';
                }
                return null;
              }
            : null,
      ),
    );
  }

  Widget _buildCheckboxField(CustomFormField field) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: CheckboxListTile(
        title: Text(field.label),
        value: _checkboxValues[field.id] ?? false,
        onChanged: (value) {
          setState(() {
            _checkboxValues[field.id] = value ?? false;
          });
        },
        controlAffinity: ListTileControlAffinity.leading,
      ),
    );
  }

  Widget _buildFileField(CustomFormField field) {
    final files = _fileValues[field.id] ?? [];
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            field.label,
            style: GoogleFonts.robotoSlab(
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (field.required)
            const Text(
              ' *',
              style: TextStyle(color: Colors.red),
            ),
          const SizedBox(height: 8),
          WebFilePicker(
            allowMultiple: true,
            onFilesSelected: (selectedFiles) {
              if (kIsWeb) {
                setState(() {
                  _fileValues[field.id] = selectedFiles.cast<html.File>();
                });
              }
            },
            child: OutlinedButton.icon(
              onPressed: () {}, // O WebFilePicker já gerencia o clique
              icon: const Icon(Icons.upload_file),
              label: const Text('Selecionar Arquivo(s)'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 48),
              ),
            ),
          ),
          if (files.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...files.asMap().entries.map((entry) {
              final index = entry.key;
              final file = entry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        file.name,
                        style: GoogleFonts.robotoSlab( fontSize: 12),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () {
                        setState(() {
                          files.removeAt(index);
                        });
                      },
                    ),
                  ],
                ),
              );
            }),
          ],
          if (field.required && files.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'Este campo é obrigatório',
                style: TextStyle(color: Colors.red[700], fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }
}

