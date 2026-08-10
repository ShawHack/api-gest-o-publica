import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/services.dart';

import '../datas/secretary_data.dart';

class SecretaryTile extends StatelessWidget {
  final SecretaryData secretary;

  SecretaryTile(DocumentSnapshot snapshot, {Key? key})
      : secretary = SecretaryData.fromDocument(snapshot),
        super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 100.0,
            child: Image.network(
              secretary.image,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) =>
              const Icon(Icons.broken_image, size: 30),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  secretary.title,
                  textAlign: TextAlign.start,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16.0,
                  ),
                ),
                Text(
                  secretary.address,
                  textAlign: TextAlign.center,
                ),
                Text(
                  secretary.email, // <-- novo campo exibido
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.blueGrey,
                    fontSize: 14.0,
                  ),
                ),
              ],
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              IconButton(
                icon:
                const Icon(Icons.phone, color: Colors.blue, size: 40.0),
                tooltip: 'Ligar',
                onPressed: () async {
                  final cleanPhone =
                  secretary.phone.replaceAll(RegExp(r'[^0-9]'), '');
                  final Uri uri = Uri(scheme: 'tel', path: cleanPhone);

                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  } else {
                    // Fallback: copia para área de transferência
                    await Clipboard.setData(ClipboardData(text: cleanPhone));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text(
                              'Discador indisponível. Número copiado.')),
                    );
                  }
                },
              ),
              IconButton(
                icon: const Icon(Icons.location_on,
                    color: Colors.red, size: 40.0), // pin vermelho
                tooltip: 'Ver no mapa',
                onPressed: () {
                  final latitude = secretary.lat;
                  final longitude = secretary.long;
                  final url = Uri.parse(
                      'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude');
                  launchUrl(url);
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}
