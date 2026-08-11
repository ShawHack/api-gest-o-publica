import 'package:flutter_test/flutter_test.dart';
import 'package:prefeitura_app/rotas/rural_api_service.dart';

void main() {
  group('RuralMapProperty', () {
    test('converte o contrato público de busca da API', () {
      final property = RuralMapProperty.fromJson({
        'codigoUpa': '191-00235',
        'plusCode': '589GM8FQ+QM',
        'name': 'Fazenda Bela Vista',
        'location': {'latitude': -22.3, 'longitude': -49.7},
      });

      expect(property.codigoUpa, '191-00235');
      expect(property.plusCode, '589GM8FQ+QM');
      expect(property.name, 'Fazenda Bela Vista');
      expect(property.latitude, -22.3);
      expect(property.longitude, -49.7);
    });
  });
}
