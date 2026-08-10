import 'package:cloud_firestore/cloud_firestore.dart';

class ServiceData {
  late String category;
  late String id;
  late String title;
  late String images;
  late String description;
  late String term;
  late String price;
  late String formAccess;
  late String docs;
  late String department;
  late String address;
  late String whatIsIt;
  late String url;

  ServiceData.fromDocument(DocumentSnapshot snapshot) {
    final data = snapshot.data() as Map<String, dynamic>;

    id = snapshot.id;
    title = data["title"] ?? "";
    description = data["description"] ?? "";
    images = data["images"] ?? "";
    term = data["term"] ?? "";
    price = data["price"] ?? "";
    formAccess = data["formAccess"] ?? "";
    department = data["department"] ?? "";
    address = data["address"] ?? "";
    whatIsIt = data["whatIsIt"] ?? "";
    docs = data["docs"]??"";
    url = data["url"]?? "";
  }
}
