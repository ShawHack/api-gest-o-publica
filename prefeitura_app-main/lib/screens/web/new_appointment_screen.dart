import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:convert';
import '../../models/appointment_model.dart';
import '../../models/service.dart';
import '../../services/appointment_service.dart';

/// Tela para criar novo agendamento
class NewAppointmentScreen extends StatefulWidget {
  const NewAppointmentScreen({super.key});

  @override
  State<NewAppointmentScreen> createState() => _NewAppointmentScreenState();
}

class _NewAppointmentScreenState extends State<NewAppointmentScreen> {
  final AppointmentService _service = AppointmentService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  DateTime _selectedDate = DateTime.now();
  String? _selectedTimeSlot;
  List<TimeSlot> _availableSlots = [];
  bool _loading = false;

  // Serviços
  List<Service> _services = [];
  Service? _selectedService;

  // Dados do usuário
  String? _userId;
  String? _userName;
  String? _userEmail;
  String? _userPhone;
  String? _userCpf;

  @override
  void initState() {
    super.initState();
    _loadServices();
    _loadUserData();
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

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');

    debugPrint('🔍 User JSON: $userJson');

    if (userJson != null) {
      final user = jsonDecode(userJson);
      debugPrint('👤 User data: $user');

      setState(() {
        // Tenta pegar o ID de várias formas possíveis (_id do MongoDB ou id)
        _userId = user['id']?.toString() ??
                  user['_id']?.toString() ??
                  prefs.getString('userId') ??
                  prefs.getString('auth_user_id');
        _userName = user['name'] ?? user['userName'] ?? '';
        _userEmail = user['email'] ?? '';
        _userPhone = user['phone'] ?? user['telefone'] ?? '';
        _userCpf = user['cpf'] ?? '';
      });

      debugPrint('✅ User loaded:');
      debugPrint('   ID: $_userId');
      debugPrint('   Nome: $_userName');
      debugPrint('   Email: $_userEmail');
      debugPrint('   Telefone: $_userPhone');
      debugPrint('   CPF: $_userCpf');

      // Carrega slots disponíveis para hoje
      await _loadAvailableSlots();
    } else {
      debugPrint('❌ Nenhum usuário encontrado no SharedPreferences');
    }
  }

  Future<void> _loadAvailableSlots() async {
    debugPrint('📅 Carregando slots para: $_selectedDate');
    setState(() => _loading = true);
    try {
      final slots = await _service.getAvailableSlots(
        _selectedDate,
        serviceId: _selectedService?.id,
      );
      debugPrint('✅ Slots carregados: ${slots.length}');
      debugPrint('📋 Slots: ${slots.map((s) => '${s.time} (${s.isAvailable ? "livre" : "ocupado"})').join(", ")}');

      // O serviço já filtra horários passados automaticamente
      setState(() {
        _availableSlots = slots;
        _selectedTimeSlot = null; // Reset seleção ao mudar data
      });
    } catch (e) {
      debugPrint('❌ Erro ao carregar slots: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar horários: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _selectDate() async {
    debugPrint('📅 Abrindo seletor de data...');

    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate.isAfter(DateTime.now()) ? _selectedDate : DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: const Color(0xFF384D9C), // RGB(56, 77, 156)
              onPrimary: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );

    debugPrint('📅 Data selecionada: $picked');

    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      await _loadAvailableSlots();
    }
  }

  Future<void> _confirmAppointment() async {
    if (_selectedService == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione um serviço')),
      );
      return;
    }

