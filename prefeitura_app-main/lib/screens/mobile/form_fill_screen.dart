import 'dart:convert';
// Import condicional para File (mobile usa dart:io, web usa stub)
import 'dart:io' if (dart.library.html) 'io_stub.dart' as io;
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import '../../models/form_model.dart';
import '../../models/inscription_model.dart';
import '../../services/inscription_service.dart';
import '../../services/auth_service.dart';
// Import do FileUploadService (usa export condicional do arquivo principal)
import '../../services/file_upload_service.dart';
import 'voucher_screen.dart';


/// Tela para preencher o formulário de inscrição
class FormFillScreen extends StatefulWidget {
  final FormModel form;
  final String userId;

  const FormFillScreen({
    super.key,
    required this.form,
    required this.userId,
  });

  @override
  State<FormFillScreen> createState() => _FormFillScreenState();
}

class _FormFillScreenState extends State<FormFillScreen> {
  final _formKey = GlobalKey<FormState>();
  final InscriptionService _inscriptionService = InscriptionService();
  final FileUploadService _fileUploadService = FileUploadService();
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, bool> _checkboxValues = {};
  final Map<String, String?> _selectValues = {};
  // Arquivos selecionados por campo (compatível com web e mobile)
  final Map<String, List<dynamic>> _fileValues = {};
  final Map<String, List<String>> _uploadedFileUrls = {}; // URLs dos arquivos enviados
  
