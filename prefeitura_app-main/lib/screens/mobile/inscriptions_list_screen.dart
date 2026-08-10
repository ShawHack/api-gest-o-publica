import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import '../../models/form_model.dart';
import '../../services/form_service.dart';
import '../../services/inscription_service.dart';
import 'form_detail_screen.dart';

// Import condicional para FormDetailWebScreen (apenas na web)
import '../web/form_detail_web_screen_stub.dart'
    if (dart.library.html) '../web/form_detail_web_screen.dart' as web_detail;

/// Tela que lista todos os formulários abertos para inscrição
class InscriptionsListScreen extends StatefulWidget {
  const InscriptionsListScreen({super.key});

  @override
  State<InscriptionsListScreen> createState() => _InscriptionsListScreenState();
}

class _InscriptionsListScreenState extends State<InscriptionsListScreen> {
  final FormService _formService = FormService();
  final InscriptionService _inscriptionService = InscriptionService();
  List<FormModel> _forms = [];
  bool _loading = true;
  String? _userId;

  @override
  void initState() {
    super.initState();
    _loadUserAndForms();
  }

  Future<void> _loadUserAndForms() async {
    final prefs = await SharedPreferences.getInstance();
    _userId = prefs.getString('userId') ?? prefs.getString('auth_user_id');

    if (_userId == null || _userId!.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Você precisa estar logado para ver as inscrições.')),
        );
        Navigator.pop(context);
      }
      return;
    }

    await _loadForms();
  }

  Future<void> _loadForms() async {
    setState(() => _loading = true);
    try {
      // Busca apenas formulários abertos
      final forms = await _formService.getForms(status: FormStatus.aberto);
      
      // Verifica quais já estão inscritos
      final formsWithStatus = await Future.wait(
        forms.map((form) async {
          final isInscribed = await _inscriptionService.isUserInscribed(form.id!, _userId!);
          return {'form': form, 'isInscribed': isInscribed};
        }),
      );

      if (mounted) {
        setState(() {
          _forms = forms;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar formulários: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inscrições'),
        backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _forms.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.description_outlined, size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(
                        'Nenhum formulário aberto no momento',
                        style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadForms,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _forms.length,
                    itemBuilder: (context, index) {
                      final form = _forms[index];
                      return _buildFormCard(form);
                    },
                  ),
                ),
    );
  }

  Widget _buildFormCard(FormModel form) {
    return FutureBuilder<bool>(
      future: _inscriptionService.isUserInscribed(form.id!, _userId!),
      builder: (context, snapshot) {
        final isInscribed = snapshot.data ?? false;
        
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: InkWell(
            onTap: () {
              if (kIsWeb) {
                // Na web, usa FormDetailWebScreen
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => web_detail.FormDetailWebScreen(form: form, userId: _userId!),
                  ),
                ).then((_) => _loadForms());
              } else {
                // No mobile, usa FormDetailScreen
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => FormDetailScreen(form: form, userId: _userId!),
                  ),
                ).then((_) => _loadForms());
              }
            },
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          form.titulo,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (isInscribed)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.green[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.check_circle, size: 16, color: Colors.green[700]),
                              const SizedBox(width: 4),
                              Text(
                                'Inscrito',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.green[700],
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  if (form.descricao != null && form.descricao!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      form.descricao!,
                      style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 8),
                      Text(
                        'Data do evento: ${DateFormat('dd/MM/yyyy').format(form.dataEvento)}',
                        style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.article, size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 8),
                      Text(
                        '${form.campos.length} campo(s) no formulário',
                        style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

