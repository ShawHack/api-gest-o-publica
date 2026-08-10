import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../../models/appointment_model.dart';
import '../../services/appointment_service.dart';

/// Tela para visualizar agendamentos do usuário
class MyAppointmentsScreen extends StatefulWidget {
  const MyAppointmentsScreen({super.key});

  @override
  State<MyAppointmentsScreen> createState() => _MyAppointmentsScreenState();
}

class _MyAppointmentsScreenState extends State<MyAppointmentsScreen> {
  final AppointmentService _service = AppointmentService();
  
  List<Appointment> _appointments = [];
  bool _loading = false;
  String? _userId;

  @override
  void initState() {
    super.initState();
    _loadUserAndAppointments();
  }

  Future<void> _loadUserAndAppointments() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');

    debugPrint('🔍 Carregando usuário para Meus Agendamentos...');
    debugPrint('   User JSON: $userJson');

    if (userJson != null) {
      final user = jsonDecode(userJson);
      // Tenta pegar o ID de várias formas (_id do MongoDB ou id)
      _userId = user['id']?.toString() ??
                user['_id']?.toString() ??
                prefs.getString('userId') ??
                prefs.getString('auth_user_id');

      debugPrint('   User ID encontrado: $_userId');

      if (_userId != null) {
        _loadAppointments();
      } else {
        debugPrint('❌ User ID não encontrado!');
      }
    } else {
      debugPrint('❌ Nenhum usuário no SharedPreferences!');
    }
  }

  Future<void> _loadAppointments() async {
    if (_userId == null) {
      debugPrint('❌ Não pode carregar agendamentos: userId é null');
      return;
    }

    debugPrint('📅 Carregando agendamentos do usuário: $_userId');
    setState(() => _loading = true);
    try {
      final appointments = await _service.getUserAppointments(_userId!);
      debugPrint('✅ Agendamentos carregados: ${appointments.length}');

      for (var apt in appointments) {
        debugPrint('   - ${apt.date} ${apt.timeSlot} (${apt.status.name})');
        debugPrint('     requestMessage: ${apt.requestMessage}');
        debugPrint('     managerResponse: ${apt.managerResponse}');
        debugPrint('     respondedAt: ${apt.respondedAt}');
      }

      setState(() {
        _appointments = appointments;
      });
    } catch (e) {
      debugPrint('❌ Erro ao carregar agendamentos: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar agendamentos: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showAppointmentActions(Appointment appointment) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Título
            Text(
              'O que deseja fazer?',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              DateFormat('dd/MM/yyyy - HH:mm', 'pt_BR').format(appointment.date),
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 24),

            // Botão Reagendar
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _requestReschedule(appointment);
                },
                icon: const Icon(Icons.event_repeat),
                label: const Text('Reagendar Atendimento'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Botão Cancelar
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _requestCancellation(appointment);
                },
                icon: const Icon(Icons.cancel_outlined),
                label: const Text('Cancelar Atendimento'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Botão Fechar
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Fechar'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _requestCancellation(Appointment appointment) async {
    final messageController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Solicitar Cancelamento'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Deseja solicitar o cancelamento deste agendamento?',
                style: TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 8),
              const Text(
                'A solicitação será enviada para aprovação do gerente.',
                style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: messageController,
                decoration: const InputDecoration(
                  labelText: 'Justificativa',
                  hintText: 'Explique o motivo',
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.all(12),
                ),
                maxLines: 3,
                maxLength: 200,
                style: const TextStyle(fontSize: 14),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              if (messageController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Por favor, informe a justificativa'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }
              Navigator.pop(context, true);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Solicitar'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _service.requestChange(
          appointment.id!,
          RequestType.cancellation,
          message: messageController.text.trim(),
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Solicitação enviada com sucesso!'),
              backgroundColor: Colors.green,
            ),
          );
          _loadAppointments();
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

  Future<void> _requestReschedule(Appointment appointment) async {
    DateTime? newDate;
    String? newTimeSlot;
    final messageController = TextEditingController();

    // Seleciona nova data
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      locale: const Locale('pt', 'BR'),
    );

    if (pickedDate == null) return;
    newDate = pickedDate;

    // Carrega horários disponíveis
    final slots = await _service.getAvailableSlots(
      newDate,
      serviceId: appointment.serviceId,
    );
    final availableSlots = slots.where((s) => s.isAvailable).toList();

    if (availableSlots.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não há horários disponíveis nesta data')),
        );
      }
      return;
    }

    // Seleciona novo horário
    if (mounted) {
      newTimeSlot = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Selecione o Novo Horário'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: availableSlots.length,
              itemBuilder: (context, index) {
                final slot = availableSlots[index];
                return ListTile(
                  title: Text(slot.time),
                  onTap: () => Navigator.pop(context, slot.time),
                );
              },
            ),
          ),
        ),
      );
    }

    if (newTimeSlot == null) return;

    // Solicita justificativa
    if (mounted) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Justificativa'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Nova data e horário:',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  '${DateFormat('dd/MM/yyyy', 'pt_BR').format(newDate!)} às $newTimeSlot',
                  style: const TextStyle(fontSize: 14, color: Color(0xFF384D9C)), // RGB(56, 77, 156)
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: messageController,
                  decoration: const InputDecoration(
                    labelText: 'Justificativa',
                    hintText: 'Explique o motivo',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.all(12),
                  ),
                  maxLines: 3,
                  maxLength: 200,
                  style: const TextStyle(fontSize: 14),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                if (messageController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Por favor, informe a justificativa'),
                      backgroundColor: Colors.red,
                    ),
                  );
                  return;
                }
                Navigator.pop(context, true);
              },
              child: const Text('Solicitar'),
            ),
          ],
        ),
      );

      if (confirmed != true) return;
    }

    // Confirma reagendamento
    try {
      await _service.requestChange(
        appointment.id!,
        RequestType.reschedule,
        newDate: newDate,
        newTimeSlot: newTimeSlot,
        message: messageController.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Solicitação de reagendamento enviada!'),
            backgroundColor: Colors.green,
          ),
        );
        _loadAppointments();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('🎨 BUILD MyAppointmentsScreen');
    debugPrint('   Loading: $_loading');
    debugPrint('   Appointments: ${_appointments.length}');
    debugPrint('   UserId: $_userId');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meus Agendamentos'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAppointments,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _appointments.isEmpty
              ? _buildEmptyState()
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final screenWidth = constraints.maxWidth;
                    final isMobile = screenWidth < 600;
                    final padding = isMobile ? 12.0 : 16.0;
                    
                    return _buildAppointmentsList(padding);
                  },
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.event_busy, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'Você ainda não tem agendamentos',
            style: TextStyle(fontSize: 16, color: Colors.grey[600]),
          ),
          const SizedBox(height: 24),
          if (_userId == null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Erro: Usuário não identificado. Faça login novamente.',
                style: TextStyle(fontSize: 14, color: Colors.red[700]),
                textAlign: TextAlign.center,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAppointmentsList(double padding) {
    // Separa agendamentos futuros e passados
    final now = DateTime.now();
    // Compara considerando apenas a data (sem hora) para determinar se é futuro
    final upcoming = _appointments.where((a) {
      final appointmentDate = DateTime(a.date.year, a.date.month, a.date.day);
      final today = DateTime(now.year, now.month, now.day);
      final isFuture = appointmentDate.isAfter(today) || appointmentDate.isAtSameMomentAs(today);
      debugPrint('📅 Agendamento ${a.date}: appointmentDate=$appointmentDate, today=$today, isFuture=$isFuture');
      return isFuture;
    }).toList();
    final past = _appointments.where((a) {
      final appointmentDate = DateTime(a.date.year, a.date.month, a.date.day);
      final today = DateTime(now.year, now.month, now.day);
      return appointmentDate.isBefore(today);
    }).toList();
    
    debugPrint('📊 Agendamentos separados: ${upcoming.length} futuros, ${past.length} passados');

    return SingleChildScrollView(
      padding: EdgeInsets.all(padding),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1200),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (upcoming.isNotEmpty) ...[
              Text(
                'Próximos Agendamentos',
                style: TextStyle(
                  fontSize: padding < 14 ? 16 : 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: padding < 14 ? 8 : 12),
              ...upcoming.map((a) => _buildAppointmentCard(a, isFuture: true)),
              SizedBox(height: padding < 14 ? 16 : 24),
            ],
            
            if (past.isNotEmpty) ...[
              Text(
                'Agendamentos Anteriores',
                style: TextStyle(
                  fontSize: padding < 14 ? 16 : 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: padding < 14 ? 8 : 12),
              ...past.map((a) => _buildAppointmentCard(a, isFuture: false)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentCard(Appointment appointment, {required bool isFuture}) {
    final statusText = _getStatusText(appointment.status);
    
    // Debug para verificar condições
    final canShowActions = isFuture && appointment.status == AppointmentStatus.pending;
    debugPrint('🎯 Card de agendamento:');
    debugPrint('   isFuture: $isFuture');
    debugPrint('   status: ${appointment.status.name}');
    debugPrint('   canShowActions: $canShowActions');
    debugPrint('   kIsWeb: $kIsWeb');

    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final statusColor = _getStatusColor(appointment.status, isMobile: isMobile);
        final cardPadding = isMobile ? 12.0 : 16.0;
        final iconSize = isMobile ? 18.0 : 20.0;
        final fontSize = isMobile ? 14.0 : 16.0;
        final smallFontSize = isMobile ? 12.0 : 14.0;
        
        return Card(
          margin: EdgeInsets.only(bottom: isMobile ? 8 : 12),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: !kIsWeb && canShowActions
                ? () => _showAppointmentActions(appointment)
                : null,
            child: Padding(
              padding: EdgeInsets.all(cardPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Container(
                          padding: EdgeInsets.symmetric(
                            horizontal: isMobile ? 10 : 12,
                            vertical: isMobile ? 4 : 6,
                          ),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            statusText,
                            style: TextStyle(
                              color: statusColor,
                              fontWeight: FontWeight.bold,
                              fontSize: isMobile ? 11 : 12,
                            ),
                          ),
                        ),
                      ),
                      if (!kIsWeb && isFuture && appointment.status == AppointmentStatus.pending)
                        Icon(
                          Icons.touch_app,
                          size: iconSize,
                          color: Colors.grey[400],
                        ),
                    ],
                  ),
                  SizedBox(height: isMobile ? 8 : 12),

                  // Data
                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today,
                        size: iconSize,
                        color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                      ),
                      SizedBox(width: isMobile ? 6 : 8),
                      Expanded(
                        child: Text(
                          DateFormat('dd/MM/yyyy - EEEE', 'pt_BR').format(appointment.date),
                          style: TextStyle(
                            fontSize: fontSize,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: isMobile ? 6 : 8),

                  // Horário
                  Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        size: iconSize,
                        color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                      ),
                      SizedBox(width: isMobile ? 6 : 8),
                      Expanded(
                        child: Text(
                          appointment.timeSlot,
                          style: TextStyle(fontSize: fontSize),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: isMobile ? 6 : 8),

                  // Tipo de Agendamento (Serviço)
                  if (appointment.serviceName != null) ...[
                    Row(
                      children: [
                        Icon(
                          Icons.medical_services,
                          size: iconSize,
                          color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                        ),
                        SizedBox(width: isMobile ? 6 : 8),
                        Expanded(
                          child: Text(
                            appointment.serviceName!,
                            style: TextStyle(fontSize: fontSize),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],

                  // Mensagem de solicitação pendente (só mostra se status for changeRequested)
                  if (appointment.status == AppointmentStatus.changeRequested &&
                      appointment.requestMessage != null) ...[
                    SizedBox(height: isMobile ? 8 : 12),
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.all(isMobile ? 10 : 12),
                      decoration: BoxDecoration(
                        color: Colors.orange[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.orange[200]!),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.pending_actions,
                                size: isMobile ? 14 : 16,
                                color: Colors.orange[700],
                              ),
                              SizedBox(width: isMobile ? 4 : 6),
                              Text(
                                'Solicitação Pendente',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: isMobile ? 12 : 13,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: isMobile ? 4 : 6),
                          Text(
                            appointment.requestMessage!,
                            style: TextStyle(fontSize: smallFontSize),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],

                  // Resposta do gerente (aprovada ou negada)
                  // Mostra se tem resposta do gerente E não está mais com status changeRequested
                  if (appointment.managerResponse != null &&
                      appointment.status != AppointmentStatus.changeRequested &&
                      appointment.respondedAt != null) ...[
                    SizedBox(height: isMobile ? 8 : 12),
                    _buildManagerResponseCard(appointment),
                  ],

                  // Botões de ação (web) ou hint para clicar (mobile)
                  Builder(
                    builder: (context) {
                      final shouldShow = isFuture && appointment.status == AppointmentStatus.pending;
                      debugPrint('🔘 Verificando botões: shouldShow=$shouldShow, kIsWeb=$kIsWeb');
                      
                      if (!shouldShow) {
                        return const SizedBox.shrink();
                      }
                      
                      return Padding(
                        padding: EdgeInsets.only(top: isMobile ? 8 : 12),
                        child: kIsWeb
                            ? // Versão Web: botões explícitos
                            Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              OutlinedButton.icon(
                                icon: const Icon(Icons.event_repeat, size: 18),
                                label: const Text('Reagendar'),
                                onPressed: () {
                                  debugPrint('🔄 Botão Reagendar clicado na web');
                                  _requestReschedule(appointment);
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                ),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton.icon(
                                icon: const Icon(Icons.cancel, size: 18),
                                label: const Text('Cancelar'),
                                onPressed: () {
                                  debugPrint('❌ Botão Cancelar clicado na web');
                                  _requestCancellation(appointment);
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.red,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                ),
                              ),
                            ],
                          )
                        : // Versão Mobile: hint para clicar
                        Center(
                            child: Text(
                              'Toque para reagendar ou cancelar',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
        );
      },
    );
  }

  Widget _buildManagerResponseCard(Appointment appointment) {
    // Determina o tipo de ação do gerente
    Color bgColor;
    Color borderColor;
    Color iconColor;
    IconData icon;
    String title;

    if (appointment.status == AppointmentStatus.cancelled) {
      // Cancelado pelo gerente
      bgColor = Colors.red[50]!;
      borderColor = Colors.red[200]!;
      iconColor = Colors.red[700]!;
      icon = Icons.cancel_outlined;
      title = 'Agendamento Cancelado';
    } else if (appointment.status == AppointmentStatus.pending) {
      // Pode ser reagendamento ou negação de solicitação
      // Se tem requestType anterior, foi uma resposta a solicitação
      // Caso contrário, foi ação direta do gerente
      bgColor = const Color(0xFF384D9C).withOpacity(0.1);
      borderColor = const Color(0xFF384D9C).withOpacity(0.3);
      iconColor = const Color(0xFF384D9C); // RGB(56, 77, 156)
      icon = Icons.event_repeat;
      title = 'Agendamento Reagendado';
    } else {
      // Outros casos
      bgColor = Colors.grey[50]!;
      borderColor = Colors.grey[200]!;
      iconColor = Colors.grey[700]!;
      icon = Icons.info_outline;
      title = 'Atualização do Gerente';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: iconColor),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            appointment.managerResponse!,
            style: const TextStyle(fontSize: 12),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
          if (appointment.respondedAt != null) ...[
            const SizedBox(height: 4),
            Text(
              'Respondido em ${DateFormat('dd/MM/yyyy HH:mm', 'pt_BR').format(appointment.respondedAt!)}',
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey[600],
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getStatusColor(AppointmentStatus status, {bool isMobile = false}) {
    // Cores específicas para mobile
    if (isMobile) {
      switch (status) {
        case AppointmentStatus.pending:
          return const Color.fromRGBO(116, 150, 102, 1.0); // RGB(116, 150, 102) - Agendado
        case AppointmentStatus.changeRequested:
          return const Color.fromRGBO(255, 181, 131, 1.0); // RGB(255, 181, 131) - Aguardando aprovação
        case AppointmentStatus.cancelled:
          return const Color.fromRGBO(160, 46, 46, 1.0); // RGB(160, 46, 46) - Cancelado
        case AppointmentStatus.attended:
          return Colors.green;
        case AppointmentStatus.noShow:
          return Colors.orange;
        default:
          return Colors.grey;
      }
    }
    
    // Cores padrão para web
    switch (status) {
      case AppointmentStatus.pending:
        return const Color(0xFF384D9C); // RGB(56, 77, 156)
      case AppointmentStatus.attended:
        return Colors.green;
      case AppointmentStatus.noShow:
        return Colors.orange;
      case AppointmentStatus.cancelled:
        return Colors.red;
      case AppointmentStatus.changeRequested:
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.pending:
        return 'Agendado';
      case AppointmentStatus.attended:
        return 'Atendido';
      case AppointmentStatus.noShow:
        return 'Não Compareceu';
      case AppointmentStatus.cancelled:
        return 'Cancelado';
      case AppointmentStatus.changeRequested:
        return 'Aguardando Aprovação';
      default:
        return status.name;
    }
  }
}

