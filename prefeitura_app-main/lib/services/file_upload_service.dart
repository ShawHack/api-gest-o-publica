// Import condicional para FileUploadService
// Na web (dart:html disponível): usa file_upload_service_web.dart
// No mobile (dart:io disponível): usa file_upload_service_mobile.dart
export 'file_upload_service_mobile.dart'
    if (dart.library.html) 'file_upload_service_web.dart';
