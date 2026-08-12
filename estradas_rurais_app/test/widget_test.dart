import 'package:estradas_rurais_app/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('abre a identidade do aplicativo Estradas Rurais', (
    tester,
  ) async {
    await tester.pumpWidget(const EstradasRuraisApp());

    expect(find.byType(RuralSplashPage), findsOneWidget);
    expect(find.byType(EstradasRuraisApp), findsOneWidget);
  });
}
