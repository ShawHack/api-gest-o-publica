import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import '../../models/appointment_model.dart';
import '../../models/service.dart';
import '../../services/appointment_service.dart';
import '../../widgets/custom_app_bar.dart';
import '../../widgets/copyright_footer.dart';

/// Tela Web para Atendente gerenciar agendamentos
class AttendantWebScreen extends StatefulWidget {
  const AttendantWebScreen({super.key});

  @override
  State<AttendantWebScreen> createState() => _AttendantWebScreenState();
}

class _AttendantWebScreenState extends State<AttendantWebScreen> {
  final AppointmentService _service = AppointmentService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  DateTime _selectedDate = DateTime.now();
  String _viewMode = 'day'; // 'day', 'week', 'month'
  List<Appointment> _appointments = [];
  List<Appointment> _pendingRequests = []; // Solicitações pendentes dos serviços do atendente
  bool _loading = false;
  String? _userName;
  String? _userCpf;
  String? _userId; // ID do usuário (MongoDB _id)
  List<Service> _attendantServices = []; // Lista de serviços do atendente
  int _selectedTab = 0; // 0: Agendamentos, 1: Solicitações

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? prefs.getString('auth_token');
    _userName = prefs.getString('auth_user_name');

    if (token == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Você precisa estar logado')),
        );
        Navigator.pushReplacementNamed(context, '/web');
      }
      return;
    }

    // Busca dados do usuário
    final userJson = prefs.getString('user');
    if (userJson != null) {
      final user = jsonDecode(userJson);
      _userCpf = user['cpf'];
      _userId = user['id']?.toString() ?? 
                user['_id']?.toString() ?? 
                prefs.getString('userId') ?? 
                prefs.getString('auth_user_id');
      debugPrint('👤 Dados do atendente:');
      debugPrint('   CPF: $_userCpf');
      debugPrint('   ID: $_userId');

      // Busca o serviço atribuído ao atendente
      await _loadAttendantService();
    }

    _loadAppointments();
    _loadPendingRequests();
  }

  /// Normaliza CPF removendo formatação (pontos e traços)
  String _normalizeCpf(String? cpf) {
    if (cpf == null || cpf.isEmpty) return '';
    return cpf.replaceAll(RegExp(r'[^\d]'), '');
  }

  /// Busca os serviços atribuídos ao atendente pelo CPF ou ID
  Future<void> _loadAttendantService() async {
    if (_userCpf == null && _userId == null) {
      debugPrint('⚠️ CPF e ID não disponíveis para buscar serviços');
      return;
    }

    try {
      debugPrint('🔍 Buscando serviços do atendente...');
      debugPrint('   CPF: $_userCpf');
      debugPrint('   ID: $_userId');

      // Busca serviços onde o atendente está cadastrado (pode ser por CPF ou ID)
      List<String> searchValues = [];
      
      // Adiciona CPF normalizado (sem formatação)
      if (_userCpf != null && _userCpf!.isNotEmpty) {
        final normalizedCpf = _normalizeCpf(_userCpf);
        if (normalizedCpf.isNotEmpty) {
          searchValues.add(normalizedCpf);
        }
        // Também tenta com o CPF original (caso esteja armazenado formatado)
        if (_userCpf != normalizedCpf) {
          searchValues.add(_userCpf!);
        }
      }
      
      // Adiciona ID do usuário
      if (_userId != null && _userId!.isNotEmpty) {
        searchValues.add(_userId!);
      }

      // Remove duplicatas
      searchValues = searchValues.toSet().toList();

      if (searchValues.isEmpty) {
        debugPrint('⚠️ Nenhum valor de busca disponível (CPF ou ID)');
        setState(() {
          _attendantServices = [];
        });
        return;
      }

      // Busca serviços que contenham qualquer um dos valores (CPF ou ID)
      // Como o Firestore não suporta OR nativo, buscamos por cada valor e combinamos
      Set<String> foundServiceIds = {};
      List<Service> allServices = [];

      for (String searchValue in searchValues) {
        debugPrint('   🔎 Buscando por: $searchValue');
        final snapshot = await _firestore
            .collection('services')
            .where('attendants', arrayContains: searchValue)
            .get();

        for (var doc in snapshot.docs) {
          if (!foundServiceIds.contains(doc.id)) {
            foundServiceIds.add(doc.id);
            allServices.add(Service.fromFirestore(doc));
            debugPrint('      ✅ Encontrado serviço: ${doc.data()['name']}');
          }
        }
      }

      if (allServices.isNotEmpty) {
        setState(() {
          _attendantServices = allServices;
        });
        debugPrint('✅ ${allServices.length} serviço(s) encontrado(s): ${allServices.map((s) => s.name).join(", ")}');
        
        // Debug: mostra os atendentes de cada serviço encontrado
        for (var service in allServices) {
          debugPrint('   📋 Serviço "${service.name}" tem atendentes: ${service.attendants.join(", ")}');
        }
      } else {
        debugPrint('⚠️ Atendente não está atribuído a nenhum serviço');
        debugPrint('   Valores buscados: ${searchValues.join(", ")}');
        setState(() {
          _attendantServices = [];
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Você não está atribuído a nenhum serviço. Contate o gerente.'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 5),
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('❌ Erro ao buscar serviços do atendente: $e');
      setState(() {
        _attendantServices = [];
      });
    }
  }

  /// Carrega solicitações pendentes filtradas pelos serviços do atendente
  Future<void> _loadPendingRequests() async {
    // Se o atendente não tem serviços atribuídos, não carrega solicitações
    if (_attendantServices.isEmpty) {
      setState(() {
        _pendingRequests = [];
      });
      return;
    }

    try {
      final allRequests = await _service.getPendingRequests();
      
      // Filtra apenas solicitações dos serviços do atendente
      final serviceIds = _attendantServices.map((s) => s.id).toSet();
      final filteredRequests = allRequests
          .where((request) => 
              request.serviceId != null && 
              serviceIds.contains(request.serviceId) &&
              // Remove solicitações que já foram atendidas ou não compareceram
              request.status != AppointmentStatus.attended && 
              request.status != AppointmentStatus.noShow)
          .toList();
      
      debugPrint('📋 Solicitações do atendente: ${filteredRequests.length} de ${allRequests.length}');
      
      setState(() {
        _pendingRequests = filteredRequests;
      });
    } catch (e) {
      debugPrint('Erro ao carregar solicitações: $e');
      setState(() {
        _pendingRequests = [];
      });
    }
  }

  Future<void> _loadAppointments() async {
    // Se o atendente não tem serviços atribuídos, não carrega agendamentos
    if (_attendantServices.isEmpty) {
      setState(() {
        _appointments = [];
        _loading = false;
      });
      return;
    }

    setState(() => _loading = true);
    try {
      DateTime startDate, endDate;

      if (_viewMode == 'day') {
        startDate = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day);
        endDate = startDate.add(const Duration(days: 1));
      } else if (_viewMode == 'week') {
        // Início da semana (domingo)
        final weekday = _selectedDate.weekday == 7 ? 0 : _selectedDate.weekday;
        startDate = _selectedDate.subtract(Duration(days: weekday));
        endDate = startDate.add(const Duration(days: 7));
      } else {
        // Mês
        startDate = DateTime(_selectedDate.year, _selectedDate.month, 1);
        endDate = DateTime(_selectedDate.year, _selectedDate.month + 1, 1);
      }

      final appointments = await _service.getAppointmentsByDateRange(
        startDate,
        endDate,
      );

      // Filtra apenas agendamentos dos serviços do atendente
      final serviceIds = _attendantServices.map((s) => s.id).toSet();
      final filteredAppointments = appointments
          .where((apt) => apt.serviceId != null && serviceIds.contains(apt.serviceId))
          .toList();
      
      debugPrint('📋 Agendamentos filtrados: ${filteredAppointments.length} de ${appointments.length} (${_attendantServices.length} serviço(s))');

      setState(() {
        _appointments = filteredAppointments;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar agendamentos: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  /// Verifica se o horário do agendamento já passou
  bool _hasAppointmentPassed(Appointment appointment) {
    final now = DateTime.now();
    
    // Pega a data do agendamento (sem hora)
    final appointmentDate = DateTime(
      appointment.date.year,
      appointment.date.month,
      appointment.date.day,
    );
    
    // Pega a data de hoje (sem hora)
    final today = DateTime(now.year, now.month, now.day);
    
    // Se o agendamento é em uma data passada, já passou
    if (appointmentDate.isBefore(today)) {
      return true;
    }
    
    // Se o agendamento é em uma data futura, ainda não passou
    if (appointmentDate.isAfter(today)) {
      return false;
    }
    
    // Se é hoje, precisa verificar o horário
    try {
      // Extrai a hora de início do timeSlot (ex: "08:00" de "08:00-08:20")
      final startTimeStr = appointment.timeSlot.split('-')[0].trim();
      final timeParts = startTimeStr.split(':');
      
      if (timeParts.length != 2) {
        debugPrint('⚠️ Formato de horário inválido: ${appointment.timeSlot}');
        return false; // Em caso de erro, não libera (mais seguro)
      }
      
      final slotHour = int.parse(timeParts[0]);
      final slotMinute = int.parse(timeParts[1]);
      
      // Cria DateTime completo com a data e horário do agendamento
      final appointmentDateTime = DateTime(
        appointment.date.year,
        appointment.date.month,
        appointment.date.day,
        slotHour,
        slotMinute,
      );
      
      // Compara com o horário atual
      final hasPassed = appointmentDateTime.isBefore(now);
      
      debugPrint('🕐 Verificação de horário:');
      debugPrint('   Agendamento: ${DateFormat('dd/MM/yyyy HH:mm').format(appointmentDateTime)}');
      debugPrint('   Agora: ${DateFormat('dd/MM/yyyy HH:mm').format(now)}');
      debugPrint('   Já passou: $hasPassed');
      
      return hasPassed;
    } catch (e) {
      debugPrint('❌ Erro ao verificar horário do agendamento: $e');
      return false; // Em caso de erro, não libera (mais seguro)
    }
  }

  Future<void> _updateStatus(Appointment appointment, AppointmentStatus newStatus) async {
    // Validação de segurança: verifica se o horário já passou
    if (!_hasAppointmentPassed(appointment)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Apenas é possível marcar como atendido ou não compareceu após o horário do agendamento ter passado.'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 4),
          ),
        );
      }
      return;
    }

    try {
      await _service.updateAppointmentStatus(appointment.id!, newStatus);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Status atualizado para: ${_getStatusText(newStatus)}'),
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
    return Scaffold(
      appBar: CustomAppBar(
        title: 'Painel do Atendente',
        actions: [
          if (_attendantServices.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color.fromRGBO(238, 112, 112, 1.0).withValues(alpha: 0.1), // RGB(238, 112, 112)
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color.fromRGBO(238, 112, 112, 1.0)), // RGB(238, 112, 112)
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.work, size: 16, color: Color.fromRGBO(238, 112, 112, 1.0)), // RGB(238, 112, 112)
                      const SizedBox(width: 6),
                      Text(
                        _attendantServices.length == 1
                            ? _attendantServices.first.name
                            : '${_attendantServices.length} Serviços',
                        style: GoogleFonts.getFont('Roboto Slab',
                          color: const Color.fromRGBO(238, 112, 112, 1.0), // RGB(238, 112, 112)
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (_userName != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: Text(
                  'Olá, $_userName',
                  style: GoogleFonts.getFont('Roboto Slab',
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
                Navigator.pushReplacementNamed(context, '/web');
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _buildTabBar(),
          _selectedTab == 0 ? _buildToolbar() : const SizedBox.shrink(),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _selectedTab == 0
                    ? _buildAppointmentsList()
                    : _buildRequestsList(),
          ),
          const CopyrightFooter(),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      color: const Color.fromRGBO(56, 77, 156, 1.0), // RGB(56, 77, 156)
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () => setState(() => _selectedTab = 0),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: _selectedTab == 0 
                      ? const Color.fromRGBO(238, 112, 112, 1.0) // RGB(238, 112, 112) quando selecionado
                      : const Color.fromRGBO(56, 77, 156, 1.0), // RGB(56, 77, 156) quando não selecionado
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.calendar_today,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Agendamentos',
                      style: GoogleFonts.getFont('Roboto Slab',
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
              onTap: () {
                setState(() => _selectedTab = 1);
                _loadPendingRequests();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: _selectedTab == 1 
                      ? const Color.fromRGBO(238, 112, 112, 1.0) // RGB(238, 112, 112) quando selecionado
                      : const Color.fromRGBO(56, 77, 156, 1.0), // RGB(56, 77, 156) quando não selecionado
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Badge(
                      label: Text('${_pendingRequests.length}'),
                      isLabelVisible: _pendingRequests.isNotEmpty,
                      child: Icon(
                        Icons.pending_actions,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Solicitações',
                      style: GoogleFonts.getFont('Roboto Slab',
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

  Widget _buildToolbar() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final padding = isMobile ? 12.0 : 16.0;
        
        return Container(
          padding: EdgeInsets.all(padding),
          color: const Color.fromRGBO(116, 129, 209, 1.0), // RGB(116, 129, 209)
          child: isMobile
              ? Column(
                  children: [
                    // Seletor de visualização
                    SegmentedButton<String>(
                      segments: [
                        ButtonSegment(
                          value: 'day',
                          label: Text('Dia', style: GoogleFonts.getFont('Roboto Slab', color: Colors.white, fontSize: 11)),
                          icon: const Icon(Icons.today, color: Colors.white, size: 16),
                        ),
                        ButtonSegment(
                          value: 'week',
                          label: Text('Semana', style: GoogleFonts.getFont('Roboto Slab', color: Colors.white, fontSize: 11)),
                          icon: const Icon(Icons.view_week, color: Colors.white, size: 16),
                        ),
                        ButtonSegment(
                          value: 'month',
                          label: Text('Mês', style: GoogleFonts.getFont('Roboto Slab', color: Colors.white, fontSize: 11)),
                          icon: const Icon(Icons.calendar_month, color: Colors.white, size: 16),
                        ),
                      ],
                      selected: {_viewMode},
                      onSelectionChanged: (Set<String> newSelection) {
                        setState(() {
                          _viewMode = newSelection.first;
                        });
                        _loadAppointments();
                      },
                      style: SegmentedButton.styleFrom(
                        selectedForegroundColor: Colors.white,
                        foregroundColor: Colors.white,
                        selectedBackgroundColor: Colors.white.withOpacity(0.3),
                        side: const BorderSide(color: Colors.white, width: 1),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Navegação de data
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.chevron_left, color: Colors.white),
                          onPressed: () {
                            setState(() {
                              if (_viewMode == 'day') {
                                _selectedDate = _selectedDate.subtract(const Duration(days: 1));
                              } else if (_viewMode == 'week') {
                                _selectedDate = _selectedDate.subtract(const Duration(days: 7));
                              } else {
                                _selectedDate = DateTime(_selectedDate.year, _selectedDate.month - 1);
                              }
                            });
                            _loadAppointments();
                          },
                        ),
                        Expanded(
                          child: Text(
                            _getDateRangeText(),
                            style: GoogleFonts.getFont('Roboto Slab',
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.chevron_right, color: Colors.white),
                          onPressed: () {
                            setState(() {
                              if (_viewMode == 'day') {
                                _selectedDate = _selectedDate.add(const Duration(days: 1));
                              } else if (_viewMode == 'week') {
                                _selectedDate = _selectedDate.add(const Duration(days: 7));
                              } else {
                                _selectedDate = DateTime(_selectedDate.year, _selectedDate.month + 1);
                              }
                            });
                            _loadAppointments();
                          },
                        ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        TextButton.icon(
                          icon: const Icon(Icons.today, size: 18, color: Colors.white),
                          label: Text('Hoje', style: GoogleFonts.getFont('Roboto Slab', color: Colors.white)),
                          onPressed: () {
                            setState(() {
                              _selectedDate = DateTime.now();
                            });
                            _loadAppointments();
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh, color: Colors.white),
                          onPressed: _loadAppointments,
                          tooltip: 'Atualizar',
                        ),
                      ],
                    ),
                  ],
                )
              : Row(
                  children: [
                    // Seletor de visualização
                    SegmentedButton<String>(
                      segments: [
                        ButtonSegment(
                          value: 'day',
                          label: Text('Dia', style: GoogleFonts.getFont('Roboto Slab', color: Colors.white, fontSize: 13)),
                          icon: const Icon(Icons.today, color: Colors.white, size: 18),
                        ),
                        ButtonSegment(
                          value: 'week',
                          label: Text('Semana', style: GoogleFonts.getFont('Roboto Slab', color: Colors.white, fontSize: 13)),
                          icon: const Icon(Icons.view_week, color: Colors.white, size: 18),
                        ),
                        ButtonSegment(
                          value: 'month',
                          label: Text('Mês', style: GoogleFonts.getFont('Roboto Slab', color: Colors.white, fontSize: 13)),
                          icon: const Icon(Icons.calendar_month, color: Colors.white, size: 18),
                        ),
                      ],
                      selected: {_viewMode},
                      onSelectionChanged: (Set<String> newSelection) {
                        setState(() {
                          _viewMode = newSelection.first;
                        });
                        _loadAppointments();
                      },
                      style: SegmentedButton.styleFrom(
                        selectedForegroundColor: Colors.white,
                        foregroundColor: Colors.white,
                        selectedBackgroundColor: Colors.white.withOpacity(0.3),
                        side: const BorderSide(color: Colors.white, width: 1),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                    const SizedBox(width: 16),
                    
                    // Navegação de data
                    IconButton(
                      icon: const Icon(Icons.chevron_left, color: Colors.white),
                      onPressed: () {
                        setState(() {
                          if (_viewMode == 'day') {
                            _selectedDate = _selectedDate.subtract(const Duration(days: 1));
                          } else if (_viewMode == 'week') {
                            _selectedDate = _selectedDate.subtract(const Duration(days: 7));
                          } else {
                            _selectedDate = DateTime(_selectedDate.year, _selectedDate.month - 1);
                          }
                        });
                        _loadAppointments();
                      },
                    ),
                    
                    Text(
                      _getDateRangeText(),
                      style: GoogleFonts.getFont('Roboto Slab',
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    
                    IconButton(
                      icon: const Icon(Icons.chevron_right, color: Colors.white),
                      onPressed: () {
                        setState(() {
                          if (_viewMode == 'day') {
                            _selectedDate = _selectedDate.add(const Duration(days: 1));
                          } else if (_viewMode == 'week') {
                            _selectedDate = _selectedDate.add(const Duration(days: 7));
                          } else {
                            _selectedDate = DateTime(_selectedDate.year, _selectedDate.month + 1);
                          }
                        });
                        _loadAppointments();
                      },
                    ),
                    
                    TextButton.icon(
                      icon: const Icon(Icons.today, color: Colors.white),
                      label: Text('Hoje', style: GoogleFonts.getFont('Roboto Slab', color: Colors.white)),
                      onPressed: () {
                        setState(() {
                          _selectedDate = DateTime.now();
                        });
                        _loadAppointments();
                      },
                    ),
                    
                    const Spacer(),
                    
                    // Botão de atualizar
                    IconButton(
                      icon: const Icon(Icons.refresh, color: Colors.white),
                      onPressed: _loadAppointments,
                      tooltip: 'Atualizar',
                    ),
                  ],
                ),
        );
      },
    );
  }

  Widget _buildAppointmentsList() {
    if (_appointments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_busy, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'Nenhum agendamento para este período',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    // Agrupa por data
    final Map<String, List<Appointment>> groupedByDate = {};
    for (var appointment in _appointments) {
      final dateKey = DateFormat('yyyy-MM-dd').format(appointment.date);
      groupedByDate.putIfAbsent(dateKey, () => []);
      groupedByDate[dateKey]!.add(appointment);
    }

    // Ordena os agendamentos de cada dia por horário
    groupedByDate.forEach((key, value) {
      value.sort((a, b) => a.timeSlot.compareTo(b.timeSlot));
    });

    final sortedDates = groupedByDate.keys.toList()..sort();

    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final padding = isMobile ? 12.0 : 16.0;
        
        return ListView.builder(
          padding: EdgeInsets.all(padding),
          itemCount: sortedDates.length,
          itemBuilder: (context, index) {
            final dateKey = sortedDates[index];
            final date = DateTime.parse(dateKey);
            final dayAppointments = groupedByDate[dateKey]!;

            return Card(
              margin: EdgeInsets.only(bottom: isMobile ? 12 : 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: EdgeInsets.all(isMobile ? 12 : 16),
                    color: const Color(0xFF384D9C).withOpacity(0.1), // RGB(56, 77, 156)
                    child: isMobile
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.calendar_today,
                                    size: 18,
                                    color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      DateFormat('EEEE, dd/MM/yyyy', 'pt_BR').format(date),
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Chip(
                                label: Text('${dayAppointments.length} agendamento(s)'),
                                backgroundColor: Colors.white,
                                padding: EdgeInsets.zero,
                              ),
                            ],
                          )
                        : Row(
                            children: [
                              Icon(Icons.calendar_today, color: const Color(0xFF384D9C)), // RGB(56, 77, 156)
                              const SizedBox(width: 8),
                              Text(
                                DateFormat('EEEE, dd/MM/yyyy', 'pt_BR').format(date),
                                style: TextStyle(
                                  fontSize: isMobile ? 14 : 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const Spacer(),
                              Chip(
                                label: Text('${dayAppointments.length} agendamento(s)'),
                                backgroundColor: Colors.white,
                              ),
                            ],
                          ),
                  ),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: dayAppointments.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, idx) {
                  return _buildAppointmentTile(dayAppointments[idx]);
                },
              ),
            ],
          ),
        );
          },
        );
      },
    );
  }

  Widget _buildAppointmentTile(Appointment appointment) {
    final statusColor = _getStatusColor(appointment.status);
    
    return ListTile(
      contentPadding: const EdgeInsets.all(16),
      leading: Container(
        width: 70,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xFF384D9C).withOpacity(0.1), // RGB(56, 77, 156)
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              appointment.timeSlot.split('-')[0],
              style: GoogleFonts.rubik(
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),
      ),
      title: Text(
        appointment.userName,
        style: GoogleFonts.getFont('Roboto Slab',
          fontWeight: FontWeight.bold,
        ),
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (appointment.serviceName != null) ...[
            Text(
              'Serviço: ${appointment.serviceName}',
              style: GoogleFonts.rubik(
                fontWeight: FontWeight.w600,
                color: const Color(0xFF384D9C), // RGB(56, 77, 156)
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
          Text(
            'Email: ${appointment.userEmail}',
            style: GoogleFonts.rubik(),
            overflow: TextOverflow.ellipsis,
          ),
          if (appointment.userPhone.isNotEmpty)
            Text(
              'Telefone: ${appointment.userPhone}',
              style: GoogleFonts.rubik(),
              overflow: TextOverflow.ellipsis,
            ),
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: statusColor),
            ),
            child: Text(
              _getStatusText(appointment.status),
              style: GoogleFonts.rubik(
                color: statusColor,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Permite marcar como atendido/não compareceu se:
          // 1. Status é pending OU
          // 2. Status é changeRequested (mesmo com solicitação pendente, pode ter sido atendido)
          if (appointment.status == AppointmentStatus.pending || 
              appointment.status == AppointmentStatus.changeRequested)
            _hasAppointmentPassed(appointment)
                ? PopupMenuButton<AppointmentStatus>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (status) => _updateStatus(appointment, status),
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: AppointmentStatus.attended,
                        child: Row(
                          children: [
                            Icon(Icons.check_circle, color: Colors.green),
                            SizedBox(width: 8),
                            Text('Marcar como Atendido'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: AppointmentStatus.noShow,
                        child: Row(
                          children: [
                            Icon(Icons.cancel, color: Colors.orange),
                            SizedBox(width: 8),
                            Text('Não Compareceu'),
                          ],
                        ),
                      ),
                    ],
                  )
                : Tooltip(
                    message: 'Aguarde o horário do agendamento passar para marcar como atendido ou não compareceu',
                    child: Icon(
                      Icons.lock_clock,
                      color: Colors.grey[400],
                      size: 20,
                    ),
                  ),
        ],
      ),
    );
  }

  String _getDateRangeText() {
    if (_viewMode == 'day') {
      return DateFormat('dd/MM/yyyy - EEEE', 'pt_BR').format(_selectedDate);
    } else if (_viewMode == 'week') {
      final weekday = _selectedDate.weekday == 7 ? 0 : _selectedDate.weekday;
      final startOfWeek = _selectedDate.subtract(Duration(days: weekday));
      final endOfWeek = startOfWeek.add(const Duration(days: 6));
      return '${DateFormat('dd/MM').format(startOfWeek)} - ${DateFormat('dd/MM/yyyy').format(endOfWeek)}';
    } else {
      return DateFormat('MMMM yyyy', 'pt_BR').format(_selectedDate);
    }
  }

  Color _getStatusColor(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.pending:
        return const Color.fromRGBO(116, 150, 102, 1.0); // RGB(116, 150, 102) - Agendado
      case AppointmentStatus.changeRequested:
        return const Color.fromRGBO(255, 181, 131, 1.0); // RGB(255, 181, 131) - Aguardando
      case AppointmentStatus.attended:
        return Colors.green;
      case AppointmentStatus.noShow:
        return Colors.orange;
      case AppointmentStatus.cancelled:
        return const Color.fromRGBO(160, 46, 46, 1.0); // RGB(160, 46, 46) - Cancelado
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.pending:
        return 'Agendado';
      case AppointmentStatus.changeRequested:
        return 'Aguardando';
      case AppointmentStatus.attended:
        return 'Atendido';
      case AppointmentStatus.noShow:
        return 'Não Compareceu';
      case AppointmentStatus.cancelled:
        return 'Cancelado';
      default:
        return status.name;
    }
  }

  Widget _buildRequestsList() {
    if (_pendingRequests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'Nenhuma solicitação pendente para seus serviços',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _pendingRequests.length,
      itemBuilder: (context, index) {
        final request = _pendingRequests[index];
        return _buildRequestCard(request);
      },
    );
  }

  Widget _buildRequestCard(Appointment request) {
    final isReschedule = request.requestType == RequestType.reschedule;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isReschedule ? const Color(0xFF384D9C).withOpacity(0.2) : Colors.red[100], // RGB(56, 77, 156)
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isReschedule ? 'REAGENDAMENTO' : 'CANCELAMENTO',
                    style: TextStyle(
                      color: isReschedule ? const Color(0xFF384D9C) : Colors.red[900], // RGB(56, 77, 156)
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  'Solicitado em ${DateFormat('dd/MM/yyyy HH:mm').format(request.requestedAt!)}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            Text(
              request.userName,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
            if (request.serviceName != null)
              Text(
                'Serviço: ${request.serviceName}',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                ),
                overflow: TextOverflow.ellipsis,
              ),
            Text(
              'Email: ${request.userEmail}',
              overflow: TextOverflow.ellipsis,
            ),
            if (request.userPhone.isNotEmpty)
              Text(
                'Telefone: ${request.userPhone}',
                overflow: TextOverflow.ellipsis,
              ),
            
            const Divider(height: 24),
            
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Agendamento Atual:',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(DateFormat('dd/MM/yyyy').format(request.date)),
                      Text(request.timeSlot),
                    ],
                  ),
                ),
                if (isReschedule && request.requestedDate != null) ...[
                  const Icon(Icons.arrow_forward, color: Colors.grey),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Nova Data Solicitada:',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF384D9C)), // RGB(56, 77, 156)
                        ),
                        Text(
                          DateFormat('dd/MM/yyyy').format(request.requestedDate!),
                          style: const TextStyle(color: Color(0xFF384D9C)), // RGB(56, 77, 156)
                        ),
                        Text(
                          request.requestedTimeSlot ?? '',
                          style: const TextStyle(color: Color(0xFF384D9C)), // RGB(56, 77, 156)
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
            
            if (request.requestMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Mensagem do usuário:',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    Text(request.requestMessage!),
                  ],
                ),
              ),
            ],
            
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                ElevatedButton.icon(
                  icon: const Icon(Icons.close),
                  label: const Text('Negar'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color.fromRGBO(160, 46, 46, 1.0), // RGB(160, 46, 46)
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () => _respondToRequest(request, false),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  icon: const Icon(Icons.check),
                  label: const Text('Aprovar'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color.fromRGBO(116, 150, 102, 1.0), // RGB(116, 150, 102)
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () => _respondToRequest(request, true),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _respondToRequest(
    Appointment appointment,
    bool approved,
  ) async {
    final messageController = TextEditingController();
    
    final message = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(approved ? 'Aprovar Solicitação' : 'Negar Solicitação'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Usuário: ${appointment.userName}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (appointment.requestMessage != null) ...[
              const Text('Mensagem do usuário:'),
              Text(appointment.requestMessage!),
              const SizedBox(height: 16),
            ],
            TextField(
              controller: messageController,
              decoration: const InputDecoration(
                labelText: 'Sua resposta (opcional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, messageController.text),
            style: ElevatedButton.styleFrom(
              backgroundColor: approved 
                  ? const Color.fromRGBO(116, 150, 102, 1.0) // RGB(116, 150, 102) - Aprovar
                  : const Color.fromRGBO(160, 46, 46, 1.0), // RGB(160, 46, 46) - Negar
              foregroundColor: Colors.white,
            ),
            child: Text(approved ? 'Aprovar' : 'Negar'),
          ),
        ],
      ),
    );

    if (message == null) return;

    try {
      await _service.respondToChangeRequest(
        appointment.id!,
        approved,
        _userId ?? '',
        message.isEmpty ? null : message,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Solicitação ${approved ? "aprovada" : "negada"} com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
        // Recarrega tanto as solicitações quanto os agendamentos
        // pois quando um reagendamento é aprovado, a data/horário muda
        await Future.wait([
          _loadPendingRequests(),
          _loadAppointments(),
        ]);
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

