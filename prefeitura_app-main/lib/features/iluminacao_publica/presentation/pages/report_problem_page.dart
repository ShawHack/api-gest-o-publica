import 'package:flutter/material.dart';

import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:open_location_code/open_location_code.dart' as olc;

class ReportProblemPage extends StatefulWidget {
  final String poleId;
  final bool fromQrScan;
  const ReportProblemPage({
    super.key,
    required this.poleId,
    this.fromQrScan = false,
  });

  @override
  State<ReportProblemPage> createState() => _ReportProblemPageState();
}

class _ReportProblemPageState extends State<ReportProblemPage> {
  bool _isLoading = false;
  bool _isSuccess = false;
  
  // Dados do Plus Code
  bool _isPlusCode = false;
  String _coordinates = '';
  double? _lat;
  double? _lng;
  
  // Config
  List<String> _adminWhatsapps = ['14981122378'];

  @override
  void initState() {
    super.initState();
    _checkPlusCode();
    _fetchAdminConfig();
  }

  Future<void> _fetchAdminConfig() async {
    try {
      final doc = await FirebaseFirestore.instance.collection('iluminacao_settings').doc('config').get();
      if (doc.exists && doc.data() != null) {
        final data = doc.data()!;
        final dynamic whatsappData = data['whatsapp_number']; 
        // Nota: se o campo no firestore for 'whatsapp_numbers' (plural), ajustar conforme sua estrutura.
        // O código anterior lia 'whatsapp_number' (singular) ou lista.
        
        // Vamos manter o número fixo e ADICIONAR os do firebase, evitando duplicatas
        final Set<String> numbers = Set.from(_adminWhatsapps);

        if (whatsappData is String) {
          numbers.add(whatsappData);
        } else if (whatsappData is List) {
          numbers.addAll(List<String>.from(whatsappData));
        } else {
           // Tenta ler o campo plural se o singular falhar
           final dynamic whatsappNumbers = data['whatsapp_numbers'];
           if (whatsappNumbers is List) {
             numbers.addAll(List<String>.from(whatsappNumbers));
           }
        }
        
        if (mounted) {
          setState(() {
            _adminWhatsapps = numbers.toList();
          });
        }
      }
    } catch(e) {
      debugPrint('Erro config: $e');
    }
  }

  void _openWhatsApp() {
    if (_adminWhatsapps.isEmpty) return;
    _startSequentialDispatch(0);
  }

