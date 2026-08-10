import 'package:flutter/material.dart';
import 'package:prefeitura_app/services/audit_client_headers.dart';
import 'package:prefeitura_app/features/memorial/domain/models/sepultado_model.dart';
import 'package:prefeitura_app/features/memorial/presentation/pages/memorial_detail_page.dart';
import 'package:prefeitura_app/features/memorial/presentation/pages/memorial_home_page.dart';
import 'package:prefeitura_app/features/memorial/presentation/pages/memorial_search_page.dart';
import 'package:prefeitura_app/features/memorial/presentation/theme/memorial_colors.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/memorial_public_scaffold.dart';
import 'package:prefeitura_app/features/memorial/presentation/widgets/memorial_search_bar.dart';

class MemorialShellPage extends StatefulWidget {
  const MemorialShellPage({super.key});

  /// Rota usada ao abrir pelo menu do Prefeitura App (mesma sessão / token).
  static const String routeName = 'memorial_shell';

  @override
  State<MemorialShellPage> createState() => _MemorialShellPageState();
}

class _MemorialShellPageState extends State<MemorialShellPage> {
  @override
  void initState() {
    super.initState();
    AuditClientHeaders.setContext(
      module: 'memorial',
      screen: 'memorial/home',
    );
  }

  @override
  void dispose() {
    AuditClientHeaders.clearContext();
    super.dispose();
  }

  void _openSearch(String query) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => MemorialSearchPage(query: query)),
    );
  }

  void _openSuggestion(SepultadoModel sep) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => MemorialDetailPage(sepultadoId: sep.id)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final canPop = Navigator.of(context).canPop();

    return Theme(
      data: Theme.of(context).copyWith(
        colorScheme: Theme.of(context).colorScheme.copyWith(
          primary: MemorialColors.primary,
        ),
      ),
      child: MemorialPublicScaffold(
        backgroundColor: MemorialColors.background,
        appBar: AppBar(
          backgroundColor: MemorialColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          centerTitle: true,
          automaticallyImplyLeading: canPop,
          leading: canPop
              ? IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                  tooltip: 'Voltar ao Prefeitura App',
                  onPressed: () => Navigator.of(context).pop(),
                )
              : null,
          title: const Text(
            'Memorial Santa Faustina',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.15,
            ),
          ),
        ),
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Material(
              color: MemorialColors.primary,
              elevation: 4,
              shadowColor: MemorialColors.primary.withValues(alpha: 0.35),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                child: MemorialSearchBar(
                  onSearch: _openSearch,
                  onSuggestionTap: _openSuggestion,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Sepultados recentes',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: MemorialColors.cardText,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Últimos registros no memorial',
                    style: TextStyle(
                      fontSize: 14,
                      color: MemorialColors.muted.withValues(alpha: 0.95),
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
            const Expanded(
              child: MemorialHomePage(),
            ),
          ],
        ),
      ),
    );
  }
}
