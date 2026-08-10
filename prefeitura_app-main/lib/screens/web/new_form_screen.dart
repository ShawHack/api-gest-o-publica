import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/form_model.dart';
import '../../services/form_service.dart';

/// Tela para criar ou editar um formulário
class NewFormScreen extends StatefulWidget {
  final FormModel? form;

  const NewFormScreen({super.key, this.form});

  @override
  State<NewFormScreen> createState() => _NewFormScreenState();
}

class _NewFormScreenState extends State<NewFormScreen> {
  final FormService _service = FormService();
  final _formKey = GlobalKey<FormState>();
  
  // Cores do design
  static const Color _azul = Color.fromRGBO(56, 77, 156, 1.0);
  static const Color _laranja = Color.fromRGBO(238, 112, 112, 1.0);
  
  final TextEditingController _tituloController = TextEditingController();
  final TextEditingController _descricaoController = TextEditingController();
  final TextEditingController _idSolicitacao1DocController = TextEditingController();
  
  DateTime _dataEvento = DateTime.now();
  FormStatus _status = FormStatus.aberto;
  List<CustomFormField> _campos = [];
  bool _loading = false;
  String? _userId;

  @override
  void initState() {
    super.initState();
    _loadFormData();
    _loadUserId();
  }

  Future<void> _loadUserId() async {
    final prefs = await SharedPreferences.getInstance();
    _userId = prefs.getString('userId') ?? prefs.getString('auth_user_id');
  }

  void _loadFormData() {
    if (widget.form != null) {
      final form = widget.form!;
      _tituloController.text = form.titulo;
      _descricaoController.text = form.descricao ?? '';
      _idSolicitacao1DocController.text = form.idSolicitacao1Doc ?? '';
      _dataEvento = form.dataEvento;
      _status = form.status;
      _campos = List.from(form.campos);
    }
  }

  @override
  void dispose() {
    _tituloController.dispose();
    _descricaoController.dispose();
    _idSolicitacao1DocController.dispose();
    super.dispose();
  }