    if (_selectedTimeSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione um horário')),
      );
      return;
    }

    // Verifica se o horário selecionado não passou (se for hoje)
    final now = DateTime.now();
    final isToday = _selectedDate.year == now.year &&
                    _selectedDate.month == now.month &&
                    _selectedDate.day == now.day;

    if (isToday) {
      final currentTime = TimeOfDay.fromDateTime(now);
      final startTimeStr = _selectedTimeSlot!.split('-')[0];
      final startParts = startTimeStr.split(':');
      final slotHour = int.parse(startParts[0]);
      final slotMinute = int.parse(startParts[1]);
      final slotTime = TimeOfDay(hour: slotHour, minute: slotMinute);

      final slotPassed = slotTime.hour < currentTime.hour ||
                         (slotTime.hour == currentTime.hour && slotTime.minute < currentTime.minute);

      if (slotPassed) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Não é possível agendar um horário que já passou'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }
    }

    debugPrint('🔍 Verificando dados do usuário...');
    debugPrint('   _userId: $_userId');
    debugPrint('   _userName: $_userName');
    debugPrint('   _userEmail: $_userEmail');
    debugPrint('   _userPhone: $_userPhone');
    debugPrint('   _userCpf: $_userCpf');

    if (_userId == null || _userName == null || _userEmail == null) {
      debugPrint('❌ Dados do usuário incompletos!');

      // Tenta recarregar os dados
      await _loadUserData();

      if (_userId == null || _userName == null || _userEmail == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Dados do usuário não encontrados. Faça login novamente.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }
    }

    setState(() => _loading = true);
    try {
      final appointment = Appointment(
        userId: _userId!,
        userName: _userName!,
        userEmail: _userEmail!,
        userPhone: _userPhone ?? '',
        userCpf: _userCpf ?? '',
        date: _selectedDate,
        timeSlot: _selectedTimeSlot!,
        serviceId: _selectedService!.id,
        serviceName: _selectedService!.name,
        createdAt: DateTime.now(),
      );

      debugPrint('📝 Criando agendamento:');
      debugPrint('   userId: ${appointment.userId}');
      debugPrint('   userName: ${appointment.userName}');
      debugPrint('   serviceId: ${appointment.serviceId}');
      debugPrint('   serviceName: ${appointment.serviceName}');
      debugPrint('   date: ${appointment.date}');
      debugPrint('   timeSlot: ${appointment.timeSlot}');

      final appointmentId = await _service.createAppointment(appointment);

      debugPrint('✅ Agendamento criado com ID: $appointmentId');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Agendamento realizado com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true); // Retorna true para indicar sucesso
      }
    } catch (e) {
      debugPrint('❌ Erro ao criar agendamento: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao agendar: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 600;
    final isTablet = screenWidth >= 600 && screenWidth < 1024;
    
    return Scaffold(
      appBar: AppBar(
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAvailableSlots,
            tooltip: 'Atualizar horários disponíveis',
          ),
        ],
        title: const Text('Novo Agendamento'),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : LayoutBuilder(
              builder: (context, constraints) {
                final padding = isMobile ? 12.0 : (isTablet ? 20.0 : 24.0);
                final spacing = isMobile ? 16.0 : 24.0;
                final maxContentWidth = isMobile ? double.infinity : 1200.0;
                
                return Center(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.all(padding),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        maxWidth: maxContentWidth,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildUserInfo(),
                          SizedBox(height: spacing),
                          _buildServiceSelector(),
                          SizedBox(height: spacing),
                          _buildDateSelector(),
                          SizedBox(height: spacing),
                          _buildTimeSlotsGrid((constraints.maxWidth < maxContentWidth ? constraints.maxWidth : maxContentWidth).toDouble()),
                          SizedBox(height: spacing * 1.5),
                          _buildConfirmButton(),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }

  Widget _buildUserInfo() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final padding = isMobile ? 12.0 : 16.0;
        final titleSize = isMobile ? 16.0 : 18.0;
        
        return SizedBox(
          width: double.infinity,
          child: Card(
            elevation: 2,
            child: Padding(
              padding: EdgeInsets.all(padding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.person,
                        color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                        size: isMobile ? 20 : 24,
                      ),
                      SizedBox(width: isMobile ? 6 : 8),
                      Text(
                        'Seus Dados',
                        style: TextStyle(
                          fontSize: titleSize,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: isMobile ? 12 : 24),
                  _buildInfoRow(Icons.badge, 'Nome', _userName ?? "Carregando...", isMobile),
                  SizedBox(height: isMobile ? 6 : 8),
                  _buildInfoRow(Icons.email, 'Email', _userEmail ?? "Carregando...", isMobile),
                  if (_userPhone != null && _userPhone!.isNotEmpty) ...[
                    SizedBox(height: isMobile ? 6 : 8),
                    _buildInfoRow(Icons.phone, 'Telefone', _userPhone!, isMobile),
                  ],
                  if (_userCpf != null && _userCpf!.isNotEmpty) ...[
                    SizedBox(height: isMobile ? 6 : 8),
                    _buildInfoRow(Icons.credit_card, 'CPF', _userCpf!, isMobile),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, bool isMobile) {
    final iconSize = isMobile ? 16.0 : 18.0;
    final fontSize = isMobile ? 13.0 : 14.0;
    
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: iconSize, color: Colors.grey[600]),
        SizedBox(width: isMobile ? 6 : 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: TextStyle(color: Colors.black, fontSize: fontSize),
              children: [
                TextSpan(
                  text: '$label: ',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                TextSpan(text: value),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildServiceSelector() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final padding = isMobile ? 12.0 : 16.0;
        final titleSize = isMobile ? 16.0 : 18.0;
        
        return SizedBox(
          width: double.infinity,
          child: Card(
            elevation: 2,
            child: Padding(
              padding: EdgeInsets.all(padding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.work,
                        color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                        size: isMobile ? 20 : 24,
                      ),
                      SizedBox(width: isMobile ? 6 : 8),
                      Text(
                        'Selecione o Serviço',
                        style: TextStyle(
                          fontSize: titleSize,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: isMobile ? 12 : 16),
              if (_services.isEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: Colors.orange),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Nenhum serviço disponível no momento',
                          style: TextStyle(color: Colors.orange),
                        ),
                      ),
                    ],
                  ),
                )
              else
                DropdownButtonFormField<Service>(
                  value: _selectedService,
                  decoration: InputDecoration(
                    labelText: 'Serviço',
                    hintText: _selectedService == null ? 'Selecione um serviço' : null,
                    border: const OutlineInputBorder(),
                    prefixIcon: Icon(
                      Icons.work_outline,
                      size: isMobile ? 20 : 24,
                    ),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: isMobile ? 12 : 16,
                      vertical: isMobile ? 12 : 16,
                    ),
                  ),
                  style: TextStyle(
                    fontSize: isMobile ? 14 : 16,
                    color: _selectedService == null ? Colors.grey[600] : Colors.black87,
                  ),
                  isExpanded: true,
                  isDense: false,
                  menuMaxHeight: isMobile ? 300 : 400,
                  dropdownColor: Colors.white,
                  icon: const Icon(Icons.arrow_drop_down),
                  iconSize: isMobile ? 24 : 28,
                  items: _services.map((service) {
                    return DropdownMenuItem<Service>(
                      value: service,
                      child: Text(
                        service.name,
                        style: TextStyle(fontSize: isMobile ? 14 : 16),
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }).toList(),
                  onChanged: (Service? newValue) {
                    setState(() {
                      _selectedService = newValue;
                      _selectedTimeSlot = null; // Reset seleção ao mudar serviço
                    });
                    // Carrega horários automaticamente quando um serviço é selecionado
                    if (newValue != null) {
                      _loadAvailableSlots();
                    } else {
                      // Limpa slots se nenhum serviço estiver selecionado
                      setState(() {
                        _availableSlots = [];
                      });
                    }
                  },
                  validator: (value) {
                    if (value == null) {
                      return 'Selecione um serviço';
                    }
                    return null;
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

  Widget _buildDateSelector() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final padding = isMobile ? 12.0 : 16.0;
        final iconSize = isMobile ? 20.0 : 24.0;
        final labelSize = isMobile ? 12.0 : 14.0;
        final dateSize = isMobile ? 14.0 : 16.0;
        
        return SizedBox(
          width: double.infinity,
          child: Card(
            elevation: 2,
            child: InkWell(
              onTap: _selectDate,
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: EdgeInsets.all(padding),
                child: Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(isMobile ? 10 : 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF384D9C).withOpacity(0.1), // RGB(56, 77, 156)
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.calendar_today,
                        color: const Color(0xFF384D9C), // RGB(56, 77, 156)
                        size: iconSize,
                      ),
                    ),
                    SizedBox(width: isMobile ? 12 : 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Data do Agendamento',
                            style: TextStyle(
                              fontSize: labelSize,
                              color: Colors.grey,
                            ),
                          ),
                          SizedBox(height: isMobile ? 2 : 4),
                          Text(
                            DateFormat('dd/MM/yyyy - EEEE', 'pt_BR').format(_selectedDate),
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: dateSize,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward_ios,
                      size: isMobile ? 14 : 16,
                      color: Colors.grey,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTimeSlotsGrid(double maxWidth) {
    debugPrint('🎨 Renderizando grid de horários. Total: ${_availableSlots.length}');

    if (_availableSlots.isEmpty) {
      return SizedBox(
        width: double.infinity,
        child: Card(
          elevation: 2,
          child: Padding(
            padding: EdgeInsets.all(maxWidth < 600 ? 24 : 32),
            child: Column(
              children: [
                Icon(
                  Icons.event_busy,
                  size: maxWidth < 600 ? 40 : 48,
                  color: Colors.grey[400],
                ),
                SizedBox(height: maxWidth < 600 ? 12 : 16),
                Text(
                  'Nenhum horário disponível para esta data',
                  style: TextStyle(
                    fontSize: maxWidth < 600 ? 14 : 16,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Separa manhã e tarde
    final morningSlots = _availableSlots.where((s) {
      final hour = int.parse(s.startTime.split(':')[0]);
      return hour < 12;
    }).toList();

    final afternoonSlots = _availableSlots.where((s) {
      final hour = int.parse(s.startTime.split(':')[0]);
      return hour >= 12;
    }).toList();

    debugPrint('🌅 Manhã: ${morningSlots.length} slots');
    debugPrint('🌞 Tarde: ${afternoonSlots.length} slots');

    final isMobile = maxWidth < 600;
    final isTablet = maxWidth >= 600 && maxWidth < 1024;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.access_time,
              color: const Color(0xFF384D9C), // RGB(56, 77, 156)
              size: isMobile ? 20 : 24,
            ),
            SizedBox(width: isMobile ? 6 : 8),
            Text(
              'Selecione o Horário',
              style: TextStyle(
                fontSize: isMobile ? 16 : 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        SizedBox(height: isMobile ? 8 : 12),

        // Layout responsivo: colunas em desktop/tablet, empilhado em mobile
        // Se a largura for muito pequena (< 700px), empilha mesmo em desktop para evitar cards muito pequenos
        (isMobile || maxWidth < 700)
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Coluna Manhã
                  if (morningSlots.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange[50],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        '🌅 Manhã',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(height: 4),
                    _buildSlotsGrid(morningSlots, maxWidth),
                    const SizedBox(height: 16),
                  ],
                  // Coluna Tarde
                  if (afternoonSlots.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF384D9C).withOpacity(0.1), // RGB(56, 77, 156)
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        '🌞 Tarde',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(height: 4),
                    _buildSlotsGrid(afternoonSlots, maxWidth),
                  ],
                ],
              )
            : Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Coluna Manhã
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (morningSlots.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.orange[50],
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              '🌅 Manhã',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(height: 4),
                          _buildSlotsGrid(morningSlots, maxWidth),
                        ],
                      ],
                    ),
                  ),
                  SizedBox(width: isTablet ? 8 : 16),
                  // Coluna Tarde
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (afternoonSlots.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF384D9C).withOpacity(0.1), // RGB(56, 77, 156)
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              '🌞 Tarde',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(height: 4),
                          _buildSlotsGrid(afternoonSlots, maxWidth),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
      ],
    );
  }

  Widget _buildSlotsGrid(List<TimeSlot> slots, double maxWidth) {
    // Calcula número de colunas dinamicamente baseado na largura disponível
    // Considera padding e espaçamento entre cards
    // Quando está em layout de colunas (manhã/tarde lado a lado), divide a largura pela metade
    final isInColumnLayout = maxWidth >= 700;
    final effectiveWidth = isInColumnLayout ? (maxWidth - 32) / 2 : maxWidth;
    final padding = effectiveWidth < 600 ? 24.0 : 32.0;
    final availableWidth = effectiveWidth - padding;
    
    int crossAxisCount;
    double childAspectRatio;
    double spacing;
    
    // Calcula baseado na largura efetiva (considerando se está dividido em colunas)
    if (effectiveWidth < 300) {
      // Muito pequeno: 2 colunas
      crossAxisCount = 2;
      childAspectRatio = 1.6;
      spacing = 4;
    } else if (effectiveWidth < 400) {
      // Pequeno: 2-3 colunas
      crossAxisCount = 2;
      childAspectRatio = 1.8;
      spacing = 4;
    } else if (effectiveWidth < 600) {
      // Mobile: 3 colunas
      crossAxisCount = 3;
      childAspectRatio = 2.0;
      spacing = 6;
    } else if (effectiveWidth < 900) {
      // Tablet pequeno: 4 colunas
      crossAxisCount = 4;
      childAspectRatio = 2.2;
      spacing = 8;
    } else if (effectiveWidth < 1200) {
      // Tablet grande: 5 colunas
      crossAxisCount = 5;
      childAspectRatio = 2.3;
      spacing = 8;
    } else {
      // Desktop: 6 colunas
      crossAxisCount = 6;
      childAspectRatio = 2.5;
      spacing = 8;
    }
    
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: childAspectRatio,
        crossAxisSpacing: spacing,
        mainAxisSpacing: spacing,
      ),
      itemCount: slots.length,
      itemBuilder: (context, index) {
        final slot = slots[index];
        final isSelected = _selectedTimeSlot == slot.time;

        return Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: slot.isAvailable
                ? () {
                    debugPrint('⏰ Horário selecionado: ${slot.time}');
                    setState(() {
                      _selectedTimeSlot = slot.time;
                    });
                  }
                : null,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              decoration: BoxDecoration(
                color: !slot.isAvailable
                    ? Colors.grey[200]
                    : isSelected
                        ? const Color(0xFF384D9C) // RGB(56, 77, 156)
                        : Colors.white,
                border: Border.all(
                  color: !slot.isAvailable
                      ? Colors.grey[400]!
                      : isSelected
                          ? const Color(0xFF384D9C) // RGB(56, 77, 156)
                          : Colors.grey[300]!,
                  width: isSelected ? 2 : 1,
                ),
                borderRadius: BorderRadius.circular(8),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: const Color(0xFF384D9C).withOpacity(0.3), // RGB(56, 77, 156)
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ]
                    : null,
              ),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  // Calcula tamanhos baseado na largura disponível do card
                  final cardWidth = constraints.maxWidth;
                  final isVerySmall = cardWidth < 60;
                  final isSmall = cardWidth < 80;
                  
                  final iconSize = isVerySmall ? 12.0 : (isSmall ? 14.0 : 16.0);
                  final fontSize = isVerySmall ? 10.0 : (isSmall ? 11.0 : 12.0);
                  final padding = isVerySmall
                      ? const EdgeInsets.symmetric(horizontal: 2, vertical: 4)
                      : isSmall
                          ? const EdgeInsets.symmetric(horizontal: 4, vertical: 4)
                          : const EdgeInsets.symmetric(horizontal: 6, vertical: 6);
                  
                  return Padding(
                    padding: padding,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          slot.isAvailable ? Icons.access_time : Icons.block,
                          size: iconSize,
                          color: !slot.isAvailable
                              ? Colors.grey[500]
                              : isSelected
                                  ? Colors.white
                                  : const Color(0xFF384D9C), // RGB(56, 77, 156)
                        ),
                        SizedBox(height: isVerySmall ? 1 : (isSmall ? 2 : 4)),
                        Flexible(
                          child: Text(
                            slot.startTime,
                            style: TextStyle(
                              color: !slot.isAvailable
                                  ? Colors.grey[600]
                                  : isSelected
                                      ? Colors.white
                                      : Colors.black87,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                              fontSize: fontSize,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                            textAlign: TextAlign.center,
                          ),
                        ),
                        if (!slot.isAvailable) ...[
                          SizedBox(height: isVerySmall ? 0 : (isSmall ? 1 : 2)),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              'Ocupado',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: isVerySmall ? 7 : (isSmall ? 8 : 9),
                                fontWeight: FontWeight.w500,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildConfirmButton() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final isEnabled = _selectedTimeSlot != null;
        final iconSize = isMobile ? 20.0 : 24.0;
        final fontSize = isMobile ? 14.0 : 16.0;
        final padding = isMobile ? 14.0 : 18.0;

        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: isEnabled ? _confirmAppointment : null,
            icon: Icon(Icons.check_circle, size: iconSize),
            label: Text(
              'Confirmar Agendamento',
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.bold,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
              foregroundColor: Colors.white,
              disabledBackgroundColor: Colors.grey[300],
              disabledForegroundColor: Colors.grey[600],
              padding: EdgeInsets.symmetric(vertical: padding),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: isEnabled ? 3 : 0,
            ),
          ),
        );
      },
    );
  }
}
