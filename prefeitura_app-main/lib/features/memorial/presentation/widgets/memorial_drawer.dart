import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/memorial/presentation/theme/memorial_colors.dart';
class MemorialDrawer extends StatelessWidget {
  const MemorialDrawer({
    super.key,
    required this.onHome,
    required this.onProfile,
    required this.onMyMemorial,
    required this.onExit,
    required this.showMyMemorial,
    required this.userName,
  });

  final VoidCallback onHome;
  final VoidCallback onProfile;
  final VoidCallback onMyMemorial;
  final VoidCallback onExit;
  final bool showMyMemorial;
  final String? userName;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Column(
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: MemorialColors.primary),
            child: Align(
              alignment: Alignment.bottomLeft,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Memorial Santa Faustina',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (userName != null && userName!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      userName!,
                      style: const TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ],
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.home_outlined),
            title: const Text('Início'),
            onTap: () {
              Navigator.pop(context);
              onHome();
            },
          ),
          if (showMyMemorial)
            ListTile(
              leading: const Icon(Icons.book_outlined),
              title: const Text('Meu Memorial'),
              onTap: () {
                Navigator.pop(context);
                onMyMemorial();
              },
            ),
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: const Text('Meu Perfil'),
            onTap: () {
              Navigator.pop(context);
              onProfile();
            },
          ),
          const Spacer(),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.arrow_back),
            title: const Text('Voltar ao Prefeitura App'),
            onTap: () {
              Navigator.pop(context);
              onExit();
            },
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
