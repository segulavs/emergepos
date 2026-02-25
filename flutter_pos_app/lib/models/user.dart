import 'package:json_annotation/json_annotation.dart';
import 'package:hive/hive.dart';

part 'user.g.dart';

@JsonSerializable(fieldRename: FieldRename.snake)
@HiveType(typeId: 0)
class User extends HiveObject {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String? organizationId;
  
  @HiveField(2)
  final List<String> storeIds;
  
  @HiveField(3)
  final String email;
  
  @HiveField(4)
  final String firstName;
  
  @HiveField(5)
  final String lastName;
  
  @HiveField(6)
  final String role;
  
  @HiveField(7)
  final bool isActive;

  User({
    required this.id,
    this.organizationId,
    required this.storeIds,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.isActive,
  });

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);

  String get fullName => '$firstName $lastName';
  
  bool get isCashier => role == 'cashier';
  bool get isStoreAdmin => role == 'store_admin';
  bool get isOrgAdmin => role == 'org_admin';
  bool get isSuperAdmin => role == 'super_admin';
}