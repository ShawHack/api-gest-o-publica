import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';

class PetNetworkImage extends StatelessWidget {
  const PetNetworkImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.borderRadius,
    this.placeholderIconSize = 48,
  });

  final String? url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;
  final double placeholderIconSize;

  @override
  Widget build(BuildContext context) {
    Widget child;
    if (url == null || url!.trim().isEmpty) {
      child = _placeholder();
    } else {
      child = CachedNetworkImage(
        imageUrl: url!,
        fit: fit,
        width: width,
        height: height,
        placeholder: (_, __) => _loading(),
        errorWidget: (_, __, ___) => _placeholder(broken: true),
      );
    }

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: child);
    }
    return child;
  }

  Widget _placeholder({bool broken = false}) {
    return Container(
      width: width,
      height: height,
      color: GarcaPetColors.surface,
      alignment: Alignment.center,
      child: Icon(
        broken ? Icons.broken_image_outlined : Icons.pets,
        size: placeholderIconSize,
        color: broken ? Colors.grey : GarcaPetColors.primary,
      ),
    );
  }

  Widget _loading() {
    return Container(
      width: width,
      height: height,
      color: GarcaPetColors.surface,
      alignment: Alignment.center,
      child: const SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(strokeWidth: 2, color: GarcaPetColors.primary),
      ),
    );
  }
}
