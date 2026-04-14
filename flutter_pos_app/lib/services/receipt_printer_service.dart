import 'package:esc_pos_printer/esc_pos_printer.dart';
import 'package:esc_pos_utils/esc_pos_utils.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/transaction.dart';

/// Wi‑Fi / Ethernet ESC/POS (port 9100). Bluetooth needs a different package.
class ReceiptPrinterService {
  static const String _keyIp = 'receipt_printer_ip';
  static const String _keyPort = 'receipt_printer_port';

  Future<String?> getPrinterIp() async {
    final p = await SharedPreferences.getInstance();
    final ip = p.getString(_keyIp);
    if (ip == null || ip.trim().isEmpty) return null;
    return ip.trim();
  }

  Future<int> getPrinterPort() async {
    final p = await SharedPreferences.getInstance();
    return p.getInt(_keyPort) ?? 9100;
  }

  Future<void> savePrinterAddress(String? ip, int port) async {
    final p = await SharedPreferences.getInstance();
    if (ip == null || ip.trim().isEmpty) {
      await p.remove(_keyIp);
    } else {
      await p.setString(_keyIp, ip.trim());
    }
    await p.setInt(_keyPort, port);
  }

  /// Prints if an IP is configured; otherwise does nothing (no error).
  Future<void> printReceiptIfConfigured(
    Transaction transaction, {
    String? storeName,
  }) async {
    if (kIsWeb) return;
    final ip = await getPrinterIp();
    if (ip == null) return;

    final port = await getPrinterPort();
    final profile = await CapabilityProfile.load();
    final printer = NetworkPrinter(PaperSize.mm80, profile);
    final result = await printer.connect(ip, port: port);
    if (result != PosPrintResult.success) {
      throw Exception(result.msg);
    }

    try {
      final header = storeName ?? 'Emerge POS';
      printer.text(
        header,
        styles: const PosStyles(
          align: PosAlign.center,
          bold: true,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
        ),
        linesAfter: 1,
      );
      printer.text(
        'Receipt #${transaction.receiptNumber}',
        styles: const PosStyles(align: PosAlign.center),
      );
      printer.text(
        _formatDate(transaction.createdAt),
        styles: const PosStyles(align: PosAlign.center),
        linesAfter: 1,
      );
      if (transaction.cashierName.isNotEmpty) {
        printer.text('Cashier: ${transaction.cashierName}');
      }
      if (transaction.customerName != null &&
          transaction.customerName!.isNotEmpty) {
        printer.text('Customer: ${transaction.customerName}');
      }
      printer.hr();
      for (final item in transaction.items) {
        printer.text(item.productName, styles: const PosStyles(bold: true));
        printer.text(
          '${item.quantity} x K${item.unitPrice.toStringAsFixed(2)}  '
          'K${item.lineTotal.toStringAsFixed(2)}',
        );
      }
      printer.hr();
      printer.row([
        PosColumn(
          text: 'Subtotal',
          width: 6,
          styles: const PosStyles(align: PosAlign.left),
        ),
        PosColumn(
          text: 'K${transaction.subtotal.toStringAsFixed(2)}',
          width: 6,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
      if (transaction.discountAmount > 0) {
        printer.row([
          PosColumn(
            text: 'Discount',
            width: 6,
            styles: const PosStyles(align: PosAlign.left),
          ),
          PosColumn(
            text: '-K${transaction.discountAmount.toStringAsFixed(2)}',
            width: 6,
            styles: const PosStyles(align: PosAlign.right),
          ),
        ]);
      }
      printer.row([
        PosColumn(
          text: 'Tax',
          width: 6,
          styles: const PosStyles(align: PosAlign.left),
        ),
        PosColumn(
          text: 'K${transaction.taxAmount.toStringAsFixed(2)}',
          width: 6,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
      printer.row([
        PosColumn(
          text: 'TOTAL',
          width: 6,
          styles: const PosStyles(align: PosAlign.left, bold: true),
        ),
        PosColumn(
          text: 'K${transaction.total.toStringAsFixed(2)}',
          width: 6,
          styles: const PosStyles(align: PosAlign.right, bold: true),
        ),
      ]);
      if (transaction.payments.isNotEmpty) {
        printer.text(
          'Paid (${transaction.payments.first.method}): '
          'K${transaction.payments.first.amount.toStringAsFixed(2)}',
          linesAfter: 1,
        );
      }
      printer.text(
        'Thank you',
        styles: const PosStyles(align: PosAlign.center),
        linesAfter: 2,
      );
      printer.cut();
    } finally {
      printer.disconnect();
    }
  }

  String _formatDate(DateTime d) {
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-'
        '${d.day.toString().padLeft(2, '0')} '
        '${d.hour.toString().padLeft(2, '0')}:'
        '${d.minute.toString().padLeft(2, '0')}';
  }
}
