import 'package:flutter/material.dart';
import 'package:prefeitura_app/screens/mobile/service_screen.dart';
import '../datas/service_data.dart';

class ServiceTile extends StatelessWidget {
  final String type;
  final ServiceData service;

  const ServiceTile(this.type, this.service, {Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Limite máximo razoável para o card quando usado em List (ajuste se necessário)
    const double maxCardHeightForList = 120.0;

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (context) => ServiceScreen(service)),
        );
      },
      child: Card(
        elevation: 2.0,
        margin: const EdgeInsets.all(4.0),
        clipBehavior: Clip.hardEdge,
        child: type == "grid"
        // GRID: usamos mainAxisSize.min e evitamos padding duplo
            ? Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // força a imagem a ocupar um espaço exato (evita sub-pixel)
            AspectRatio(
              aspectRatio: 1.0,
              child: Image.network(
                service.images,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) =>
                const Icon(Icons.broken_image, size: 50),
              ),
            ),
            // usa SizedBox com altura fixa em vez de Padding + Column que pode somar pixels
            SizedBox(
              height: 42, // ajuste conforme seu layout (tamanho do título + espaçamento)
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                  child: Text(
                    service.title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 11.0,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ),
          ],
        )
        // LIST / ROW: limitamos altura total e usamos Flexible para textos
            : ConstrainedBox(
          constraints: const BoxConstraints(
            // garante que o cartão não passe de uma certa altura
            maxHeight: maxCardHeightForList,
          ),
          child: Row(
            children: [
              // Imagem com tamanho fixo e margem externa controlada
              Container(
                width: 100,
                height: 100,
                margin: const EdgeInsets.all(8.0),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4.0),
                  child: Image.network(
                    service.images,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) =>
                    const Icon(Icons.broken_image, size: 30),
                  ),
                ),
              ),
              // Espaço restante para textos
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // título dentro de Flexible para não "esticar" a coluna
                      Flexible(
                        fit: FlexFit.loose,
                        child: Text(
                          service.title,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14.0,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(height: 6.0),
                      // descrição com Flexible e maxLines
                      Flexible(
                        fit: FlexFit.loose,
                        child: Text(
                          service.description,
                          style: const TextStyle(fontSize: 10.0),
                          maxLines: 3,
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
      ),
    );
  }
}
