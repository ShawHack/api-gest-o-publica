import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_api.dart';
import 'package:prefeitura_app/features/garca_pet/domain/institutional/garca_pet_media_urls.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/institutional_network_image.dart';

/// Hero da página de castração com selo “encerrada” sincronizado à API.
class CastrationInstitutionalHero extends StatefulWidget {
  const CastrationInstitutionalHero({
    super.key,
    required this.heroImageUrl,
    this.onStatusLoaded,
  });

  final String? heroImageUrl;
  final void Function(bool closed)? onStatusLoaded;

  @override
  State<CastrationInstitutionalHero> createState() =>
      _CastrationInstitutionalHeroState();
}

class _CastrationInstitutionalHeroState extends State<CastrationInstitutionalHero> {
  static const _heroHeight = 220.0;

  bool _loading = true;
  bool _closed = false;

  @override
  void initState() {
    super.initState();
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    final closed = await GarcaPetApi().fetchCastrationClosed();
    if (!mounted) return;
    setState(() {
      _closed = closed;
      _loading = false;
    });
    widget.onStatusLoaded?.call(closed);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: _heroHeight,
          child: Stack(
            fit: StackFit.expand,
            children: [
              InstitutionalNetworkImage(
                url: widget.heroImageUrl,
                height: _heroHeight,
              ),
              if (_closed)
                ColoredBox(
                  color: Colors.black.withValues(alpha: 0.35),
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: InstitutionalNetworkImage(
                        url: GarcaPetMediaUrls.castracaoClosedNotice,
                        height: _heroHeight * 0.75,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                ),
              if (_loading)
                const Align(
                  alignment: Alignment.topRight,
                  child: Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (_closed && !_loading) const _CastrationClosedBanner(),
      ],
    );
  }
}

class _CastrationClosedBanner extends StatelessWidget {
  const _CastrationClosedBanner();

  @override
  Widget build(BuildContext context) {
    return Material(
      color: GarcaPetColors.error.withValues(alpha: 0.12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.lock_outline, color: GarcaPetColors.error, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'A campanha de castração solidária está temporariamente encerrada. '
                'Acompanhe os canais da SAMA para novas datas.',
                style: GoogleFonts.rubik(
                  fontSize: 14,
                  height: 1.45,
                  color: GarcaPetColors.primaryDark,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
