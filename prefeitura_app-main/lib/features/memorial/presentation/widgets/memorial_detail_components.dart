import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/domain/models/memorial_comment_model.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/features/memorial/presentation/theme/memorial_colors.dart';
import 'package:prefeitura_app/features/memorial/presentation/utils/memorial_date_format.dart';
import 'package:prefeitura_app/features/memorial/presentation/utils/memorial_image_url.dart';

/// Card base com sombra suave (Material 3).
class MemorialSurfaceCard extends StatelessWidget {
  const MemorialSurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 0,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: padding,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE8ECF4)),
          boxShadow: [
            BoxShadow(
              color: MemorialColors.primary.withValues(alpha: 0.06),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: child,
      ),
    );
  }
}

class MemorialSectionTitle extends StatelessWidget {
  const MemorialSectionTitle({
    super.key,
    required this.title,
    this.subtitle,
  });

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: MemorialColors.cardText,
              letterSpacing: 0.1,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              style: const TextStyle(
                fontSize: 14,
                color: MemorialColors.muted,
                height: 1.35,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class MemorialInitialsAvatar extends StatelessWidget {
  const MemorialInitialsAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.radius = 36,
  });

  final String name;
  final String? imageUrl;
  final double radius;

  static String initialsFrom(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts.first[0].toUpperCase();
    }
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final hasImage = imageUrl != null && imageUrl!.isNotEmpty;

    return CircleAvatar(
      radius: radius,
      backgroundColor: MemorialColors.primary.withValues(alpha: 0.12),
      backgroundImage: hasImage ? NetworkImage(imageUrl!) : null,
      child: hasImage
          ? null
          : Text(
              initialsFrom(name),
              style: TextStyle(
                fontSize: radius * 0.55,
                fontWeight: FontWeight.w700,
                color: MemorialColors.primary,
              ),
            ),
    );
  }
}

class MemorialInfoRow extends StatelessWidget {
  const MemorialInfoRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: MemorialColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: MemorialColors.primary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: MemorialColors.muted,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: MemorialColors.cardText,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class MemorialPersonalCard extends StatelessWidget {
  const MemorialPersonalCard({
    super.key,
    required this.sep,
    required this.imageUrl,
  });

  final SepultadoModel sep;
  final String imageUrl;

  @override
  Widget build(BuildContext context) {
    return MemorialSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MemorialInitialsAvatar(
                name: sep.nome,
                imageUrl: imageUrl,
                radius: 32,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      sep.nome,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: MemorialColors.cardText,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Em memória',
                      style: TextStyle(
                        fontSize: 13,
                        color: MemorialColors.muted.withValues(alpha: 0.95),
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Divider(height: 28, color: Color(0xFFE8ECF4)),
          MemorialInfoRow(
            icon: Icons.cake_outlined,
            label: 'Data de nascimento',
            value: memorialFormatDate(sep.dtNasc),
          ),
          MemorialInfoRow(
            icon: Icons.favorite_border_rounded,
            label: 'Data de falecimento',
            value: memorialFormatDate(sep.dtFal),
          ),
          if (sep.idade?.trim().isNotEmpty == true)
            MemorialInfoRow(
              icon: Icons.hourglass_bottom_outlined,
              label: 'Idade',
              value: memorialDisplayText(sep.idade),
            ),
          MemorialInfoRow(
            icon: Icons.woman_outlined,
            label: 'Mãe',
            value: memorialDisplayText(sep.mae),
          ),
          MemorialInfoRow(
            icon: Icons.man_outlined,
            label: 'Pai',
            value: memorialDisplayText(sep.pai),
          ),
          if (sep.nacionalidade?.trim().isNotEmpty == true)
            MemorialInfoRow(
              icon: Icons.flag_outlined,
              label: 'Nacionalidade',
              value: memorialDisplayText(sep.nacionalidade),
            ),
        ],
      ),
    );
  }
}

class MemorialLocationCard extends StatelessWidget {
  const MemorialLocationCard({
    super.key,
    required this.sep,
    required this.onOpenMap,
  });

  final SepultadoModel sep;
  final VoidCallback? onOpenMap;

