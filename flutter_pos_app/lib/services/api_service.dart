import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/product.dart';
import '../models/transaction.dart';

class ApiService {
  // Default base URL - can be overridden via SharedPreferences
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:8000/api';
    } else if (Platform.isAndroid) {
      // For Android emulator, use 10.0.2.2 which maps to host's localhost
      // For physical devices, this should be configured to the actual server IP
      return 'http://10.0.2.2:8000/api';
    } else if (Platform.isIOS) {
      return 'http://localhost:8000/api';
    }
    return 'http://localhost:8000/api';
  }
  
  static const String _tokenKey = 'auth_token';
  static const String _baseUrlKey = 'api_base_url';
  
  late Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  String? _authToken;

  ApiService() {
    _initializeDio();
    _loadCustomBaseUrl();
  }

  void _initializeDio() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (_authToken != null) {
          options.headers['Authorization'] = 'Bearer $_authToken';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          clearToken();
        }
        handler.next(error);
      },
    ));
  }

  Future<void> _loadCustomBaseUrl() async {
    // Load custom base URL asynchronously and update if found
    if (!kIsWeb) {
      try {
        final prefs = await SharedPreferences.getInstance();
        final customUrl = prefs.getString(_baseUrlKey);
        if (customUrl != null && customUrl.isNotEmpty && customUrl != _dio.options.baseUrl) {
          _dio.options.baseUrl = customUrl;
          if (kDebugMode) {
            print('Using custom API URL: $customUrl');
          }
        }
      } catch (e) {
        // If SharedPreferences fails, use default
        if (kDebugMode) {
          print('Failed to load custom API URL: $e');
        }
      }
    }
  }

  // Method to set custom base URL
  Future<void> setBaseUrl(String url) async {
    _dio.options.baseUrl = url;
    if (!kIsWeb) {
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_baseUrlKey, url);
      } catch (e) {
        if (kDebugMode) {
          print('Failed to save custom API URL: $e');
        }
      }
    }
  }

  // Authentication
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      final data = response.data;
      _authToken = data['access_token'];
      await _storage.write(key: _tokenKey, value: _authToken);
      
      return data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> logout() async {
    _authToken = null;
    await _storage.delete(key: _tokenKey);
  }

  Future<String?> getStoredToken() async {
    _authToken = await _storage.read(key: _tokenKey);
    return _authToken;
  }

  Future<void> clearToken() async {
    _authToken = null;
    await _storage.delete(key: _tokenKey);
  }

  Future<User> getCurrentUser() async {
    try {
      final response = await _dio.get('/auth/me');
      return User.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Products
  Future<List<Product>> getProducts({
    String? search,
    String? category,
    String? storeId,
  }) async {
    try {
      String endpoint = storeId != null 
          ? '/products/with-stock/$storeId'
          : '/products';
      
      final response = await _dio.get(endpoint, queryParameters: {
        if (search != null) 'search': search,
        if (category != null) 'category': category,
      });

      final List<dynamic> data = response.data;
      return data.map((json) => Product.fromJson(json)).toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Product?> getProductByBarcode(String barcode) async {
    try {
      final response = await _dio.get('/products/barcode/$barcode');
      return Product.fromJson(response.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      throw _handleError(e);
    }
  }

  Future<Product> createProduct(Map<String, dynamic> productData) async {
    try {
      final response = await _dio.post('/products', data: productData);
      return Product.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Product> updateProduct(String productId, Map<String, dynamic> productData) async {
    try {
      final response = await _dio.put('/products/$productId', data: productData);
      return Product.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Transactions
  Future<Transaction> createTransaction(Map<String, dynamic> transactionData) async {
    try {
      final response = await _dio.post('/transactions', data: transactionData);
      return Transaction.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Transaction>> getTransactions({
    String? storeId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final response = await _dio.get('/transactions', queryParameters: {
        if (storeId != null) 'store_id': storeId,
        if (startDate != null) 'start_date': startDate.toIso8601String(),
        if (endDate != null) 'end_date': endDate.toIso8601String(),
      });

      final List<dynamic> data = response.data;
      return data.map((json) => Transaction.fromJson(json)).toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> voidTransaction(String transactionId, String reason) async {
    try {
      await _dio.post('/transactions/$transactionId/void', data: {
        'reason': reason,
      });
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Stock Management
  Future<void> updateStock(String storeId, String productId, {
    required String movementType,
    required double quantity,
    String? reason,
  }) async {
    try {
      await _dio.post('/stock/$storeId/movement', data: {
        'product_id': productId,
        'movement_type': movementType,
        'quantity': quantity,
        'reason': reason ?? '',
      });
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getStockMovements(String storeId, {
    String? productId,
  }) async {
    try {
      final response = await _dio.get('/stock/$storeId/movements', queryParameters: {
        if (productId != null) 'product_id': productId,
      });

      return List<Map<String, dynamic>>.from(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Analytics
  Future<Map<String, dynamic>> getDashboardData() async {
    try {
      final response = await _dio.get('/analytics/dashboard');
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getSalesSummary({
    String? storeId,
    String? period = 'daily',
  }) async {
    try {
      final response = await _dio.get('/analytics/sales-summary', queryParameters: {
        if (storeId != null) 'store_id': storeId,
        'period': period,
      });

      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Stores
  Future<List<Map<String, dynamic>>> getStores() async {
    try {
      final response = await _dio.get('/stores');
      return List<Map<String, dynamic>>.from(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Health Check
  Future<bool> checkHealth() async {
    try {
      final response = await _dio.get('/health');
      return response.data['status'] == 'healthy';
    } catch (e) {
      return false;
    }
  }

  // Sync operations
  Future<void> syncTransaction(Transaction transaction) async {
    try {
      await _dio.post('/transactions', data: transaction.toJson());
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> syncStockMovement(Map<String, dynamic> movement) async {
    try {
      final storeId = movement['store_id'];
      await _dio.post('/stock/$storeId/movement', data: movement);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Error handling
  String _handleError(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Connection timeout. Please check your internet connection.';
    }
    
    if (e.type == DioExceptionType.connectionError) {
      return 'Unable to connect to server. Please check your internet connection.';
    }

    if (e.response != null) {
      final statusCode = e.response!.statusCode;
      final data = e.response!.data;

      switch (statusCode) {
        case 400:
          return data['detail'] ?? 'Bad request';
        case 401:
          return 'Authentication failed. Please login again.';
        case 403:
          return 'Access denied. You don\'t have permission for this action.';
        case 404:
          return 'Resource not found';
        case 422:
          return 'Validation error. Please check your input.';
        case 500:
          return 'Server error. Please try again later.';
        default:
          return data['detail'] ?? 'An error occurred';
      }
    }

    return 'An unexpected error occurred';
  }

  bool get hasToken => _authToken != null;
}