  Future<void> _startSequentialDispatch(int index) async {
    if (index >= _adminWhatsapps.length) {
      return;
    }

    final phone = _adminWhatsapps[index];
    final isLast = index == _adminWhatsapps.length - 1;

    // Se houver mais de um número, avisar o usuário do processo
    if (_adminWhatsapps.length > 1) {
      final shouldContinue = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: Text('Enviando ${index + 1}/${_adminWhatsapps.length}'),
          content: Text(
            'Agora vamos abrir o WhatsApp para o número:\n\n$phone\n\n'
            '1. Envie a mensagem.\n'
            '2. Volte para este aplicativo para enviar ao próximo.',
            style: const TextStyle(fontSize: 16),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false), // Cancelar
              child: const Text('CANCELAR'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true), // Continuar
              child: Text(isLast ? 'ENVIAR E FINALIZAR' : 'ENVIAR E PRÓXIMO'),
            ),
          ],
        ),
      );

      if (shouldContinue != true) return;
    }

    // Lança o WhatsApp
    await _launchWhatsapp(phone);

    // Se não for o último, chama o próximo recursivamente após um pequeno delay
    if (!isLast) {
      if (mounted) {
         _startSequentialDispatch(index + 1);
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Todos os alertas foram iniciados!')));
      }
    }
  }

  Future<void> _launchWhatsapp(String phone) async {
    // Remove formatting characters
    String cleanNumber = phone.replaceAll(RegExp(r'[^\d]'), '');
    
    // Lógica inteligente para prefixo 55
    if (!cleanNumber.startsWith('55') || cleanNumber.length <= 11) {
      cleanNumber = '55$cleanNumber';
    }

    // Verifica se é Plus Code (considerando validação mais permissiva)
    final bool isLocation = _isPlusCode || (widget.poleId.contains('+') && widget.poleId.length >= 6);

    String locationInfo = 'ID: ${widget.poleId}';
    
    if (isLocation) {
      // Cria um link do Google Maps
      // 1. Prioriza coordenadas exatas se tivermos decodificado com sucesso
      if (_lat != null && _lng != null) {
         locationInfo = 'Abrir no Maps: https://www.google.com/maps/search/?api=1&query=$_lat,$_lng';
      } else {
         // 2. Fallback para busca textual pelo Plus Code
         final encodedCode = Uri.encodeComponent(widget.poleId);
         locationInfo = 'Abrir no Maps: https://www.google.com/maps/search/?api=1&query=$encodedCode';
      }
    }

    final message = Uri.encodeComponent(
      'Olá! Defeito na iluminação pública.\n'
      '$locationInfo'
    );
    
    final url = Uri.parse("https://wa.me/$cleanNumber?text=$message");
    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
         throw 'Não foi possível abrir';
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erro ao abrir WhatsApp')));
    }
  }

  // No topo do arquivo, adicione:
  // import 'package:open_location_code/open_location_code.dart' as olc;

  void _checkPlusCode() {
    // 1. Tentar validação simples (heurística) para setar a flag de interface sem travar
    final bool simpleCheck = widget.poleId.contains('+') && widget.poleId.length >= 6;
    
    // 2. Tentar decodificar usando a classe PlusCode da biblioteca
    try {
      String code = widget.poleId.trim().toUpperCase();
      
      // A biblioteca open_location_code 1.0.1 em Dart usa construtor para criar o objeto code
      // e depois chama decode() nele.
      final plusCode = olc.PlusCode(code);
      
      // Tenta decodificar. Se for um código válido e COMPLETO, retorna a área.
      // Se for curto (sem cidade) ou inválido, pode lançar exceção ou não retornar coordenadas úteis.
      
      // Nota: A biblioteca pode não lançar exceção para short codes, mas o decode() retornará.
      final area = plusCode.decode();
      
      // Verifica se decodificou algo sensato (lat/lng não nulos)
      // Para short codes, o decode pode funcionar mas requer referência. Sem referência, assume 0,0 ou similar?
      // Vamos assumir que se o decode funcionou sem erro, temos um código "válido" sintaticamente.
      
      // Porém, para extrair lat/long precisos para GPS, precisamos saber se é FULL.
      // A versão Dart dessa lib pode não ter 'isFull' exposto facilmente ou ter outro nome.
      // Vamos verificar pelo tamanho do código limpo.
      // Global codes tem 8+ chars (ex: 86H4+3F não é global. 796R86H4+3F é.)
      // Referência: Plus Code Global tem pelo menos 8 caracteres ANTES do sinal de +? Não.
      // Estrutura: 86H4+3F (4+2 chars) -> Short.
      // 86H4V7JV+3F (8+2 chars) -> Full.
      
      String clean = code.replaceAll('+', '');
      bool seemsFull = clean.length >= 8;

      if (seemsFull) {
         setState(() {
           _isPlusCode = true;
           _lat = area.center.latitude;
           _lng = area.center.longitude;
           _coordinates = '${_lat!.toStringAsFixed(5)}, ${_lng!.toStringAsFixed(5)}';
         });
      } else {
         // É um short code ou inválido para navegação direta sem contexto.
         // Marcamos visualmente, mas sem lat/lng precisos.
         setState(() {
           _isPlusCode = true;
           _coordinates = 'Código Local (Requer referência)';
         });
      }

    } catch (e) {
      debugPrint('Erro ao decodificar Plus Code: $e');
      // Fallback
      if (simpleCheck) {
        setState(() {
          _isPlusCode = true;
          _coordinates = widget.poleId;
        });
      }
    }
  }

  void _submitReport(String problemType) async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Cria o objeto do reporte
      final reportData = {
        'poleId': widget.poleId,
        'type': problemType,
        'status': 'pending', // pending, assigned, resolved
        'createdAt': FieldValue.serverTimestamp(),
        'isPlusCode': _isPlusCode,
        'location': _isPlusCode && _lat != null ? GeoPoint(_lat!, _lng!) : null,
      };

      // Envia para o Firestore
      await FirebaseFirestore.instance.collection('iluminacao_reports').add(reportData);

      if (mounted) {
        setState(() {
          _isLoading = false;
          _isSuccess = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao enviar reporte: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isSuccess) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle_outline, color: Colors.green, size: 80),
                const SizedBox(height: 16),
                Text(
                  'Recebido!',
                  style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'A ocorrência no local ${widget.poleId} foi registrada.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(fontSize: 16, color: Colors.grey),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false), 
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.all(16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('VOLTAR AO INÍCIO'),
                  ),
                ),
                if (_adminWhatsapps.isNotEmpty && !widget.fromQrScan) ...[
                   const SizedBox(height: 16),
                   SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _openWhatsApp,
                        icon: const Icon(Icons.message, color: Colors.green),
                        label: const Text('AVISAR NO WHATSAPP', style: TextStyle(color: Colors.green)),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.all(16),
                          side: const BorderSide(color: Colors.green),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                   )
                ]
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Reportar Problema', style: GoogleFonts.outfit()),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: _isPlusCode ? Colors.green.shade50 : Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _isPlusCode ? Colors.green.shade200 : Colors.blue.shade100),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              _isPlusCode ? Icons.location_on : Icons.lightbulb,
                              color: _isPlusCode ? Colors.green.shade700 : Colors.blue.shade800,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _isPlusCode ? 'LOCALIZAÇÃO PRECISA (PLUS CODE)' : 'IDENTIFICAÇÃO DO POSTE',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: _isPlusCode ? Colors.green.shade800 : Colors.blue.shade800,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          widget.poleId,
                          style: GoogleFonts.outfit(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                            letterSpacing: 1.1,
                          ),
                        ),
                        if (_isPlusCode) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Coords: $_coordinates',
                            style: GoogleFonts.outfit(
                              fontSize: 14,
                              color: Colors.grey.shade700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                final encodedCode = Uri.encodeComponent(widget.poleId);
                                final url = Uri.parse('https://www.google.com/maps/search/?api=1&query=$encodedCode');
                                try {
                                  if (await canLaunchUrl(url)) {
                                    await launchUrl(url, mode: LaunchMode.externalApplication);
                                  } else {
                                    throw 'Erro ao lançar';
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível abrir o mapa')));
                                  }
                                }
                              },
                              icon: const Icon(Icons.map, size: 18),
                              label: const Text('ABRIR NO MAPA'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.green.shade700,
                                side: BorderSide(color: Colors.green.shade200),
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Este código garante que a equipe de reparo encontre o poste exato no mapa.',
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              color: Colors.green.shade800,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ] else ...[
                           const Text('ID interno do sistema'),
                        ]
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'Qual é o problema?',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildOption(
                    context,
                    title: 'Lâmpada Queimada',
                    subtitle: 'A luz não acende durante a noite.',
                    icon: Icons.lightbulb_outline,
                    color: Colors.orange,
                    onTap: () => _submitReport('queimada'),
                  ),
                  _buildOption(
                    context,
                    title: 'Luz Piscando',
                    subtitle: 'A iluminação está intermitente.',
                    icon: Icons.flourescent,
                    color: Colors.amber,
                    onTap: () => _submitReport('piscando'),
                  ),
                  _buildOption(
                    context,
                    title: 'Acesa de Dia',
                    subtitle: 'Desperdício de energia.',
                    icon: Icons.wb_sunny_outlined,
                    color: Colors.blue,
                    onTap: () => _submitReport('acesa_dia'),
                  ),
                   _buildOption(
                    context,
                    title: 'Poste Danificado',
                    subtitle: 'Estrutura torta ou perigosa.',
                    icon: Icons.warning_amber_rounded,
                    color: Colors.red,
                    onTap: () => _submitReport('danificado'),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildOption(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade200),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        subtitle,
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
