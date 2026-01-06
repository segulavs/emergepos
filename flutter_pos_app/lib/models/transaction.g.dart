// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'transaction.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class TransactionAdapter extends TypeAdapter<Transaction> {
  @override
  final int typeId = 2;

  @override
  Transaction read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return Transaction(
      id: fields[0] as String,
      organizationId: fields[1] as String,
      storeId: fields[2] as String,
      receiptNumber: fields[3] as String,
      transactionType: fields[4] as String,
      status: fields[5] as String,
      items: (fields[6] as List).cast<TransactionItem>(),
      subtotal: fields[7] as double,
      discountAmount: fields[8] as double,
      taxAmount: fields[9] as double,
      total: fields[10] as double,
      payments: (fields[11] as List).cast<Payment>(),
      cashierId: fields[12] as String,
      cashierName: fields[13] as String,
      customerName: fields[14] as String?,
      customerPhone: fields[15] as String?,
      notes: fields[16] as String,
      createdAt: fields[17] as DateTime,
      localId: fields[18] as String?,
      synced: fields[19] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, Transaction obj) {
    writer
      ..writeByte(20)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.organizationId)
      ..writeByte(2)
      ..write(obj.storeId)
      ..writeByte(3)
      ..write(obj.receiptNumber)
      ..writeByte(4)
      ..write(obj.transactionType)
      ..writeByte(5)
      ..write(obj.status)
      ..writeByte(6)
      ..write(obj.items)
      ..writeByte(7)
      ..write(obj.subtotal)
      ..writeByte(8)
      ..write(obj.discountAmount)
      ..writeByte(9)
      ..write(obj.taxAmount)
      ..writeByte(10)
      ..write(obj.total)
      ..writeByte(11)
      ..write(obj.payments)
      ..writeByte(12)
      ..write(obj.cashierId)
      ..writeByte(13)
      ..write(obj.cashierName)
      ..writeByte(14)
      ..write(obj.customerName)
      ..writeByte(15)
      ..write(obj.customerPhone)
      ..writeByte(16)
      ..write(obj.notes)
      ..writeByte(17)
      ..write(obj.createdAt)
      ..writeByte(18)
      ..write(obj.localId)
      ..writeByte(19)
      ..write(obj.synced);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TransactionAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class TransactionItemAdapter extends TypeAdapter<TransactionItem> {
  @override
  final int typeId = 3;

  @override
  TransactionItem read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return TransactionItem(
      productId: fields[0] as String,
      productName: fields[1] as String,
      sku: fields[2] as String,
      quantity: fields[3] as double,
      unitPrice: fields[4] as double,
      discountAmount: fields[5] as double,
      taxType: fields[6] as String,
      taxAmount: fields[7] as double,
      lineTotal: fields[8] as double,
    );
  }

  @override
  void write(BinaryWriter writer, TransactionItem obj) {
    writer
      ..writeByte(9)
      ..writeByte(0)
      ..write(obj.productId)
      ..writeByte(1)
      ..write(obj.productName)
      ..writeByte(2)
      ..write(obj.sku)
      ..writeByte(3)
      ..write(obj.quantity)
      ..writeByte(4)
      ..write(obj.unitPrice)
      ..writeByte(5)
      ..write(obj.discountAmount)
      ..writeByte(6)
      ..write(obj.taxType)
      ..writeByte(7)
      ..write(obj.taxAmount)
      ..writeByte(8)
      ..write(obj.lineTotal);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TransactionItemAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

class PaymentAdapter extends TypeAdapter<Payment> {
  @override
  final int typeId = 4;

  @override
  Payment read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return Payment(
      method: fields[0] as String,
      amount: fields[1] as double,
      reference: fields[2] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, Payment obj) {
    writer
      ..writeByte(3)
      ..writeByte(0)
      ..write(obj.method)
      ..writeByte(1)
      ..write(obj.amount)
      ..writeByte(2)
      ..write(obj.reference);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PaymentAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Transaction _$TransactionFromJson(Map<String, dynamic> json) => Transaction(
      id: json['id'] as String,
      organizationId: json['organizationId'] as String,
      storeId: json['storeId'] as String,
      receiptNumber: json['receiptNumber'] as String,
      transactionType: json['transactionType'] as String,
      status: json['status'] as String,
      items: (json['items'] as List<dynamic>)
          .map((e) => TransactionItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      subtotal: (json['subtotal'] as num).toDouble(),
      discountAmount: (json['discountAmount'] as num).toDouble(),
      taxAmount: (json['taxAmount'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
      payments: (json['payments'] as List<dynamic>)
          .map((e) => Payment.fromJson(e as Map<String, dynamic>))
          .toList(),
      cashierId: json['cashierId'] as String,
      cashierName: json['cashierName'] as String,
      customerName: json['customerName'] as String?,
      customerPhone: json['customerPhone'] as String?,
      notes: json['notes'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      localId: json['localId'] as String?,
      synced: json['synced'] as bool,
    );

Map<String, dynamic> _$TransactionToJson(Transaction instance) =>
    <String, dynamic>{
      'id': instance.id,
      'organizationId': instance.organizationId,
      'storeId': instance.storeId,
      'receiptNumber': instance.receiptNumber,
      'transactionType': instance.transactionType,
      'status': instance.status,
      'items': instance.items,
      'subtotal': instance.subtotal,
      'discountAmount': instance.discountAmount,
      'taxAmount': instance.taxAmount,
      'total': instance.total,
      'payments': instance.payments,
      'cashierId': instance.cashierId,
      'cashierName': instance.cashierName,
      'customerName': instance.customerName,
      'customerPhone': instance.customerPhone,
      'notes': instance.notes,
      'createdAt': instance.createdAt.toIso8601String(),
      'localId': instance.localId,
      'synced': instance.synced,
    };

TransactionItem _$TransactionItemFromJson(Map<String, dynamic> json) =>
    TransactionItem(
      productId: json['productId'] as String,
      productName: json['productName'] as String,
      sku: json['sku'] as String,
      quantity: (json['quantity'] as num).toDouble(),
      unitPrice: (json['unitPrice'] as num).toDouble(),
      discountAmount: (json['discountAmount'] as num).toDouble(),
      taxType: json['taxType'] as String,
      taxAmount: (json['taxAmount'] as num).toDouble(),
      lineTotal: (json['lineTotal'] as num).toDouble(),
    );

Map<String, dynamic> _$TransactionItemToJson(TransactionItem instance) =>
    <String, dynamic>{
      'productId': instance.productId,
      'productName': instance.productName,
      'sku': instance.sku,
      'quantity': instance.quantity,
      'unitPrice': instance.unitPrice,
      'discountAmount': instance.discountAmount,
      'taxType': instance.taxType,
      'taxAmount': instance.taxAmount,
      'lineTotal': instance.lineTotal,
    };

Payment _$PaymentFromJson(Map<String, dynamic> json) => Payment(
      method: json['method'] as String,
      amount: (json['amount'] as num).toDouble(),
      reference: json['reference'] as String?,
    );

Map<String, dynamic> _$PaymentToJson(Payment instance) => <String, dynamic>{
      'method': instance.method,
      'amount': instance.amount,
      'reference': instance.reference,
    };
