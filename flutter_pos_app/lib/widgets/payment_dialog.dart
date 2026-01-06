import 'package:flutter/material.dart';
import '../models/transaction.dart';
import '../utils/currency_formatter.dart';

class PaymentDialog extends StatefulWidget {
  final double totalAmount;

  const PaymentDialog({
    super.key,
    required this.totalAmount,
  });

  @override
  State<PaymentDialog> createState() => _PaymentDialogState();
}

class _PaymentDialogState extends State<PaymentDialog> {
  final List<Payment> _payments = [];
  String _selectedMethod = 'cash';
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _referenceController = TextEditingController();

  double get _totalPaid => _payments.fold(0, (sum, payment) => sum + payment.amount);
  double get _remainingAmount => widget.totalAmount - _totalPaid;
  bool get _isFullyPaid => _remainingAmount <= 0;

  @override
  void initState() {
    super.initState();
    _amountController.text = widget.totalAmount.toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Payment'),
      content: SizedBox(
        width: 400,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Total amount
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Amount:'),
                  Text(
                    CurrencyFormatter.format(widget.totalAmount),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Payment method selection
            DropdownButtonFormField<String>(
              value: _selectedMethod,
              decoration: const InputDecoration(
                labelText: 'Payment Method',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'cash', child: Text('Cash')),
                DropdownMenuItem(value: 'card', child: Text('Card')),
                DropdownMenuItem(value: 'mobile_money', child: Text('Mobile Money')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedMethod = value!;
                  _referenceController.clear();
                });
              },
            ),
            
            const SizedBox(height: 16),
            
            // Amount input
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Amount',
                prefixText: 'K ',
                border: const OutlineInputBorder(),
                helperText: _remainingAmount > 0 
                    ? 'Remaining: ${CurrencyFormatter.format(_remainingAmount)}'
                    : null,
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Reference (for card/mobile money)
            if (_selectedMethod != 'cash')
              TextField(
                controller: _referenceController,
                decoration: InputDecoration(
                  labelText: _selectedMethod == 'card' 
                      ? 'Card Reference' 
                      : 'Mobile Money Reference',
                  border: const OutlineInputBorder(),
                ),
              ),
            
            const SizedBox(height: 16),
            
            // Add payment button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _addPayment,
                child: const Text('Add Payment'),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Payments list
            if (_payments.isNotEmpty) ...[
              const Text(
                'Payments:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ..._payments.asMap().entries.map((entry) {
                final index = entry.key;
                final payment = entry.value;
                return Card(
                  child: ListTile(
                    title: Text(_getPaymentMethodName(payment.method)),
                    subtitle: payment.reference != null 
                        ? Text('Ref: ${payment.reference}')
                        : null,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          CurrencyFormatter.format(payment.amount),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, size: 18),
                          onPressed: () => _removePayment(index),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
              
              const SizedBox(height: 8),
              
              // Payment summary
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _isFullyPaid ? Colors.green[50] : Colors.orange[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Paid:'),
                        Text(
                          CurrencyFormatter.format(_totalPaid),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    if (!_isFullyPaid)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Remaining:'),
                          Text(
                            CurrencyFormatter.format(_remainingAmount),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.red,
                            ),
                          ),
                        ],
                      ),
                    if (_totalPaid > widget.totalAmount)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Change:'),
                          Text(
                            CurrencyFormatter.format(_totalPaid - widget.totalAmount),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isFullyPaid ? _completePayment : null,
          child: const Text('Complete Payment'),
        ),
      ],
    );
  }

  void _addPayment() {
    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid amount')),
      );
      return;
    }

    if (_selectedMethod != 'cash' && _referenceController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a reference')),
      );
      return;
    }

    setState(() {
      _payments.add(Payment(
        method: _selectedMethod,
        amount: amount,
        reference: _selectedMethod == 'cash' ? null : _referenceController.text.trim(),
      ));
      
      // Reset form
      _amountController.text = _remainingAmount > 0 
          ? _remainingAmount.toStringAsFixed(2)
          : '0.00';
      _referenceController.clear();
    });
  }

  void _removePayment(int index) {
    setState(() {
      _payments.removeAt(index);
      _amountController.text = _remainingAmount > 0 
          ? _remainingAmount.toStringAsFixed(2)
          : '0.00';
    });
  }

  void _completePayment() {
    Navigator.of(context).pop(_payments);
  }

  String _getPaymentMethodName(String method) {
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

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    super.dispose();
  }
}