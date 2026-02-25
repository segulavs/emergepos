import 'package:esc_pos_utils/esc_pos_utils.dart';
import 'package:esc_pos_printer/esc_pos_printer.dart';
import 'package:intl/intl.dart';
import '../models/transaction.dart';

class ReceiptPrinterService {
  static final ReceiptPrinterService instance = ReceiptPrinterService._();
  ReceiptPrinterService._();

  String? _printerIp;
  int _printerPort = 9100;

  void configure({required String ip, int port = 9100}) {
    _printerIp = ip;
    _printerPort = port;
  }

  bool get isConfigured => _printerIp != null && _printerIp!.isNotEmpty;

  Future<List<int>> generateReceiptBytes(Transaction transaction,
      {String storeName = 'POS Store', String? storePhone}) async {
    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm80, profile);
    List<int> bytes = [];

    bytes += generator.text(storeName,
        styles: const PosStyles(
          align: PosAlign.center,
          bold: true,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
        ));

    if (storePhone != null && storePhone.isNotEmpty) {
      bytes += generator.text('Tel: $storePhone',
          styles: const PosStyles(align: PosAlign.center));
    }

    bytes += generator.hr();

    bytes += generator.text('RECEIPT',
        styles: const PosStyles(
          align: PosAlign.center,
          bold: true,
        ));

    bytes += generator.text(
        'Receipt #: ${transaction.receiptNumber}',
        styles: const PosStyles(align: PosAlign.left));

    final dateStr =
        DateFormat('dd/MM/yyyy HH:mm').format(transaction.createdAt);
    bytes += generator.text('Date: $dateStr',
        styles: const PosStyles(align: PosAlign.left));

    if (transaction.cashierName.isNotEmpty) {
      bytes += generator.text('Cashier: ${transaction.cashierName}',
          styles: const PosStyles(align: PosAlign.left));
    }

    if (transaction.customerName != null &&
        transaction.customerName!.isNotEmpty) {
      bytes += generator.text('Customer: ${transaction.customerName}',
          styles: const PosStyles(align: PosAlign.left));
    }

    bytes += generator.hr();

    bytes += generator.row([
      PosColumn(text: 'Item', width: 6, styles: const PosStyles(bold: true)),
      PosColumn(
          text: 'Qty',
          width: 2,
          styles: const PosStyles(bold: true, align: PosAlign.right)),
      PosColumn(
          text: 'Total',
          width: 4,
          styles: const PosStyles(bold: true, align: PosAlign.right)),
    ]);
    bytes += generator.hr(ch: '-');

    for (final item in transaction.items) {
      final itemName = item.productName.length > 22
          ? item.productName.substring(0, 22)
          : item.productName;

      bytes += generator.row([
        PosColumn(text: itemName, width: 6),
        PosColumn(
            text: item.quantity.toStringAsFixed(0),
            width: 2,
            styles: const PosStyles(align: PosAlign.right)),
        PosColumn(
            text: 'K${item.lineTotal.toStringAsFixed(2)}',
            width: 4,
            styles: const PosStyles(align: PosAlign.right)),
      ]);

      if (item.unitPrice != item.lineTotal / item.quantity ||
          item.quantity > 1) {
        bytes += generator.text(
            '  @ K${item.unitPrice.toStringAsFixed(2)} each',
            styles: const PosStyles(
              fontType: PosFontType.fontA,
            ));
      }
    }

    bytes += generator.hr();

    bytes += generator.row([
      PosColumn(text: 'Subtotal:', width: 8),
      PosColumn(
          text: 'K${transaction.subtotal.toStringAsFixed(2)}',
          width: 4,
          styles: const PosStyles(align: PosAlign.right)),
    ]);

    if (transaction.discountAmount > 0) {
      bytes += generator.row([
        PosColumn(text: 'Discount:', width: 8),
        PosColumn(
            text: '-K${transaction.discountAmount.toStringAsFixed(2)}',
            width: 4,
            styles: const PosStyles(align: PosAlign.right)),
      ]);
    }

    bytes += generator.row([
      PosColumn(text: 'VAT (16%):', width: 8),
      PosColumn(
          text: 'K${transaction.taxAmount.toStringAsFixed(2)}',
          width: 4,
          styles: const PosStyles(align: PosAlign.right)),
    ]);

    bytes += generator.hr();

    bytes += generator.row([
      PosColumn(
          text: 'TOTAL:',
          width: 8,
          styles: const PosStyles(
            bold: true,
            height: PosTextSize.size2,
          )),
      PosColumn(
          text: 'K${transaction.total.toStringAsFixed(2)}',
          width: 4,
          styles: const PosStyles(
            bold: true,
            height: PosTextSize.size2,
            align: PosAlign.right,
          )),
    ]);

    bytes += generator.hr();

    bytes += generator.text('Payment:',
        styles: const PosStyles(bold: true));
    for (final payment in transaction.payments) {
      final methodName = _paymentMethodLabel(payment.method);
      bytes += generator.row([
        PosColumn(text: '  $methodName', width: 8),
        PosColumn(
            text: 'K${payment.amount.toStringAsFixed(2)}',
            width: 4,
            styles: const PosStyles(align: PosAlign.right)),
      ]);
    }

    final totalPaid = transaction.payments
        .fold(0.0, (sum, p) => sum + p.amount);
    if (totalPaid > transaction.total) {
      bytes += generator.row([
        PosColumn(text: '  Change:', width: 8),
        PosColumn(
            text: 'K${(totalPaid - transaction.total).toStringAsFixed(2)}',
            width: 4,
            styles: const PosStyles(align: PosAlign.right)),
      ]);
    }

