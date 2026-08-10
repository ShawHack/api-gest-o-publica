import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/pet_network_image.dart';

class PetImageGallery extends StatefulWidget {
  const PetImageGallery({
    super.key,
    required this.imageUrls,
    this.aspectRatio = 4 / 3,
    this.borderRadius = 12,
  });

  final List<String> imageUrls;
  final double aspectRatio;
  final double borderRadius;

  @override
  State<PetImageGallery> createState() => _PetImageGalleryState();
}

class _PetImageGalleryState extends State<PetImageGallery> {
  final _pageCtrl = PageController();
  int _index = 0;

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final urls = widget.imageUrls;
    if (urls.isEmpty) {
      return AspectRatio(
        aspectRatio: widget.aspectRatio,
        child: Container(
          decoration: BoxDecoration(
            color: GarcaPetColors.surface,
            borderRadius: BorderRadius.circular(widget.borderRadius),
          ),
          child: const Icon(Icons.pets, size: 64, color: GarcaPetColors.primary),
        ),
      );
    }

    if (urls.length == 1) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(widget.borderRadius),
        child: AspectRatio(
          aspectRatio: widget.aspectRatio,
          child: PetNetworkImage(url: urls.first),
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(widget.borderRadius),
      child: AspectRatio(
        aspectRatio: widget.aspectRatio,
        child: Stack(
          alignment: Alignment.bottomCenter,
          children: [
            PageView.builder(
              controller: _pageCtrl,
              itemCount: urls.length,
              onPageChanged: (value) => setState(() => _index = value),
              itemBuilder: (_, i) => PetNetworkImage(url: urls[i]),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '${_index + 1} / ${urls.length}',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ),
            Positioned(
              bottom: 10,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(urls.length, (i) {
                  final active = i == _index;
                  return Container(
                    width: active ? 8 : 6,
                    height: active ? 8 : 6,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: active ? Colors.white : Colors.white54,
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

void openPetImageFullscreen(BuildContext context, List<String> urls, {int initialIndex = 0}) {
  if (urls.isEmpty) return;
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => _FullscreenPetGallery(urls: urls, initialIndex: initialIndex),
    ),
  );
}

class _FullscreenPetGallery extends StatefulWidget {
  const _FullscreenPetGallery({
    required this.urls,
    required this.initialIndex,
  });

  final List<String> urls;
  final int initialIndex;

  @override
  State<_FullscreenPetGallery> createState() => _FullscreenPetGalleryState();
}

class _FullscreenPetGalleryState extends State<_FullscreenPetGallery> {
  late final PageController _pageCtrl;
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex.clamp(0, widget.urls.length - 1);
    _pageCtrl = PageController(initialPage: _index);
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('${_index + 1} / ${widget.urls.length}'),
      ),
      body: PageView.builder(
        controller: _pageCtrl,
        itemCount: widget.urls.length,
        onPageChanged: (value) => setState(() => _index = value),
        itemBuilder: (_, i) => InteractiveViewer(
          minScale: 0.8,
          maxScale: 4,
          child: Center(
            child: PetNetworkImage(
              url: widget.urls[i],
              fit: BoxFit.contain,
              placeholderIconSize: 72,
            ),
          ),
        ),
      ),
    );
  }
}
