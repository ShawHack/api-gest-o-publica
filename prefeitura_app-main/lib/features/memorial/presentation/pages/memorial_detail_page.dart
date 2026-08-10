import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_api.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_exception.dart';
import 'package:prefeitura_app/features/memorial/domain/models/memorial_comment_model.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/features/memorial/presentation/theme/memorial_colors.dart';
import 'package:prefeitura_app/features/memorial/presentation/utils/memorial_image_url.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/memorial_detail_components.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/memorial_location_fab.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/memorial_public_scaffold.dart';
import 'package:prefeitura_app/features/memorial/utils/memorial_location_launcher.dart';
import 'package:prefeitura_app/services/auth_service.dart';

class MemorialDetailPage extends StatefulWidget {
  const MemorialDetailPage({super.key, required this.sepultadoId});

  final String sepultadoId;

  static const int _maxCommentLength = 1000;

  @override
  State<MemorialDetailPage> createState() => _MemorialDetailPageState();
}

class _MemorialDetailPageState extends State<MemorialDetailPage> {
  final _api = MemorialApi();
  final _commentCtrl = TextEditingController();
  final _commentFocus = FocusNode();

  SepultadoModel? _sep;
  final List<MemorialCommentModel> _comments = [];
  bool _loading = true;
  bool _loadingComments = false;
  bool _sending = false;
  String? _error;
  int _commentPage = 1;
  bool _hasMoreComments = false;
  int _charCount = 0;

  @override
  void initState() {
    super.initState();
    _commentCtrl.addListener(_onCommentChanged);
    _load();
  }

  @override
  void dispose() {
    _commentCtrl.removeListener(_onCommentChanged);
    _commentCtrl.dispose();
    _commentFocus.dispose();
    super.dispose();
  }

  void _onCommentChanged() {
    setState(() => _charCount = _commentCtrl.text.length);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final sep = await _api.getById(widget.sepultadoId);
      if (!mounted) return;
      setState(() {
        _sep = sep;
        _loading = false;
      });
      await _loadComments(reset: true);
    } on MemorialException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar sepultado.';
        _loading = false;
      });
    }
  }

  Future<void> _loadComments({required bool reset}) async {
    setState(() => _loadingComments = true);
    try {
      final page = reset ? 1 : _commentPage + 1;
      final result = await _api.getComments(widget.sepultadoId, page: page, limit: 10);
      if (!mounted) return;
      setState(() {
        if (reset) {
          _comments
            ..clear()
            ..addAll(result.items);
        } else {
          _comments.addAll(result.items);
        }
        _commentPage = result.page;
        _hasMoreComments = result.hasMore;
        _loadingComments = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingComments = false);
    }
  }

  Future<void> _sendComment() async {
    final text = _commentCtrl.text.trim();
    if (text.isEmpty) return;

    final authed = await AuthService.isAuthenticated();
    if (!authed) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Faça login no menu do Prefeitura App para comentar.'),
        ),
      );
      return;
    }

    setState(() => _sending = true);
    try {
      await _api.postComment(widget.sepultadoId, text);
      _commentCtrl.clear();
      _commentFocus.unfocus();
      await _loadComments(reset: true);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Homenagem enviada com sucesso.')),
      );
    } on MemorialException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível enviar a homenagem.')),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _openMaps() async {
    final sep = _sep;
    if (sep == null) return;
    await memorialOpenSepultadoLocation(context, sep, api: _api);
  }

  @override
  Widget build(BuildContext context) {
    final sep = _sep;

    return MemorialPublicScaffold(
      backgroundColor: MemorialColors.background,
      extraOverlays: [
        if (sep != null) MemorialLocationFab(sepultado: sep, api: _api),
      ],
      appBar: AppBar(
        backgroundColor: MemorialColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        title: Text(
          _sep?.nome ?? 'Detalhes',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: MemorialColors.primary),
      );
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _load,
                style: FilledButton.styleFrom(backgroundColor: MemorialColors.primary),
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      );
    }

    final sep = _sep;
    if (sep == null) {
      return const Center(child: Text('Sepultado não encontrado.'));
    }

    final images = sep.images.isNotEmpty
        ? [for (final img in sep.images) memorialSepultadoImageUrl([img])]
        : [memorialSepultadoImageUrl(const [])];

    final heroImage = images.first;
    final canOpenMap = memorialCanOpenSepultadoLocation(sep);

    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 96),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          MemorialHeroGallery(imageUrls: images),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                MemorialPersonalCard(sep: sep, imageUrl: heroImage),
                const SizedBox(height: 16),
                MemorialLocationCard(
                  sep: sep,
                  onOpenMap: canOpenMap ? _openMaps : null,
                ),
                const SizedBox(height: 28),
                const MemorialSectionTitle(
                  title: 'Mensagens e homenagens',
                  subtitle: 'Deixe uma palavra de carinho e conforto à família',
                ),
                MemorialTributeComposer(
                  controller: _commentCtrl,
                  focusNode: _commentFocus,
                  charCount: _charCount,
                  maxLength: MemorialDetailPage._maxCommentLength,
                  sending: _sending,
                  onSend: _sendComment,
                ),
                const SizedBox(height: 16),
                if (_loadingComments && _comments.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: CircularProgressIndicator(color: MemorialColors.primary),
                    ),
                  )
                else if (!_loadingComments && _comments.isEmpty)
                  MemorialSurfaceCard(
                    child: Row(
                      children: [
                        Icon(
                          Icons.favorite_outline,
                          color: MemorialColors.primary.withValues(alpha: 0.7),
                          size: 28,
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Text(
                            'Nenhuma homenagem ainda. Seja o primeiro a deixar uma mensagem.',
                            style: TextStyle(
                              color: MemorialColors.muted,
                              fontSize: 15,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ..._comments.map((c) => MemorialTributeCard(comment: c)),
                if (_hasMoreComments)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: TextButton.icon(
                      onPressed: _loadingComments ? null : () => _loadComments(reset: false),
                      icon: const Icon(Icons.expand_more_rounded),
                      label: const Text('Carregar mais homenagens'),
                      style: TextButton.styleFrom(
                        foregroundColor: MemorialColors.primary,
                      ),
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
