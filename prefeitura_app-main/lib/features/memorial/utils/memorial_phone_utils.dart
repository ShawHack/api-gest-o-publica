/// WhatsApp do Cemitério Santa Faustina — mesmo número do Memorial Web (`WhatsAppButton.js`).
const String memorialCemeteryWhatsAppDigits = '551434710233';

/// Normaliza telefone brasileiro para links `wa.me` (apenas dígitos, com DDI 55).
String? memorialNormalizeWhatsAppDigits(String? raw) {
  if (raw == null) return null;
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;

  var digits = trimmed.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return null;

  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  if (!digits.startsWith('55') || digits.length <= 11) {
    digits = '55$digits';
  }

  if (digits.length < 12) return null;
  return digits;
}
