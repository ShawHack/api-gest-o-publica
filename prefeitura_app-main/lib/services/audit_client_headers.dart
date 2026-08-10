import 'package:flutter/foundation.dart';

/// Headers de rastreabilidade para trilha corporativa (`X-Client-*`).
/// Enviados em todas as chamadas à API Node (`api.garca.sp.gov.br`).
class AuditClientHeaders {
  AuditClientHeaders._();

  static const String appId = 'prefeitura_app';
  static const String appVersion = '1.0.0+1';

  /// Tela/rota atual (ex.: `garca_pet/pet_detail`).
  static String? currentScreen;

  /// Módulo ativo (ex.: `memorial`, `garca_pet`, `auth`).
  static String? currentModule;

  static void setContext({String? screen, String? module}) {
    if (screen != null) currentScreen = screen;
    if (module != null) currentModule = module;
  }

  static void clearContext() {
    currentScreen = null;
    currentModule = null;
  }

  static String platform() {
    if (kIsWeb) return 'web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'android';
      case TargetPlatform.iOS:
        return 'ios';
      case TargetPlatform.linux:
        return 'linux';
      case TargetPlatform.macOS:
        return 'macos';
      case TargetPlatform.windows:
        return 'windows';
      case TargetPlatform.fuchsia:
        return 'fuchsia';
    }
  }

  static String newRequestId() {
    final ms = DateTime.now().millisecondsSinceEpoch;
    return 'app-$ms';
  }

  static Map<String, String> build({String? module, String? screen}) {
    final resolvedModule = module ?? currentModule;
    final resolvedScreen = screen ?? currentScreen;
    return {
      'X-Client-App': appId,
      'X-Client-Platform': platform(),
      'X-Client-Version': appVersion,
      if (resolvedModule != null && resolvedModule.isNotEmpty)
        'X-Client-Module': resolvedModule,
      if (resolvedScreen != null && resolvedScreen.isNotEmpty)
        'X-Screen-Id': resolvedScreen,
      'X-Request-Id': newRequestId(),
    };
  }

  static Map<String, String> merge(
    Map<String, String>? base, {
    String? module,
    String? screen,
  }) {
    return {...build(module: module, screen: screen), ...?base};
  }

  /// Aplica headers em [http.MultipartRequest] (upload de arquivos).
  static void applyToMultipart(
    dynamic request, {
    String? module,
    String? screen,
  }) {
    final headers = build(module: module, screen: screen);
    headers.forEach((key, value) {
      request.headers[key] = value;
    });
  }
}
