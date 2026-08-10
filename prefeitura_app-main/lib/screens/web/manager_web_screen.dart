import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:convert';
import '../../models/appointment_model.dart';
import '../../models/service.dart';
import '../../services/appointment_service.dart';
import '../../widgets/custom_app_bar.dart';
import '../../widgets/copyright_footer.dart';
import '../mobile/manage_services_screen.dart';

/// Tela Web para Gerente (Admin)
class ManagerWebScreen extends StatefulWidget {
  const ManagerWebScreen({super.key});

  @override
  State<ManagerWebScreen> createState() => _ManagerWebScreenState();
}

class _ManagerWebScreenState extends State<ManagerWebScreen> {
  final AppointmentService _service = AppointmentService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  int _selectedTab = 0; // 0: Dashboard, 1: Solicitações, 2: Bloquear Horários, 3: Serviços
  List<Appointment> _pendingRequests = [];
  List<Appointment> _allAppointments = [];
  Map<String, int> _statistics = {};
  bool _loading = false;
  String? _userName;
  String? _userId;
  String? _userRole;

  // Filtros do dashboard
  DateTime? _filterStartDate;
  DateTime? _filterEndDate;
  AppointmentStatus? _selectedStatusFilter; // null = todos, ou um status específico
  
  // Filtros robustos para lista de agendamentos
  final TextEditingController _searchTextController = TextEditingController();
  AppointmentStatus? _filterStatus;
  String? _filterServiceId;
  DateTime? _filterAppointmentStartDate;
  DateTime? _filterAppointmentEndDate;
  bool _showFilters = false;
  
  // Paginação
  int _currentPage = 1;
  int _itemsPerPage = 20;
  final List<int> _itemsPerPageOptions = [10, 20, 50, 100];

  // Bloquear horários
  DateTime _blockDate = DateTime.now();
  List<String> _selectedSlotsToBlock = [];
  final TextEditingController _blockReasonController = TextEditingController();
  List<Service> _services = [];
  String? _selectedServiceId;
  bool _isRecurringBlock = false;
  
  // Desbloquear horários
  DateTime _unblockDate = DateTime.now();
  List<String> _blockedSlots = [];
  List<String> _selectedSlotsToUnblock = [];

  @override
  void initState() {
    super.initState();
    _checkAuth();
    _loadServices();
    // Adiciona listener para atualizar a UI quando o texto da pesquisa mudar
    _searchTextController.addListener(_onSearchTextChanged);
  }
  
  void _onSearchTextChanged() {
    // Atualiza a UI quando o texto da pesquisa muda
    if (mounted) {
      setState(() {
        _currentPage = 1; // Reset para primeira página ao filtrar
      });
    }
  }
  
  @override
  void dispose() {
    _searchTextController.removeListener(_onSearchTextChanged);
    _searchTextController.dispose();
    _blockReasonController.dispose();
    super.dispose();
  }

  /// Carrega serviços disponíveis
  Future<void> _loadServices() async {
    try {
      final snapshot = await _firestore
          .collection('services')
          .orderBy('name')
          .get();

      setState(() {
        _services = snapshot.docs
            .map((doc) => Service.fromFirestore(doc))
            .toList();
      });
    } catch (e) {
      debugPrint('Erro ao carregar serviços: $e');
    }
  }

  Future<void> _checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? prefs.getString('auth_token');
    _userName = prefs.getString('auth_user_name');
    _userId = prefs.getString('userId') ?? prefs.getString('auth_user_id');
    // Normaliza o role para garantir consistência
    _userRole = prefs.getString('role')?.trim().toLowerCase();

