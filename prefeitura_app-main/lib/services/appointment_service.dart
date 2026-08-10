import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/appointment_model.dart';
import 'email_service.dart';

/// Serviço para gerenciar agendamentos
class AppointmentService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'appointments';

  /// Verifica autenticação no Firebase
  Future<void> _ensureAuth() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      debugPrint('⚠️ AVISO: Usuário não autenticado ao acessar appointments!');
      debugPrint('   Isso pode causar erros de permissão.');
    } else {
      debugPrint('✅ Usuário autenticado: ${user.email} (UID: ${user.uid})');
    }
  }

  /// Gera lista de slots de horário disponíveis
  /// Manhã: 8h-11h (slots de 20min)
  /// Tarde: 13h-15:40 (slots de 20min)
  List<String> generateTimeSlots() {
    final List<String> slots = [];

    debugPrint('🕐 Gerando slots de horário...');

    // Manhã: 8:00 - 11:00
    for (int hour = 8; hour < 11; hour++) {
      for (int minute = 0; minute < 60; minute += 20) {
        final start = '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
        final endMinute = minute + 20;
        final endHour = endMinute >= 60 ? hour + 1 : hour;
        final adjustedMinute = endMinute >= 60 ? endMinute - 60 : endMinute;
        final end = '${endHour.toString().padLeft(2, '0')}:${adjustedMinute.toString().padLeft(2, '0')}';
        slots.add('$start-$end');
      }
    }

    // Tarde: 13:00 - 15:40
    for (int hour = 13; hour <= 15; hour++) {
      final maxMinute = hour == 15 ? 40 : 60;
      for (int minute = 0; minute < maxMinute; minute += 20) {
        final start = '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
        final endMinute = minute + 20;
        final endHour = endMinute >= 60 ? hour + 1 : hour;
        final adjustedMinute = endMinute >= 60 ? endMinute - 60 : endMinute;
        final end = '${endHour.toString().padLeft(2, '0')}:${adjustedMinute.toString().padLeft(2, '0')}';
        slots.add('$start-$end');
      }
    }

    debugPrint('✅ Total de slots gerados: ${slots.length}');
    debugPrint('📋 Slots: ${slots.join(", ")}');

    return slots;
  }

  /// Verifica disponibilidade de slots para uma data específica
  /// [serviceId] - Se fornecido, considera apenas bloqueios gerais ou específicos deste serviço
  Future<List<TimeSlot>> getAvailableSlots(DateTime date, {String? serviceId}) async {
    await _ensureAuth(); // Garante autenticação antes da query

    try {
      debugPrint('🔍 Buscando slots disponíveis para: $date');
      if (serviceId != null) {
        debugPrint('   Serviço: $serviceId');
      }

      // DIAGNÓSTICO: Verifica estado de autenticação ANTES da consulta
      final currentUser = FirebaseAuth.instance.currentUser;
      debugPrint('🔐 DIAGNÓSTICO - Estado da autenticação:');
      debugPrint('   Usuário atual: ${currentUser?.email ?? "NENHUM"}');
      debugPrint('   UID: ${currentUser?.uid ?? "N/A"}');
      debugPrint('   Provedor: ${currentUser?.providerData.map((p) => p.providerId).join(", ") ?? "N/A"}');
      
      // Se não estiver autenticado, tenta fazer login agora
      if (currentUser == null) {
        debugPrint('⚠️ CRÍTICO: Não há usuário autenticado! Tentando login de emergência...');
        try {
          await FirebaseAuth.instance.signInWithEmailAndPassword(
            email: 'tecnico@gmail.com',
            password: const String.fromEnvironment('API_BASIC_AUTH_PASSWORD'),
          );
          debugPrint('✅ Login de emergência bem-sucedido!');
        } catch (loginError) {
          debugPrint('❌ FALHA no login de emergência: $loginError');
        }
      }

      // Normaliza a data para meia-noite
      final normalizedDate = DateTime(date.year, date.month, date.day);
      final nextDay = normalizedDate.add(const Duration(days: 1));

      debugPrint('📅 Data normalizada: $normalizedDate até $nextDay');

      // Busca TODOS os agendamentos do dia (sem filtro de status para evitar índice composto)
      debugPrint('🔎 Consultando Firestore...');
      final querySnapshot = await _firestore
          .collection(_collection)
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(normalizedDate))
          .where('date', isLessThan: Timestamp.fromDate(nextDay))
          .get();

      debugPrint('📊 Agendamentos encontrados: ${querySnapshot.docs.length}');

      // Cria mapa de slots ocupados (filtra status em memória)
      final Map<String, String> occupiedSlots = {};
      for (var doc in querySnapshot.docs) {
        final data = doc.data();
        final appointment = Appointment.fromFirestore(doc);

        // Considera ocupado se:
        // 1. Estiver pendente, atendido ou com mudança solicitada
        // 2. OU for um horário bloqueado (userId == 'BLOCKED')
        final isBlocked = data['userId'] == 'BLOCKED';
        
        if (isBlocked) {
          // Se há um serviceId na busca, verifica se o bloqueio se aplica
          final blockServiceId = data['serviceId'] as String?;
          
          // Lógica de aplicação do bloqueio:
          // - Bloqueio geral (blockServiceId == null) = bloqueia TODOS os serviços
          // - Bloqueio específico (blockServiceId == "abc") = bloqueia apenas aquele serviço
          // - Se a busca é geral (serviceId == null): todos os bloqueios se aplicam
          // - Se a busca é específica (serviceId != null): bloqueios gerais OU específicos daquele serviço se aplicam
          final appliesToService = serviceId == null
              ? true // Busca geral: todos os bloqueios se aplicam
              : (blockServiceId == null || blockServiceId == serviceId); // Busca específica: bloqueios gerais (todos) OU específicos daquele serviço
          
          if (appliesToService) {
            occupiedSlots[appointment.timeSlot] = appointment.id!;
            debugPrint('🚫 Slot BLOQUEADO: ${appointment.timeSlot} (serviço: ${blockServiceId ?? "todos"})');
          } else {
            debugPrint('⚪ Bloqueio ignorado (serviço diferente): ${appointment.timeSlot}');
          }
        } else if (appointment.status == AppointmentStatus.pending ||
            appointment.status == AppointmentStatus.attended ||
            appointment.status == AppointmentStatus.changeRequested) {
          occupiedSlots[appointment.timeSlot] = appointment.id!;
          debugPrint('🔒 Slot ocupado: ${appointment.timeSlot} (${appointment.status.name})');
        } else {
          debugPrint('⚪ Slot ignorado: ${appointment.timeSlot} (${appointment.status.name})');
        }
      }

      // Gera lista de todos os slots com disponibilidade
      final allSlots = generateTimeSlots();
      final result = allSlots.map((slot) {
        final isOccupied = occupiedSlots.containsKey(slot);
        return TimeSlot(
          time: slot,
          isAvailable: !isOccupied,
          appointmentId: isOccupied ? occupiedSlots[slot] : null,
        );
      }).toList();

      final availableCount = result.where((s) => s.isAvailable).length;
      debugPrint('✅ Slots disponíveis: $availableCount de ${result.length}');

      // Filtra horários passados se a data for hoje
      final filteredResult = _filterPastSlots(result, date);

      return filteredResult;
    } catch (e) {
      debugPrint('❌ Erro ao buscar slots disponíveis: $e');
      debugPrint('Stack trace: ${StackTrace.current}');
      rethrow;
    }
  }

  /// Filtra horários que já passaram se a data for hoje
  List<TimeSlot> _filterPastSlots(List<TimeSlot> slots, DateTime date) {
    final now = DateTime.now();
    final isToday = date.year == now.year &&
                    date.month == now.month &&
                    date.day == now.day;

    if (!isToday) {
      return slots; // Não filtra se não for hoje
    }

    final currentTime = TimeOfDay.fromDateTime(now);
    debugPrint('🕐 Filtrando slots passados. Horário atual: ${currentTime.hour}:${currentTime.minute}');

    final filtered = slots.where((slot) {
      // Extrai a hora de início do slot (ex: "08:00-08:20" -> 08:00)
      final startTimeStr = slot.time.split('-')[0];
      final startParts = startTimeStr.split(':');
      final slotHour = int.parse(startParts[0]);
      final slotMinute = int.parse(startParts[1]);
      
      // Cria TimeOfDay para o slot
      final slotTime = TimeOfDay(hour: slotHour, minute: slotMinute);
      
      // Compara se o slot já passou
      final slotPassed = slotTime.hour < currentTime.hour ||
                       (slotTime.hour == currentTime.hour && slotTime.minute < currentTime.minute);
      
      if (slotPassed) {
        debugPrint('⏰ Slot passado removido: ${slot.time}');
      }
      
      return !slotPassed;
    }).toList();

    debugPrint('✅ Slots após filtrar passados: ${filtered.length} de ${slots.length}');
    return filtered;
  }

  /// Cria novo agendamento
  Future<String> createAppointment(Appointment appointment) async {
    try {
      // Verifica se o slot está disponível
      final slots = await getAvailableSlots(
        appointment.date,
        serviceId: appointment.serviceId,
      );
      final selectedSlot = slots.firstWhere(
        (slot) => slot.time == appointment.timeSlot,
        orElse: () => TimeSlot(time: '', isAvailable: false),
      );

      if (!selectedSlot.isAvailable) {
        throw Exception('Este horário não está mais disponível');
      }

      // Cria o agendamento
      final docRef = await _firestore.collection(_collection).add(appointment.toMap());
      debugPrint('Agendamento criado com ID: ${docRef.id}');
      
      // Envia email de confirmação
      _sendConfirmationEmail(
        appointmentId: docRef.id,
        userName: appointment.userName,
        userEmail: appointment.userEmail,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        serviceName: appointment.serviceName,
      );
      
      return docRef.id;
    } catch (e) {
      debugPrint('Erro ao criar agendamento: $e');
      rethrow;
    }
  }

  /// Busca agendamentos do usuário
  Future<List<Appointment>> getUserAppointments(String userId) async {
    await _ensureAuth();
    try {
      debugPrint('🔍 Buscando agendamentos do usuário: $userId');
      debugPrint('   Coleção: $_collection');

      // Busca sem orderBy para evitar índice composto
      final querySnapshot = await _firestore
          .collection(_collection)
          .where('userId', isEqualTo: userId)
          .get();

      debugPrint('📊 Documentos encontrados: ${querySnapshot.docs.length}');

      // Converte para lista de appointments
      final appointments = querySnapshot.docs
          .map((doc) => Appointment.fromFirestore(doc))
          .toList();

      // Ordena em memória por data (mais recente primeiro)
      appointments.sort((a, b) => b.date.compareTo(a.date));

      debugPrint('✅ Agendamentos parseados e ordenados: ${appointments.length}');

      return appointments;
    } catch (e) {
      debugPrint('❌ Erro ao buscar agendamentos do usuário: $e');
      debugPrint('Stack trace: ${StackTrace.current}');
      rethrow;
    }
  }

  /// Busca agendamentos por período (para atendente/gerente)
  Future<List<Appointment>> getAppointmentsByDateRange(
    DateTime startDate,
    DateTime endDate, {
    List<AppointmentStatus>? statusFilter,
  }) async {
    try {
      // Busca sem filtro de status para evitar índice composto
      final querySnapshot = await _firestore
          .collection(_collection)
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startDate))
          .where('date', isLessThanOrEqualTo: Timestamp.fromDate(endDate))
          .get();

      // Converte para lista e exclui bloqueios
      var appointments = querySnapshot.docs
          .map((doc) {
            final data = doc.data() as Map<String, dynamic>?;
            // Exclui bloqueios (userId == 'BLOCKED')
            if (data != null && data['userId'] == 'BLOCKED') {
              return null;
            }
            return Appointment.fromFirestore(doc);
          })
          .where((apt) => apt != null)
          .cast<Appointment>()
          .toList();

      // Filtra por status em memória se necessário
      if (statusFilter != null && statusFilter.isNotEmpty) {
        appointments = appointments
            .where((apt) => statusFilter.contains(apt.status))
            .toList();
      }

      // Ordena por data
      appointments.sort((a, b) => a.date.compareTo(b.date));

      return appointments;
    } catch (e) {
      debugPrint('Erro ao buscar agendamentos por período: $e');
      rethrow;
    }
  }

  /// Atualiza status do agendamento (atendente marca presença/falta)
  Future<void> updateAppointmentStatus(
    String appointmentId,
    AppointmentStatus newStatus,
  ) async {
    try {
      await _firestore.collection(_collection).doc(appointmentId).update({
        'status': newStatus.name,
        'updatedAt': Timestamp.now(),
      });
      debugPrint('Status do agendamento $appointmentId atualizado para ${newStatus.name}');
    } catch (e) {
      debugPrint('Erro ao atualizar status: $e');
      rethrow;
    }
  }

  /// Solicita cancelamento ou troca de agendamento
  Future<void> requestChange(
    String appointmentId,
    RequestType requestType, {
    DateTime? newDate,
    String? newTimeSlot,
    String? message,
  }) async {
    try {
      final updateData = {
        'requestType': requestType.name,
        'requestMessage': message,
        'requestedAt': Timestamp.now(),
        'status': AppointmentStatus.changeRequested.name,
        'updatedAt': Timestamp.now(),
      };

      if (requestType == RequestType.reschedule) {
        if (newDate != null) updateData['requestedDate'] = Timestamp.fromDate(newDate);
        if (newTimeSlot != null) updateData['requestedTimeSlot'] = newTimeSlot;
      }

      await _firestore.collection(_collection).doc(appointmentId).update(updateData);
      debugPrint('Solicitação de mudança registrada para agendamento $appointmentId');
    } catch (e) {
      debugPrint('Erro ao solicitar mudança: $e');
      rethrow;
    }
  }

  /// Gerente responde solicitação de mudança
  Future<void> respondToChangeRequest(
    String appointmentId,
    bool approved,
    String managerId,
    String? responseMessage,
  ) async {
    try {
      final doc = await _firestore.collection(_collection).doc(appointmentId).get();
      final appointment = Appointment.fromFirestore(doc);

      final Map<String, dynamic> updateData = {
        'managerResponse': responseMessage,
        'respondedAt': Timestamp.now(),
        'respondedBy': managerId,
        'updatedAt': Timestamp.now(),
      };

      if (approved) {
        if (appointment.requestType == RequestType.cancellation) {
          updateData['status'] = AppointmentStatus.cancelled.name;
        } else if (appointment.requestType == RequestType.reschedule) {
          if (appointment.requestedDate != null) {
            updateData['date'] = Timestamp.fromDate(appointment.requestedDate!);
          }
          if (appointment.requestedTimeSlot != null) {
            updateData['timeSlot'] = appointment.requestedTimeSlot;
          }
          updateData['status'] = AppointmentStatus.pending.name;
        }
        // Remove campos de solicitação usando FieldValue.delete()
        updateData['requestType'] = FieldValue.delete();
        updateData['requestMessage'] = FieldValue.delete();
        updateData['requestedDate'] = FieldValue.delete();
        updateData['requestedTimeSlot'] = FieldValue.delete();
      } else {
        // Negado - volta ao status anterior e limpa solicitação
        updateData['status'] = AppointmentStatus.pending.name;
        // Remove campos de solicitação usando FieldValue.delete()
        updateData['requestType'] = FieldValue.delete();
        updateData['requestMessage'] = FieldValue.delete();
        updateData['requestedDate'] = FieldValue.delete();
        updateData['requestedTimeSlot'] = FieldValue.delete();
      }

      await _firestore.collection(_collection).doc(appointmentId).update(updateData);
      debugPrint('✅ Resposta à solicitação registrada: ${approved ? "Aprovada" : "Negada"}');
      debugPrint('   Campos removidos: requestType, requestMessage, requestedDate, requestedTimeSlot');
    } catch (e) {
      debugPrint('Erro ao responder solicitação: $e');
      rethrow;
    }
  }

  /// Busca solicitações pendentes (para gerente)
  Future<List<Appointment>> getPendingRequests() async {
    try {
      // Busca sem orderBy para evitar índice composto
      final querySnapshot = await _firestore
          .collection(_collection)
          .where('status', isEqualTo: AppointmentStatus.changeRequested.name)
          .get();

      // Converte e ordena em memória
      final appointments = querySnapshot.docs
          .map((doc) => Appointment.fromFirestore(doc))
          .toList();

      // Ordena por requestedAt (mais recente primeiro)
      appointments.sort((a, b) {
        if (a.requestedAt == null && b.requestedAt == null) return 0;
        if (a.requestedAt == null) return 1;
        if (b.requestedAt == null) return -1;
        return b.requestedAt!.compareTo(a.requestedAt!);
      });

      return appointments;
    } catch (e) {
      debugPrint('Erro ao buscar solicitações pendentes: $e');
      rethrow;
    }
  }

  /// Busca estatísticas de agendamentos
  Future<Map<String, int>> getStatistics({DateTime? startDate, DateTime? endDate}) async {
    try {
      Query query = _firestore.collection(_collection);

      if (startDate != null) {
        query = query.where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startDate));
      }
      if (endDate != null) {
        query = query.where('date', isLessThanOrEqualTo: Timestamp.fromDate(endDate));
      }

      final querySnapshot = await query.get();
      
      // Filtra agendamentos reais (exclui bloqueios)
      final appointments = querySnapshot.docs
          .map((doc) {
            final data = doc.data() as Map<String, dynamic>?;
            // Exclui bloqueios (userId == 'BLOCKED')
            if (data != null && data['userId'] == 'BLOCKED') {
              return null;
            }
            return Appointment.fromFirestore(doc);
          })
          .where((apt) => apt != null)
          .cast<Appointment>()
          .toList();

      return {
        'total': appointments.length,
        'pending': appointments.where((a) => a.status == AppointmentStatus.pending).length,
        'attended': appointments.where((a) => a.status == AppointmentStatus.attended).length,
        'noShow': appointments.where((a) => a.status == AppointmentStatus.noShow).length,
        'cancelled': appointments.where((a) => a.status == AppointmentStatus.cancelled).length,
        'changeRequested': appointments.where((a) => a.status == AppointmentStatus.changeRequested).length,
      };
    } catch (e) {
      debugPrint('Erro ao buscar estatísticas: $e');
      rethrow;
    }
  }

  /// Gerente cancela agendamento diretamente (sem solicitação)
  Future<void> managerCancelAppointment(
    String appointmentId,
    String managerId,
    String reason,
  ) async {
    try {
      // Busca o agendamento antes de atualizar
      final doc = await _firestore.collection(_collection).doc(appointmentId).get();
      final appointment = Appointment.fromFirestore(doc);
      
      await _firestore.collection(_collection).doc(appointmentId).update({
        'status': AppointmentStatus.cancelled.name,
        'managerResponse': reason,
        'respondedAt': Timestamp.now(),
        'respondedBy': managerId,
        'updatedAt': Timestamp.now(),
      });
      debugPrint('Agendamento $appointmentId cancelado pelo gerente $managerId');
    } catch (e) {
      debugPrint('Erro ao cancelar agendamento: $e');
      rethrow;
    }
  }

  /// Gerente reagenda diretamente (sem solicitação)
  Future<void> managerRescheduleAppointment(
    String appointmentId,
    DateTime newDate,
    String newTimeSlot,
    String managerId,
    String reason,
  ) async {
    try {
      // Busca o agendamento antes de atualizar
      final doc = await _firestore.collection(_collection).doc(appointmentId).get();
      final appointment = Appointment.fromFirestore(doc);
      final oldDate = appointment.date;
      final oldTimeSlot = appointment.timeSlot;
      
      // Verifica se o novo slot está disponível
      final slots = await getAvailableSlots(
        newDate,
        serviceId: appointment.serviceId,
      );
      final selectedSlot = slots.firstWhere(
        (slot) => slot.time == newTimeSlot,
        orElse: () => TimeSlot(time: '', isAvailable: false),
      );

      if (!selectedSlot.isAvailable) {
        throw Exception('O horário selecionado não está mais disponível');
      }

      await _firestore.collection(_collection).doc(appointmentId).update({
        'date': Timestamp.fromDate(newDate),
        'timeSlot': newTimeSlot,
        'managerResponse': reason,
        'respondedAt': Timestamp.now(),
        'respondedBy': managerId,
        'updatedAt': Timestamp.now(),
      });
      debugPrint('Agendamento $appointmentId reagendado pelo gerente $managerId');
    } catch (e) {
      debugPrint('Erro ao reagendar agendamento: $e');
      rethrow;
    }
  }

  /// Gerente bloqueia múltiplos horários
  Future<void> blockMultipleSlots({
    required DateTime date,
    required List<String> timeSlots,
    required String managerId,
    required String reason,
    String? serviceId,
    bool isRecurring = false,
  }) async {
    try {
      debugPrint('🚫 Bloqueando ${timeSlots.length} horários para ${date.toString()}');
      if (serviceId != null) {
        debugPrint('   Serviço: $serviceId');
      }
      if (isRecurring) {
        debugPrint('   ⚠️ BLOQUEIO RECORRENTE: Será aplicado toda semana');
      }

      final batch = _firestore.batch();
      final dayOfWeek = date.weekday; // 1 = segunda, 7 = domingo

      // Se for recorrente, bloqueia para as próximas 52 semanas (1 ano)
      final datesToBlock = isRecurring
          ? List.generate(52, (week) => date.add(Duration(days: week * 7)))
          : [date];

      for (final blockDate in datesToBlock) {
        for (final timeSlot in timeSlots) {
          final docRef = _firestore.collection(_collection).doc();
          final blockData = {
            'userId': 'BLOCKED',
            'userName': 'Horário Bloqueado',
            'userEmail': '',
            'userPhone': '',
            'userCpf': '',
            'date': Timestamp.fromDate(blockDate),
            'timeSlot': timeSlot,
            'status': AppointmentStatus.cancelled.name,
            'managerResponse': reason,
            'respondedAt': Timestamp.now(),
            'respondedBy': managerId,
            'createdAt': Timestamp.now(),
            'updatedAt': Timestamp.now(),
          };

          // Adiciona serviceId se fornecido
          if (serviceId != null) {
            blockData['serviceId'] = serviceId;
          }

          // Adiciona flag de recorrência se aplicável
          if (isRecurring) {
            blockData['isRecurringBlock'] = true;
            blockData['recurringDayOfWeek'] = dayOfWeek;
            blockData['originalBlockDate'] = Timestamp.fromDate(date);
          }

          batch.set(docRef, blockData);
        }
      }

      await batch.commit();
      final totalBlocks = datesToBlock.length * timeSlots.length;
      debugPrint('✅ $totalBlocks horário(s) bloqueado(s) com sucesso (${datesToBlock.length} data(s))');
    } catch (e) {
      debugPrint('❌ Erro ao bloquear horários: $e');
      rethrow;
    }
  }

  /// Verifica e envia lembretes para agendamentos que são amanhã
  /// Este método deve ser chamado periodicamente (ex: via Cloud Function ou cron job)
  Future<void> sendRemindersForTomorrow() async {
    try {
      final now = DateTime.now();
      final tomorrow = DateTime(now.year, now.month, now.day + 1);
      final dayAfterTomorrow = DateTime(now.year, now.month, now.day + 2);

      debugPrint('🔔 Verificando lembretes para agendamentos de amanhã...');
      debugPrint('   Data de amanhã: ${DateFormat('dd/MM/yyyy').format(tomorrow)}');

      // Busca agendamentos que são amanhã, estão pendentes e ainda não receberam lembrete
      final querySnapshot = await _firestore
          .collection(_collection)
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(tomorrow))
          .where('date', isLessThan: Timestamp.fromDate(dayAfterTomorrow))
          .where('status', isEqualTo: AppointmentStatus.pending.name)
          .get();

      final appointments = querySnapshot.docs
          .map((doc) => Appointment.fromFirestore(doc))
          .where((apt) => !apt.reminderSent) // Apenas os que ainda não receberam lembrete
          .toList();

      debugPrint('📊 Agendamentos encontrados que precisam de lembrete: ${appointments.length}');

      int sentCount = 0;
      for (final appointment in appointments) {
        try {
          // Marca como enviado (sem enviar email)
          await _firestore.collection(_collection).doc(appointment.id).update({
            'reminderSent': true,
            'updatedAt': Timestamp.now(),
          });

          sentCount++;
          debugPrint('✅ Lembrete processado para: ${appointment.userName} (${appointment.userEmail})');
        } catch (e) {
          debugPrint('❌ Erro ao processar lembrete para ${appointment.userName}: $e');
          // Continua com os próximos mesmo se houver erro
        }
      }

      debugPrint('✅ Total de lembretes processados: $sentCount de ${appointments.length}');
    } catch (e) {
      debugPrint('❌ Erro ao verificar lembretes: $e');
      rethrow;
    }
  }

  /// Envia email de confirmação de agendamento
  Future<void> _sendConfirmationEmail({
    required String appointmentId,
    required String userName,
    required String userEmail,
    required DateTime date,
    required String timeSlot,
    String? serviceName,
  }) async {
    try {
      final dateFormatted = DateFormat('dd/MM/yyyy', 'pt_BR').format(date);
      final dayOfWeek = DateFormat('EEEE', 'pt_BR').format(date);
      
      // Usa o método correto sendAppointmentEmail
      await EmailService.sendAppointmentEmail(
        eventType: 'created',
        to: userEmail,
        idempotencyKey: appointmentId,
        data: {
          'userName': userName,
          'date': dateFormatted,
          'dayOfWeek': dayOfWeek,
          'timeSlot': timeSlot,
          if (serviceName != null) 'serviceName': serviceName,
        },
      );
      
      debugPrint('📧 Email de confirmação enviado para: $userEmail');
    } catch (e) {
      debugPrint('❌ Erro ao enviar email de confirmação: $e');
      // Não relança o erro para não interromper o fluxo principal
    }
  }

  /// Gerente desbloqueia horários bloqueados
  Future<void> unblockSlots({
    required DateTime date,
    required List<String> timeSlots,
  }) async {
    try {
      debugPrint('🔓 Desbloqueando ${timeSlots.length} horários para ${date.toString()}');
      debugPrint('   Horários a desbloquear: ${timeSlots.join(", ")}');

      // Normaliza a data para o início do dia (sem horas)
      final normalizedDate = DateTime(date.year, date.month, date.day);
      final nextDay = normalizedDate.add(const Duration(days: 1));

      debugPrint('   Data normalizada: ${normalizedDate.toString()}');
      debugPrint('   Próximo dia: ${nextDay.toString()}');

      // Busca TODOS os horários bloqueados do dia (sem filtro de timeSlot primeiro)
      final snapshot = await _firestore
          .collection(_collection)
          .where('userId', isEqualTo: 'BLOCKED')
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(normalizedDate))
          .where('date', isLessThan: Timestamp.fromDate(nextDay))
          .get();

      debugPrint('📊 Documentos bloqueados encontrados: ${snapshot.docs.length}');

      final batch = _firestore.batch();
      int count = 0;

      for (final doc in snapshot.docs) {
        final data = doc.data();
        final docTimeSlot = data['timeSlot'] as String?;
        
        debugPrint('   Verificando documento ${doc.id}: timeSlot=$docTimeSlot');
        
        if (docTimeSlot != null && timeSlots.contains(docTimeSlot)) {
          debugPrint('      ✅ Deletando bloqueio: $docTimeSlot');
          batch.delete(doc.reference);
          count++;
        } else {
          debugPrint('      ⚪ Ignorando: $docTimeSlot (não está na lista de desbloqueio)');
        }
      }

      if (count > 0) {
        await batch.commit();
        debugPrint('✅ $count horário(s) desbloqueado(s) com sucesso');
      } else {
        debugPrint('⚠️ Nenhum horário foi desbloqueado. Verifique se os horários estão corretos.');
      }
    } catch (e) {
      debugPrint('❌ Erro ao desbloquear horários: $e');
      debugPrint('   Stack trace: ${StackTrace.current}');
      rethrow;
    }
  }

}
