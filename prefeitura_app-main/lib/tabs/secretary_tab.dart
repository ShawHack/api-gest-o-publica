import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../tiles/secretary_tile.dart';

class SecretaryTab extends StatelessWidget {
  const SecretaryTab({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<QuerySnapshot>(
      // Busca todos os documentos da coleção "Services" no Firestore
        future: FirebaseFirestore.instance.collection("secretary").get(),
    // Builder que reconstrói a UI baseado no estado da operação
      builder: (context, snapshot) {
        // Verifica se a operação ainda está em andamento
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: CircularProgressIndicator(), // Indicador de carregamento
          );
        }

        // Verifica se ocorreu algum erro durante a busca
        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Ícone de erro
                const Icon(Icons.error, color: Colors.red, size: 64),
                const SizedBox(height: 16),

                // Título do erro
                Text(
                  'Erro ao carregar serviços',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),

                // Detalhes do erro
                Text('${snapshot.error}'),
              ],
            ),
          );
        }

        // Verifica se não há dados ou se a lista está vazia
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Ícone de lista vazia
                Icon(Icons.inbox, color: Colors.grey, size: 64),
                SizedBox(height: 16),

                // Mensagem informando que não há serviços
                Text(
                  'Nenhum serviço encontrado',
                  style: TextStyle(fontSize: 18, color: Colors.grey),
                ),
              ],
            ),
          );
        }

        // Extrai a lista de documentos do snapshot
        final docs = snapshot.data!.docs;

        // Constrói uma ListView com os documentos encontrados
        return ListView.separated(
          // Número total de itens na lista
          itemCount: docs.length,

          // Função que constrói cada item da lista
          itemBuilder: (context, index) {
            // Retorna um CategoryTile para cada documento
            return SecretaryTile(docs[index]);
          },

          // Função que constrói o separador entre os itens
          separatorBuilder: (context, index) {
            // Divisor entre os tiles para melhor separação visual
            return const Divider(
              height: 1,
              // Altura total do divisor
              thickness: 0.5,
              // Espessura da linha
              color: Colors.grey,
              // Cor do divisor
              indent: 16,
              // Margem esquerda
              endIndent: 16, // Margem direita
            );
          },
        );
      },
    );
  }
}
