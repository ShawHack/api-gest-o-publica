import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:prefeitura_app/features/garca_pet/domain/institutional/institutional_content.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/castration_institutional_hero.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/institutional_network_image.dart';

class InstitutionalDetailPage extends StatelessWidget {
  const InstitutionalDetailPage({
    super.key,
    required this.content,
  });

  final InstitutionalPageContent content;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: GarcaPetColors.surface,
      appBar: AppBar(
        backgroundColor: GarcaPetColors.primary,
        foregroundColor: Colors.white,
        title: Text(content.title),
      ),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          if (content.id == InstitutionalPageId.castracao)
            CastrationInstitutionalHero(heroImageUrl: content.heroImageUrl)
          else
            InstitutionalNetworkImage(url: content.heroImageUrl, height: 220),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  content.subtitle,
                  style: GoogleFonts.rubik(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: GarcaPetColors.primary,
                    height: 1.25,
                  ),
                ),
                if (content.badges.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: content.badges
                        .map((b) => _BadgeChip(label: b))
                        .toList(),
                  ),
                ],
              ],
            ),
          ),
          ...content.sections.map(_SectionCard.new),
          if (content.contactLines.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              child: _ContactCard(lines: content.contactLines),
            ),
        ],
      ),
    );
  }
}

class _BadgeChip extends StatelessWidget {
  const _BadgeChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: GarcaPetColors.accent.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: GarcaPetColors.accent.withValues(alpha: 0.5)),
      ),
      child: Text(
        label,
        style: GoogleFonts.rubik(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: GarcaPetColors.primaryDark,
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard(this.section);

  final InstitutionalSection section;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Card(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: GarcaPetColors.accent.withValues(alpha: 0.35)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 4,
                    height: 22,
                    decoration: BoxDecoration(
                      color: GarcaPetColors.accent,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      section.title,
                      style: GoogleFonts.rubik(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: GarcaPetColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
              ...section.paragraphs.map(
                (p) => Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    p,
                    style: GoogleFonts.rubik(
                      fontSize: 15,
                      height: 1.55,
                      color: const Color(0xFF2D3B2C),
                    ),
                  ),
                ),
              ),
              if (section.bullets.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Column(
                    children: section.bullets
                        .map(
                          (b) => Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Padding(
                                  padding: EdgeInsets.only(top: 6),
                                  child: Icon(
                                    Icons.circle,
                                    size: 8,
                                    color: GarcaPetColors.accent,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    b,
                                    style: GoogleFonts.rubik(
                                      fontSize: 15,
                                      height: 1.5,
                                      color: const Color(0xFF2D3B2C),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard({required this.lines});

  final List<String> lines;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: GarcaPetColors.primary,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.contact_phone_outlined, color: Colors.white),
                const SizedBox(width: 8),
                Text(
                  'Contato',
                  style: GoogleFonts.rubik(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
            ...lines.map(
              (line) => Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(
                  line,
                  style: GoogleFonts.rubik(
                    fontSize: 14,
                    height: 1.45,
                    color: Colors.white.withValues(alpha: 0.95),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
