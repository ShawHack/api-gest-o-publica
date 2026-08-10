import 'package:flutter/material.dart';
import 'package:prefeitura_app/services/audit_client_headers.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/my_adoptions_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/my_pets_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/pet_form_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/pets_for_adoption_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_institutional_drawer.dart';

class GarcaPetShellPage extends StatefulWidget {
  const GarcaPetShellPage({super.key});

  @override
  State<GarcaPetShellPage> createState() => _GarcaPetShellPageState();
}

class _GarcaPetShellPageState extends State<GarcaPetShellPage> {
  @override
  void initState() {
    super.initState();
    AuditClientHeaders.setContext(
      module: 'garca_pet',
      screen: 'garca_pet/shell',
    );
  }

  @override
  void dispose() {
    AuditClientHeaders.clearContext();
    super.dispose();
  }

  int _index = 0;
  final _myPetsKey = GlobalKey<MyPetsPageState>();
  final _myAdoptionsKey = GlobalKey<MyAdoptionsPageState>();

  static const _titles = [
    'Pets para Adoção',
    'Cadastrar Pet',
    'Meus Pets',
    'Minhas Adoções',
  ];

  void _onPetSaved() {
    _myPetsKey.currentState?.reload();
    setState(() => _index = 2);
  }

  /// Voltar: dentro do Garça Pet, retorna à aba Adoção; só na Adoção sai para o app.
  void _handleBack() {
    if (_index != 0) {
      setState(() => _index = 0);
      return;
    }
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _index == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_index != 0) {
          setState(() => _index = 0);
        }
      },
      child: Theme(
        data: Theme.of(context).copyWith(
          colorScheme: Theme.of(context).colorScheme.copyWith(
            primary: GarcaPetColors.primary,
            secondary: GarcaPetColors.accent,
          ),
        ),
        child: Scaffold(
        drawer: const GarcaPetInstitutionalDrawer(),
        appBar: AppBar(
          backgroundColor: GarcaPetColors.primary,
          foregroundColor: Colors.white,
          automaticallyImplyLeading: false,
          leading: Builder(
            builder: (context) => IconButton(
              tooltip: 'Institucional',
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ),
          actions: [
            if (_index != 0 || Navigator.of(context).canPop())
              IconButton(
                tooltip: _index == 0 ? 'Voltar ao app' : 'Voltar para adoção',
                icon: const Icon(Icons.arrow_back),
                onPressed: _handleBack,
              ),
          ],
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Garça Pet',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w400),
              ),
              Text(
                _titles[_index],
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
        body: IndexedStack(
          index: _index,
          children: [
            const PetsForAdoptionPage(),
            PetFormPage(onSaved: _onPetSaved),
            MyPetsPage(key: _myPetsKey),
            MyAdoptionsPage(key: _myAdoptionsKey),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          indicatorColor: GarcaPetColors.accent.withValues(alpha: 0.35),
          onDestinationSelected: (value) {
            setState(() => _index = value);
            if (value == 2) _myPetsKey.currentState?.reload();
            if (value == 3) _myAdoptionsKey.currentState?.reload();
          },
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.pets_outlined),
              selectedIcon: Icon(Icons.pets),
              label: 'Adoção',
            ),
            NavigationDestination(
              icon: Icon(Icons.add_circle_outline),
              selectedIcon: Icon(Icons.add_circle),
              label: 'Cadastrar',
            ),
            NavigationDestination(
              icon: Icon(Icons.inventory_2_outlined),
              selectedIcon: Icon(Icons.inventory_2),
              label: 'Meus Pets',
            ),
            NavigationDestination(
              icon: Icon(Icons.favorite_border),
              selectedIcon: Icon(Icons.favorite),
              label: 'Minhas',
            ),
          ],
        ),
        ),
      ),
    );
  }
}
