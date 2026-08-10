/// Centraliza configurações de ambiente lidas via `--dart-define`.
///
/// Exemplo de execução:
/// flutter run -d chrome --web-hostname=localhost --web-port=5173 \
///   --dart-define=API_BASE_URL=http://localhost:3000

/// URL base do backend de agendamentos.
/// Pode ser definida no build com `--dart-define=API_BASE_URL=...`.
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:7500',
);


