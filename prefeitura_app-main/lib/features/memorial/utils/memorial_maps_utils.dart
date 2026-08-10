import 'package:url_launcher/url_launcher.dart';

/// Abre Google Maps com Plus Code ou texto de localização.
Future<bool> memorialOpenMapsQuery(String query) async {
  final trimmed = query.trim();
  if (trimmed.isEmpty) return false;

  final uri = Uri.parse(
    'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(trimmed)}',
  );
  if (!await canLaunchUrl(uri)) return false;
  return launchUrl(uri, mode: LaunchMode.externalApplication);
}

/// Abre Google Maps com coordenadas (API GeoJSON: [lng, lat]).
Future<bool> memorialOpenMapsCoordinates(double latitude, double longitude) async {
  final uri = Uri.parse(
    'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude',
  );
  if (!await canLaunchUrl(uri)) return false;
  return launchUrl(uri, mode: LaunchMode.externalApplication);
}