  Future<void> _saveForm() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _loading = true);

    try {
      final form = FormModel(
        id: widget.form?.id,
        titulo: _tituloController.text.trim(),
        descricao: _descricaoController.text.trim().isEmpty
            ? null
            : _descricaoController.text.trim(),
        dataEvento: _dataEvento,
        idSolicitacao1Doc: _idSolicitacao1DocController.text.trim().isEmpty
            ? null
            : _idSolicitacao1DocController.text.trim(),
        status: _status,
        createdAt: widget.form?.createdAt ?? DateTime.now(),
        updatedAt: DateTime.now(),
        createdBy: widget.form?.createdBy ?? _userId,
        updatedBy: _userId,
        campos: _campos,
      );

      if (widget.form?.id != null) {
        await _service.updateForm(form);
      } else {
        await _service.createForm(form);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.form != null
                ? 'Formulário atualizado com sucesso!'
                : 'Formulário criado com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao salvar formulário: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _addField() {
    showDialog(
      context: context,
      builder: (context) => _AddFieldDialog(
        onAdd: (field) {
          setState(() {
            _campos.add(field);
          });
        },
      ),
    );
  }

  void _editField(int index) {
    showDialog(
      context: context,
      builder: (context) => _AddFieldDialog(
        field: _campos[index],
        onAdd: (field) {
          setState(() {
            _campos[index] = field;
          });
        },
      ),
    );
  }

  void _removeField(int index) {
    setState(() {
      _campos.removeAt(index);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: _azul,
        foregroundColor: Colors.white,
        title: Text(
          widget.form != null ? 'Editar Formulário' : 'Novo Formulário',
          style: GoogleFonts.robotoSlab(
            color: _laranja,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          if (widget.form != null)
            DropdownButton<FormStatus>(
              value: _status,
              underline: const SizedBox(),
              items: FormStatus.values.map((status) {
                return DropdownMenuItem(
                  value: status,
                  child: Text(
                    _getStatusText(status),
                    style: GoogleFonts.robotoSlab(),
                  ),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _status = value);
                }
              },
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Informações básicas
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Informações Básicas do Evento',
                        style: GoogleFonts.robotoSlab( fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _tituloController,
                        decoration: const InputDecoration(
                          labelText: 'Título *',
                          hintText: 'Digite o título do evento',
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'O título é obrigatório';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _descricaoController,
                        decoration: const InputDecoration(
                          labelText: 'Descrição',
                          hintText: 'Digite a descrição do evento',
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),
                      InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _dataEvento,
                            firstDate: DateTime.now().subtract(const Duration(days: 365)),
                            lastDate: DateTime.now().add(const Duration(days: 365)),
                          );
                          if (picked != null) {
                            setState(() => _dataEvento = picked);
                          }
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Data do Evento *',
                            prefixIcon: Icon(Icons.calendar_today),
                          ),
                          child: Text(
                            DateFormat('dd/MM/yyyy', 'pt_BR').format(_dataEvento),
                            style: GoogleFonts.robotoSlab(),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _idSolicitacao1DocController,
                        decoration: const InputDecoration(
                          labelText: 'ID da Solicitação 1Doc',
                          hintText: 'Digite o ID da solicitação via 1Doc',
                          prefixIcon: Icon(Icons.description),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Campos customizáveis
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Campos Customizáveis',
                            style: GoogleFonts.robotoSlab( fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          ElevatedButton.icon(
                            onPressed: _addField,
                            icon: const Icon(Icons.add),
                            label: Text(
                              'Adicionar Campo',
                              style: GoogleFonts.robotoSlab(),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _azul,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      if (_campos.isEmpty)
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              children: [
                                Icon(Icons.add_circle_outline, size: 64, color: Colors.grey[400]),
                                const SizedBox(height: 16),
                                Text(
                                  'Nenhum campo customizado adicionado',
                                  style: GoogleFonts.robotoSlab( color: Colors.grey[600]),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Clique em "Adicionar Campo" para criar campos editáveis',
                                  style: GoogleFonts.robotoSlab( color: Colors.grey[500], fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _campos.length,
                          itemBuilder: (context, index) {
                            final field = _campos[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              color: Colors.grey[50],
                              child: ListTile(
                                title: Text(
                                  field.label,
                                  style: GoogleFonts.robotoSlab( fontWeight: FontWeight.bold),
                                ),
                                subtitle: Text(
                                  '${_getFieldTypeText(field.type)}${field.required ? " (obrigatório)" : ""}',
                                  style: GoogleFonts.robotoSlab(),
                                ),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.edit, color: _azul),
                                      onPressed: () => _editField(index),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete, color: Colors.red),
                                      onPressed: () => _removeField(index),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Botões de ação
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _azul,
                    ),
                    child: Text(
                      'Cancelar',
                      style: GoogleFonts.robotoSlab(),
                    ),
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton(
                    onPressed: _loading ? null : _saveForm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _azul,
                      foregroundColor: Colors.white,
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            widget.form != null ? 'Atualizar' : 'Criar',
                            style: GoogleFonts.robotoSlab(),
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getStatusText(FormStatus status) {
    switch (status) {
      case FormStatus.aberto:
        return 'Aberto';
      case FormStatus.emAndamento:
        return 'Em Andamento';
      case FormStatus.concluido:
        return 'Concluído';
    }
  }

  String _getFieldTypeText(FieldType type) {
    switch (type) {
      case FieldType.text:
        return 'Texto';
      case FieldType.number:
        return 'Número';
      case FieldType.date:
        return 'Data';
      case FieldType.email:
        return 'Email';
      case FieldType.phone:
        return 'Telefone';
      case FieldType.textarea:
        return 'Área de Texto';
      case FieldType.select:
        return 'Seleção';
      case FieldType.checkbox:
        return 'Checkbox';
      case FieldType.file:
        return 'Arquivo';
    }
  }
}

/// Dialog para adicionar/editar um campo customizável
class _AddFieldDialog extends StatefulWidget {
  final CustomFormField? field;
  final Function(CustomFormField) onAdd;

  const _AddFieldDialog({this.field, required this.onAdd});

  @override
  State<_AddFieldDialog> createState() => _AddFieldDialogState();
}

class _AddFieldDialogState extends State<_AddFieldDialog> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _labelController = TextEditingController();
  final TextEditingController _optionsController = TextEditingController();
  
  // Cor azul escuro
  static const Color _azul = Color.fromRGBO(56, 77, 156, 1.0);
  
  FieldType _selectedType = FieldType.text;
  bool _required = false;
  List<String> _options = [];

  @override
  void initState() {
    super.initState();
    if (widget.field != null) {
      final field = widget.field!;
      _labelController.text = field.label;
      _selectedType = field.type;
      _required = field.required;
      if (field.options != null) {
        _options = List.from(field.options!);
        _optionsController.text = _options.join(', ');
      }
    }
  }

  @override
  void dispose() {
    _labelController.dispose();
    _optionsController.dispose();
    super.dispose();
  }

  void _addOption() {
    final option = _optionsController.text.trim();
    if (option.isNotEmpty && !_options.contains(option)) {
      setState(() {
        _options.add(option);
        _optionsController.clear();
      });
    }
  }

  void _removeOption(String option) {
    setState(() {
      _options.remove(option);
    });
  }

  void _save() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedType == FieldType.select && _options.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Adicione pelo menos uma opção para campos de seleção'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final field = CustomFormField(
      id: widget.field?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      label: _labelController.text.trim(),
      type: _selectedType,
      required: _required,
      options: _selectedType == FieldType.select ? _options : null,
    );

    widget.onAdd(field);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        widget.field != null ? 'Editar Campo' : 'Adicionar Campo',
        style: GoogleFonts.robotoSlab(),
      ),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _labelController,
                decoration: const InputDecoration(
                  labelText: 'Label do Campo *',
                  hintText: 'Ex: Nome do Responsável',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'O label é obrigatório';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<FieldType>(
                value: _selectedType,
                decoration: const InputDecoration(
                  labelText: 'Tipo de Campo *',
                ),
                items: FieldType.values.map((type) {
                  return DropdownMenuItem(
                    value: type,
                    child: Text(
                      _getFieldTypeText(type),
                      style: GoogleFonts.robotoSlab(),
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedType = value);
                  }
                },
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                title: Text(
                  'Campo obrigatório',
                  style: GoogleFonts.robotoSlab(),
                ),
                value: _required,
                onChanged: (value) {
                  setState(() => _required = value ?? false);
                },
              ),
              if (_selectedType == FieldType.select) ...[
                const SizedBox(height: 16),
                Text(
                  'Opções de Seleção:',
                  style: GoogleFonts.robotoSlab( fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _optionsController,
                        decoration: const InputDecoration(
                          hintText: 'Digite uma opção',
                          isDense: true,
                        ),
                        onFieldSubmitted: (_) => _addOption(),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add),
                      onPressed: _addOption,
                    ),
                  ],
                ),
                if (_options.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _options.map((option) {
                      return Chip(
                        label: Text(option),
                        onDeleted: () => _removeOption(option),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Cancelar',
            style: GoogleFonts.robotoSlab(),
          ),
        ),
        ElevatedButton(
          onPressed: _save,
          style: ElevatedButton.styleFrom(
            backgroundColor: _azul,
            foregroundColor: Colors.white,
          ),
          child: Text(
            'Salvar',
            style: GoogleFonts.robotoSlab(),
          ),
        ),
      ],
    );
  }

  String _getFieldTypeText(FieldType type) {
    switch (type) {
      case FieldType.text:
        return 'Texto';
      case FieldType.number:
        return 'Número';
      case FieldType.date:
        return 'Data';
      case FieldType.email:
        return 'Email';
      case FieldType.phone:
        return 'Telefone';
      case FieldType.textarea:
        return 'Área de Texto';
      case FieldType.select:
        return 'Seleção';
      case FieldType.checkbox:
        return 'Checkbox';
      case FieldType.file:
        return 'Arquivo';
    }
  }
}