    if (token == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Você precisa estar logado')),
        );
        Navigator.pushReplacementNamed(context, '/web');
      }
      return;
    }

    // Verifica se é admin (case-insensitive)
    if (_userRole != 'admin') {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Acesso negado. Apenas administradores podem acessar esta área.'),
            backgroundColor: Colors.red,
          ),
        );
        Navigator.pushReplacementNamed(context, '/web');
      }
      return;
    }

    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      await Future.wait([
        _loadPendingRequests(),
        _loadStatistics(),
        _loadAllAppointments(),
      ]);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadAllAppointments() async {
    try {
      // Carrega um range amplo para permitir filtros flexíveis
      // Sempre carrega últimos 90 dias + próximos 90 dias para permitir filtros em memória
      final appointments = await _service.getAppointmentsByDateRange(
        DateTime.now().subtract(const Duration(days: 90)),
        DateTime.now().add(const Duration(days: 90)),
      );
      debugPrint('📋 Agendamentos carregados: ${appointments.length}');
      setState(() {
        _allAppointments = appointments;
        // Reset página para primeira página ao recarregar
        _currentPage = 1;
      });
    } catch (e) {
      debugPrint('❌ Erro ao carregar agendamentos: $e');
    }
  }

  Future<void> _loadPendingRequests() async {
    try {
      final requests = await _service.getPendingRequests();
      
      // Filtra solicitações: remove aquelas que já foram atendidas ou não compareceram
      // Pois se o atendimento já aconteceu (ou não aconteceu), a solicitação não faz mais sentido
      final filteredRequests = requests.where((request) {
        final status = request.status;
        final shouldShow = status != AppointmentStatus.attended && 
                          status != AppointmentStatus.noShow;
        
        if (!shouldShow) {
          debugPrint('🚫 Removendo solicitação de ${request.userName}: status já é ${status.name}');
        }
        
        return shouldShow;
      }).toList();
      
      debugPrint('📋 Solicitações pendentes: ${filteredRequests.length} de ${requests.length} (${requests.length - filteredRequests.length} removidas por já estarem atendidas/não comparecidas)');
      
      setState(() {
        _pendingRequests = filteredRequests;
      });
    } catch (e) {
      debugPrint('Erro ao carregar solicitações: $e');
    }
  }

  Future<void> _loadStatistics() async {
    try {
      final stats = await _service.getStatistics(
        startDate: _filterStartDate,
        endDate: _filterEndDate,
      );
      setState(() {
        _statistics = stats;
      });
    } catch (e) {
      debugPrint('Erro ao carregar estatísticas: $e');
    }
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
        _userId!,
        message.isEmpty ? null : message,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Solicitação ${approved ? "aprovada" : "negada"} com sucesso!'),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: 'Painel do Gerente',
        actions: [
          if (_userName != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: Text(
                  'Olá, $_userName (Admin)',
                  style: const TextStyle(color: Color(0xFF384D9C), fontSize: 14), // RGB(56, 77, 156)
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF384D9C)), // RGB(56, 77, 156)
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
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _selectedTab == 0
                    ? _buildDashboard()
                    : _selectedTab == 1
                        ? _buildRequestsList()
                        : _selectedTab == 2
                            ? _buildBlockSlotsTab()
                            : _buildServicesTab(),
          ),
          const CopyrightFooter(),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    // Cores da barra de menu
    const Color defaultColor = Color.fromRGBO(116, 129, 209, 1.0); // RGB(116, 129, 209) - padrão
    const Color selectedColor = Color.fromRGBO(238, 112, 112, 1.0); // RGB(238, 112, 112) - selecionado
    
    return Container(
      color: Colors.grey[100],
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () => setState(() => _selectedTab = 0),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: _selectedTab == 0 ? selectedColor : defaultColor,
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 0 ? selectedColor : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.dashboard,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Dashboard',
                      style: TextStyle(
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
                  color: _selectedTab == 1 ? selectedColor : defaultColor,
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 1 ? selectedColor : Colors.transparent,
                      width: 3,
                    ),
                  ),
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
                      style: TextStyle(
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
              onTap: () async {
                setState(() {
                  _selectedTab = 2;
                });
                await _loadBlockedSlots();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: _selectedTab == 2 ? selectedColor : defaultColor,
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 2 ? selectedColor : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.block,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Bloquear/Desbloquear',
                      style: TextStyle(
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
              onTap: () => setState(() => _selectedTab = 3),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: _selectedTab == 3 ? selectedColor : defaultColor,
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 3 ? selectedColor : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.work,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Serviços',
                      style: TextStyle(
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

  Widget _buildDashboard() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final isTablet = constraints.maxWidth >= 600 && constraints.maxWidth < 1024;
        final padding = isMobile ? 12.0 : (isTablet ? 16.0 : 24.0);
        
        return SingleChildScrollView(
          padding: EdgeInsets.all(padding),
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: isMobile ? double.infinity : 1400),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Título e filtro de data - responsivo
                isMobile
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Estatísticas de Agendamentos',
                            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 12),
                          _buildDateFilter(),
                        ],
                      )
                    : Row(
                        children: [
                          Text(
                            'Estatísticas de Agendamentos',
                            style: TextStyle(
                              fontSize: isTablet ? 22 : 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          _buildDateFilter(),
                        ],
                      ),
                SizedBox(height: isMobile ? 16 : 24),

          // Cards de estatísticas - Layout responsivo
          LayoutBuilder(
            builder: (context, constraints) {
              // Calcula quantas colunas cabem baseado na largura
              int crossAxisCount = 4;
              double spacing = 16;
              double aspectRatio = 2.0;
              
              if (constraints.maxWidth < 600) {
                // Mobile
                crossAxisCount = 1;
                spacing = 12;
                aspectRatio = 2.5;
              } else if (constraints.maxWidth < 900) {
                // Tablet pequeno
                crossAxisCount = 2;
                spacing = 14;
                aspectRatio = 2.2;
              } else if (constraints.maxWidth < 1200) {
                // Tablet grande
                crossAxisCount = 2;
                spacing = 16;
                aspectRatio = 2.0;
              } else {
                // Desktop
                crossAxisCount = 4;
                spacing = 16;
                aspectRatio = 2.0;
              }

              return GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: spacing,
                mainAxisSpacing: spacing,
                childAspectRatio: aspectRatio,
                children: [
                  _buildStatCard(
                    'Total de agendamentos',
                    _statistics['total'] ?? 0,
                    Icons.calendar_today,
                    const Color.fromRGBO(56, 77, 156, 1.0), // RGB(56, 77, 156)
                    null, // null = todos
                  ),
                  _buildStatCard(
                    'Agendados',
                    _statistics['pending'] ?? 0,
                    Icons.schedule,
                    const Color.fromRGBO(237, 151, 86, 1.0), // RGB(237, 151, 86)
                    AppointmentStatus.pending,
                  ),
                  _buildStatCard(
                    'Atendidos',
                    _statistics['attended'] ?? 0,
                    Icons.check_circle,
                    const Color.fromRGBO(68, 96, 66, 1.0), // RGB(68, 96, 66)
                    AppointmentStatus.attended,
                  ),
                  _buildStatCard(
                    'Não compareceram',
                    _statistics['noShow'] ?? 0,
                    Icons.cancel,
                    const Color.fromRGBO(160, 46, 46, 1.0), // RGB(160, 46, 46)
                    AppointmentStatus.noShow,
                  ),
                ],
              );
            },
                ),

                SizedBox(height: isMobile ? 20 : 32),
                const Divider(),
                SizedBox(height: isMobile ? 16 : 24),

                // Lista de todos os agendamentos
                _buildAppointmentsSection(),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Retorna a lista de agendamentos filtrada por todos os critérios
  List<Appointment> _getFilteredAppointments() {
    var filtered = _allAppointments;
    final initialCount = filtered.length;
    
    // Filtro por status (do card de estatísticas)
    if (_selectedStatusFilter != null) {
      filtered = filtered.where((apt) => apt.status == _selectedStatusFilter).toList();
    }
    
    // Filtros robustos da lista
    if (_filterStatus != null) {
      filtered = filtered.where((apt) => apt.status == _filterStatus).toList();
    }
    
    if (_filterServiceId != null) {
      filtered = filtered.where((apt) => apt.serviceId == _filterServiceId).toList();
    }
    
    if (_filterAppointmentStartDate != null) {
      final beforeDateFilter = filtered.length;
      final startOfDay = DateTime(
        _filterAppointmentStartDate!.year,
        _filterAppointmentStartDate!.month,
        _filterAppointmentStartDate!.day,
      );
      filtered = filtered.where((apt) {
        final aptDate = DateTime(apt.date.year, apt.date.month, apt.date.day);
        // Inclui agendamentos na data inicial ou depois
        return aptDate.isAtSameMomentAs(startOfDay) || aptDate.isAfter(startOfDay);
      }).toList();
      debugPrint('📅 Filtro data inicial: ${DateFormat('dd/MM/yyyy').format(_filterAppointmentStartDate!)} - $beforeDateFilter -> ${filtered.length} agendamentos');
    }
    
    if (_filterAppointmentEndDate != null) {
      final beforeDateFilter = filtered.length;
      final endOfDay = DateTime(
        _filterAppointmentEndDate!.year,
        _filterAppointmentEndDate!.month,
        _filterAppointmentEndDate!.day,
      );
      filtered = filtered.where((apt) {
        final aptDate = DateTime(apt.date.year, apt.date.month, apt.date.day);
        // Inclui agendamentos na data final ou antes
        return aptDate.isAtSameMomentAs(endOfDay) || aptDate.isBefore(endOfDay);
      }).toList();
      debugPrint('📅 Filtro data final: ${DateFormat('dd/MM/yyyy').format(_filterAppointmentEndDate!)} - $beforeDateFilter -> ${filtered.length} agendamentos');
    }
    
    // Filtro de texto (busca em nome, email, CPF, telefone, serviço)
    final searchText = _searchTextController.text.trim().toLowerCase();
    if (searchText.isNotEmpty) {
      final beforeSearchCount = filtered.length;
      filtered = filtered.where((apt) {
        // Trata valores vazios ou null de forma segura
        final nameMatch = (apt.userName.isNotEmpty && apt.userName.toLowerCase().contains(searchText));
        final emailMatch = (apt.userEmail.isNotEmpty && apt.userEmail.toLowerCase().contains(searchText));
        final searchTextNumbers = searchText.replaceAll(RegExp(r'[^\d]'), '');
        final cpfMatch = searchTextNumbers.isNotEmpty && 
                         apt.userCpf.isNotEmpty && 
                         apt.userCpf.replaceAll(RegExp(r'[^\d]'), '').contains(searchTextNumbers);
        final phoneMatch = searchTextNumbers.isNotEmpty && 
                           apt.userPhone.isNotEmpty && 
                           apt.userPhone.replaceAll(RegExp(r'[^\d]'), '').contains(searchTextNumbers);
        final serviceMatch = apt.serviceName != null && 
                            apt.serviceName!.isNotEmpty && 
                            apt.serviceName!.toLowerCase().contains(searchText);
        final timeSlotMatch = apt.timeSlot.isNotEmpty && 
                             apt.timeSlot.toLowerCase().contains(searchText);
        
        return nameMatch || emailMatch || cpfMatch || phoneMatch || serviceMatch || timeSlotMatch;
      }).toList();
      debugPrint('🔍 Pesquisa: "$searchText" - ${beforeSearchCount} -> ${filtered.length} agendamentos');
    }
    
    // Ordena por data (mais recente primeiro)
    filtered.sort((a, b) => b.date.compareTo(a.date));
    
    return filtered;
  }
  
  /// Retorna a lista paginada de agendamentos
  List<Appointment> _getPaginatedAppointments() {
    final filtered = _getFilteredAppointments();
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final endIndex = startIndex + _itemsPerPage;
    
    if (startIndex >= filtered.length) {
      return [];
    }
    
    return filtered.sublist(
      startIndex,
      endIndex > filtered.length ? filtered.length : endIndex,
    );
  }
  
  /// Retorna o total de páginas
  int _getTotalPages() {
    final filtered = _getFilteredAppointments();
    return (filtered.length / _itemsPerPage).ceil();
  }
  
  /// Limpa todos os filtros
  void _clearAllFilters() {
    setState(() {
      _searchTextController.clear();
      _filterStatus = null;
      _filterServiceId = null;
      _filterAppointmentStartDate = null;
      _filterAppointmentEndDate = null;
      _selectedStatusFilter = null;
      _currentPage = 1;
    });
  }

  Widget _buildAppointmentsSection() {
    final filteredCount = _getFilteredAppointments().length;
    final totalCount = _allAppointments.length;
    final hasActiveFilters = _searchTextController.text.isNotEmpty ||
        _filterStatus != null ||
        _filterServiceId != null ||
        _filterAppointmentStartDate != null ||
        _filterAppointmentEndDate != null ||
        _selectedStatusFilter != null;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Cabeçalho com título e botão de filtros
        Row(
          children: [
            const Text(
              'Todos os Agendamentos',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const Spacer(),
            // Contador de resultados
            Text(
              '$filteredCount de $totalCount agendamentos',
              style: TextStyle(fontSize: 14, color: Colors.grey[600]),
            ),
            const SizedBox(width: 16),
            // Botão de filtros
            IconButton(
              icon: Icon(_showFilters ? Icons.filter_alt : Icons.filter_alt_outlined),
              onPressed: () {
                setState(() {
                  _showFilters = !_showFilters;
                });
              },
              tooltip: 'Filtros',
            ),
            // Botão limpar filtros
            if (hasActiveFilters)
              IconButton(
                icon: const Icon(Icons.clear_all),
                onPressed: _clearAllFilters,
                tooltip: 'Limpar filtros',
                color: Colors.red,
              ),
          ],
        ),
        const SizedBox(height: 16),
        
        // Barra de pesquisa robusta (sempre visível)
        _buildSearchBar(),
        
        const SizedBox(height: 16),
        
        // Painel de filtros
        if (_showFilters) _buildFiltersPanel(),
        
        const SizedBox(height: 16),
        
        // Controles de paginação (topo)
        _buildPaginationControls(),
        
        const SizedBox(height: 16),
        
        // Lista de agendamentos
        _buildAllAppointmentsList(),
        
        const SizedBox(height: 16),
        
        // Controles de paginação (rodapé)
        _buildPaginationControls(),
      ],
    );
  }
  
  Widget _buildSearchBar() {
    return Card(
      elevation: 2,
      child: ValueListenableBuilder<TextEditingValue>(
        valueListenable: _searchTextController,
        builder: (context, value, child) {
          return TextField(
            controller: _searchTextController,
            decoration: InputDecoration(
              hintText: 'Buscar por nome, email, CPF, telefone, serviço ou horário...',
              prefixIcon: const Icon(Icons.search, color: Color(0xFF384D9C)), // RGB(56, 77, 156)
              suffixIcon: value.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        setState(() {
                          _searchTextController.clear();
                          _currentPage = 1;
                        });
                      },
                      tooltip: 'Limpar busca',
                    )
                  : IconButton(
                      icon: const Icon(Icons.filter_list),
                      onPressed: () {
                        setState(() {
                          _showFilters = !_showFilters;
                        });
                      },
                      tooltip: 'Mostrar filtros avançados',
                    ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF384D9C), width: 2), // RGB(56, 77, 156)
              ),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            ),
            onChanged: (value) {
              // O listener já atualiza a UI, mas mantemos aqui para garantir
              if (mounted) {
                setState(() {
                  _currentPage = 1; // Reset para primeira página ao filtrar
                });
              }
            },
            style: const TextStyle(fontSize: 16),
          );
        },
      ),
    );
  }
  
  Widget _buildFiltersPanel() {
    return Card(
      elevation: 2,
      color: Colors.grey[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.filter_list, color: Color(0xFF384D9C)), // RGB(56, 77, 156)
                const SizedBox(width: 8),
                const Text(
                  'Filtros Avançados',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                TextButton.icon(
                  icon: const Icon(Icons.clear, size: 18),
                  label: const Text('Limpar'),
                  onPressed: _clearAllFilters,
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 16),
            
            // Filtros em linha
            Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                // Filtro por status
                SizedBox(
                  width: 200,
                  child: DropdownButtonFormField<AppointmentStatus?>(
                    value: _filterStatus,
                    decoration: InputDecoration(
                      labelText: 'Status',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      prefixIcon: const Icon(Icons.label_outline),
                    ),
                    items: [
                      const DropdownMenuItem<AppointmentStatus?>(
                        value: null,
                        child: Text('Todos os status'),
                      ),
                      ...AppointmentStatus.values.map((status) {
                        return DropdownMenuItem<AppointmentStatus?>(
                          value: status,
                          child: Text(_getStatusText(status)),
                        );
                      }),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _filterStatus = value;
                        _currentPage = 1;
                      });
                    },
                  ),
                ),
                
                // Filtro por serviço
                SizedBox(
                  width: 250,
                  child: DropdownButtonFormField<String?>(
                    value: _filterServiceId,
                    decoration: InputDecoration(
                      labelText: 'Serviço',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      prefixIcon: const Icon(Icons.work_outline),
                    ),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('Todos os serviços'),
                      ),
                      ..._services.map((service) {
                        return DropdownMenuItem<String?>(
                          value: service.id,
                          child: Text(service.name),
                        );
                      }),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _filterServiceId = value;
                        _currentPage = 1;
                      });
                    },
                  ),
                ),
                
                // Filtro data inicial
                SizedBox(
                  width: 180,
                  child: InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _filterAppointmentStartDate ?? DateTime.now(),
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setState(() {
                          _filterAppointmentStartDate = picked;
                          _currentPage = 1;
                        });
                      }
                    },
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: 'Data Inicial',
                        prefixIcon: const Icon(Icons.calendar_today),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        suffixIcon: _filterAppointmentStartDate != null
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: () {
                                  setState(() {
                                    _filterAppointmentStartDate = null;
                                    _currentPage = 1;
                                  });
                                },
                              )
                            : null,
                      ),
                      child: Text(
                        _filterAppointmentStartDate != null
                            ? DateFormat('dd/MM/yyyy', 'pt_BR').format(_filterAppointmentStartDate!)
                            : 'Selecione',
                        style: TextStyle(
                          color: _filterAppointmentStartDate != null
                              ? Colors.black
                              : Colors.grey[600],
                        ),
                      ),
                    ),
                  ),
                ),
                
                // Filtro data final
                SizedBox(
                  width: 180,
                  child: InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _filterAppointmentEndDate ?? DateTime.now(),
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setState(() {
                          _filterAppointmentEndDate = picked;
                          _currentPage = 1;
                        });
                      }
                    },
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: 'Data Final',
                        prefixIcon: const Icon(Icons.calendar_today),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        suffixIcon: _filterAppointmentEndDate != null
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: () {
                                  setState(() {
                                    _filterAppointmentEndDate = null;
                                    _currentPage = 1;
                                  });
                                },
                              )
                            : null,
                      ),
                      child: Text(
                        _filterAppointmentEndDate != null
                            ? DateFormat('dd/MM/yyyy', 'pt_BR').format(_filterAppointmentEndDate!)
                            : 'Selecione',
                        style: TextStyle(
                          color: _filterAppointmentEndDate != null
                              ? Colors.black
                              : Colors.grey[600],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildPaginationControls() {
    final filteredCount = _getFilteredAppointments().length;
    final totalPages = _getTotalPages();
    final startItem = filteredCount == 0 ? 0 : ((_currentPage - 1) * _itemsPerPage) + 1;
    final endItem = (_currentPage * _itemsPerPage) > filteredCount
        ? filteredCount
        : (_currentPage * _itemsPerPage);
    
    return Row(
      children: [
        // Select de itens por página
        Row(
          children: [
            const Text('Itens por página: ', style: TextStyle(fontSize: 14)),
            SizedBox(
              width: 80,
              child: DropdownButton<int>(
                value: _itemsPerPage,
                isDense: true,
                items: _itemsPerPageOptions.map((value) {
                  return DropdownMenuItem<int>(
                    value: value,
                    child: Text('$value'),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _itemsPerPage = value;
                      _currentPage = 1; // Reset para primeira página
                    });
                  }
                },
              ),
            ),
          ],
        ),
        const Spacer(),
        
        // Informação de página
        Text(
          filteredCount == 0
              ? 'Nenhum resultado'
              : 'Mostrando $startItem-$endItem de $filteredCount',
          style: TextStyle(fontSize: 14, color: Colors.grey[600]),
        ),
        const SizedBox(width: 16),
        
        // Botões de navegação
        IconButton(
          icon: const Icon(Icons.first_page),
          onPressed: _currentPage == 1
              ? null
              : () {
                  setState(() {
                    _currentPage = 1;
                  });
                },
          tooltip: 'Primeira página',
        ),
        IconButton(
          icon: const Icon(Icons.chevron_left),
          onPressed: _currentPage == 1
              ? null
              : () {
                  setState(() {
                    _currentPage--;
                  });
                },
          tooltip: 'Página anterior',
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            '$_currentPage / $totalPages',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.chevron_right),
          onPressed: _currentPage >= totalPages
              ? null
              : () {
                  setState(() {
                    _currentPage++;
                  });
                },
          tooltip: 'Próxima página',
        ),
        IconButton(
          icon: const Icon(Icons.last_page),
          onPressed: _currentPage >= totalPages
              ? null
              : () {
                  setState(() {
                    _currentPage = totalPages;
                  });
                },
          tooltip: 'Última página',
        ),
      ],
    );
  }

  Widget _buildAllAppointmentsList() {
    final paginatedAppointments = _getPaginatedAppointments();
    final filteredCount = _getFilteredAppointments().length;
    
    if (filteredCount == 0) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(48),
          child: Column(
            children: [
              Icon(Icons.calendar_today_outlined, size: 64, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(
                _searchTextController.text.isNotEmpty ||
                        _filterStatus != null ||
                        _filterServiceId != null ||
                        _filterAppointmentStartDate != null ||
                        _filterAppointmentEndDate != null
                    ? 'Nenhum agendamento encontrado com os filtros aplicados'
                    : 'Nenhum agendamento encontrado',
                style: TextStyle(fontSize: 16, color: Colors.grey[600]),
              ),
              if (_searchTextController.text.isNotEmpty ||
                  _filterStatus != null ||
                  _filterServiceId != null ||
                  _filterAppointmentStartDate != null ||
                  _filterAppointmentEndDate != null) ...[
                const SizedBox(height: 16),
                TextButton.icon(
                  icon: const Icon(Icons.clear_all),
                  label: const Text('Limpar filtros'),
                  onPressed: _clearAllFilters,
                ),
              ],
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: paginatedAppointments.length,
      itemBuilder: (context, index) {
        final appointment = paginatedAppointments[index];
        return _buildAppointmentCard(appointment);
      },
    );
  }

  Widget _buildAppointmentCard(Appointment appointment) {
    // No dashboard, usa cores e textos específicos para as tags
    final statusColor = _getStatusColorForDashboard(appointment.status);
    final statusText = _getStatusTextForDashboard(appointment.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
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
                        appointment.userName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      if (appointment.serviceName != null) ...[
                        Text(
                          'Serviço: ${appointment.serviceName}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                      ],
                      Text(
                        'CPF: ${appointment.userCpf}',
                        style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'Email: ${appointment.userEmail}',
                        style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                      ),
                      if (appointment.userPhone.isNotEmpty)
                        Text(
                          'Telefone: ${appointment.userPhone}',
                          style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                        ),
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
                        style: TextStyle(
                          color: statusColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      DateFormat('dd/MM/yyyy', 'pt_BR').format(appointment.date),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      appointment.timeSlot,
                      style: const TextStyle(
                        fontSize: 14,
                        color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),

            // Justificativa do gerente (se houver)
            if (appointment.managerResponse != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.note_alt, size: 16, color: Colors.grey[700]),
                        const SizedBox(width: 6),
                        const Text(
                          'Justificativa do Gerente',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      appointment.managerResponse!,
                      style: const TextStyle(fontSize: 13),
                    ),
                    if (appointment.respondedAt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Respondido em ${DateFormat('dd/MM/yyyy HH:mm', 'pt_BR').format(appointment.respondedAt!)}',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[600],
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],

            // Botões de ação
            if (appointment.status == AppointmentStatus.pending)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    ElevatedButton.icon(
                      icon: const Icon(Icons.event_repeat, size: 18),
                      label: const Text('Reagendar'),
                      onPressed: () => _managerRescheduleAppointment(appointment),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color.fromRGBO(56, 77, 156, 1.0), // RGB(56, 77, 156)
                        foregroundColor: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.cancel, size: 18),
                      label: const Text('Cancelar'),
                      onPressed: () => _managerCancelAppointment(appointment),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color.fromRGBO(160, 46, 46, 1.0), // RGB(160, 46, 46)
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDateFilter() {
    return Row(
      children: [
        OutlinedButton.icon(
          icon: const Icon(Icons.filter_list),
          label: Text(
            _filterStartDate != null && _filterEndDate != null
                ? '${DateFormat('dd/MM/yy').format(_filterStartDate!)} - ${DateFormat('dd/MM/yy').format(_filterEndDate!)}'
                : 'Filtrar Período',
          ),
          onPressed: () async {
            final DateTimeRange? picked = await showDateRangePicker(
              context: context,
              firstDate: DateTime(2020),
              lastDate: DateTime.now().add(const Duration(days: 365)),
              initialDateRange: _filterStartDate != null && _filterEndDate != null
                  ? DateTimeRange(start: _filterStartDate!, end: _filterEndDate!)
                  : null,
            );

            if (picked != null) {
              setState(() {
                // Atualiza filtros das estatísticas
                _filterStartDate = picked.start;
                _filterEndDate = picked.end;
                // Sincroniza com filtros da lista de agendamentos
                _filterAppointmentStartDate = picked.start;
                _filterAppointmentEndDate = picked.end;
                _currentPage = 1; // Reset para primeira página
              });
              _loadStatistics();
            }
          },
        ),
        if (_filterStartDate != null) ...[
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.clear),
            onPressed: () {
              setState(() {
                // Limpa filtros das estatísticas
                _filterStartDate = null;
                _filterEndDate = null;
                // Limpa filtros da lista de agendamentos também
                _filterAppointmentStartDate = null;
                _filterAppointmentEndDate = null;
                _currentPage = 1; // Reset para primeira página
              });
              _loadStatistics();
            },
            tooltip: 'Limpar filtro',
          ),
        ],
      ],
    );
  }

  Widget _buildStatCard(String title, int value, IconData icon, Color color, AppointmentStatus? filterStatus) {
    final isSelected = _selectedStatusFilter == filterStatus;
    
    return InkWell(
      onTap: () {
        setState(() {
          // Se clicar no mesmo filtro, remove o filtro (mostra todos)
          if (_selectedStatusFilter == filterStatus) {
            _selectedStatusFilter = null;
          } else {
            _selectedStatusFilter = filterStatus;
          }
        });
      },
      child: Card(
        elevation: isSelected ? 4 : 2,
        color: color, // Fundo com a cor especificada
        child: Container(
          decoration: isSelected
              ? BoxDecoration(
                  border: Border.all(color: Colors.white, width: 2),
                  borderRadius: BorderRadius.circular(4),
                )
              : BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 32, color: Colors.white),
                const SizedBox(height: 8),
                Text(
                  value.toString(),
                  style: GoogleFonts.rubik(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.rubik(
                        fontSize: 14,
                        color: Colors.white,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    if (isSelected) ...[
                      const SizedBox(width: 4),
                      Icon(Icons.filter_alt, size: 16, color: Colors.white),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
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
              'Nenhuma solicitação pendente',
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

  /// Cores de status específicas para o dashboard
  Color _getStatusColorForDashboard(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.pending:
        return const Color.fromRGBO(255, 181, 131, 1.0); // RGB(255, 181, 131) - Agendando
      case AppointmentStatus.attended:
        return const Color.fromRGBO(116, 150, 102, 1.0); // RGB(116, 150, 102) - Atendido
      case AppointmentStatus.noShow:
        return Colors.red;
      case AppointmentStatus.cancelled:
        return Colors.grey;
      case AppointmentStatus.changeRequested:
        return const Color(0xFF384D9C); // RGB(56, 77, 156)
      case AppointmentStatus.changeApproved:
        return Colors.teal;
      case AppointmentStatus.changeDenied:
        return Colors.deepOrange;
    }
  }

  Color _getStatusColor(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.pending:
        return Colors.orange;
      case AppointmentStatus.attended:
        return Colors.green;
      case AppointmentStatus.noShow:
        return Colors.red;
      case AppointmentStatus.cancelled:
        return Colors.grey;
      case AppointmentStatus.changeRequested:
        return const Color(0xFF384D9C); // RGB(56, 77, 156)
      case AppointmentStatus.changeApproved:
        return Colors.teal;
      case AppointmentStatus.changeDenied:
        return Colors.deepOrange;
    }
  }

  /// Textos de status específicos para o dashboard
  String _getStatusTextForDashboard(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.pending:
        return 'Agendando';
      case AppointmentStatus.attended:
        return 'Atendido';
      case AppointmentStatus.noShow:
        return 'Não Compareceu';
      case AppointmentStatus.cancelled:
        return 'Cancelado';
      case AppointmentStatus.changeRequested:
        return 'Mudança Solicitada';
      case AppointmentStatus.changeApproved:
        return 'Mudança Aprovada';
      case AppointmentStatus.changeDenied:
        return 'Mudança Negada';
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
        return 'Mudança Solicitada';
      case AppointmentStatus.changeApproved:
        return 'Mudança Aprovada';
      case AppointmentStatus.changeDenied:
        return 'Mudança Negada';
    }
  }

  Future<void> _managerCancelAppointment(Appointment appointment) async {
    final messageController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar Agendamento'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Paciente: ${appointment.userName}',
              style: const TextStyle(fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
            if (appointment.serviceName != null)
              Text(
                'Serviço: ${appointment.serviceName}',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                ),
                overflow: TextOverflow.ellipsis,
              ),
            Text(
              'Data: ${DateFormat('dd/MM/yyyy', 'pt_BR').format(appointment.date)}',
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              'Horário: ${appointment.timeSlot}',
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 16),
            const Text(
              'Tem certeza que deseja cancelar este agendamento?\n\n'
              '⚠️ Esta ação é IMEDIATA e não precisa de aprovação.',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: messageController,
              decoration: const InputDecoration(
                labelText: 'Justificativa *',
                hintText: 'Explique o motivo do cancelamento',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
              maxLength: 200,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Voltar'),
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
            child: const Text('Cancelar Agendamento'),
          ),
        ],
      ),
    );

    if (confirmed == true && _userId != null) {
      try {
        await _service.managerCancelAppointment(
          appointment.id!,
          _userId!,
          messageController.text.trim(),
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Agendamento cancelado com sucesso!'),
              backgroundColor: Colors.green,
            ),
          );
          _loadData();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erro: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _managerRescheduleAppointment(Appointment appointment) async {
    debugPrint('🔄 Iniciando reagendamento para: ${appointment.userName}');

    DateTime? newDate;
    String? newTimeSlot;
    final messageController = TextEditingController();

    try {
      debugPrint('📅 Abrindo date picker...');

      // Seleciona nova data
      final pickedDate = await showDatePicker(
        context: context,
        initialDate: DateTime.now().add(const Duration(days: 1)),
        firstDate: DateTime.now(),
        lastDate: DateTime.now().add(const Duration(days: 90)),
        locale: const Locale('pt', 'BR'),
        builder: (context, child) {
          return Theme(
            data: Theme.of(context).copyWith(
              colorScheme: const ColorScheme.light(
                primary: const Color(0xFF384D9C), // RGB(56, 77, 156)
              ),
            ),
            child: child!,
          );
        },
      );

      debugPrint('📅 Data selecionada: $pickedDate');

      if (pickedDate == null) {
        debugPrint('❌ Nenhuma data selecionada, cancelando...');
        return;
      }
      newDate = pickedDate;

      // Carrega horários disponíveis
      debugPrint('🕐 Carregando horários disponíveis...');
      final slots = await _service.getAvailableSlots(
        newDate,
        serviceId: appointment.serviceId,
      );
      final availableSlots = slots.where((s) => s.isAvailable).toList();
      debugPrint('✅ Horários disponíveis: ${availableSlots.length}');

      if (availableSlots.isEmpty) {
        debugPrint('❌ Nenhum horário disponível nesta data');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Não há horários disponíveis nesta data')),
          );
        }
        return;
      }

      // Seleciona novo horário
      debugPrint('🕐 Abrindo seleção de horário...');
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

      debugPrint('🕐 Horário selecionado: $newTimeSlot');

      if (newTimeSlot == null) {
        debugPrint('❌ Nenhum horário selecionado, cancelando...');
        return;
      }

      // Solicita justificativa
      debugPrint('📝 Abrindo dialog de justificativa...');
      if (mounted) {
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Justificativa do Reagendamento'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Paciente: ${appointment.userName}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
                if (appointment.serviceName != null)
                  Text(
                    'Serviço: ${appointment.serviceName}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                const Divider(),
                const Text('Data atual:', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(
                  '${DateFormat('dd/MM/yyyy', 'pt_BR').format(appointment.date)} - ${appointment.timeSlot}',
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                const Text('Nova data:', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(
                  '${DateFormat('dd/MM/yyyy', 'pt_BR').format(newDate!)} - $newTimeSlot',
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 16),
                const Text(
                  '⚠️ Esta ação é IMEDIATA e não precisa de aprovação.',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: messageController,
                  decoration: const InputDecoration(
                    labelText: 'Justificativa *',
                    hintText: 'Explique o motivo do reagendamento',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                  maxLength: 200,
                ),
              ],
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
                child: const Text('Reagendar Agora'),
              ),
            ],
          ),
        );

        debugPrint('📝 Confirmado: $confirmed');

        if (confirmed != true) {
          debugPrint('❌ Reagendamento cancelado pelo usuário');
          return;
        }
      }

      // Reagenda diretamente
      debugPrint('💾 Salvando reagendamento...');
      if (_userId != null) {
        await _service.managerRescheduleAppointment(
          appointment.id!,
          newDate,
          newTimeSlot,
          _userId!,
          messageController.text.trim(),
        );

        debugPrint('✅ Reagendamento salvo com sucesso!');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Agendamento reagendado com sucesso!'),
              backgroundColor: Colors.green,
            ),
          );
          _loadData();
        }
      } else {
        debugPrint('❌ Erro: userId é null');
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Erro ao reagendar: $e');
      debugPrint('Stack trace: $stackTrace');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Retorna a contagem de horários bloqueados para uma data
  Future<int> _getBlockedSlotsCount(DateTime date) async {
    try {
      final startOfDay = DateTime(date.year, date.month, date.day);
      final endOfDay = DateTime(date.year, date.month, date.day, 23, 59, 59);

      final snapshot = await _firestore
          .collection('appointments')
          .where('userId', isEqualTo: 'BLOCKED')
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
          .where('date', isLessThanOrEqualTo: Timestamp.fromDate(endOfDay))
          .get();

      return snapshot.docs.length;
    } catch (e) {
      debugPrint('❌ Erro ao contar horários bloqueados: $e');
      return 0;
    }
  }

  /// Carrega horários bloqueados para a data selecionada
  Future<void> _loadBlockedSlots() async {
    try {
      final startOfDay = DateTime(_unblockDate.year, _unblockDate.month, _unblockDate.day);
      final endOfDay = DateTime(_unblockDate.year, _unblockDate.month, _unblockDate.day, 23, 59, 59);

      debugPrint('🔍 Buscando horários bloqueados para ${DateFormat('dd/MM/yyyy', 'pt_BR').format(_unblockDate)}');

      final snapshot = await _firestore
          .collection('appointments')
          .where('userId', isEqualTo: 'BLOCKED')
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
          .where('date', isLessThanOrEqualTo: Timestamp.fromDate(endOfDay))
          .get();

      setState(() {
        _blockedSlots = snapshot.docs
            .map((doc) => doc.data()['timeSlot'] as String)
            .toList();
        _selectedSlotsToUnblock.clear();
      });

      debugPrint('📋 Horários bloqueados encontrados: ${_blockedSlots.length}');
      if (_blockedSlots.isNotEmpty) {
        debugPrint('   Horários: ${_blockedSlots.join(", ")}');
      }
    } catch (e) {
      debugPrint('❌ Erro ao carregar horários bloqueados: $e');
      setState(() {
        _blockedSlots = [];
      });
    }
  }

  Widget _buildBlockSlotsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Bloquear e Desbloquear Horários',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Gerencie os horários bloqueados para datas específicas',
            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
          ),
          const SizedBox(height: 32),
          
          // Aba de Bloquear
          Card(
            elevation: 2,
            margin: const EdgeInsets.only(bottom: 24),
            child: ExpansionTile(
              title: const Text('Bloquear Horários', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: const Text('Bloqueie múltiplos horários para uma data específica'),
              initiallyExpanded: true,
              children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: _buildBlockSection(),
                ),
              ],
            ),
          ),
          
          // Aba de Desbloquear
          Card(
            elevation: 2,
            child: ExpansionTile(
              title: const Text('Desbloquear Horários', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: FutureBuilder<int>(
                future: _getBlockedSlotsCount(_unblockDate),
                builder: (context, snapshot) {
                  final count = snapshot.data ?? _blockedSlots.length;
                  return Text(count == 0 
                      ? 'Nenhum horário bloqueado para ${DateFormat('dd/MM/yyyy', 'pt_BR').format(_unblockDate)}'
                      : '$count horário(s) bloqueado(s) encontrado(s)');
                },
              ),
              initiallyExpanded: true,
              onExpansionChanged: (expanded) {
                if (expanded) {
                  _loadBlockedSlots();
                }
              },
              children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: _buildUnblockSection(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBlockSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Seletor de serviço
        const Text(
          'Selecione o Serviço',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _selectedServiceId,
          decoration: InputDecoration(
            hintText: 'Selecione um serviço',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            prefixIcon: const Icon(Icons.work, color: Color(0xFF384D9C)), // RGB(56, 77, 156)
          ),
          items: [
            const DropdownMenuItem<String>(
              value: null,
              child: Text('Todos os serviços'),
            ),
            ..._services.map((service) {
              return DropdownMenuItem<String>(
                value: service.id,
                child: Text(service.name),
              );
            }),
          ],
          onChanged: (value) {
            setState(() {
              _selectedServiceId = value;
            });
          },
        ),
        const SizedBox(height: 24),

        // Seletor de data
        const Text(
          'Selecione a Data',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: _blockDate,
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 365)),
            );
            if (picked != null) {
              setState(() {
                _blockDate = picked;
                _selectedSlotsToBlock.clear();
              });
            }
          },
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today, color: Color(0xFF384D9C)), // RGB(56, 77, 156)
                const SizedBox(width: 12),
                Text(
                  DateFormat('dd/MM/yyyy', 'pt_BR').format(_blockDate),
                  style: const TextStyle(fontSize: 16),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Seleção de horários
        const Text(
          'Selecione os Horários para Bloquear',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        _buildSlotSelectionGrid(),
        const SizedBox(height: 24),

        // Opção de bloqueio recorrente
        Card(
          color: const Color(0xFF384D9C).withOpacity(0.1), // RGB(56, 77, 156)
          child: CheckboxListTile(
            title: const Text(
              'Bloqueio Recorrente',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: const Text(
              'O dia marcado estará bloqueado toda semana (mesmo dia da semana)',
              style: TextStyle(fontSize: 12),
            ),
            value: _isRecurringBlock,
            onChanged: (value) {
              setState(() {
                _isRecurringBlock = value ?? false;
              });
            },
            activeColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
          ),
        ),
        const SizedBox(height: 24),

        // Justificativa
        const Text(
          'Motivo do Bloqueio',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _blockReasonController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Ex: Feriado municipal, Manutenção do sistema, etc.',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Botões de ação
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _selectedSlotsToBlock.isEmpty || _blockReasonController.text.trim().isEmpty
                    ? null
                    : _blockSelectedSlots,
                icon: const Icon(Icons.block),
                label: Text('Bloquear ${_selectedSlotsToBlock.length} Horário(s)'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color.fromRGBO(160, 46, 46, 1.0), // RGB(160, 46, 46)
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _selectedSlotsToBlock.isEmpty
                    ? null
                    : () {
                        setState(() {
                          _selectedSlotsToBlock.clear();
                        });
                      },
                icon: const Icon(Icons.clear),
                label: const Text('Limpar Seleção'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildUnblockSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Seletor de data
        const Text(
          'Selecione a Data',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: _unblockDate,
              firstDate: DateTime.now().subtract(const Duration(days: 30)),
              lastDate: DateTime.now().add(const Duration(days: 365)),
            );
            if (picked != null) {
              setState(() {
                _unblockDate = picked;
                _selectedSlotsToUnblock.clear();
              });
              _loadBlockedSlots();
            }
          },
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today, color: Color(0xFF384D9C)), // RGB(56, 77, 156)
                const SizedBox(width: 12),
                Text(
                  DateFormat('dd/MM/yyyy', 'pt_BR').format(_unblockDate),
                  style: const TextStyle(fontSize: 16),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _loadBlockedSlots,
                  tooltip: 'Atualizar',
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Horários bloqueados
        if (_blockedSlots.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline, color: Colors.grey),
                SizedBox(width: 12),
                Text(
                  'Nenhum horário bloqueado para esta data',
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          )
        else ...[
          Text(
            'Horários Bloqueados (${_blockedSlots.length})',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _buildBlockedSlotsGrid(),
          const SizedBox(height: 24),

          // Botões de ação
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _selectedSlotsToUnblock.isEmpty
                      ? null
                      : _unblockSelectedSlots,
                  icon: const Icon(Icons.lock_open),
                  label: Text('Desbloquear ${_selectedSlotsToUnblock.length} Horário(s)'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color.fromRGBO(116, 150, 102, 1.0), // RGB(116, 150, 102)
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _selectedSlotsToUnblock.isEmpty
                      ? null
                      : () {
                          setState(() {
                            _selectedSlotsToUnblock.clear();
                          });
                        },
                  icon: const Icon(Icons.clear),
                  label: const Text('Limpar Seleção'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildBlockedSlotsGrid() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _blockedSlots.map((slot) {
        final isSelected = _selectedSlotsToUnblock.contains(slot);

        return FilterChip(
          label: Text(slot),
          selected: isSelected,
          onSelected: (selected) {
            setState(() {
              if (selected) {
                _selectedSlotsToUnblock.add(slot);
              } else {
                _selectedSlotsToUnblock.remove(slot);
              }
            });
          },
          selectedColor: Colors.green[100],
          checkmarkColor: Colors.green[700],
          backgroundColor: Colors.red[50],
          labelStyle: TextStyle(
            color: isSelected ? Colors.green[700] : Colors.red[700],
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        );
      }).toList(),
    );
  }

  Future<void> _unblockSelectedSlots() async {
    if (_selectedSlotsToUnblock.isEmpty) {
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Desbloqueio'),
        content: Text(
          'Deseja desbloquear ${_selectedSlotsToUnblock.length} horário(s) para ${DateFormat('dd/MM/yyyy', 'pt_BR').format(_unblockDate)}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: const Color.fromRGBO(116, 150, 102, 1.0), // RGB(116, 150, 102)
            ),
            child: const Text('Desbloquear'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _loading = true);

    try {
      await _service.unblockSlots(
        date: _unblockDate,
        timeSlots: _selectedSlotsToUnblock,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${_selectedSlotsToUnblock.length} horário(s) desbloqueado(s) com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );

        setState(() {
          _selectedSlotsToUnblock.clear();
        });
        
        // Recarrega a lista de bloqueados
        _loadBlockedSlots();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao desbloquear horários: $e'),
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

  Widget _buildSlotSelectionGrid() {
    final allSlots = _service.generateTimeSlots();

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: allSlots.map((slot) {
        final isSelected = _selectedSlotsToBlock.contains(slot);

        return FilterChip(
          label: Text(slot),
          selected: isSelected,
          onSelected: (selected) {
            setState(() {
              if (selected) {
                _selectedSlotsToBlock.add(slot);
              } else {
                _selectedSlotsToBlock.remove(slot);
              }
            });
          },
          selectedColor: Colors.red[100],
          checkmarkColor: Colors.red[700],
          labelStyle: TextStyle(
            color: isSelected ? Colors.red[700] : Colors.black87,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        );
      }).toList(),
    );
  }

  Future<void> _blockSelectedSlots() async {
    if (_selectedSlotsToBlock.isEmpty || _blockReasonController.text.trim().isEmpty) {
      return;
    }

    final serviceName = _selectedServiceId != null
        ? _services.firstWhere((s) => s.id == _selectedServiceId).name
        : 'Todos os serviços';
    
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Bloqueio'),
        content: Text(
          'Deseja bloquear ${_selectedSlotsToBlock.length} horário(s) para ${DateFormat('dd/MM/yyyy', 'pt_BR').format(_blockDate)}?\n\n'
          'Serviço: $serviceName\n'
          '${_isRecurringBlock ? "⚠️ BLOQUEIO RECORRENTE: Este dia da semana estará bloqueado toda semana.\n\n" : ""}'
          'Motivo: ${_blockReasonController.text.trim()}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: const Color.fromRGBO(160, 46, 46, 1.0), // RGB(160, 46, 46)
            ),
            child: const Text('Bloquear'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _loading = true);

    try {
      await _service.blockMultipleSlots(
        date: _blockDate,
        timeSlots: _selectedSlotsToBlock,
        managerId: _userId!,
        reason: _blockReasonController.text.trim(),
        serviceId: _selectedServiceId,
        isRecurring: _isRecurringBlock,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${_selectedSlotsToBlock.length} horário(s) bloqueado(s) com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );

        setState(() {
          _selectedSlotsToBlock.clear();
          _blockReasonController.clear();
          _isRecurringBlock = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao bloquear horários: $e'),
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

  Widget _buildServicesTab() {
    return const ManageServicesScreen();
  }
}

