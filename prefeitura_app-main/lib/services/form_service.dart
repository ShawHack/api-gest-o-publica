import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../models/form_model.dart';

/// Serviço para gerenciar formulários do Forms Garça
class FormService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'forms_garca';

  /// Garante autenticação no Firebase (Login fixo para acesso à API)
  Future<void> _ensureAuth() async {
    final user = FirebaseAuth.instance.currentUser;
    final targetEmail = 'ls789679@gmail.com';

    if (user == null || user.email != targetEmail) {
      debugPrint("🔐 Usuário atual (${user?.email}) não é a conta de suporte. Relogando...");
      try {
        if (user != null) {
          await FirebaseAuth.instance.signOut();
        }
        await FirebaseAuth.instance.signInWithEmailAndPassword(
          email: targetEmail,
          password: const String.fromEnvironment('API_BASIC_AUTH_PASSWORD')
        );
        debugPrint("✅ Logado no Firebase com conta de suporte: ${FirebaseAuth.instance.currentUser?.uid}");
      } catch (e) {
        debugPrint("❌ Erro ao logar no Firebase: $e");
      }
    }
  }

  /// Cria um novo formulário
  Future<String> createForm(FormModel form) async {
    await _ensureAuth();
    try {
      final docRef = await _firestore.collection(_collection).add(form.toMap());
      debugPrint('✅ Formulário criado com ID: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      debugPrint('❌ Erro ao criar formulário: $e');
      rethrow;
    }
  }

  /// Atualiza um formulário existente
  Future<void> updateForm(FormModel form) async {
    await _ensureAuth();
    try {
      if (form.id == null) {
        throw Exception('ID do formulário é obrigatório para atualização');
      }

      final updateData = form.toMap();
      updateData['updatedAt'] = Timestamp.now();

      await _firestore.collection(_collection).doc(form.id).update(updateData);
      debugPrint('✅ Formulário ${form.id} atualizado com sucesso');
    } catch (e) {
      debugPrint('❌ Erro ao atualizar formulário: $e');
      rethrow;
    }
  }

  /// Deleta um formulário
  Future<void> deleteForm(String formId) async {
    await _ensureAuth();
    try {
      await _firestore.collection(_collection).doc(formId).delete();
      debugPrint('✅ Formulário $formId deletado com sucesso');
    } catch (e) {
      debugPrint('❌ Erro ao deletar formulário: $e');
      rethrow;
    }
  }

  /// Busca todos os formulários, opcionalmente filtrados por status
  Future<List<FormModel>> getForms({FormStatus? status}) async {
    await _ensureAuth();
    try {
      // Busca todos os formulários ordenados por createdAt
      // Filtra por status em memória para evitar necessidade de índice composto
      Query query = _firestore.collection(_collection)
          .orderBy('createdAt', descending: true);

      final querySnapshot = await query.get();

      var forms = querySnapshot.docs
          .map((doc) => FormModel.fromFirestore(doc))
          .toList();

      // Filtra por status em memória se necessário
      if (status != null) {
        forms = forms.where((f) => f.status == status).toList();
      }

      debugPrint('✅ ${forms.length} formulário(s) encontrado(s)');
      return forms;
    } catch (e) {
      debugPrint('❌ Erro ao buscar formulários: $e');
      rethrow;
    }
  }

  /// Busca um formulário por ID
  Future<FormModel?> getFormById(String formId) async {
    await _ensureAuth();
    try {
      final doc = await _firestore.collection(_collection).doc(formId).get();
      if (!doc.exists) {
        return null;
      }
      return FormModel.fromFirestore(doc);
    } catch (e) {
      debugPrint('❌ Erro ao buscar formulário: $e');
      rethrow;
    }
  }

  /// Atualiza o status de um formulário
  Future<void> updateFormStatus(
    String formId,
    FormStatus newStatus,
    String? updatedBy,
  ) async {
    await _ensureAuth();
    try {
      await _firestore.collection(_collection).doc(formId).update({
        'status': newStatus.name,
        'updatedAt': Timestamp.now(),
        'updatedBy': updatedBy,
      });
      debugPrint('✅ Status do formulário $formId atualizado para ${newStatus.name}');
    } catch (e) {
      debugPrint('❌ Erro ao atualizar status: $e');
      rethrow;
    }
  }

  /// Busca formulários por período
  Future<List<FormModel>> getFormsByDateRange(
    DateTime startDate,
    DateTime endDate, {
    FormStatus? status,
  }) async {
    await _ensureAuth();
    try {
      Query query = _firestore
          .collection(_collection)
          .where('dataEvento', isGreaterThanOrEqualTo: Timestamp.fromDate(startDate))
          .where('dataEvento', isLessThanOrEqualTo: Timestamp.fromDate(endDate));

      if (status != null) {
        query = query.where('status', isEqualTo: status.name);
      }

      final querySnapshot = await query.orderBy('dataEvento', descending: true).get();

      final forms = querySnapshot.docs
          .map((doc) => FormModel.fromFirestore(doc))
          .toList();

      return forms;
    } catch (e) {
      debugPrint('❌ Erro ao buscar formulários por período: $e');
      rethrow;
    }
  }

  /// Busca estatísticas dos formulários
  Future<Map<String, int>> getStatistics() async {
    await _ensureAuth();
    try {
      final querySnapshot = await _firestore.collection(_collection).get();

      final forms = querySnapshot.docs
          .map((doc) => FormModel.fromFirestore(doc))
          .toList();

      return {
        'total': forms.length,
        'aberto': forms.where((f) => f.status == FormStatus.aberto).length,
        'emAndamento': forms.where((f) => f.status == FormStatus.emAndamento).length,
        'concluido': forms.where((f) => f.status == FormStatus.concluido).length,
      };
    } catch (e) {
      debugPrint('❌ Erro ao buscar estatísticas: $e');
      rethrow;
    }
  }
}