  bool _loading = true;
  bool _saving = false;
  String? _userName;
  String? _userEmail;
  String? _userPhone;
  String? _userCpf;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  @override
  void dispose() {
    for (var controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadUserData() async {
    setState(() => _loading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? prefs.getString('auth_token');
      
      if (token == null || token.isEmpty) {
        throw Exception('Token não encontrado');
      }

      // Busca dados do usuário via API
      final resp = await http.get(
        Uri.parse('${AuthService.kApiBase}/users/checkuser'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      if (resp.statusCode == 200 && resp.body.isNotEmpty) {
        final data = jsonDecode(resp.body);
        final user = data['user'] ?? data;
        
        setState(() {
          _userName = (user['name'] ?? user['nome'] ?? '').toString();
          _userEmail = (user['email'] ?? '').toString();
          _userPhone = (user['phone'] ?? user['telefone'] ?? '').toString();
          _userCpf = (user['cpf'] ?? '').toString();
        });
      }

      // Inicializa controllers e valores para cada campo
      for (var field in widget.form.campos) {
        if (field.type == FieldType.checkbox) {
          _checkboxValues[field.id] = false;
        } else if (field.type == FieldType.select) {
          _selectValues[field.id] = null;
        } else if (field.type == FieldType.file) {
          _fileValues[field.id] = [];
          _uploadedFileUrls[field.id] = [];
        } else {
          _controllers[field.id] = TextEditingController();
          
          // Pré-preenche com dados do perfil
          if (_userName != null && _userName!.isNotEmpty) {
            if (field.label.toLowerCase().contains('nome') || 
                field.label.toLowerCase().contains('name')) {
              _controllers[field.id]!.text = _userName!;
            }
          }
          if (_userEmail != null && _userEmail!.isNotEmpty) {
            if (field.type == FieldType.email || 
                field.label.toLowerCase().contains('email') ||
                field.label.toLowerCase().contains('e-mail')) {
              _controllers[field.id]!.text = _userEmail!;
            }
          }
          if (_userPhone != null && _userPhone!.isNotEmpty) {
            if (field.type == FieldType.phone || 
                field.label.toLowerCase().contains('telefone') ||
                field.label.toLowerCase().contains('phone')) {
              _controllers[field.id]!.text = _userPhone!;
            }
          }
          if (_userCpf != null && _userCpf!.isNotEmpty) {
            if (field.label.toLowerCase().contains('cpf')) {
              _controllers[field.id]!.text = _userCpf!;
            }
          }
        }
      }

      if (mounted) {
        setState(() => _loading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar dados: $e')),
        );
      }
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
      
      // Agora faz upload dos arquivos usando o ID real da inscrição
      // Os arquivos são armazenados em container separado e apenas os links são salvos
      final updatedFormData = Map<String, dynamic>.from(formData);
      for (var field in widget.form.campos) {
        if (field.type == FieldType.file && _fileValues[field.id] != null && _fileValues[field.id]!.isNotEmpty) {
          try {
            // Faz upload de cada arquivo individualmente
            // Retorna apenas os links que serão salvos no banco
            final fileLinks = <String>[];
            for (var file in _fileValues[field.id]!) {
              final timestamp = DateTime.now().millisecondsSinceEpoch;
              // Obtém o nome do arquivo de forma compatível com web e mobile
              String fileName;
              if (kIsWeb) {
                // Na web, o file é html.File e tem a propriedade 'name'
                try {
                  final fileDynamic = file as dynamic;
                  fileName = '${timestamp}_${FileUploadService.getFileName(fileDynamic.name ?? 'arquivo')}';
                } catch (e) {
                  debugPrint('Erro ao obter nome do arquivo na web: $e');
                  continue;
                }
              } else {
                // No mobile, o file é io.File e tem a propriedade 'path'
                // Na web, io.File é na verdade html.File, então verificamos de forma diferente
                try {
                  final fileDynamic = file as dynamic;
                  // Tenta acessar 'path' (mobile) ou 'name' (web) dinamicamente
                  final pathOrName = fileDynamic.path ?? fileDynamic.name;
                  if (pathOrName != null) {
                    fileName = '${timestamp}_${FileUploadService.getFileName(pathOrName.toString())}';
                  } else {
                    continue; // Pula arquivos inválidos
                  }
                } catch (e) {
                  debugPrint('Erro ao obter nome do arquivo: $e');
                  continue; // Pula arquivos inválidos
                }
              }
              
              // Passa o arquivo diretamente - o FileUploadService já tem imports condicionais
              // e aceita o tipo correto (html.File na web, io.File no mobile)
              final fileLink = await _fileUploadService.uploadFile(
                file: file,
                formId: widget.form.id!,
                inscriptionId: inscriptionId,
                fieldId: field.id,
                fileName: fileName,
              );
              fileLinks.add(fileLink);
            }
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
        // Busca a inscrição atual para preservar o voucher
        final currentInscription = await _inscriptionService.getInscriptionById(inscriptionId);
        if (currentInscription != null) {
          final updatedInscription = currentInscription.copyWith(formData: updatedFormData);
          await _inscriptionService.updateInscription(inscriptionId, updatedInscription);
        }
      }
      
      // Busca a inscrição criada para obter o voucher
      final createdInscription = await _inscriptionService.getInscriptionById(inscriptionId);
      
      // Debug: verifica se o voucher foi gerado
      if (createdInscription != null) {
        debugPrint('✅ Voucher gerado: ${createdInscription.voucherCode}');
      } else {
        debugPrint('❌ Erro: Inscrição não encontrada após criação');
      }

      if (mounted && createdInscription != null) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => VoucherScreen(inscription: createdInscription, form: widget.form),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao salvar inscrição: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Preencher Formulário'),
        backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    widget.form.titulo,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (widget.form.descricao != null && widget.form.descricao!.isNotEmpty)
                    Text(
                      widget.form.descricao!,
                      style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                    ),
                  const SizedBox(height: 24),
                  ...widget.form.campos.map((field) => _buildField(field)),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _submitForm,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _saving
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text(
                              'Finalizar Inscrição',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildField(CustomFormField field) {
    switch (field.type) {
      case FieldType.text:
      case FieldType.email:
      case FieldType.phone:
        return _buildTextField(field);
      case FieldType.number:
        return _buildNumberField(field);
      case FieldType.date:
        return _buildDateField(field);
      case FieldType.textarea:
        return _buildTextArea(field);
      case FieldType.select:
        return _buildSelectField(field);
      case FieldType.checkbox:
        return _buildCheckboxField(field);
      case FieldType.file:
        return _buildFileField(field);
    }
  }

  Widget _buildTextField(CustomFormField field) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: _controllers[field.id],
        keyboardType: field.type == FieldType.email
            ? TextInputType.emailAddress
            : field.type == FieldType.phone
                ? TextInputType.phone
                : TextInputType.text,
        decoration: InputDecoration(
          labelText: field.label,
          hintText: 'Digite ${field.label.toLowerCase()}',
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        ),
        validator: (value) {
          if (field.required && (value == null || value.trim().isEmpty)) {
            return 'Este campo é obrigatório';
          }
          if (field.type == FieldType.email && value != null && value.isNotEmpty) {
            if (!value.contains('@')) {
              return 'E-mail inválido';
            }
          }
          return null;
        },
      ),
    );
  }

  Widget _buildNumberField(CustomFormField field) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: _controllers[field.id],
        keyboardType: TextInputType.number,
        decoration: InputDecoration(
          labelText: field.label,
          hintText: 'Digite ${field.label.toLowerCase()}',
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        ),
        validator: (value) {
          if (field.required && (value == null || value.trim().isEmpty)) {
            return 'Este campo é obrigatório';
          }
          if (value != null && value.isNotEmpty) {
            if (double.tryParse(value) == null) {
              return 'Digite um número válido';
            }
          }
          return null;
        },
      ),
    );
  }

  Widget _buildDateField(CustomFormField field) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: _controllers[field.id],
        readOnly: true,
        decoration: InputDecoration(
          labelText: field.label,
          hintText: 'Selecione a data',
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          suffixIcon: const Icon(Icons.calendar_today),
        ),
        onTap: () async {
          final date = await showDatePicker(
            context: context,
            initialDate: DateTime.now(),
            firstDate: DateTime(1900),
            lastDate: DateTime(2100),
          );
          if (date != null) {
            _controllers[field.id]!.text = DateFormat('dd/MM/yyyy').format(date);
          }
        },
        validator: (value) {
          if (field.required && (value == null || value.isEmpty)) {
            return 'Este campo é obrigatório';
          }
          return null;
        },
      ),
    );
  }

