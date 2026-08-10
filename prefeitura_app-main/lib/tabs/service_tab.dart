import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:prefeitura_app/tiles/category.dart';
import 'package:go_router/go_router.dart'; // Import go_router

/// Tab responsável por exibir a lista de serviços da prefeitura
/// Carrega os dados do Firestore e exibe em uma lista de CategoryTiles
class ServiceTab extends StatelessWidget {
  const ServiceTab({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 🆕 FEATURE HIGHLIGHT: Iluminação Pública
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: InkWell(
              onTap: () {
                 // Use context.push instead of Navigator to work with GoRouter/MaterialApp routes
                 // If GoRouter is fully set up, context.push('/iluminacao')
                 // If basic routes are used (as seen in main.dart), Navigator.pushNamed works too.
                 Navigator.of(context).pushNamed('/iluminacao');
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF384D9C), Color(0xFF5C7AE6)], // Blue gradient
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.blue.withOpacity(0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.lightbulb_outline, color: Colors.white, size: 32),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Iluminação Pública',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Lâmpada queimada? Reporte aqui.',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 16),
                  ],
                ),
              ),
            ),
          ),

          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'Todos os Serviços',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
          ),

          // FutureBuilder para lidar com operações assíncronas do Firestore
          FutureBuilder<List<QueryDocumentSnapshot>>(
            // Busca todos os documentos da coleção "Services" ou "services" no Firestore
            future: _fetchServices(),
      
            // Builder que reconstrói a UI baseado no estado da operação
            builder: (context, snapshot) {
              // Verifica se a operação ainda está em andamento
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32.0),
                    child: CircularProgressIndicator(),
                  ), 
                );
              }
      
              // Verifica se ocorreu algum erro durante a busca
              if (snapshot.hasError) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error, color: Colors.red, size: 48),
                        const SizedBox(height: 16),
                        Text(
                          'Erro ao carregar serviços.',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                        const SizedBox(height: 8),
                         Text(
                          '${snapshot.error}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                );
              }
      
              // Verifica se não há dados ou se a lista está vazia
              if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return const Center(child: Text('Nenhum serviço extra encontrado'));
              }
      
              // Extrai a lista de documentos do snapshot
              final docs = snapshot.data!;
      
              // Constrói uma ListView com os documentos encontrados
              return ListView.separated(
                shrinkWrap: true, // Important for nesting
                physics: const NeverScrollableScrollPhysics(), // Important for nesting
                // Número total de itens na lista
                itemCount: docs.length,
      
                // Função que constrói cada item da lista
                itemBuilder: (context, index) {
                  // Retorna um CategoryTile para cada documento
                  return CategoryTile(docs[index]);
                },

                // Função que constrói o separador entre os itens
                separatorBuilder: (context, index) {
                  return const Divider(
                    height: 1,
                    thickness: 0.5,
                    color: Colors.grey,
                    indent: 16,
                    endIndent: 16, 
                  );
                },
      

              );
            },
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Future<List<QueryDocumentSnapshot>> _fetchServices() async {
    try {
      // 1. Tenta buscar na coleção "Services" (Maiúsculo) - Padrão correto para Categorias de Serviços da Prefeitura
      debugPrint("Buscando na coleção 'Services'...");
      final s1 = await FirebaseFirestore.instance.collection("Services").orderBy("title").get();
      if (s1.docs.isNotEmpty) {
        debugPrint("Encontrados ${s1.docs.length} serviços em 'Services'.");
        return s1.docs;
      }
    } catch (e) {
      debugPrint("Erro ao buscar 'Services': $e");
    }

    try {
      // 2. Fallback: Tenta buscar na coleção "services" (Minúsculo) - Usado para Agendamentos/Interno
      // Isso só deve acontecer se a primeira falhar ou estiver vazia.
      debugPrint("Fallback: Buscando na coleção 'services'...");
      final s2 = await FirebaseFirestore.instance.collection("services").get();
      return s2.docs;
    } catch (e) {
      debugPrint("Erro ao buscar 'services': $e");
      // Se falhar ambas, relança o erro
      throw e;
    }
  }
}
