import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/transaction.dart';
import '../services/receipt_printer_service.dart';
import '../utils/currency_formatter.dart';

class ReceiptDialog extends StatefulWidget {
  final Transaction transaction;
  final String storeName;
  final String? storePhone;

  const ReceiptDialog({
    super.key,
    required this.transaction,
    this.storeName = 'POS Store',
    this.storePhone,
  });

  @override
  State<ReceiptDialog> createState() => _ReceiptDialogState();
}

class _ReceiptDialogState extends State<ReceiptDialog> {
  bool _isPrinting = false;

  @override
  Widget build(BuildContext context) {
    final txn = widget.transaction;
    final totalPaid = txn.payments.fold(0.0, (sum, p) => sum + p.amount);
    final change = totalPaid > txn.total ? totalPaid - txn.total : 0.0;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(16)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 32),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Transaction Complete',
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16)),
                        Text('#${txn.receiptNumber}',
                            style: TextStyle(
                                color: Colors.grey[600], fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Items',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...txn.items.map((item) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                    '${item.productName} x${item.quantity.toStringAsFixed(0)}',
                                    style: const TextStyle(fontSize: 13)),
                              ),
                              Text(CurrencyFormatter.format(item.lineTotal),
                                  style: const TextStyle(fontSize: 13)),
                            ],
                          ),
                        )),

                    const Divider(height: 24),

                    _summaryRow('Subtotal', txn.subtotal),
                    if (txn.discountAmount > 0)
                      _summaryRow('Discount', -txn.discountAmount,
                          color: Colors.red),
                    _summaryRow('VAT (16%)', txn.taxAmount),
                    const SizedBox(height: 4),
                    _summaryRow('Total', txn.total, bold: true, size: 16),

                    const Divider(height: 24),

                    const Text('Payment',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    ...txn.payments.map((p) => _summaryRow(
                        _paymentLabel(p.method), p.amount)),
                    if (change > 0)
                      _summaryRow('Change', change, color: Colors.green),
                  ],
                ),
              ),
            ),

            Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isPrinting ? null : _printReceipt,
                      icon: _isPrinting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.print),
                      label: const Text('Print'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _shareReceipt,
                      icon: const Icon(Icons.share),
                      label: const Text('Share'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Done'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, double amount,
      {Color? color, bool bold = false, double size = 14}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  fontWeight: bold ? FontWeight.bold : FontWeight.normal,
                  fontSize: size)),
          Text(CurrencyFormatter.format(amount),
              style: TextStyle(
                  fontWeight: bold ? FontWeight.bold : FontWeight.normal,
                  fontSize: size,
                  color: color)),
        ],
      ),
    );
  }

  String _paymentLabel(String method) {
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

  Future<void> _printReceipt() async {
    setState(() => _isPrinting = true);
    try {
      final printer = ReceiptPrinterService.instance;
      if (!printer.isConfigured) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Printer not configured. Go to Settings to set printer IP.'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      final result = await printer.printReceipt(
        widget.transaction,
        storeName: widget.storeName,
        storePhone: widget.storePhone,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.message),
            backgroundColor: result.success ? Colors.green : Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isPrinting = false);
    }
  }

  void _shareReceipt() {
    final printer = ReceiptPrinterService.instance;
    final text = printer.generateTextReceipt(
      widget.transaction,
      storeName: widget.storeName,
      storePhone: widget.storePhone,
    );

    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Receipt copied to clipboard'),
        backgroundColor: Colors.green,
      ),
    );
  }
}
