// Import condicional para WebFilePicker
// Na web (dart:html disponível): usa web_file_picker_web.dart
// No mobile (dart:html não disponível): usa web_file_picker_stub.dart
export 'web_file_picker_stub.dart'
    if (dart.library.html) 'web_file_picker_web.dart';
