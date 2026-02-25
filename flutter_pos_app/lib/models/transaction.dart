import 'package:json_annotation/json_annotation.dart';
import 'package:hive/hive.dart';

part 'transaction.g.dart';

@JsonSerializable(fieldRename: FieldRename.snake)
@HiveType(typeId: 2)
class Transaction extends HiveObject {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String organizationId;
  
  @HiveField(2)
  final String storeId;
  
  @HiveField(3)
  final String receiptNumber;
  
  @HiveField(4)
  final String transactionType;
  
  @HiveField(5)
  final String status;
  
  @HiveField(6)
  final List<TransactionItem> items;
  
  @HiveField(7)
  final double subtotal;
  
  @HiveField(8)
  final double discountAmount;
  
  @HiveField(9)
  final double taxAmount;
  
  @HiveField(10)
  final double total;
  
  @HiveField(11)
  final List<Payment> payments;
  
  @HiveField(12)
  final String cashierId;
  
  @HiveField(13)
  final String cashierName;
  
  @HiveField(14)
  final String? customerName;
  
  @HiveField(15)
  final String? customerPhone;
  
  @HiveField(16)
  final String notes;
  
  @HiveField(17)
  final DateTime createdAt;
  
  @HiveField(18)
  final String? localId;
  
  @HiveField(19)
  final bool synced;

  Transaction({
    required this.id,
    required this.organizationId,
    required this.storeId,
    required this.receiptNumber,
    required this.transactionType,
    required this.status,
    required this.items,
    required this.subtotal,
    required this.discountAmount,
    required this.taxAmount,
    required this.total,
    required this.payments,
    required this.cashierId,
    required this.cashierName,
    this.customerName,
    this.customerPhone,
    required this.notes,
    required this.createdAt,
    this.localId,
    required this.synced,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) => _$TransactionFromJson(json);
  Map<String, dynamic> toJson() => _$TransactionToJson(this);

  bool get isPending => status == 'pending';
  bool get isCompleted => status == 'completed';
  bool get isVoided => status == 'voided';
  bool get needsSync => !synced;
}

@JsonSerializable(fieldRename: FieldRename.snake)
@HiveType(typeId: 3)
class TransactionItem extends HiveObject {
  @HiveField(0)
  final String productId;
  
  @HiveField(1)
  final String productName;
  
  @HiveField(2)
  final String sku;
  
  @HiveField(3)
  final double quantity;
  
  @HiveField(4)
  final double unitPrice;
  
  @HiveField(5)
  final double discountAmount;
  
  @HiveField(6)
  final String taxType;
  
  @HiveField(7)
  final double taxAmount;
  
  @HiveField(8)
  final double lineTotal;

  TransactionItem({
    required this.productId,
    required this.productName,
    required this.sku,
    required this.quantity,
    required this.unitPrice,
    required this.discountAmount,
    required this.taxType,
    required this.taxAmount,
    required this.lineTotal,
  });

  factory TransactionItem.fromJson(Map<String, dynamic> json) => _$TransactionItemFromJson(json);
  Map<String, dynamic> toJson() => _$TransactionItemToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
@HiveType(typeId: 4)
class Payment extends HiveObject {
  @HiveField(0)
  final String method;
  
  @HiveField(1)
  final double amount;
  
  @HiveField(2)
  final String? reference;

  Payment({
    required this.method,
    required this.amount,
    this.reference,
  });

  factory Payment.fromJson(Map<String, dynamic> json) => _$PaymentFromJson(json);
  Map<String, dynamic> toJson() => _$PaymentToJson(this);
}