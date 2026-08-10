import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_api.dart';
import 'package:prefeitura_app/features/garca_pet/domain/institutional/institutional_content.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/institutional/institutional_detail_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/institutional_network_image.dart';

/// Listagem dos 5 conteúdos institucionais (equivalente ao menu do site).
class InstitutionalHubPage extends StatefulWidget {
  const InstitutionalHubPage({super.key});

  @override
  State<InstitutionalHubPage> createState() => _InstitutionalHubPageState();
}

class _InstitutionalHubPageState extends State<InstitutionalHubPage> {
  bool _castrationClosed = false;

  @override
  void initState() {
    super.initState();
    GarcaPetApi().fetchCastrationClosed().then((closed) {
      if (mounted) setState(() => _castrationClosed = closed);
    });
  }

  void _openDetail(BuildContext context, InstitutionalPageContent page) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => InstitutionalDetailPage(content: page),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = InstitutionalContent.all();

    return Scaffold(
      backgroundColor: GarcaPetColors.surface,
      appBar: AppBar(
        backgroundColor: GarcaPetColors.primary,
        foregroundColor: Colors.white,
        title: const Text('Institucional'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          Text(
            'Conheça o Garça Pet',
            style: GoogleFonts.rubik(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: GarcaPetColors.primary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Mesmas informações do site, otimizadas para o celular.',
            style: GoogleFonts.rubik(
              fontSize: 14,
              color: GarcaPetColors.primaryDark.withValues(alpha: 0.85),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 20),
          ...pages.map(
            (page) => _InstitutionalListCard(
              page: page,
              showCastrationClosed: page.id == InstitutionalPageId.castracao &&
                  _castrationClosed,
              onTap: () => _openDetail(context, page),
            ),
          ),
        ],
      ),
    );
  }
}

class _InstitutionalListCard extends StatelessWidget {
  const _InstitutionalListCard({
    required this.page,
    required this.onTap,
    this.showCastrationClosed = false,
  });

  final InstitutionalPageContent page;
  final VoidCallback onTap;
  final bool showCastrationClosed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Material(
        color: Colors.white,
        elevation: 0,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: GarcaPetColors.accent.withValues(alpha: 0.4),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(15),
                  ),
                  child: InstitutionalNetworkImage(
                    url: page.heroImageUrl,
                    height: 120,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor:
                            GarcaPetColors.accent.withValues(alpha: 0.25),
                        child: Icon(page.icon, color: GarcaPetColors.primary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    page.title,
                                    style: GoogleFonts.rubik(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                      color: GarcaPetColors.primary,
                                    ),
                                  ),
                                ),
                                if (showCastrationClosed) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: GarcaPetColors.error
                                          .withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'Encerrada',
                                      style: GoogleFonts.rubik(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: GarcaPetColors.error,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              page.subtitle,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.rubik(
                                fontSize: 13,
                                color: const Color(0xFF4A5C48),
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(
                        Icons.chevron_right,
                        color: GarcaPetColors.accent,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
