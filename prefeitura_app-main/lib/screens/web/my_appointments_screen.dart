import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../features/agenda/data/agenda_api_service.dart';
import '../../features/agenda/data/agenda_models.dart';

class MyAppointmentsScreen extends StatefulWidget {
  const MyAppointmentsScreen({super.key});
  @override
  State<MyAppointmentsScreen> createState() => _MyAppointmentsScreenState();
}

class _MyAppointmentsScreenState extends State<MyAppointmentsScreen> {
  final _api = AgendaApiService();
  List<AgendaAppointment> _items = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _api.close();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await _api.mine();
      if (mounted) {
        setState(() {
          _items = items;
          _loading = false;
        });
      }
    } on AgendaApiException catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = error.message;
        });
      }
    }
  }

  bool _canChange(AgendaAppointment item) =>
      item.status == 'booked' || item.status == 'confirmed';
  String _status(String value) =>
      const {
        'booked': 'Agendado',
        'confirmed': 'Confirmado',
        'completed': 'Concluído',
        'no_show': 'Não compareceu',
        'cancelled': 'Cancelado',
      }[value] ??
      value;

  Future<void> _cancel(AgendaAppointment item) async {
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar agendamento?'),
        content: Text('Confirma o cancelamento do protocolo ${item.protocol}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Voltar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );
    if (accepted != true) return;
    try {
      await _api.cancel(
        item.id,
        reason: 'Cancelamento solicitado pelo cidadão no aplicativo.',
      );
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Agendamento cancelado.')));
      await _load();
    } on AgendaApiException catch (error) {
      _showError(error.message);
    }
  }

  Future<void> _reschedule(AgendaAppointment item) async {
    if (item.serviceId == null || item.serviceId!.isEmpty) {
      _showError('Serviço do agendamento não identificado.');
      return;
    }
    final today = DateUtils.dateOnly(DateTime.now());
    final date = await showDatePicker(
      context: context,
      initialDate: today.add(const Duration(days: 1)),
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
      locale: const Locale('pt', 'BR'),
    );
    if (date == null || !mounted) return;
    try {
      final key =
          '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      final result = await _api.availability(item.serviceId!, key);
      final slots = result.slots.where((slot) => slot.available).toList();
      if (!mounted) return;
      if (slots.isEmpty) {
        _showError('Não há horários disponíveis nesta data.');
        return;
      }
      final selected = await showModalBottomSheet<AgendaSlot>(
        context: context,
        builder: (context) => SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const Text(
                'Escolha o novo horário',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              ...slots.map(
                (slot) => ListTile(
                  leading: const Icon(Icons.schedule),
                  title: Text(slot.time),
                  onTap: () => Navigator.pop(context, slot),
                ),
              ),
            ],
          ),
        ),
      );
      if (selected == null) return;
      await _api.reschedule(
        appointmentId: item.id,
        serviceId: item.serviceId!,
        startsAt: selected.startsAt,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Agendamento reagendado.')));
      await _load();
    } on AgendaApiException catch (error) {
      _showError(error.message);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Meus agendamentos'),
      actions: [
        IconButton(
          onPressed: _loading ? null : _load,
          tooltip: 'Atualizar',
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: SafeArea(
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Semantics(liveRegion: true, child: Text(_error!)),
                  OutlinedButton(
                    onPressed: _load,
                    child: const Text('Tentar novamente'),
                  ),
                ],
              ),
            )
          : _items.isEmpty
          ? const Center(child: Text('Você ainda não possui agendamentos.'))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: _items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final item = _items[index];
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.serviceName ?? 'Atendimento',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(item.unitName ?? ''),
                          Text(
                            DateFormat(
                              'dd/MM/yyyy HH:mm',
                              'pt_BR',
                            ).format(item.startsAt.toLocal()),
                          ),
                          Text('Protocolo: ${item.protocol}'),
                          Chip(label: Text(_status(item.status))),
                          if (_canChange(item))
                            Wrap(
                              spacing: 8,
                              children: [
                                TextButton.icon(
                                  onPressed: () => _reschedule(item),
                                  icon: const Icon(Icons.event_repeat),
                                  label: const Text('Reagendar'),
                                ),
                                TextButton.icon(
                                  onPressed: () => _cancel(item),
                                  icon: const Icon(Icons.cancel_outlined),
                                  label: const Text('Cancelar'),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
    ),
  );
}
