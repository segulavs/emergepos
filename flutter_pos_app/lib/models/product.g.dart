// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'product.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class ProductAdapter extends TypeAdapter<Product> {
  @override
  final int typeId = 1;

  @override
  Product read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return Product(
      id: fields[0] as String,
      organizationId: fields[1] as String,
      name: fields[2] as String,
      description: fields[3] as String,
      sku: fields[4] as String,
      barcode: fields[5] as String?,
      brand: fields[6] as String,
      category: fields[7] as String,
      costPrice: fields[8] as double,
      sellingPrice: fields[9] as double,
      taxType: fields[10] as String,
      unit: fields[11] as String,
      isActive: fields[12] as bool,
      imageBase64: fields[13] as String?,
      stockQuantity: fields[14] as double,
      reorderLevel: fields[15] as double,
    );
  }

  @override
  void write(BinaryWriter writer, Product obj) {
    writer
      ..writeByte(16)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.organizationId)
      ..writeByte(2)
      ..write(obj.name)
      ..writeByte(3)
      ..write(obj.description)
      ..writeByte(4)
      ..write(obj.sku)
      ..writeByte(5)
      ..write(obj.barcode)
      ..writeByte(6)
      ..write(obj.brand)
      ..writeByte(7)
      ..write(obj.category)
      ..writeByte(8)
      ..write(obj.costPrice)
      ..writeByte(9)
      ..write(obj.sellingPrice)
      ..writeByte(10)
      ..write(obj.taxType)
      ..writeByte(11)
      ..write(obj.unit)
      ..writeByte(12)
      ..write(obj.isActive)
      ..writeByte(13)
      ..write(obj.imageBase64)
      ..writeByte(14)
      ..write(obj.stockQuantity)
      ..writeByte(15)
      ..write(obj.reorderLevel);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProductAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Product _$ProductFromJson(Map<String, dynamic> json) => Product(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      sku: json['sku'] as String,
      barcode: json['barcode'] as String?,
      brand: json['brand'] as String,
      category: json['category'] as String,
      costPrice: (json['cost_price'] as num).toDouble(),
      sellingPrice: (json['selling_price'] as num).toDouble(),
      taxType: json['tax_type'] as String,
      unit: json['unit'] as String,
      isActive: json['is_active'] as bool,
      imageBase64: json['image_base64'] as String?,
      stockQuantity: (json['stock_quantity'] as num?)?.toDouble() ?? 0,
      reorderLevel: (json['reorder_level'] as num?)?.toDouble() ?? 10,
    );

Map<String, dynamic> _$ProductToJson(Product instance) => <String, dynamic>{
      'id': instance.id,
      'organization_id': instance.organizationId,
      'name': instance.name,
      'description': instance.description,
      'sku': instance.sku,
      'barcode': instance.barcode,
      'brand': instance.brand,
      'category': instance.category,
      'cost_price': instance.costPrice,
      'selling_price': instance.sellingPrice,
      'tax_type': instance.taxType,
      'unit': instance.unit,
      'is_active': instance.isActive,
      'image_base64': instance.imageBase64,
      'stock_quantity': instance.stockQuantity,
      'reorder_level': instance.reorderLevel,
    };
