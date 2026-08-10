import 'dart:io';

import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

abstract final class GarcaPetMediaPermissions {
  /// Solicita permissão de galeria/fotos antes do image_picker (Android 13+ / iOS).
  static Future<bool> ensureGalleryAccess(BuildContext context) async {
    if (!Platform.isAndroid && !Platform.isIOS) return true;

    Permission permission;
    if (Platform.isAndroid) {
      permission = Permission.photos;
      var status = await permission.status;
      if (!status.isGranted && !status.isLimited) {
        status = await permission.request();
      }
      if (status.isGranted || status.isLimited) return true;

      // Fallback Android antigo
      final legacy = await Permission.storage.request();
      if (legacy.isGranted) return true;
    } else {
      permission = Permission.photos;
      var status = await permission.status;
      if (!status.isGranted && !status.isLimited) {
        status = await permission.request();
      }
      if (status.isGranted || status.isLimited) return true;
    }

    if (!context.mounted) return false;
    final openSettings = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Permissão necessária'),
        content: const Text(
          'Para selecionar fotos do pet, permita o acesso à galeria nas configurações do app.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Abrir ajustes')),
        ],
      ),
    );
    if (openSettings == true) {
      await openAppSettings();
    }
    return false;
  }
}
