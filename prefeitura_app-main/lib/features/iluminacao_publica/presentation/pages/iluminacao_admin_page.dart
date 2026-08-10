import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mask_text_input_formatter/mask_text_input_formatter.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class IluminacaoAdminPage extends StatefulWidget {
  const IluminacaoAdminPage({super.key});

  @override
  State<IluminacaoAdminPage> createState() => _IluminacaoAdminPageState();
}

class _IluminacaoAdminPageState extends State<IluminacaoAdminPage> {
  final TextEditingController _whatsappController = TextEditingController();
  final _maskFormatter = MaskTextInputFormatter(
    mask: '(##) #####-####', 
    filter: { "#": RegExp(r'[0-9]') },
    type: MaskAutoCompletionType.lazy
  );
  bool _isLoadingConfig = false;
  List<String> _whatsappNumbers = [];

  String _selectedTab = 'reports'; // 'reports' or 'poles'

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    setState(() => _isLoadingConfig = true);
    try {
      final doc = await FirebaseFirestore.instance.collection('iluminacao_settings').doc('config').get();
      if (doc.exists && doc.data() != null) {
        final data = doc.data()!;
        if (data['whatsapp_numbers'] is List) {
           setState(() {
             _whatsappNumbers = List<String>.from(data['whatsapp_numbers']);
           });
        } else if (data['whatsapp_number'] != null) {
           // Migração legado (se tinha só um)
           setState(() {
             _whatsappNumbers = [data['whatsapp_number']];
           });
        }
      }
    } catch (e) {
      debugPrint('Erro ao carregar numbers: $e');
    } finally {
      if (mounted) setState(() => _isLoadingConfig = false);
    }
  }

  Future<void> _addNumber() async {
    final rawNumber = _maskFormatter.getUnmaskedText();
    if (_whatsappController.text.isEmpty || rawNumber.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Número inválido.')));
      return;
    }

    final newNumber = _whatsappController.text;
    if (_whatsappNumbers.contains(newNumber)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Este número já está na lista.')));
      return;
    }

    setState(() {
      _whatsappNumbers.add(newNumber);
      _whatsappController.clear();
      _maskFormatter.clear();
    });

    await _saveList();
  }

  Future<void> _removeNumber(String number) async {
    setState(() {
      _whatsappNumbers.remove(number);
    });
    await _saveList();
  }

  Future<void> _saveList() async {
    setState(() => _isLoadingConfig = true);
    try {
      await FirebaseFirestore.instance.collection('iluminacao_settings').doc('config').set({
        'whatsapp_numbers': _whatsappNumbers,
        'updated_at': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro ao salvar: $e')));
    } finally {
      if (mounted) setState(() => _isLoadingConfig = false);
    }
  }

  void _showPrintDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Gerar Etiqueta QR'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
             const Text('Digite o código do poste ou Plus Code para gerar a etiqueta.'),
             const SizedBox(height: 16),
             TextField(
               controller: controller,
               decoration: const InputDecoration(
                 labelText: 'Código / ID',
                 hintText: 'Ex: 86H4+3F ou POSTE-01',
                 border: OutlineInputBorder(),
               ),
             ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCELAR')),
          FilledButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                Navigator.pop(ctx);
                _generateAndPrintPdf(controller.text);
              }
            },
            child: const Text('GERAR PDF'),
          )
        ],
      ),
    );
  }

  Future<void> _generateAndPrintPdf(String data) async {
    try {
      // Registrar o poste gerado no banco de dados para controle
      await FirebaseFirestore.instance.collection('iluminacao_poles').doc(data).set({
        'poleId': data,
        'createdAt': FieldValue.serverTimestamp(),
        'type': 'generated_label',
      }, SetOptions(merge: true));

      final pdf = pw.Document();
      // ... (existing PDF generation code)
      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.roll80, 
          build: (pw.Context context) {
            return pw.Center(
              child: pw.Column(
                mainAxisAlignment: pw.MainAxisAlignment.center,
                children: [
                  pw.Text('ILUMINACAO PUBLICA', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                  pw.SizedBox(height: 10),
                  pw.Container(
                    padding: const pw.EdgeInsets.all(10),
                    color: PdfColors.white,
                    child: pw.BarcodeWidget(
                      barcode: pw.Barcode.qrCode(),
                      data: data,
                      width: 140,
                      height: 140,
                    ),
                  ),
                  pw.SizedBox(height: 10),
                  pw.Text(data, style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                  pw.SizedBox(height: 5),
                  pw.Text('Escaneie para reportar problema', style: const pw.TextStyle(fontSize: 8)),
                ],
              ),
            );
          },
        ),
      );

      await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => pdf.save(),
        name: 'etiqueta_${data.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_')}',
      );
      
      if (mounted) {
         setState(() {
           _selectedTab = 'poles'; // Muda para a aba de postes para mostrar o recém criado
         });
         ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Etiqueta gerada e poste registrado!')));
      }

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro ao gerar PDF: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Admin Iluminação', style: GoogleFonts.outfit()),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => setState((){}), 
          )
        ],
      ),
      body: Column(
        children: [
          // Configuração e Ferramentas (Expansível ou Fixo)
          // Vamos colocar em um ExpansionTile para economizar espaço
           ExpansionTile(
            title: Text('Configurações e Ferramentas', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                color: Colors.grey.shade100,
                child: Column(
                  children: [
                    // Config Whatsapp
                     Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _whatsappController,
                            inputFormatters: [_maskFormatter],
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              hintText: 'Add WhatsApp (DDD)...',
                              isDense: true,
                              prefixIcon: Icon(Icons.add_call, size: 20),
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filled(
                          onPressed: _isLoadingConfig ? null : _addNumber,
                          icon: const Icon(Icons.add),
                        ),
                      ],
                    ),
                    if (_whatsappNumbers.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8.0,
                        children: _whatsappNumbers.map((num) => Chip(
                          label: Text(num, style: const TextStyle(fontSize: 12)),
                          backgroundColor: Colors.white,
                          padding: EdgeInsets.zero,
                          labelPadding: const EdgeInsets.symmetric(horizontal: 8),
                          visualDensity: VisualDensity.compact,
                          deleteIcon: const Icon(Icons.close, size: 16, color: Colors.red),
                          onDeleted: () => _removeNumber(num),
                        )).toList(),
                      ),
                    ],
                    const Divider(),
                     SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _showPrintDialog,
                        icon: const Icon(Icons.print),
                        label: const Text('GERAR NOVA ETIQUETA'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: Colors.blue.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Abas de Navegação
          Container(
            color: Colors.white,
            child: Row(
              children: [
                Expanded(child: _buildTabButton('Reportes', 'reports', Icons.report_problem)),
                Expanded(child: _buildTabButton('Etiquetas Geradas', 'poles', Icons.qr_code)),
              ],
            ),
          ),
          
          const Divider(height: 1, thickness: 1),

          // Lista Principal
          Expanded(
            child: _selectedTab == 'reports' ? _buildReportsList() : _buildPolesList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton(String label, String value, IconData icon) {
    final isSelected = _selectedTab == value;
    return InkWell(
      onTap: () => setState(() => _selectedTab = value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(
            color: isSelected ? Theme.of(context).primaryColor : Colors.transparent,
            width: 3,
          )),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? Theme.of(context).primaryColor : Colors.grey),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? Theme.of(context).primaryColor : Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReportsList() {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('iluminacao_reports')
          .orderBy('createdAt', descending: true)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) return const Center(child: Text('Erro ao carregar dados'));
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) return const Center(child: Text('Nenhum reporte encontrado.'));

        return ListView.builder(
          itemCount: snapshot.data!.docs.length,
          itemBuilder: (context, index) {
            final doc = snapshot.data!.docs[index];
            final data = doc.data() as Map<String, dynamic>;
            final date = (data['createdAt'] as Timestamp?)?.toDate();
            final formattedDate = date != null ? DateFormat('dd/MM/yy HH:mm').format(date) : '-';
            final isPlusCode = data['isPlusCode'] == true;

            return Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: _getStatusColor(data['status']),
                  child: Icon(_getInputIcon(data['type']), color: Colors.white),
                ),
                title: Text(data['poleId'] ?? 'Sem ID', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                subtitle: Text('${_translateType(data['type'])} • $formattedDate'),
                trailing: isPlusCode ? const Icon(Icons.location_on, color: Colors.green) : null,
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildPolesList() {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('iluminacao_poles')
          .orderBy('createdAt', descending: true)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) return const Center(child: Text('Erro ao carregar dados'));
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
           return Center(
             child: Column(
               mainAxisAlignment: MainAxisAlignment.center,
               children: [
                 const Icon(Icons.broken_image, size: 48, color: Colors.grey),
                 const SizedBox(height: 16),
                 const Text('Nenhuma etiqueta gerada ainda.'),
                 TextButton(onPressed: _showPrintDialog, child: const Text('GERAR PRIMEIRA'))
               ],
             ),
           );
        }

        return ListView.builder(
          itemCount: snapshot.data!.docs.length,
          itemBuilder: (context, index) {
            final doc = snapshot.data!.docs[index];
            final data = doc.data() as Map<String, dynamic>;
            final date = (data['createdAt'] as Timestamp?)?.toDate();
            final formattedDate = date != null ? DateFormat('dd/MM/yy HH:mm').format(date) : '-';

            return Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              elevation: 0,
              color: Colors.blue.shade50,
              child: ListTile(
                leading: const Icon(Icons.qr_code_2, color: Colors.blue),
                title: Text(
                  data['poleId'] ?? 'Sem ID',
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18),
                ),
                subtitle: Text('Gerado em: $formattedDate'),
                trailing: IconButton(
                  icon: const Icon(Icons.print),
                  onPressed: () => _generateAndPrintPdf(data['poleId']),
                  tooltip: 'Reimprimir',
                ),
              ),
            );
          },
        );
      },
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'resolved': return Colors.green;
      case 'assigned': return Colors.blue;
      default: return Colors.orange; // pending
    }
  }

  IconData _getInputIcon(String? type) {
    switch (type) {
      case 'queimada': return Icons.lightbulb_outline;
      case 'piscando': return Icons.flourescent;
      case 'acesa_dia': return Icons.wb_sunny_outlined;
      case 'danificado': return Icons.warning_amber_rounded;
      default: return Icons.help_outline;
    }
  }

  String _translateType(String? type) {
     switch (type) {
      case 'queimada': return 'Lâmpada Queimada';
      case 'piscando': return 'Luz Piscando';
      case 'acesa_dia': return 'Acesa de Dia';
      case 'danificado': return 'Poste Danificado';
      default: return type ?? 'Outro';
    }
  }
}
