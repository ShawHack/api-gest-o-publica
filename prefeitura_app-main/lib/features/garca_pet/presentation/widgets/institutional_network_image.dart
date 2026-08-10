import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';

/// Banner/hero institucional com fallback seguro se a imagem não carregar.
class InstitutionalNetworkImage extends StatelessWidget {
  const InstitutionalNetworkImage({
    super.key,
    required this.url,
    this.height = 200,
    this.fit = BoxFit.cover,
  });

  final String? url;
  final double height;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final trimmed = url?.trim();
    if (trimmed == null || trimmed.isEmpty) {
      return _placeholder();
    }

    return SizedBox(
      height: height,
      width: double.infinity,
      child: CachedNetworkImage(
        imageUrl: trimmed,
        fit: fit,
        placeholder: (context, url) => _placeholder(loading: true),
        errorWidget: (context, url, error) => _placeholder(broken: true),
      ),
    );
  }

  Widget _placeholder({bool loading = false, bool broken = false}) {
    return Container(
      height: height,
      width: double.infinity,
      color: GarcaPetColors.accent.withValues(alpha: 0.25),
      alignment: Alignment.center,
      child: Icon(
        broken ? Icons.broken_image_outlined : Icons.image_outlined,
        size: 56,
        color: GarcaPetColors.primary.withValues(alpha: loading ? 0.4 : 0.7),
      ),
    );
  }
}
