import 'package:cloud_firestore/cloud_firestore.dart';

class SecretaryData {

  late String id;
  late String title;
  late String image;
  late String email;
  late String address;
  late double lat;
  late double long;
  late String phone;

  SecretaryData.fromDocument(DocumentSnapshot snapshot) {
    final data = snapshot.data() as Map<String, dynamic>;

    id = snapshot.id;
    title = data["title"] ?? "";
    email = data["email"] ?? "";
    image = data["image"] ?? "";
    lat = data["lat"] ?? "";
    long = data["long"] ?? "";
    phone = data["phone"] ?? "";
    address=data["address"];

  }
}
