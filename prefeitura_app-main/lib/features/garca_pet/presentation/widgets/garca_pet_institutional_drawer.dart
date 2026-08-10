import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:prefeitura_app/features/garca_pet/domain/institutional/institutional_content.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/institutional/institutional_detail_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/institutional/institutional_hub_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';

/// Drawer do Garça Pet com atalhos ao conteúdo institucional (menu do site).
class GarcaPetInstitutionalDrawer extends StatelessWidget {
  const GarcaPetInstitutionalDrawer({super.key});

  void _closeAndPush(BuildContext context, Widget page) {
    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => page),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = InstitutionalContent.all();

    return Drawer(
      child: ColoredBox(
        color: GarcaPetColors.surface,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      GarcaPetColors.primary,
                      GarcaPetColors.primaryDark,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.account_balance_outlined,
                        color: Colors.white, size: 32),
                    const SizedBox(height: 10),
                    Text(
                      'Institucional',
                      style: GoogleFonts.rubik(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Garça Pet · Prefeitura de Garça',
                      style: GoogleFonts.rubik(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: [
                    ListTile(
                      leading: const Icon(Icons.view_list_outlined,
                          color: GarcaPetColors.primary),
                      title: Text(
                        'Ver todos',
                        style: GoogleFonts.rubik(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        'Listagem com cards',
                        style: GoogleFonts.rubik(fontSize: 12),
                      ),
                      onTap: () => _closeAndPush(
                        context,
                        const InstitutionalHubPage(),
                      ),
                    ),
                    const Divider(height: 1, indent: 16, endIndent: 16),
                    ...pages.map(
                      (page) => ListTile(
                        leading: Icon(page.icon, color: GarcaPetColors.accent),
                        title: Text(
                          page.title,
                          style: GoogleFonts.rubik(
                            fontWeight: FontWeight.w600,
                            color: GarcaPetColors.primaryDark,
                          ),
                        ),
                        onTap: () => _closeAndPush(
                          context,
                          InstitutionalDetailPage(content: page),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
