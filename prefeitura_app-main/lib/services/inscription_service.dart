import 'dart:math';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../models/inscription_model.dart';

/// Serviço para gerenciar inscrições em formulários
class InscriptionService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'inscriptions_garca';

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

  /// Gera um código único de voucher
  String _generateVoucherCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final random = Random();
    return List.generate(8, (_) => chars[random.nextInt(chars.length)]).join();
  }

  /// Cria uma nova inscrição
  Future<String> createInscription(InscriptionModel inscription) async {
    await _ensureAuth();
    try {
      // Verifica se o usuário já se inscreveu neste formulário
      final existing = await _firestore
          .collection(_collection)
          .where('formId', isEqualTo: inscription.formId)
          .where('userId', isEqualTo: inscription.userId)
          .get();

      if (existing.docs.isNotEmpty) {
        throw Exception('Você já está inscrito neste formulário');
      }

      // Gera código único de voucher
      String voucherCode = '';
      bool isUnique = false;
      int attempts = 0;
      while (!isUnique && attempts < 10) {
        voucherCode = _generateVoucherCode();
        final check = await _firestore
            .collection(_collection)
            .where('voucherCode', isEqualTo: voucherCode)
            .get();
        if (check.docs.isEmpty) {
          isUnique = true;
        } else {
          attempts++;
        }
      }

      if (!isUnique || voucherCode.isEmpty) {
        throw Exception('Erro ao gerar código único. Tente novamente.');
      }

      final inscriptionWithCode = inscription.copyWith(
        voucherCode: voucherCode,
      );

      final docRef = await _firestore
          .collection(_collection)
          .add(inscriptionWithCode.toMap());

      debugPrint('✅ Inscrição criada com ID: ${docRef.id}, voucher: $voucherCode');
      return docRef.id;
    } catch (e) {
      debugPrint('❌ Erro ao criar inscrição: $e');
      rethrow;
    }
  }

  /// Busca todas as inscrições de um formulário
  Future<List<InscriptionModel>> getInscriptionsByForm(String formId) async {
    await _ensureAuth();
    try {
      final querySnapshot = await _firestore
          .collection(_collection)
          .where('formId', isEqualTo: formId)
          .orderBy('createdAt', descending: true)
          .get();

      final inscriptions = querySnapshot.docs
          .map((doc) => InscriptionModel.fromFirestore(doc))
          .toList();

      debugPrint('✅ ${inscriptions.length} inscrição(ões) encontrada(s) para o formulário $formId');
      return inscriptions;
    } catch (e) {
      debugPrint('❌ Erro ao buscar inscrições: $e');
      rethrow;
    }
  }

  /// Busca todas as inscrições de um usuário
  Future<List<InscriptionModel>> getInscriptionsByUser(String userId) async {
    await _ensureAuth();
    try {
      final querySnapshot = await _firestore
          .collection(_collection)
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .get();

      final inscriptions = querySnapshot.docs
          .map((doc) => InscriptionModel.fromFirestore(doc))
          .toList();

      debugPrint('✅ ${inscriptions.length} inscrição(ões) encontrada(s) para o usuário $userId');
      return inscriptions;
    } catch (e) {
      debugPrint('❌ Erro ao buscar inscrições do usuário: $e');
      rethrow;
    }
  }

  /// Busca uma inscrição por ID
  Future<InscriptionModel?> getInscriptionById(String inscriptionId) async {
    await _ensureAuth();
    try {
      final doc = await _firestore.collection(_collection).doc(inscriptionId).get();
      if (!doc.exists) {
        return null;
      }
      return InscriptionModel.fromFirestore(doc);
    } catch (e) {
      debugPrint('❌ Erro ao buscar inscrição: $e');
      rethrow;
    }
  }

  /// Atualiza uma inscrição
  Future<void> updateInscription(String inscriptionId, InscriptionModel inscription) async {
    await _ensureAuth();
    try {
      await _firestore
          .collection(_collection)
          .doc(inscriptionId)
          .update(inscription.toMap());
      debugPrint('✅ Inscrição $inscriptionId atualizada com sucesso');
    } catch (e) {
      debugPrint('❌ Erro ao atualizar inscrição: $e');
      rethrow;
    }
  }

  /// Verifica se o usuário já está inscrito em um formulário
  Future<bool> isUserInscribed(String formId, String userId) async {
    await _ensureAuth();
    try {
      final querySnapshot = await _firestore
          .collection(_collection)
          .where('formId', isEqualTo: formId)
          .where('userId', isEqualTo: userId)
          .limit(1)
          .get();

      return querySnapshot.docs.isNotEmpty;
    } catch (e) {
      debugPrint('❌ Erro ao verificar inscrição: $e');
      return false;
    }
  }

  /// Busca todas as inscrições (para admin)
  Future<List<InscriptionModel>> getAllInscriptions() async {
    await _ensureAuth();
    try {
      final querySnapshot = await _firestore
          .collection(_collection)
          .orderBy('createdAt', descending: true)
          .get();

      final inscriptions = querySnapshot.docs
          .map((doc) => InscriptionModel.fromFirestore(doc))
          .toList();

      debugPrint('✅ ${inscriptions.length} inscrição(ões) encontrada(s)');
      return inscriptions;
    } catch (e) {
      debugPrint('❌ Erro ao buscar todas as inscrições: $e');
      rethrow;
    }
  }

  /// Deleta uma inscrição
  Future<void> deleteInscription(String inscriptionId) async {
    await _ensureAuth();
    try {
      await _firestore.collection(_collection).doc(inscriptionId).delete();
      debugPrint('✅ Inscrição $inscriptionId deletada com sucesso');
    } catch (e) {
      debugPrint('❌ Erro ao deletar inscrição: $e');
      rethrow;
    }
  }
}
