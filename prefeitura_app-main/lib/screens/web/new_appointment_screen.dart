import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../features/agenda/data/agenda_api_service.dart';
import '../../features/agenda/data/agenda_models.dart';

class NewAppointmentScreen extends StatefulWidget {
  const NewAppointmentScreen({super.key});
  @override
  State<NewAppointmentScreen> createState() => _NewAppointmentScreenState();
}

class _NewAppointmentScreenState extends State<NewAppointmentScreen> {
  final _api = AgendaApiService();
  List<AgendaServiceSummary> _services = const [];
  List<AgendaSlot> _slots = const [];
  AgendaServiceSummary? _service;
  AgendaSlot? _slot;
  DateTime _date = DateTime.now();
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  @override
  void dispose() {
    _api.close();
    super.dispose();
  }

  String _dateKey(DateTime value) =>
      '${value.year.toString().padLeft(4, '0')}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';

  Future<void> _loadServices() async {
    try {
      final items = await _api.listServices();
      if (!mounted) return;
      setState(() {
        _services = items;
        _loading = false;
        _error = items.isEmpty ? 'Nenhum serviço disponível.' : null;
      });
    } on AgendaApiException catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = error.message;
        });
      }
    }
  }

  Future<void> _loadSlots() async {
    if (_service == null) return;
    setState(() {
      _loading = true;
      _slot = null;
      _error = null;
    });
    try {
      final result = await _api.availability(_service!.id, _dateKey(_date));
      if (!mounted) return;
      setState(() {
        _slots = result.slots.where((item) => item.available).toList();
        _loading = false;
        if (_slots.isEmpty) _error = 'Não há horários disponíveis nesta data.';
      });
    } on AgendaApiException catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = error.message;
        });
      }
    }
  }

  Future<void> _chooseDate() async {
    final today = DateUtils.dateOnly(DateTime.now());
    final value = await showDatePicker(
      context: context,
      initialDate: _date.isBefore(today) ? today : _date,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
      locale: const Locale('pt', 'BR'),
    );
    if (value == null || !mounted) return;
    setState(() => _date = value);
    await _loadSlots();
  }

  Future<void> _confirm() async {
    if (_service == null || _slot == null || _saving) return;
    setState(() => _saving = true);
    try {
      final result = await _api.create(
        serviceId: _service!.id,
        startsAt: _slot!.startsAt,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Agendamento confirmado. Protocolo: ${result.protocol}',
          ),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context, true);
    } on AgendaApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message), backgroundColor: Colors.red),
      );
      if (error.statusCode == 409) await _loadSlots();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Novo agendamento')),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Escolha o serviço',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<AgendaServiceSummary>(
            initialValue: _service,
            isExpanded: true,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              labelText: 'Serviço',
            ),
            items: _services
                .map(
                  (item) => DropdownMenuItem(
                    value: item,
                    child: Text('${item.name} — ${item.unit.name}'),
                  ),
                )
                .toList(),
            onChanged: _loading
                ? null
                : (value) {
                    setState(() => _service = value);
                    _loadSlots();
                  },
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _service == null ? null : _chooseDate,
            icon: const Icon(Icons.calendar_month),
            label: Text(DateFormat('dd/MM/yyyy', 'pt_BR').format(_date)),
          ),
          const SizedBox(height: 20),
          const Text(
            'Horários disponíveis',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            Semantics(
              liveRegion: true,
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _slots
                  .map(
                    (item) => ChoiceChip(
                      label: Text(item.time),
                      selected: identical(_slot, item),
                      onSelected: (_) => setState(() => _slot = item),
                    ),
                  )
                  .toList(),
            ),
          const SizedBox(height: 28),
          FilledButton.icon(
            onPressed: _slot == null || _saving ? null : _confirm,
            icon: const Icon(Icons.check_circle_outline),
            label: Text(_saving ? 'Confirmando...' : 'Confirmar agendamento'),
          ),
        ],
      ),
    ),
  );
}
