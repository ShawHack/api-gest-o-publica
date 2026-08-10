import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../screens/mobile/category_screen.dart';

/// Widget que exibe um tile para categoria de serviços
/// Recebe um DocumentSnapshot do Firestore e exibe as informações
class CategoryTile extends StatelessWidget {
  /// Documento do Firestore contendo os dados da categoria
  final DocumentSnapshot snapshot;

  /// Construtor que recebe o documento do Firestore
  const CategoryTile(this.snapshot, {Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Converte os dados do documento para um Map para facilitar o acesso
    Map<String, dynamic>? data;

    try {
      // Tenta fazer o cast dos dados do documento
      data = snapshot.data() as Map<String, dynamic>?;
    } catch (e) {
      // Em caso de erro no cast, retorna um tile de erro
      return const ListTile(
        leading: Icon(Icons.error, color: Colors.red),
        title: Text('Erro ao carregar dados da categoria'),
      );
    }

    // Verifica se os dados existem
    if (data == null) {
      return const ListTile(
        leading: Icon(Icons.warning, color: Colors.orange),
        title: Text('Dados da categoria não disponíveis'),
      );
    }

    // Extrai o título do documento, tenta várias chaves possíveis
    String title = data["title"]?.toString() ?? 
                   data["nome"]?.toString() ?? 
                   data["name"]?.toString() ?? 
                   data["label"]?.toString() ?? 
                   'Título não disponível (ID: ${snapshot.id})';

    // Extrai a URL do ícone do documento, tenta várias chaves possíveis
    final iconUrl = data["icon"]?.toString() ?? 
                    data["icone"]?.toString() ?? 
                    data["img"]?.toString() ?? 
                    data["image"]?.toString() ?? 
                    '';

    return ListTile(
      // Avatar circular à esquerda do tile
      leading: Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.grey[300],
          image: iconUrl.isNotEmpty
              ? DecorationImage(
                  image: NetworkImage(iconUrl),
                  fit: BoxFit
                      .scaleDown, // Nunca aumenta, só diminui se necessário
                )
              : null,
        ),
        child: iconUrl.isEmpty
            ? const Icon(Icons.category, color: Colors.grey)
            : null,
      ),

      // Título principal do tile
      title: Text(
        title,
        style: const TextStyle(
          fontWeight: FontWeight.w500, // Texto um pouco mais destacado
        ),
      ),

      // Ícone à direita indicando que é clicável
      trailing: const Icon(Icons.keyboard_double_arrow_right),

      // Ação executada quando o tile é tocado
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (context) => CategoryScreen(snapshot)),
        );
      },
    );
  }
}
