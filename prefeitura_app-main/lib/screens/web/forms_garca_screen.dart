import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/form_model.dart';
import '../../models/inscription_model.dart';
import '../../services/form_service.dart';
import '../../services/inscription_service.dart';
import '../../widgets/copyright_footer.dart';
import 'new_form_screen.dart';
import 'dart:convert';

// Import condicional para download em web
// Na web (dart:html disponível): usa pdf_download_web.dart
// No mobile (dart:html não disponível): usa pdf_download_stub.dart
import 'pdf_download_stub.dart' as pdf_download
    if (dart.library.html) 'pdf_download_web.dart';

// Import condicional para abrir links na web
import 'open_link_stub.dart' as link_helper
    if (dart.library.html) 'open_link_web.dart';

import 'dart:typed_data';
import 'dart:async';

// Import condicional para diálogo de download de PDF
import 'pdf_dialog_helper_stub.dart'
    if (dart.library.html) 'pdf_dialog_helper_web.dart' as pdf_dialog;

/// Tela principal do Forms Garça
class FormsGarcaScreen extends StatefulWidget {
  const FormsGarcaScreen({super.key});

  @override
  State<FormsGarcaScreen> createState() => _FormsGarcaScreenState();
}

class _FormsGarcaScreenState extends State<FormsGarcaScreen> {
  final FormService _service = FormService();
  final InscriptionService _inscriptionService = InscriptionService();
  
  int _selectedTab = 0; // 0: Abertos, 1: Concluídos, 2: Inscritos
  List<FormModel> _allForms = [];
  List<InscriptionModel> _allInscriptions = [];
  Map<String, int> _statistics = {};
  bool _loading = false;
  String? _userName;
  String? _userId;
  String? _userRole;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? prefs.getString('auth_token');
    _userName = prefs.getString('auth_user_name');
    _userId = prefs.getString('userId') ?? prefs.getString('auth_user_id');
    _userRole = prefs.getString('role')?.trim().toLowerCase();

    debugPrint('🔐 Verificando autenticação:');
    debugPrint('   Token: ${token != null ? "presente" : "ausente"}');
    debugPrint('   UserId: $_userId');
    debugPrint('   UserName: $_userName');
    debugPrint('   Role: "$_userRole"');
    debugPrint('   Todas as chaves do SharedPreferences: ${prefs.getKeys()}');