  @override
  Widget build(BuildContext context) {
    final hasMap = onOpenMap != null;

    return MemorialSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.place_outlined, color: MemorialColors.primary, size: 22),
              const SizedBox(width: 8),
              const Text(
                'Localização',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: MemorialColors.cardText,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          MemorialInfoRow(
            icon: Icons.church_outlined,
            label: 'Cemitério',
            value: memorialDisplayText(sep.cemiterio, fallback: 'Santa Faustina'),
          ),
          MemorialInfoRow(
            icon: Icons.signpost_outlined,
            label: 'Rua',
            value: memorialDisplayText(sep.rua),
          ),
          MemorialInfoRow(
            icon: Icons.grid_view_rounded,
            label: 'Quadra',
            value: memorialDisplayText(sep.quadraNome ?? sep.quadra),
          ),
          MemorialInfoRow(
            icon: Icons.tag_outlined,
            label: 'Placa',
            value: memorialDisplayText(sep.chapa),
          ),
          if (hasMap) ...[
            const SizedBox(height: 4),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onOpenMap,
                icon: const Icon(Icons.map_outlined, size: 20),
                label: const Text('Abrir no mapa'),
                style: FilledButton.styleFrom(
                  backgroundColor: MemorialColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class MemorialTributeComposer extends StatelessWidget {
  const MemorialTributeComposer({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.charCount,
    required this.maxLength,
    required this.sending,
    required this.onSend,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final int charCount;
  final int maxLength;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return MemorialSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: controller,
            focusNode: focusNode,
            maxLines: 4,
            minLines: 3,
            maxLength: maxLength,
            style: const TextStyle(
              color: MemorialColors.cardText,
              fontSize: 16,
              height: 1.45,
            ),
            cursorColor: MemorialColors.primary,
            decoration: InputDecoration(
              hintText: 'Escreva uma homenagem com carinho...',
              hintStyle: TextStyle(
                color: MemorialColors.muted.withValues(alpha: 0.85),
                fontSize: 15,
              ),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              counterText: '',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: MemorialColors.primary, width: 2),
              ),
              contentPadding: const EdgeInsets.all(16),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                '$charCount / $maxLength',
                style: const TextStyle(
                  fontSize: 13,
                  color: MemorialColors.muted,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: sending ? null : onSend,
                icon: sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send_rounded, size: 20),
                label: Text(sending ? 'Enviando...' : 'Enviar homenagem'),
                style: FilledButton.styleFrom(
                  backgroundColor: MemorialColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class MemorialTributeCard extends StatelessWidget {
  const MemorialTributeCard({super.key, required this.comment});

  final MemorialCommentModel comment;

  @override
  Widget build(BuildContext context) {
    final author = (comment.autor ?? 'Anônimo').trim();
    final img = memorialCommentImageUrl(comment.imagem);
    final dateLabel = comment.createdAt != null
        ? memorialFormatDateTime(comment.createdAt)
        : '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: MemorialSurfaceCard(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MemorialInitialsAvatar(name: author, radius: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          author,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            color: MemorialColors.cardText,
                          ),
                        ),
                      ),
                      if (dateLabel.isNotEmpty)
                        Text(
                          dateLabel,
                          style: const TextStyle(
                            fontSize: 12,
                            color: MemorialColors.muted,
                          ),
                        ),
                    ],
                  ),
                  if (comment.texto.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      comment.texto,
                      style: const TextStyle(
                        fontSize: 15,
                        color: MemorialColors.cardText,
                        height: 1.45,
                      ),
                    ),
                  ],
                  if (comment.emojis.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      comment.emojis.join(' '),
                      style: const TextStyle(fontSize: 18),
                    ),
                  ],
                  if (img != null) ...[
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        img,
                        height: 140,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MemorialHeroGallery extends StatefulWidget {
  const MemorialHeroGallery({super.key, required this.imageUrls});

  final List<String> imageUrls;

  @override
  State<MemorialHeroGallery> createState() => _MemorialHeroGalleryState();
}

class _MemorialHeroGalleryState extends State<MemorialHeroGallery> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final urls = widget.imageUrls;

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
      child: SizedBox(
        height: 240,
        child: Stack(
          fit: StackFit.expand,
          children: [
            PageView.builder(
              itemCount: urls.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (_, i) => Image.network(
                urls[i],
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: MemorialColors.primary.withValues(alpha: 0.12),
                  child: const Icon(Icons.image_not_supported_outlined, size: 56),
                ),
              ),
            ),
            if (urls.length > 1)
              Positioned(
                bottom: 12,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(urls.length, (i) {
                    final active = i == _index;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: active ? 20 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: active ? Colors.white : Colors.white.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                    );
                  }),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