  Widget _buildTextArea(CustomFormField field) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: _controllers[field.id],
        maxLines: 5,
        decoration: InputDecoration(
          labelText: field.label,
          hintText: 'Digite ${field.label.toLowerCase()}',
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        ),
        validator: (value) {
          if (field.required && (value == null || value.trim().isEmpty)) {
            return 'Este campo é obrigatório';
          }
          return null;
        },
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
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
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
        validator: (value) {
          if (field.required && (value == null || value.isEmpty)) {
            return 'Este campo é obrigatório';
          }
          return null;
        },
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

  /// Cria um File a partir do path (apenas para mobile)
  /// Na web, retorna null pois não deve ser usado
  dynamic _createFileFromPath(String path) {
    if (kIsWeb) {
      return null; // Na web, não cria File desta forma
    }
    return io.File(path);
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
            style: const TextStyle(
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
          OutlinedButton.icon(
            onPressed: () async {
              try {
                if (kIsWeb) {
                  // Na web, não usamos FilePicker, mas sim WebFilePicker
                  // Este código não deve ser executado na web
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Use a versão web do formulário')),
                    );
                  }
                  return;
                }
                
                FilePickerResult? result = await FilePicker.platform.pickFiles(
                  allowMultiple: true,
                  type: FileType.any,
                );

                if (result != null && result.files.isNotEmpty) {
                  setState(() {
                    // No mobile, cria io.File a partir do path
                    // Na web, isso não deve ser executado (já tem verificação kIsWeb acima)
                    // Usamos uma função auxiliar para evitar problemas de tipo na compilação web
                    _fileValues[field.id] = result.files
                        .where((f) => f.path != null)
                        .map((f) => _createFileFromPath(f.path!))
                        .where((f) => f != null)
                        .cast<dynamic>()
                        .toList();
                  });
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erro ao selecionar arquivo: $e')),
                  );
                }
              }
            },
            icon: const Icon(Icons.upload_file),
            label: const Text('Selecionar Arquivo(s)'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
          if (files.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...files.asMap().entries.map((entry) {
              final index = entry.key;
              final file = entry.value;
              // Obtém o nome do arquivo de forma compatível com web e mobile
              String fileName;
              if (kIsWeb) {
                // Na web, o file é html.File e tem a propriedade 'name'
                try {
                  final fileDynamic = file as dynamic;
                  fileName = fileDynamic.name ?? 'arquivo';
                } catch (e) {
                  fileName = 'arquivo';
                }
              } else {
                // No mobile, o file é io.File e tem a propriedade 'path'
                // Na web, io.File é na verdade html.File, então verificamos de forma diferente
                try {
                  final fileDynamic = file as dynamic;
                  // Tenta acessar 'path' (mobile) ou 'name' (web) dinamicamente
                  final pathOrName = fileDynamic.path ?? fileDynamic.name;
                  if (pathOrName != null) {
                    final pathStr = pathOrName.toString();
                    fileName = pathStr.split('/').last.split('\\').last;
                  } else {
                    fileName = 'arquivo';
                  }
                } catch (e) {
                  fileName = 'arquivo';
                }
              }
              
              return Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        fileName,
                        style: const TextStyle(fontSize: 12),
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

