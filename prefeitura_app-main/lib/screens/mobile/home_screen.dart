import 'package:flutter/material.dart';

import '../../tabs/secretary_tab.dart';
import '../../tabs/service_tab.dart';
import '../../widgets/custom_drawer.dart';
import '../../widgets/news_list.dart'; // ⬅️ importa a listagem de notícias

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PageView(
      controller: _pageController,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        // 🔹 Página 1: Notícias (somente listagem)
        Scaffold(
          appBar: AppBar(
            title: const Text('Notícias'),
            leading: Builder(
              builder: (context) => IconButton(
                icon: const Icon(Icons.menu),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
            ),
          ),
          drawer: CustomDrawer(_pageController),
          body: ListView(
            // ⚠️ NÃO use const na lista, pois NewsList não é const
            children: [
              const SizedBox(height: 12),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Principais notícias',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(height: 8),
              const NewsList(limit: 12),
              const SizedBox(height: 16),
            ],
          ),
        ),

        // 🔹 Página 2: Serviços
        Scaffold(
          appBar: AppBar(
            title: const Text('Serviços'),
            leading: Builder(
              builder: (context) => IconButton(
                icon: const Icon(Icons.menu),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
            ),
          ),
          drawer: CustomDrawer(_pageController),
          body: const ServiceTab(),
        ),

        // 🔹 Página 3: Secretarias
        Scaffold(
          appBar: AppBar(
            title: const Text('Secretarias'),
            leading: Builder(
              builder: (context) => IconButton(
                icon: const Icon(Icons.menu),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
            ),
          ),
          drawer: CustomDrawer(_pageController),
          body: const SecretaryTab(),
        ),

        // 🔹 Página 4: Placeholder
        Scaffold(
          appBar: AppBar(title: const Text('Outras Opções'), centerTitle: true),
          drawer: CustomDrawer(_pageController),
          body: Container(
            color: Colors.brown.shade100,
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.construction, size: 64.0, color: Colors.brown.shade600),
                  const SizedBox(height: 16.0),
                  Text(
                    'Em construção...',
                    style: TextStyle(
                      fontSize: 18.0,
                      color: Colors.brown.shade800,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
