import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../../datas/service_data.dart';

import '../../tiles/service_tiles.dart';

class CategoryScreen extends StatelessWidget {
  late final DocumentSnapshot snapshot;

  CategoryScreen(this.snapshot);

  @override
  Widget build(BuildContext context) {
    final data = snapshot.data() as Map<String, dynamic>;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(

          title: Text(data["title"], style: TextStyle(color: Colors.white)),
          centerTitle: true,
          bottom: const TabBar(
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(icon: Icon(Icons.grid_on)),
              Tab(icon: Icon(Icons.list)),
            ],
          ),
        ),
        body: FutureBuilder<QuerySnapshot>(
          future: FirebaseFirestore.instance
              .collection("Services")
              .doc(snapshot.id)
              .collection("itens")
              .get(),
          builder: (context, snapshot) {
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }

            final documents = snapshot.data!.docs;

            return TabBarView(
              physics: const NeverScrollableScrollPhysics(),
              children: [
                GridView.builder(
                  padding: const EdgeInsets.all(4.0),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 4.0,
                    crossAxisSpacing: 4.0,
                    childAspectRatio: 0.7,
                  ),
                  itemCount: documents.length,
                  itemBuilder: (context, index) {
                    return ServiceTile(
                      "grid",
                      ServiceData.fromDocument(documents[index]),
                    );
                  },
                ),
                ListView.builder(
                  padding: const EdgeInsets.all(0.0),
                  itemCount: documents.length,
                  itemBuilder: (context, index) {
                    return ServiceTile(
                      "list",
                      ServiceData.fromDocument(documents[index]),
                    );
                  },
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
