import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final NumberFormat _formatter = NumberFormat.currency(
    locale: 'en_ZM',
    symbol: 'K ',
    decimalDigits: 2,
  );

  static String format(double amount) {
    return _formatter.format(amount);
  }

  static String formatWithoutSymbol(double amount) {
    return NumberFormat('#,##0.00').format(amount);
  }
}