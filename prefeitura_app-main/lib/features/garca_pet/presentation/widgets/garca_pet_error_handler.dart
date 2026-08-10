import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

abstract final class GarcaPetErrorHandler {
  static bool _isEmailNotVerified(GarcaPetException error) {
    if (error.code == 'email_not_verified') return true;
    final msg = error.message.toLowerCase();
    return error.statusCode == 403 &&
        (msg.contains('verifique') || msg.contains('verificar seu e-mail'));
  }

  /// Retorna true se o erro foi tratado (não precisa de SnackBar genérico).
  static Future<bool> handle(BuildContext context, GarcaPetException error) async {
    if (_isEmailNotVerified(error)) {
      await _showEmailVerificationDialog(context, error.message);
      return true;
    }
    if (error.statusCode == 401) {
      if (!context.mounted) return true;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message.isNotEmpty ? error.message : 'Sessão expirada. Faça login novamente.')),
      );
      return true;
    }
    return false;
  }

  static Future<void> _showEmailVerificationDialog(BuildContext context, String message) async {
    final emailCtrl = TextEditingController(text: await _guessEmail());
    if (!context.mounted) {
      emailCtrl.dispose();
      return;
    }

    final reenviar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Verificação pendente'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(message),
            const SizedBox(height: 12),
            TextField(
              controller: emailCtrl,
              decoration: const InputDecoration(
                labelText: 'E-mail para reenvio',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Agora não')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Reenviar e-mail')),
        ],
      ),
    );

    if (reenviar == true && context.mounted) {
      try {
        final msg = await AuthService.resendVerification(emailCtrl.text.trim());
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      } catch (e) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
    emailCtrl.dispose();
  }

  static Future<String> _guessEmail() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString('user');
      if (userJson != null) {
        final user = jsonDecode(userJson);
        if (user is Map && user['email'] != null) {
          return user['email'].toString();
        }
      }
    } catch (_) {}
    return '';
  }
}
