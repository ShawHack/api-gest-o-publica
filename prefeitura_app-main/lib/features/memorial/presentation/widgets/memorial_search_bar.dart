import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/data/memorial_api.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/features/memorial/presentation/theme/memorial_colors.dart';

class MemorialSearchBar extends StatefulWidget {
  const MemorialSearchBar({
    super.key,
    required this.onSearch,
    required this.onSuggestionTap,
    this.api,
  });

  final void Function(String query) onSearch;
  final void Function(SepultadoModel sepultado) onSuggestionTap;
  final MemorialApi? api;

  @override
  State<MemorialSearchBar> createState() => _MemorialSearchBarState();
}

class _MemorialSearchBarState extends State<MemorialSearchBar> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _api = MemorialApi();
  List<SepultadoModel> _suggestions = [];
  bool _loading = false;
  bool _showSuggestions = false;

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _fetchSuggestions(String term) async {
    if (term.trim().length < 2) {
      setState(() {
        _suggestions = [];
        _showSuggestions = false;
      });
      return;
    }
    setState(() => _loading = true);
    try {
      final api = widget.api ?? _api;
      final items = await api.suggestions(term);
      if (!mounted) return;
      setState(() {
        _suggestions = items;
        _showSuggestions = items.isNotEmpty;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _suggestions = [];
        _showSuggestions = false;
        _loading = false;
      });
    }
  }

  void _submit() {
    final term = _controller.text.trim();
    if (term.isEmpty) return;
    setState(() => _showSuggestions = false);
    _focusNode.unfocus();
    widget.onSearch(term);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          elevation: 2,
          shadowColor: Colors.black26,
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          clipBehavior: Clip.antiAlias,
          child: TextField(
            controller: _controller,
            focusNode: _focusNode,
            style: const TextStyle(
              color: MemorialColors.cardText,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
            cursorColor: MemorialColors.primary,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Buscar por nome, rua, quadra ou placa...',
              hintStyle: const TextStyle(
                color: MemorialColors.muted,
                fontSize: 15,
                fontWeight: FontWeight.w400,
              ),
              prefixIcon: const Icon(
                Icons.search,
                color: MemorialColors.primary,
                size: 22,
              ),
              suffixIcon: _loading
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: MemorialColors.primary,
                        ),
                      ),
                    )
                  : IconButton(
                      tooltip: 'Buscar',
                      icon: const Icon(Icons.arrow_forward_rounded),
                      color: MemorialColors.primary,
                      onPressed: _submit,
                    ),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
              isDense: true,
            ),
            onChanged: (v) {
              Future.delayed(const Duration(milliseconds: 300), () {
                if (_controller.text == v) _fetchSuggestions(v);
              });
            },
            onSubmitted: (_) => _submit(),
          ),
        ),
        if (_showSuggestions)
          Container(
            margin: const EdgeInsets.only(top: 8),
            constraints: const BoxConstraints(maxHeight: 220),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ListView.separated(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              itemCount: _suggestions.length,
              separatorBuilder: (_, index) => const Divider(height: 1, indent: 16, endIndent: 16),
              itemBuilder: (context, index) {
                final s = _suggestions[index];
                return ListTile(
                  dense: true,
                  title: Text(
                    s.nome,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: MemorialColors.cardText,
                    ),
                  ),
                  subtitle: Text(
                    [s.rua, s.quadra, s.chapa].where((e) => e?.isNotEmpty == true).join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: MemorialColors.muted, fontSize: 13),
                  ),
                  onTap: () {
                    setState(() => _showSuggestions = false);
                    _controller.clear();
                    widget.onSuggestionTap(s);
                  },
                );
              },
            ),
          ),
      ],
    );
  }
}
