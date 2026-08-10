import 'package:intl/intl.dart';

const _monthAbbrev = <String, int>{
  'jan': 1,
  'feb': 2,
  'mar': 3,
  'apr': 4,
  'may': 5,
  'jun': 6,
  'jul': 7,
  'aug': 8,
  'sep': 9,
  'oct': 10,
  'nov': 11,
  'dec': 12,
};

final _brDateFormat = DateFormat('dd/MM/yyyy', 'pt_BR');

/// Texto de exibição para campos opcionais (mãe, pai, etc.).
String memorialDisplayText(String? value, {String fallback = 'Não informado'}) {
  final s = (value ?? '').trim();
  if (s.isEmpty) return fallback;
  final lower = s.toLowerCase();
  if (lower == '—' ||
      lower == '-' ||
      lower == 'desconhecido' ||
      lower == 'desconhecida' ||
      lower == 'inform. desconhecida' ||
      lower == 'n/a') {
    return fallback;
  }
  return s;
}

/// Converte vários formatos do backend em [DateTime] (data civil, sem deslocar fuso).
DateTime? memorialParseDate(dynamic valor) {
  if (valor == null) return null;
  final s = valor.toString().trim();
  if (s.isEmpty) return null;

  final br = RegExp(r'^(\d{2})/(\d{2})/(\d{4})$');
  final brMatch = br.firstMatch(s);
  if (brMatch != null) {
    return DateTime(
      int.parse(brMatch.group(3)!),
      int.parse(brMatch.group(2)!),
      int.parse(brMatch.group(1)!),
    );
  }

  final iso = RegExp(r'^(\d{4})-(\d{2})-(\d{2})');
  final isoMatch = iso.firstMatch(s);
  if (isoMatch != null) {
    return DateTime(
      int.parse(isoMatch.group(1)!),
      int.parse(isoMatch.group(2)!),
      int.parse(isoMatch.group(3)!),
    );
  }

  final eng = RegExp(
    r'[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})',
  );
  final engMatch = eng.firstMatch(s);
  if (engMatch != null) {
    final month = _monthAbbrev[engMatch.group(1)!.toLowerCase()];
    if (month != null) {
      return DateTime(
        int.parse(engMatch.group(3)!),
        month,
        int.parse(engMatch.group(2)!),
      );
    }
  }

  final parsed = DateTime.tryParse(s);
  if (parsed != null) {
    if (s.contains('GMT') || s.contains('UTC')) {
      final u = parsed.toUtc();
      return DateTime(u.year, u.month, u.day);
    }
    return DateTime(parsed.year, parsed.month, parsed.day);
  }

  if (RegExp(r'^\d{8,}$').hasMatch(s)) {
    final ms = int.tryParse(s);
    if (ms != null) {
      final d = DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true);
      return DateTime(d.year, d.month, d.day);
    }
  }

  return null;
}

/// Data em pt-BR ou [fallback] quando ausente/inválida.
String memorialFormatDate(dynamic valor, {String fallback = 'Não informado'}) {
  final parsed = memorialParseDate(valor);
  if (parsed != null) {
    return _brDateFormat.format(parsed);
  }

  final s = valor?.toString().trim() ?? '';
  if (s.isEmpty) return fallback;

  final lower = s.toLowerCase();
  if (lower == 'desconhecida' ||
      lower == 'desconhecido' ||
      lower == 'não informado' ||
      lower == 'nao informado') {
    return fallback;
  }

  return fallback;
}

/// Data/hora de comentário.
String memorialFormatDateTime(DateTime? date, {String fallback = ''}) {
  if (date == null) return fallback;
  return DateFormat('dd/MM/yyyy', 'pt_BR').format(date.toLocal());
}
