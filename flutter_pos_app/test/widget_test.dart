import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_pos_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const POSApp());
    await tester.pumpAndSettle();

    expect(find.text('POS Mobile'), findsOneWidget);
  });
}
