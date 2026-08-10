import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

class HomeTab extends StatelessWidget {
  const HomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    // 🔹 Fundo com gradiente azul → roxo
    Widget _buildBodyBack() => Container(
      decoration: const BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFF384D9C), // RGB(56, 77, 156)
            Color(0xFF4A5FA8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
    );

    return Stack(
      children: [
        _buildBodyBack(),

        // 🔹 Consulta Firestore com mapeamento de documentos
        FutureBuilder<QuerySnapshot>(
          future: FirebaseFirestore.instance
              .collection("home")
              .orderBy("pos")
              .get(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation(Colors.white),
                ),
              );
            } else if (snapshot.hasError) {
              return Center(child: Text('Erro: ${snapshot.error}'));
            } else {
              // 🔹 Mapeamento dos documentos incluindo ID para futuras operações
              final List<Map<String, dynamic>> items = snapshot.data!.docs.map((
                doc,
              ) {
                Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
                data['documentId'] = doc.id;
                return data;
              }).toList();

              // 🔹 Opcional: Criar um Map para busca rápida por ID
              final Map<String, Map<String, dynamic>> itemsMap = {
                for (var item in items) item['documentId']: item,
              };

              // 🔹 Debug: Imprime os IDs dos documentos (remover em produção)
              print("📄 Documentos carregados:");
              for (var item in items) {
                print(
                  "ID: ${item['documentId']}, Nome: ${item['nome']}, Pos: ${item['pos']}",
                );
              }

              return CustomScrollView(
                slivers: [
                  // 🔹 AppBar
                  SliverAppBar(
                    floating: true,
                    snap: true,
                    backgroundColor: Colors.transparent,
                    elevation: 0.0,
                    flexibleSpace: FlexibleSpaceBar(
                      centerTitle: true,
                      titlePadding: const EdgeInsets.only(bottom: 16.0),
                      title: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          //Image.asset("assets/birdi.png", height: 30),
                          //const SizedBox(width: 8),
                          const Text(
                            "Prefeitura de Garça",
                            style: TextStyle(color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // 🔹 Grid de Cards com margem lateral de 16px
                  SliverPadding(
                    // 🔹 Margem lateral de 16px, vertical mínima
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16.0,
                      vertical: 0.0,
                    ),
                    sliver: SliverGrid(
                      delegate: SliverChildBuilderDelegate((context, index) {
                        final item = items[index];
                        final documentId = item['documentId'];

                        return GestureDetector(
                          onTap: () {
                            _handleItemTap(context, documentId, item, itemsMap);
                          },
                          child: Card(
                            // 🔹 Margin mínimo entre cards
                            margin: const EdgeInsets.all(1.0),
                            // Reduzido para mínimo
                            elevation: 2,
                            // Reduzido para menos sombra
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(
                                8,
                              ), // Reduzido de 12 para 8
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // 🔹 Imagem
                                Expanded(
                                  flex: 3,
                                  child: ClipRRect(
                                    borderRadius: const BorderRadius.only(
                                      topLeft: Radius.circular(8),
                                      // Ajustado para coincidir com o Card
                                      topRight: Radius.circular(8),
                                    ),
                                    child: item['image'] != null
                                        ? Image.network(
                                            item['image'],
                                            width: double.infinity,
                                            fit: BoxFit.cover,
                                            errorBuilder: (context, error, _) =>
                                                const Center(
                                                  child: Icon(
                                                    Icons.broken_image,
                                                    size: 30,
                                                  ),
                                                ),
                                            loadingBuilder:
                                                (context, child, progress) {
                                                  if (progress == null)
                                                    return child;
                                                  return const Center(
                                                    child:
                                                        CircularProgressIndicator(
                                                          strokeWidth: 2,
                                                        ),
                                                  );
                                                },
                                          )
                                        : const Center(
                                            child: Icon(
                                              Icons.image_not_supported,
                                              size: 30,
                                            ),
                                          ),
                                  ),
                                ),

                                // 🔹 Texto com padding mínimo
                                Expanded(
                                  flex: 1,
                                  child: Padding(
                                    padding: const EdgeInsets.all(4.0),
                                    // Reduzido de 6.0 para 4.0
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        // 🔹 Nome
                                        Flexible(
                                          child: Text(
                                            item['name'] ?? 'Sem nome',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize:
                                                  12, // Reduzido de 13 para 12
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(height: 1),
                                        // Reduzido de 2 para 1

                                        // 🔹 Posição
                                        Flexible(
                                          child: Text(
                                            'Pos: ${item['pos'] ?? '-'}',
                                            // Texto mais curto
                                            style: const TextStyle(
                                              fontSize: 10,
                                              // Reduzido de 11 para 10
                                              color: Colors.grey,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),

                                        // 🔹 ID do documento (opcional)
                                        if (documentId.isNotEmpty)
                                          Flexible(
                                            child: Text(
                                              'ID: ${documentId.substring(0, 6)}...', // Mais curto
                                              style: const TextStyle(
                                                fontSize: 8,
                                                // Reduzido de 9 para 8
                                                color: Colors.grey,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }, childCount: items.length),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 1,
                            mainAxisSpacing: 0.0,
                            // Reduzido de 2 para 1 (espaço vertical)
                            crossAxisSpacing: 1.0,
                            // Reduzido de 2 para 1 (espaço horizontal)
                            childAspectRatio:
                                0.75, // Voltado para 0.75 para melhor proporção
                          ),
                    ),
                  ),
                ],
              );
            }
          },
        ),
      ],
    );
  }

  // 🔹 Método para lidar com clique no item
  void _handleItemTap(
    BuildContext context,
    String documentId,
    Map<String, dynamic> item,
    Map<String, Map<String, dynamic>> itemsMap,
  ) {
    _showActionDialog(context, documentId, item);
  }

  // 🔹 Dialog com exemplos de ações
  void _showActionDialog(
    BuildContext context,
    String documentId,
    Map<String, dynamic> item,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.info_outline, color: Colors.blue),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                item['nome'] ?? 'Item',
                style: const TextStyle(fontSize: 18),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ID do Documento:',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade700,
                      ),
                    ),
                    Text(
                      documentId,
                      style: const TextStyle(fontFamily: 'monospace'),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Posição: ${item['pos'] ?? '-'}',
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              const Text(
                'Ações disponíveis:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 8),

              _buildActionTile(
                Icons.edit,
                'Editar item',
                'Modificar nome, posição ou imagem',
              ),
              _buildActionTile(
                Icons.delete,
                'Excluir item',
                'Remove permanentemente do banco',
              ),
              _buildActionTile(
                Icons.swap_vert,
                'Alterar posição',
                'Muda a ordem de exibição',
              ),
              _buildActionTile(
                Icons.visibility,
                'Ver detalhes',
                'Exibe informações completas',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Fechar'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(context).pop();
              _performExampleAction(documentId, item);
            },
            icon: const Icon(Icons.play_arrow),
            label: const Text('Executar Exemplo'),
          ),
        ],
      ),
    );
  }

  // 🔹 Helper para criar tiles de ação
  Widget _buildActionTile(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.blue.shade700),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 🔹 Exemplo de método para realizar ações com o documento
  void _performExampleAction(String documentId, Map<String, dynamic> item) {
    print("🚀 Executando ação para o documento: $documentId");
  }
}
