import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_api.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/features/memorial/utils/memorial_location_launcher.dart';

/// Botão flutuante direito — localização do sepultado (detalhe), espelhando o Memorial Web.
class MemorialLocationFab extends StatefulWidget {
  const MemorialLocationFab({
    super.key,
    required this.sepultado,
    this.api,
  });

  final SepultadoModel sepultado;
  final MemorialApi? api;

  @override
  State<MemorialLocationFab> createState() => _MemorialLocationFabState();
}

class _MemorialLocationFabState extends State<MemorialLocationFab> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    if (!memorialCanOpenSepultadoLocation(widget.sepultado)) {
      return const SizedBox.shrink();
    }

    return Positioned(
      right: 16,
      bottom: 16,
      child: SafeArea(
        child: Material(
          elevation: 6,
          shadowColor: const Color(0xFFED9756).withValues(alpha: 0.45),
          borderRadius: BorderRadius.circular(28),
          child: InkWell(
            borderRadius: BorderRadius.circular(28),
            onTap: _loading ? null : _openLocation,
            child: Ink(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                gradient: const LinearGradient(
                  colors: [Color(0xFFED9756), Color(0xFFFFB583)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_loading)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    else
                      const Icon(Icons.location_on_rounded, color: Colors.white, size: 22),
                    const SizedBox(width: 8),
                    Text(
                      _loading ? 'Carregando...' : 'Quadra',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openLocation() async {
    setState(() => _loading = true);
    await memorialOpenSepultadoLocation(
      context,
      widget.sepultado,
      api: widget.api,
    );
    if (mounted) setState(() => _loading = false);
  }
}
