import 'package:json_annotation/json_annotation.dart';
import 'package:hive/hive.dart';

part 'product.g.dart';

@JsonSerializable()
@HiveType(typeId: 1)
class Product extends HiveObject {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String organizationId;
  
  @HiveField(2)
  final String name;
  
  @HiveField(3)
  final String description;
  
  @HiveField(4)
  final String sku;
  
  @HiveField(5)
  final String? barcode;
  
  @HiveField(6)
  final String brand;
  
  @HiveField(7)
  final String category;
  
  @HiveField(8)
  final double costPrice;
  
  @HiveField(9)
  final double sellingPrice;
  
  @HiveField(10)
  final String taxType;
  
  @HiveField(11)
  final String unit;
  
  @HiveField(12)
  final bool isActive;
  
  @HiveField(13)
  final String? imageBase64;
  
  @HiveField(14)
  final double stockQuantity;
  
  @HiveField(15)
  final double reorderLevel;

  Product({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.description,
    required this.sku,
    this.barcode,
    required this.brand,
    required this.category,
    required this.costPrice,
    required this.sellingPrice,
    required this.taxType,
    required this.unit,
    required this.isActive,
    this.imageBase64,
    this.stockQuantity = 0,
    this.reorderLevel = 10,
  });

  factory Product.fromJson(Map<String, dynamic> json) => _$ProductFromJson(json);
  Map<String, dynamic> toJson() => _$ProductToJson(this);

  bool get isLowStock => stockQuantity <= reorderLevel;
  bool get isOutOfStock => stockQuantity <= 0;
  
  Product copyWith({
    String? id,
    String? organizationId,
    String? name,
    String? description,
    String? sku,
    String? barcode,
    String? brand,
    String? category,
    double? costPrice,
    double? sellingPrice,
    String? taxType,
    String? unit,
    bool? isActive,
    String? imageBase64,
    double? stockQuantity,
    double? reorderLevel,
  }) {
    return Product(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      name: name ?? this.name,
      description: description ?? this.description,
      sku: sku ?? this.sku,
      barcode: barcode ?? this.barcode,
      brand: brand ?? this.brand,
      category: category ?? this.category,
      costPrice: costPrice ?? this.costPrice,
      sellingPrice: sellingPrice ?? this.sellingPrice,
      taxType: taxType ?? this.taxType,
      unit: unit ?? this.unit,
      isActive: isActive ?? this.isActive,
      imageBase64: imageBase64 ?? this.imageBase64,
      stockQuantity: stockQuantity ?? this.stockQuantity,
      reorderLevel: reorderLevel ?? this.reorderLevel,
    );
  }
}