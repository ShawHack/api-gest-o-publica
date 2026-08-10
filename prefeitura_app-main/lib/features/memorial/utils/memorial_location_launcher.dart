import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_api.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_exception.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/features/memorial/utils/memorial_maps_utils.dart';

/// Indica se há alguma forma de abrir a localização do sepultado.
bool memorialCanOpenSepultadoLocation(SepultadoModel sep) {
  if (sep.hasCoordinates) return true;
  if (_nonEmpty(sep.plusCodePreciso) || _nonEmpty(sep.plusCodeQuadra)) {
    return true;
  }
  return _nonEmpty(sep.quadra);
}

bool _nonEmpty(String? value) => value != null && value.trim().isNotEmpty;

/// Resolve e abre mapas: plus code do sepultado, coordenadas ou `/dloc/{quadra}` (web).
Future<void> memorialOpenSepultadoLocation(
  BuildContext context,
  SepultadoModel sep, {
  MemorialApi? api,
  void Function(bool loading)? onLoading,
}) async {
  final client = api ?? MemorialApi();

  final preciso = sep.plusCodePreciso?.trim();
  if (preciso != null && preciso.isNotEmpty) {
    final ok = await memorialOpenMapsQuery(preciso);
    if (!context.mounted) return;
    if (!ok) _showMapsError(context);
    return;
  }

  final quadraCode = sep.plusCodeQuadra?.trim();
  if (quadraCode != null && quadraCode.isNotEmpty) {
    final ok = await memorialOpenMapsQuery(quadraCode);
    if (!context.mounted) return;
    if (!ok) _showMapsError(context);
    return;
  }

  if (sep.hasCoordinates) {
    final ok = await memorialOpenMapsCoordinates(sep.latitude!, sep.longitude!);
    if (!context.mounted) return;
    if (!ok) _showMapsError(context);
    return;
  }

  final quadra = sep.quadra?.trim();
  if (quadra == null || quadra.isEmpty) {
    if (!context.mounted) return;
    _showSnack(context, 'Localização não disponível para este sepultado.');
    return;
  }

  onLoading?.call(true);
  try {
    final pluscode = await client.fetchPlusCodeByQuadra(quadra);
    if (!context.mounted) return;
    if (pluscode == null || pluscode.trim().isEmpty) {
      _showSnack(context, 'Plus code não encontrado para esta quadra.');
      return;
    }
    final ok = await memorialOpenMapsQuery(pluscode);
    if (!context.mounted) return;
    if (!ok) {
      _showMapsError(context);
    }
  } on MemorialException catch (e) {
    if (!context.mounted) return;
    _showSnack(context, e.message);
  } catch (_) {
    if (!context.mounted) return;
    _showSnack(context, 'Erro ao buscar localização da quadra.');
  } finally {
    onLoading?.call(false);
  }
}

void _showMapsError(BuildContext context) {
  _showSnack(context, 'Não foi possível abrir o aplicativo de mapas.');
}

void _showSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}
