import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:mask_text_input_formatter/mask_text_input_formatter.dart';

class AdminScreen extends StatelessWidget {

  final _formKey = GlobalKey<FormState>();

  final _description = TextEditingController();
  final _docs = TextEditingController();
  final _formAcess = TextEditingController();
  final _images = TextEditingController();
  final _price = TextEditingController();
  final _term = TextEditingController();
  final _title = TextEditingController();
  final _url = TextEditingController();
  final _whatIsIt = TextEditingController();






  @override
  void dispose() {
    _description.dispose();
    _docs.dispose();
    _formAcess.dispose();
    _images.dispose();
    _price.dispose();
    _term.dispose();
    _title.dispose();
    _url.dispose();
    _whatIsIt.dispose();

  }


  String? _req(String? v, String nome)=>
      (v == null || v.trim().isEmpty)? 'Por favor, preencha $nome': null;


  Future<void> _salvarNoFirestore(BuildContext context) async {
    if (!_formKey.currentState!.validate()) return;



   try {
     final Map<String, String>dados = {
       'description': _description.text.trim(),
       'docs': _docs.text.trim(),
       'formAcess': _formAcess.text.trim(),
       'images': _images.text.trim(),
       'price': _price.text.trim(),
       'term': _term.text.trim(),
       'title': _title.text.trim(),
       'url': _url.text.trim(),
       'whatIsIt': _whatIsIt.text.trim()
     };
     await FirebaseFirestore.instance.collection('Services').doc('Services').set(dados);

     ScaffoldMessenger.of(context).showSnackBar(
         const SnackBar(content: Text('Salvo com sucesso!'))
     );
     // limpa os campos
     _formKey.currentState!.reset();
     _description.clear();
     _docs.clear();
     _formAcess.clear();
     _images.clear();
     _price.clear();
     _term.clear();
     _title.clear();
     _url.clear();
     _whatIsIt.clear();
   }catch(e) {
     ScaffoldMessenger.of(context).showSnackBar(
         SnackBar(content: Text('Erro ao salvar: $e'))
     );

   }
 //  finally{}



   }



  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
          // Usando a cor primária institucional
          title: const Text("Cadastro de Serviço"),
          centerTitle: true,


        ),
        body: Form(
          key: _formKey,
          child: ListView(
              padding: EdgeInsets.only(right: 36.0, left: 36.0),
              children: [


              SizedBox(height: 40.0),

          //     FORMULÁRIO  //////////////////

          SizedBox(height: 10.0),

          TextFormField(
            decoration: InputDecoration(
              hintText: "Sobre o serviço",
              prefixIcon: Icon(Icons.search_off),
            ),
            controller: _description,
            keyboardType: TextInputType.text,

          ),

          SizedBox(height: 10.0),

          TextFormField(
            decoration: InputDecoration(
              hintText: "Documentação",
              prefixIcon: Icon(Icons.description),
            ),
            controller: _docs,
            keyboardType: TextInputType.text,

          ),

          SizedBox(height: 10.0),

          TextFormField(
            decoration: InputDecoration(
              hintText: "Formas de Atendimento",
              prefixIcon: Icon(Icons.person_add_sharp),
            ),
            controller: _formAcess,
            keyboardType: TextInputType.text,
            // inputFormatters: [_phoneMask],


          ),

          SizedBox(height: 10.0),

          TextFormField(
            decoration: InputDecoration(
              hintText: "Imagem",
              prefixIcon: Icon(Icons.broken_image_outlined),
            ),
            controller: _images,
            keyboardType: TextInputType.text,
            validator: (value) {
              if (value?.isEmpty ?? true) {
                return 'Por favor, preencha o campo';
              }

              return null;
            },
          ),
          SizedBox(height: 10.0),

          TextFormField(
            decoration: InputDecoration(
              hintText: "Custo",
              prefixIcon: Icon(Icons.monetization_on_outlined),
            ),
            controller: _price,
            keyboardType: TextInputType.text,

          ),


          SizedBox(height: 10.0),

          // Campo de E-mail (usa o tema global automaticamente)
          TextFormField(
            decoration: InputDecoration(
              hintText: "Prazo de Atendimento",
              prefixIcon: Icon(Icons.access_time),
            ),
            controller: _term,
            keyboardType: TextInputType.text,

          ),

          SizedBox(height: 10.0),

          TextFormField(
            decoration: InputDecoration(
              hintText: "Título",
              prefixIcon: Icon(Icons.edit),
            ),
            controller: _title,
            keyboardType: TextInputType.text,
            validator: (value) {
              if (value?.isEmpty ?? true) {
                return 'Por favor, preencha o título';
              }

              return null;
            },
          ),

            SizedBox(height: 10.0),


            TextFormField(
              decoration: InputDecoration(
                hintText: "Urls",
                prefixIcon: Icon(Icons.search),
              ),
              controller: _url,
              obscureText: true,

            ),
            SizedBox(height: 10.0),

            TextFormField(
              decoration: InputDecoration(
                hintText: "Descrição do Serviço",
                prefixIcon: Icon(Icons.edit_note_outlined),
              ),
              controller: _whatIsIt,
              keyboardType: TextInputType.text,
              validator: (value) {
                if (value?.isEmpty ?? true) {
                  return 'Por favor, preencha a descrição do serviço';
                }


                return null;
              },
            ),
              SizedBox(height: 32.0),

              // Botão de Entrar (usa o tema global automaticamente)
              ElevatedButton(
                onPressed:()=> _salvarNoFirestore(context) ,

                child: Text("Inserir"),
              ),

              SizedBox(height: 20.0),


              ],
            ),
          ),
        );
    }
}