    bytes += generator.feed(1);
    bytes += generator.text('Thank you for your purchase!',
        styles: const PosStyles(align: PosAlign.center));
    bytes += generator.feed(1);
    bytes += generator.text(
        'Powered by NG POS',
        styles: const PosStyles(
          align: PosAlign.center,
          fontType: PosFontType.fontB,
        ));

    bytes += generator.feed(2);
    bytes += generator.cut();

    return bytes;
  }

  Future<PrintResult> printReceipt(Transaction transaction,
      {String storeName = 'POS Store', String? storePhone}) async {
    if (!isConfigured) {
      return PrintResult(
          success: false, message: 'Printer not configured. Set printer IP in Settings.');
    }

    try {
      final bytes = await generateReceiptBytes(transaction,
          storeName: storeName, storePhone: storePhone);

      final printer = NetworkPrinter(PaperSize.mm80,
          await CapabilityProfile.load());
      final connectResult =
          await printer.connect(_printerIp!, port: _printerPort);

      if (connectResult == PosPrintResult.success) {
        printer.rawBytes(bytes);
        await Future.delayed(const Duration(seconds: 2));
        printer.disconnect();
        return PrintResult(success: true, message: 'Receipt printed successfully');
      } else {
        return PrintResult(
            success: false,
            message: 'Could not connect to printer at $_printerIp:$_printerPort');
      }
    } catch (e) {
      return PrintResult(success: false, message: 'Print error: $e');
    }
  }

  String generateTextReceipt(Transaction transaction,
      {String storeName = 'POS Store', String? storePhone}) {
    final buf = StringBuffer();
    final divider = '=' * 40;
    final thinDivider = '-' * 40;
    final dateStr =
        DateFormat('dd/MM/yyyy HH:mm').format(transaction.createdAt);

    buf.writeln(divider);
    buf.writeln(_center(storeName, 40));
    if (storePhone != null && storePhone.isNotEmpty) {
      buf.writeln(_center('Tel: $storePhone', 40));
    }
    buf.writeln(divider);
    buf.writeln(_center('RECEIPT', 40));
    buf.writeln('Receipt #: ${transaction.receiptNumber}');
    buf.writeln('Date: $dateStr');
    if (transaction.cashierName.isNotEmpty) {
      buf.writeln('Cashier: ${transaction.cashierName}');
    }
    if (transaction.customerName != null &&
        transaction.customerName!.isNotEmpty) {
      buf.writeln('Customer: ${transaction.customerName}');
    }
    buf.writeln(thinDivider);

    buf.writeln(_padRight('Item', 22) +
        _padLeft('Qty', 6) +
        _padLeft('Total', 12));
    buf.writeln(thinDivider);

    for (final item in transaction.items) {
      final name = item.productName.length > 22
          ? item.productName.substring(0, 22)
          : item.productName;
      buf.writeln(_padRight(name, 22) +
          _padLeft(item.quantity.toStringAsFixed(0), 6) +
          _padLeft('K${item.lineTotal.toStringAsFixed(2)}', 12));
    }

    buf.writeln(thinDivider);
    buf.writeln(
        _padRight('Subtotal:', 28) +
        _padLeft('K${transaction.subtotal.toStringAsFixed(2)}', 12));

    if (transaction.discountAmount > 0) {
      buf.writeln(_padRight('Discount:', 28) +
          _padLeft(
              '-K${transaction.discountAmount.toStringAsFixed(2)}', 12));
    }

    buf.writeln(_padRight('VAT (16%):', 28) +
        _padLeft('K${transaction.taxAmount.toStringAsFixed(2)}', 12));

    buf.writeln(divider);
    buf.writeln(_padRight('TOTAL:', 28) +
        _padLeft('K${transaction.total.toStringAsFixed(2)}', 12));
    buf.writeln(divider);

    buf.writeln('Payment:');
    for (final payment in transaction.payments) {
      buf.writeln(_padRight('  ${_paymentMethodLabel(payment.method)}', 28) +
          _padLeft('K${payment.amount.toStringAsFixed(2)}', 12));
    }

    final totalPaid =
        transaction.payments.fold(0.0, (sum, p) => sum + p.amount);
    if (totalPaid > transaction.total) {
      buf.writeln(_padRight('  Change:', 28) +
          _padLeft(
              'K${(totalPaid - transaction.total).toStringAsFixed(2)}', 12));
    }

    buf.writeln();
    buf.writeln(_center('Thank you for your purchase!', 40));
    buf.writeln(_center('Powered by NG POS', 40));

    return buf.toString();
  }

  String _paymentMethodLabel(String method) {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'card':
        return 'Card';
      case 'mobile_money':
        return 'Mobile Money';
      default:
        return method;
    }
  }

  String _center(String text, int width) {
    if (text.length >= width) return text;
    final pad = (width - text.length) ~/ 2;
    return ' ' * pad + text;
  }

  String _padRight(String text, int width) {
    if (text.length >= width) return text;
    return text + ' ' * (width - text.length);
  }

  String _padLeft(String text, int width) {
    if (text.length >= width) return text;
    return ' ' * (width - text.length) + text;
  }
}

class PrintResult {
  final bool success;
  final String message;

  PrintResult({required this.success, required this.message});
}