    if (token == null) {
      debugPrint('❌ Token não encontrado, redirecionando para login');
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/forms-garca-login');
      }
      return;
    }

    // Verifica se é admin (case-insensitive)
    if (_userRole != 'admin') {
      debugPrint('❌ Acesso negado. Role: "$_userRole" (esperado: "admin")');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Acesso negado. Apenas administradores podem acessar esta área.\nRole atual: $_userRole'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
        Navigator.pushReplacementNamed(context, '/forms-garca-login');
      }
      return;
    }

    debugPrint('✅ Autenticação OK, carregando dados...');
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      await Future.wait([
        _loadForms(),
        _loadStatistics(),
        _loadInscriptions(),
      ]);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadForms() async {
    try {
      final forms = await _service.getForms();
      setState(() {
        _allForms = forms;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar formulários: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _loadStatistics() async {
    try {
      final stats = await _service.getStatistics();
      setState(() {
        _statistics = stats;
      });
    } catch (e) {
      debugPrint('Erro ao carregar estatísticas: $e');
    }
  }

  Future<void> _loadInscriptions() async {
    try {
      final inscriptions = await _inscriptionService.getAllInscriptions();
      setState(() {
        _allInscriptions = inscriptions;
      });
    } catch (e) {
      debugPrint('Erro ao carregar inscrições: $e');
    }
  }

  List<FormModel> _getFormsByStatus(FormStatus status) {
    return _allForms.where((f) => f.status == status).toList();
  }

  Future<void> _updateFormStatus(FormModel form, FormStatus newStatus) async {
    try {
      await _service.updateFormStatus(form.id!, newStatus, _userId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Status atualizado para ${_getStatusText(newStatus)}'),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _deleteForm(FormModel form) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Exclusão'),
        content: Text('Deseja realmente excluir o formulário "${form.titulo}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );

    if (confirmed == true && form.id != null) {
      try {
        await _service.deleteForm(form.id!);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Formulário excluído com sucesso!'),
              backgroundColor: Colors.green,
            ),
          );
          _loadData();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  // Cores do design
  static const Color _azul = Color.fromRGBO(56, 77, 156, 1.0);
  static const Color _laranja = Color.fromRGBO(238, 112, 112, 1.0);
  static const Color _azulMenu = Color.fromRGBO(116, 129, 209, 1.0);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: _azul,
        foregroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        centerTitle: false,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Forms Garça',
              style: GoogleFonts.robotoSlab(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: _laranja,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'Sistema de Gestão de Formulários',
              style: GoogleFonts.robotoSlab(
                fontSize: 12,
                color: Colors.white,
                fontWeight: FontWeight.normal,
              ),
            ),
          ],
        ),
        actions: [
          if (_userName != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: Text(
                  'Olá, $_userName (Admin)',
                  style: GoogleFonts.robotoSlab(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            tooltip: 'Sair',
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.clear();
              if (mounted) {
                Navigator.pushReplacementNamed(context, '/forms-garca-login');
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _buildTabBar(),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _buildContent(),
          ),
          const CopyrightFooter(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const NewFormScreen()),
          );
          if (result == true) {
            _loadData();
          }
        },
        icon: const Icon(Icons.add),
        label: Text(
          'Novo Evento',
          style: GoogleFonts.robotoSlab( color: Colors.white),
        ),
        backgroundColor: _laranja,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      color: _azulMenu,
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () => setState(() => _selectedTab = 0),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 0 ? Colors.white : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Badge(
                      label: Text('${_statistics['aberto'] ?? 0}'),
                      isLabelVisible: (_statistics['aberto'] ?? 0) > 0,
                      child: Icon(
                        Icons.folder_open,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Abertos',
                      style: GoogleFonts.robotoSlab(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: InkWell(
              onTap: () => setState(() => _selectedTab = 1),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 1 ? Colors.white : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Badge(
                      label: Text('${_statistics['concluido'] ?? 0}'),
                      isLabelVisible: (_statistics['concluido'] ?? 0) > 0,
                      child: Icon(
                        Icons.check_circle,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Concluídos',
                      style: GoogleFonts.robotoSlab(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: InkWell(
              onTap: () => setState(() => _selectedTab = 2),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 2 ? Colors.white : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.people,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Inscritos',
                      style: GoogleFonts.robotoSlab(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_selectedTab == 2) {
      // Aba de Inscritos
      return _buildInscriptionsContent();
    }

    List<FormModel> forms;
    FormStatus status;

    switch (_selectedTab) {
      case 0:
        status = FormStatus.aberto;
        forms = _getFormsByStatus(status);
        break;
      case 1:
        status = FormStatus.concluido;
        forms = _getFormsByStatus(status);
        break;
      default:
        status = FormStatus.aberto; // Valor padrão para evitar erro
        forms = [];
    }

    if (forms.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'Nenhum formulário ${_getStatusText(status).toLowerCase()}',
              style: GoogleFonts.robotoSlab( fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: forms.length,
      itemBuilder: (context, index) {
        return _buildFormCard(forms[index]);
      },
    );
  }

  Widget _buildInscriptionsContent() {
    if (_allInscriptions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'Nenhuma inscrição encontrada',
              style: GoogleFonts.robotoSlab( fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    // Agrupa inscrições por formulário
    final Map<String, List<InscriptionModel>> inscriptionsByForm = {};
    for (var inscription in _allInscriptions) {
      if (!inscriptionsByForm.containsKey(inscription.formId)) {
        inscriptionsByForm[inscription.formId] = [];
      }
      inscriptionsByForm[inscription.formId]!.add(inscription);
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: inscriptionsByForm.length,
      itemBuilder: (context, index) {
        final formId = inscriptionsByForm.keys.elementAt(index);
        final inscriptions = inscriptionsByForm[formId]!;
        final form = _allForms.firstWhere(
          (f) => f.id == formId,
          orElse: () => FormModel(
            titulo: 'Formulário não encontrado',
            dataEvento: DateTime.now(),
            createdAt: DateTime.now(),
          ),
        );
        
        return _buildInscriptionsCard(form, inscriptions);
      },
    );
  }

  Widget _buildInscriptionsCard(FormModel form, List<InscriptionModel> inscriptions) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      child: ExpansionTile(
        leading: const Icon(Icons.description, color: _azul),
        title: Text(
          form.titulo,
          style: GoogleFonts.robotoSlab( fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          '${inscriptions.length} inscrição(ões)',
          style: GoogleFonts.robotoSlab(),
        ),
        trailing: inscriptions.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.download, color: _azul),
                tooltip: 'Exportar inscrições deste formulário',
                onPressed: () => _exportInscriptionsForForm(form, inscriptions),
              )
            : null,
        children: [
          ...inscriptions.map((inscription) => _buildInscriptionItem(inscription)),
        ],
      ),
    );
  }

  Widget _buildInscriptionItem(InscriptionModel inscription) {
    return ListTile(
      leading: const Icon(Icons.person, color: Colors.grey),
      title: Text(inscription.userName, style: GoogleFonts.robotoSlab()),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('E-mail: ${inscription.userEmail}', style: GoogleFonts.robotoSlab()),
          if (inscription.userPhone != null && inscription.userPhone!.isNotEmpty)
            Text('Telefone: ${inscription.userPhone}', style: GoogleFonts.robotoSlab()),
          Text('Voucher: ${inscription.voucherCode}', style: GoogleFonts.robotoSlab()),
          Text(
            'Data: ${DateFormat('dd/MM/yyyy HH:mm').format(inscription.createdAt)}',
            style: GoogleFonts.robotoSlab( fontSize: 12, color: Colors.grey[600]),
          ),
        ],
      ),
      trailing: IconButton(
        icon: const Icon(Icons.visibility),
        onPressed: () => _showInscriptionDetails(inscription),
      ),
    );
  }

  void _showInscriptionDetails(InscriptionModel inscription) {
    final form = _allForms.firstWhere(
      (f) => f.id == inscription.formId,
      orElse: () => FormModel(
        titulo: 'Formulário não encontrado',
        dataEvento: DateTime.now(),
        createdAt: DateTime.now(),
      ),
    );

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Detalhes da Inscrição - ${form.titulo}',
          style: GoogleFonts.robotoSlab(
            color: const Color.fromRGBO(238, 112, 112, 1.0),
          ),
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailRow('Nome', inscription.userName),
              _buildDetailRow('E-mail', inscription.userEmail),
              if (inscription.userPhone != null && inscription.userPhone!.isNotEmpty)
                _buildDetailRow('Telefone', inscription.userPhone!),
              if (inscription.userCpf != null && inscription.userCpf!.isNotEmpty)
                _buildDetailRow('CPF', inscription.userCpf!),
              _buildDetailRow('Código do Voucher', inscription.voucherCode),
              _buildDetailRow(
                'Data da Inscrição',
                DateFormat('dd/MM/yyyy HH:mm').format(inscription.createdAt),
              ),
              const SizedBox(height: 16),
              Text(
                'Respostas do Formulário:',
                style: GoogleFonts.robotoSlab(
                  fontWeight: FontWeight.bold,
                  color: const Color.fromRGBO(238, 112, 112, 1.0),
                ),
              ),
              const SizedBox(height: 8),
              ...inscription.formData.entries.map((entry) {
                final field = form.campos.firstWhere(
                  (f) => f.id == entry.key,
                  orElse: () => CustomFormField(
                    id: entry.key,
                    label: entry.key,
                    type: FieldType.text,
                  ),
                );
                
                // Se for campo de arquivo, mostra os links
                if (field.type == FieldType.file && entry.value is List) {
                  final fileUrls = entry.value as List;
                  if (fileUrls.isNotEmpty) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${field.label}:',
                            style: GoogleFonts.robotoSlab(
                              fontWeight: FontWeight.bold,
                              color: const Color.fromRGBO(238, 112, 112, 1.0),
                            ),
                          ),
                          const SizedBox(height: 4),
                          ...fileUrls.map((url) {
                            final urlString = url.toString();
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: InkWell(
                                onTap: () {
                                  // Abre o link em nova aba (apenas na web)
                                  try {
                                    link_helper.openLink(urlString);
                                  } catch (e) {
                                    debugPrint('Erro ao abrir link: $e');
                                  }
                                },
                                child: Row(
                                  children: [
                                    const Icon(Icons.link, size: 16, color: _azulMenu),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        urlString,
                                        style: GoogleFonts.robotoSlab(
                                          color: _azulMenu,
                                          decoration: TextDecoration.underline,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    );
                  }
                }
                
                // Para outros tipos de campo, formata o valor
                String formattedValue;
                if (entry.value is bool) {
                  formattedValue = entry.value ? 'Sim' : 'Não';
                } else if (entry.value is List) {
                  formattedValue = entry.value.join('; ');
                } else {
                  formattedValue = entry.value.toString();
                }
                
                return _buildDetailRow(field.label, formattedValue);
              }),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: GoogleFonts.robotoSlab(
                fontWeight: FontWeight.bold,
                color: const Color.fromRGBO(238, 112, 112, 1.0),
              ),
            ),
          ),
          Expanded(child: Text(value, style: GoogleFonts.robotoSlab())),
        ],
      ),
    );
  }

  Future<void> _exportInscriptionsForForm(FormModel form, List<InscriptionModel> inscriptions) async {
    try {
      debugPrint('📄 Iniciando exportação PDF para formulário: ${form.titulo}');
      debugPrint('📄 Total de inscrições: ${inscriptions.length}');
      
      if (inscriptions.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não há inscrições para exportar neste formulário.')),
        );
        return;
      }

      // Remove caracteres especiais apenas dos nomes das colunas (cabeçalho)
      String cleanColumnName(String? value) {
        if (value == null || value.isEmpty) return '';
        return value
            .replaceAll(RegExp(r'[^\w\s-]'), '') // Remove caracteres especiais exceto letras, números, espaços e hífens
            .replaceAll(RegExp(r'\s+'), ' ') // Remove espaços múltiplos
            .trim();
      }

      // Formata o valor para exibição no PDF
      String formatValue(dynamic value, CustomFormField? field) {
        if (value == null) return '-';
        
        if (value is bool) {
          return value ? 'Sim' : 'Não';
        } else if (value is List) {
          // Se for lista de URLs (arquivos), retorna links
          if (field?.type == FieldType.file && value.isNotEmpty && value.first is String && (value.first as String).startsWith('http')) {
            return value.map((url) => url.toString()).join('\n');
          }
          return value.join('; ');
        } else {
          return value.toString();
        }
      }

      // Cria o PDF
      debugPrint('📄 Criando documento PDF...');
      final pdf = pw.Document();
      
      debugPrint('📄 Adicionando página ao PDF...');
      pdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(40),
          build: (pw.Context context) {
            return [
              // Cabeçalho
              pw.Header(
                level: 0,
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'Lista de Inscrições',
                      style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
                    ),
                    pw.SizedBox(height: 8),
                    pw.Text(
                      'Formulário: ${form.titulo}',
                      style: pw.TextStyle(fontSize: 16),
                    ),
                    pw.Text(
                      'Data de Exportação: ${DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now())}',
                      style: pw.TextStyle(fontSize: 12, color: PdfColors.grey700),
                    ),
                    pw.SizedBox(height: 20),
                  ],
                ),
              ),
              
              // Tabela de inscrições
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300),
                children: [
                  // Cabeçalho da tabela
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                    children: [
                      _buildTableCell('Nome', isHeader: true),
                      _buildTableCell('Email', isHeader: true),
                      _buildTableCell('Telefone', isHeader: true),
                      _buildTableCell('CPF', isHeader: true),
                      _buildTableCell('Voucher', isHeader: true),
                      _buildTableCell('Data', isHeader: true),
                      ...form.campos.map((field) => _buildTableCell(cleanColumnName(field.label), isHeader: true)),
                    ],
                  ),
                  
                  // Linhas de dados
                  ...inscriptions.map((inscription) {
                    return pw.TableRow(
                      children: [
                        _buildTableCell(inscription.userName),
                        _buildTableCell(inscription.userEmail ?? '-'),
                        _buildTableCell(inscription.userPhone ?? '-'),
                        _buildTableCell(inscription.userCpf ?? '-'),
                        _buildTableCell(inscription.voucherCode),
                        _buildTableCell(DateFormat('dd/MM/yyyy HH:mm').format(inscription.createdAt)),
                        ...form.campos.map((field) {
                          final value = inscription.formData[field.id];
                          final formattedValue = formatValue(value, field);
                          
                          // Se for arquivo (lista de URLs), cria links
                          if (field.type == FieldType.file && value is List && value.isNotEmpty) {
                            return pw.Container(
                              padding: const pw.EdgeInsets.all(4),
                              child: pw.Column(
                                crossAxisAlignment: pw.CrossAxisAlignment.start,
                                children: value.map<pw.Widget>((url) {
                                  return pw.UrlLink(
                                    destination: url.toString(),
                                    child: pw.Text(
                                      'Abrir arquivo ${value.indexOf(url) + 1}',
                                      style: pw.TextStyle(
                                        color: PdfColors.blue,
                                        decoration: pw.TextDecoration.underline,
                                        fontSize: 8,
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            );
                          }
                          
                          return _buildTableCell(formattedValue);
                        }),
                      ],
                    );
                  }),
                ],
              ),
            ];
          },
        ),
      );

      // Gera e faz download do PDF
      if (kIsWeb) {
        try {
          debugPrint('📄 Gerando nome do arquivo...');
          final fileName = 'inscricoes_${cleanColumnName(form.titulo)}_${DateFormat('yyyyMMdd_HHmmss').format(DateTime.now())}.pdf';
          debugPrint('📄 Nome do arquivo: $fileName');
          
          debugPrint('📄 Salvando PDF em bytes...');
          final bytes = await pdf.save();
          debugPrint('📄 PDF salvo. Tamanho: ${bytes.length} bytes');
          
          // Converte Uint8List para List<int> se necessário
          final bytesList = bytes is List<int> ? bytes : bytes.toList();
          debugPrint('📄 Bytes convertidos. Tamanho da lista: ${bytesList.length}');
          
          debugPrint('📄 Iniciando download...');
          
          // Tenta fazer download automático primeiro
          try {
            _downloadPdfFile(bytesList, fileName);
            debugPrint('✅ Tentativa de download automático realizada');
          } catch (e) {
            debugPrint('⚠️ Download automático falhou: $e');
          }
          
          // Sempre mostra o diálogo com botão de download como garantia
          // Isso funciona mesmo se o navegador bloquear downloads automáticos
          if (mounted) {
            _showDownloadDialog(bytesList, fileName, inscriptions.length);
          }
        } catch (e, stackTrace) {
          debugPrint('❌ Erro ao gerar/download PDF: $e');
          debugPrint('❌ Stack trace: $stackTrace');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Erro ao gerar PDF: $e'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      } else {
        // Para mobile, mostra mensagem
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Exportação disponível apenas na versão web. ${inscriptions.length} inscrição(ões) encontrada(s).'),
          ),
        );
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Erro geral na exportação: $e');
      debugPrint('❌ Stack trace: $stackTrace');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao exportar: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  pw.Widget _buildTableCell(String text, {bool isHeader = false}) {
    // Limita o tamanho do texto para evitar problemas no PDF
    final maxLength = 100;
    final displayText = text.length > maxLength 
        ? '${text.substring(0, maxLength)}...' 
        : text;
    
    return pw.Container(
      padding: const pw.EdgeInsets.all(4),
      child: pw.Text(
        displayText,
        style: pw.TextStyle(
          fontSize: isHeader ? 10 : 8,
          fontWeight: isHeader ? pw.FontWeight.bold : pw.FontWeight.normal,
        ),
        maxLines: 3,
        overflow: pw.TextOverflow.clip,
      ),
    );
  }

  void _downloadPdfFile(List<int> bytes, String fileName) {
    if (!kIsWeb) {
      debugPrint('Download de PDF disponível apenas na versão web');
      return;
    }
    
    try {
      pdf_download.downloadPdfFile(bytes, fileName);
      debugPrint('✅ PDF gerado e download iniciado: $fileName (${bytes.length} bytes)');
    } catch (e) {
      debugPrint('❌ Erro ao fazer download do PDF: $e');
      rethrow;
    }
  }

  void _showDownloadDialog(List<int> bytes, String fileName, int count) {
    if (!kIsWeb) return;
    pdf_dialog.showPdfDownloadDialog(context, bytes, fileName, count);
  }

  Widget _buildFormCard(FormModel form) {
    final statusColor = _getStatusColor(form.status);
    final statusText = _getStatusText(form.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => NewFormScreen(form: form),
            ),
          );
          if (result == true) {
            _loadData();
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          form.titulo,
                          style: GoogleFonts.robotoSlab(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (form.descricao != null && form.descricao!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            form.descricao!,
                            style: GoogleFonts.robotoSlab( fontSize: 14, color: Colors.grey[600]),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                            const SizedBox(width: 4),
                            Text(
                              DateFormat('dd/MM/yyyy', 'pt_BR').format(form.dataEvento),
                              style: GoogleFonts.robotoSlab( fontSize: 14, color: Colors.grey[600]),
                            ),
                            if (form.idSolicitacao1Doc != null) ...[
                              const SizedBox(width: 16),
                              Icon(Icons.description, size: 16, color: Colors.grey[600]),
                              const SizedBox(width: 4),
                              Text(
                                '1Doc: ${form.idSolicitacao1Doc}',
                                style: GoogleFonts.robotoSlab( fontSize: 14, color: Colors.grey[600]),
                              ),
                            ],
                          ],
                        ),
                        if (form.campos.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            '${form.campos.length} campo(s) customizado(s)',
                            style: GoogleFonts.robotoSlab( fontSize: 12, color: Colors.grey[500]),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          statusText,
                          style: GoogleFonts.robotoSlab(
                            color: statusColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        DateFormat('dd/MM/yyyy', 'pt_BR').format(form.createdAt),
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (form.status == FormStatus.aberto)
                    OutlinedButton.icon(
                      icon: const Icon(Icons.check, size: 18),
                      label: Text('Concluir', style: GoogleFonts.robotoSlab()),
                      onPressed: () => _updateFormStatus(form, FormStatus.concluido),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.green,
                      ),
                    ),
                  if (form.status == FormStatus.concluido)
                    OutlinedButton.icon(
                      icon: const Icon(Icons.arrow_back, size: 18),
                      label: Text('Reabrir', style: GoogleFonts.robotoSlab()),
                      onPressed: () => _updateFormStatus(form, FormStatus.aberto),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.orange,
                      ),
                    ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    onPressed: () => _deleteForm(form),
                    tooltip: 'Excluir',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(FormStatus status) {
    switch (status) {
      case FormStatus.aberto:
        return _azulMenu;
      case FormStatus.emAndamento:
        return Colors.orange;
      case FormStatus.concluido:
        return Colors.green;
    }
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
}

