// Stub para FormFillWebScreen em plataformas não-web
// Este arquivo nunca será usado, mas é necessário para compilação
// A versão real está em form_fill_web_screen.dart

import 'package:flutter/material.dart';
import '../../models/form_model.dart';

class FormFillWebScreen extends StatelessWidget {
  final FormModel form;
  final String userId;

  const FormFillWebScreen({
    super.key,
    required this.form,
    required this.userId,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Formulário')),
      body: const Center(child: Text('Esta tela só está disponível na web')),
    );
  }
}







