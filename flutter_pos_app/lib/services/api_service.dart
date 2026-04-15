import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/product.dart';
import '../models/transaction.dart';

class ApiService {
  // Default base URL - Production server on Railway kss
  // Can be overridden via SharedPreferences or environment variables
  static const String _defaultProductionUrl = 'https://disciplined-recreation-production.up.railway.app/api';
  
  static String get baseUrl {
    // Check for environment variable first (for build-time configuration)
    const envUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }
    
    // Default to production Railway URL
    // This can be overridden via SharedPreferences (loaded asynchronously in _loadCustomBaseUrl)
    // or by using --dart-define=API_BASE_URL=http://your-url/api when running
    return _defaultProductionUrl;
  }
  
  // Get the default production URL (for UI display)
  static String get defaultBaseUrl => _defaultProductionUrl;
  
  static const String _tokenKey = 'auth_token';
  static const String _baseUrlKey = 'api_base_url';
  static const String _cachePrefix = 'cache:';
  static const String _lastCacheSyncAtKey = '${_cachePrefix}last_synced_at';
  
  late Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  String? _authToken;
  bool _dioInitialized = false;
  bool _urlLoaded = false;

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
        // Log the full URL being called
        if (kDebugMode) {
          print('API Request: ${options.method} ${options.baseUrl}${options.path}');
          print('Full URL: ${options.uri}');
        }
        if (_authToken != null) {
          options.headers['Authorization'] = 'Bearer $_authToken';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        if (kDebugMode) {
          print('API Error: ${error.requestOptions.method} ${error.requestOptions.uri}');
          print('Error type: ${error.type}');
          print('Error message: ${error.message}');
          if (error.response != null) {
            print('Response status: ${error.response?.statusCode}');
            print('Response data: ${error.response?.data}');
          } else {
            print('No response received - connection error');
          }
        }
        if (error.response?.statusCode == 401) {
          // Token expired, clear it
          clearToken();
        }
        handler.next(error);
      },
    ));
    
    _dioInitialized = true;
    
    if (kDebugMode) {
      print('API Service initialized with base URL: ${_dio.options.baseUrl}');
    }
  }

  Future<void> _loadCustomBaseUrl() async {
    // Load custom base URL asynchronously and update if found
    if (!kIsWeb) {
      try {
        final prefs = await SharedPreferences.getInstance();
        final customUrl = prefs.getString(_baseUrlKey);
        if (customUrl != null && customUrl.isNotEmpty) {
          String normalizedUrl = customUrl.trim();
          // Remove trailing slash if present
          if (normalizedUrl.endsWith('/')) {
            normalizedUrl = normalizedUrl.substring(0, normalizedUrl.length - 1);
          }
          if (normalizedUrl != _dio.options.baseUrl) {
            _dio.options.baseUrl = normalizedUrl;
            _urlLoaded = true;
            if (kDebugMode) {
              print('Loaded and using custom API URL: $normalizedUrl');
            }
          }
        } else if (kDebugMode) {
          print('No custom URL found, using default: ${_dio.options.baseUrl}');
        }
      } catch (e) {
        // If SharedPreferences fails, use default
        if (kDebugMode) {
          print('Failed to load custom API URL: $e');
        }
      }
    }
  }
  
  // Ensure URL is loaded before making requests
  Future<void> ensureInitialized() async {
    if (!_urlLoaded) {
      await _loadCustomBaseUrl();
    }
  }

  // Method to get current base URL being used
  String getCurrentBaseUrl() {
    return _dio.options.baseUrl;
  }
  
  // Method to get saved custom URL from preferences
  Future<String?> getSavedBaseUrl() async {
    if (kIsWeb) {
      return null;
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_baseUrlKey);
    } catch (e) {
      if (kDebugMode) {
        print('Failed to get saved API URL: $e');
      }
      return null;
    }
  }
  
  // Method to set custom base URL
  Future<void> setBaseUrl(String url) async {
    // Normalize URL (remove trailing slash, ensure proper format)
    String normalizedUrl = url.trim();
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.substring(0, normalizedUrl.length - 1);
    }
    
    _dio.options.baseUrl = normalizedUrl;
    if (!kIsWeb) {
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_baseUrlKey, normalizedUrl);
        if (kDebugMode) {
          print('API URL updated to: $normalizedUrl');
        }
      } catch (e) {
        if (kDebugMode) {
          print('Failed to save custom API URL: $e');
        }
      }
    }
  }
  
  // Method to reset to default URL
  Future<void> resetToDefaultUrl() async {
    await setBaseUrl(_defaultProductionUrl);
  }

  // Authentication
  Future<Map<String, dynamic>> login(String email, String password) async {
    // Ensure API is initialized with correct URL
    await ensureInitialized();
    
    try {
      if (kDebugMode) {
        print('Attempting login to: ${_dio.options.baseUrl}/auth/login');
      }
      
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      final data = response.data;
      
      if (kDebugMode) {
        print('Login response received: $data');
        print('Access token present: ${data['access_token'] != null}');
        print('User data present: ${data['user'] != null}');
        if (data['user'] != null) {
          print('User data: ${data['user']}');
        }
      }
      
      // Validate response structure
      if (data['access_token'] == null) {
        throw Exception('No access token in response');
      }
      
      if (data['user'] == null) {
        throw Exception('No user data in response');
      }
      
      _authToken = data['access_token'];
      await _storage.write(key: _tokenKey, value: _authToken);
      
      if (kDebugMode) {
        print('Login successful - token saved');
      }
      
      return data;
    } on DioException catch (e) {
      if (kDebugMode) {
        print('Login failed: ${_handleError(e)}');
        print('Full error: ${e.toString()}');
      }
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

  String _buildCacheKey(String resource, [Map<String, dynamic>? params]) {
    if (params == null || params.isEmpty) {
      return '$_cachePrefix$resource';
    }

    final sortedKeys = params.keys.toList()..sort();
    final query = sortedKeys
        .map((key) => '$key=${params[key] ?? ''}')
        .join('&');
    return '$_cachePrefix$resource?$query';
  }

  Future<void> _cacheResponse(String key, dynamic data) async {
    if (kIsWeb) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, jsonEncode(data));
      await prefs.setString(_lastCacheSyncAtKey, DateTime.now().toIso8601String());
    } catch (e) {
      if (kDebugMode) {
        print('Failed to cache response for $key: $e');
      }
    }
  }

  Future<DateTime?> getLastCacheSyncAt() async {
    if (kIsWeb) return null;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_lastCacheSyncAtKey);
      if (raw == null || raw.isEmpty) {
        return null;
      }
      return DateTime.tryParse(raw);
    } catch (e) {
      if (kDebugMode) {
        print('Failed to read last cache sync time: $e');
      }
      return null;
    }
  }

  Future<dynamic> _getCachedResponse(String key) async {
    if (kIsWeb) return null;

    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(key);
      if (cached == null || cached.isEmpty) {
        return null;
      }
      return jsonDecode(cached);
    } catch (e) {
      if (kDebugMode) {
        print('Failed to read cache for $key: $e');
      }
      return null;
    }
  }

  Future<void> _invalidateCacheByPrefix(String prefix) async {
    if (kIsWeb) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs
          .getKeys()
          .where((key) => key.startsWith('$_cachePrefix$prefix'))
          .toList();
      for (final key in keys) {
        await prefs.remove(key);
      }
    } catch (e) {
      if (kDebugMode) {
        print('Failed to invalidate cache for $prefix: $e');
      }
    }
  }

  Future<User> getCurrentUser() async {
    try {
      final response = await _dio.get('/auth/me');
      final userData = response.data;
      
      // Convert snake_case from backend to camelCase for Flutter model
      final convertedUserData = <String, dynamic>{
        'id': userData['id'],
        'organizationId': userData['organization_id'],
        'storeIds': userData['store_ids'] ?? [],
        'email': userData['email'],
        'firstName': userData['first_name'],
        'lastName': userData['last_name'],
        'role': userData['role']?.toString() ?? userData['role'],
        'isActive': userData['is_active'] ?? true,
      };
      
      return User.fromJson(convertedUserData);
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
    final cacheKey = _buildCacheKey('products', {
      'search': search,
      'category': category,
      'storeId': storeId,
    });

    try {
      String endpoint = storeId != null 
          ? '/products/with-stock/$storeId'
          : '/products';
      
      final response = await _dio.get(endpoint, queryParameters: {
        if (search != null) 'search': search,
        if (category != null) 'category': category,
      });

      final List<dynamic> data = response.data;
      await _cacheResponse(cacheKey, data);
      return data.map((json) => Product.fromJson(json)).toList();
    } on DioException catch (e) {
      final cached = await _getCachedResponse(cacheKey);
      if (cached is List) {
        return cached
            .map((json) => Product.fromJson(Map<String, dynamic>.from(json)))
            .toList();
      }
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
      await _invalidateCacheByPrefix('products');
      await _invalidateCacheByPrefix('dashboard');
      return Product.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Product> updateProduct(String productId, Map<String, dynamic> productData) async {
    try {
      final response = await _dio.put('/products/$productId', data: productData);
      await _invalidateCacheByPrefix('products');
      await _invalidateCacheByPrefix('dashboard');
      return Product.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> deleteProduct(String productId) async {
    try {
      await _dio.delete('/products/$productId');
      await _invalidateCacheByPrefix('products');
      await _invalidateCacheByPrefix('dashboard');
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Transactions
  Future<Transaction> createTransaction(Map<String, dynamic> transactionData) async {
    try {
      final response = await _dio.post('/transactions', data: transactionData);
      await _invalidateCacheByPrefix('transactions');
      await _invalidateCacheByPrefix('dashboard');
      await _invalidateCacheByPrefix('sales-summary');
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
    final cacheKey = _buildCacheKey('transactions', {
      'storeId': storeId,
      'startDate': startDate?.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
    });

    try {
      final response = await _dio.get('/transactions', queryParameters: {
        if (storeId != null) 'store_id': storeId,
        if (startDate != null) 'start_date': startDate.toIso8601String(),
        if (endDate != null) 'end_date': endDate.toIso8601String(),
      });

      final List<dynamic> data = response.data;
      await _cacheResponse(cacheKey, data);
      return data.map((json) => Transaction.fromJson(json)).toList();
    } on DioException catch (e) {
      final cached = await _getCachedResponse(cacheKey);
      if (cached is List) {
        return cached
            .map((json) => Transaction.fromJson(Map<String, dynamic>.from(json)))
            .toList();
      }
      throw _handleError(e);
    }
  }

  Future<void> voidTransaction(String transactionId, String reason) async {
    try {
      await _dio.post('/transactions/$transactionId/void', data: {
        'reason': reason,
      });
      await _invalidateCacheByPrefix('transactions');
      await _invalidateCacheByPrefix('dashboard');
      await _invalidateCacheByPrefix('sales-summary');
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
      await _invalidateCacheByPrefix('store-stock');
      await _invalidateCacheByPrefix('products');
      await _invalidateCacheByPrefix('dashboard');
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
    final cacheKey = _buildCacheKey('dashboard');
    try {
      final response = await _dio.get('/analytics/dashboard');
      await _cacheResponse(cacheKey, response.data);
      return response.data;
    } on DioException catch (e) {
      final cached = await _getCachedResponse(cacheKey);
      if (cached is Map) {
        return Map<String, dynamic>.from(cached);
      }
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getSalesSummary({
    String? storeId,
    String? period = 'daily',
  }) async {
    final cacheKey = _buildCacheKey('sales-summary', {
      'storeId': storeId,
      'period': period,
    });

    try {
      final response = await _dio.get('/analytics/sales-summary', queryParameters: {
        if (storeId != null) 'store_id': storeId,
        'period': period,
      });

      await _cacheResponse(cacheKey, response.data);
      return response.data;
    } on DioException catch (e) {
      final cached = await _getCachedResponse(cacheKey);
      if (cached is Map) {
        return Map<String, dynamic>.from(cached);
      }
      throw _handleError(e);
    }
  }

  // Stores
  Future<List<Map<String, dynamic>>> getStores() async {
    final cacheKey = _buildCacheKey('stores');

    try {
      final response = await _dio.get('/stores');
      if (kDebugMode) {
        print('Stores API response: ${response.data}');
      }
      final data = response.data;
      await _cacheResponse(cacheKey, data);
      if (data is List) {
        return List<Map<String, dynamic>>.from(data);
      } else if (data is Map && data.containsKey('data')) {
        // Handle case where API returns {data: [...]}
        return List<Map<String, dynamic>>.from(data['data']);
      }
      return List<Map<String, dynamic>>.from([]);
    } on DioException catch (e) {
      if (kDebugMode) {
        print('Error getting stores: ${_handleError(e)}');
      }
      final cached = await _getCachedResponse(cacheKey);
      if (cached is List) {
        return List<Map<String, dynamic>>.from(cached);
      } else if (cached is Map && cached.containsKey('data')) {
        return List<Map<String, dynamic>>.from(cached['data']);
      }
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> createStore(Map<String, dynamic> storeData) async {
    try {
      final response = await _dio.post('/stores', data: storeData);
      await _invalidateCacheByPrefix('stores');
      await _invalidateCacheByPrefix('dashboard');
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> updateStore(String storeId, Map<String, dynamic> storeData) async {
    try {
      final response = await _dio.put('/stores/$storeId', data: storeData);
      await _invalidateCacheByPrefix('stores');
      await _invalidateCacheByPrefix('dashboard');
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Users
  Future<List<Map<String, dynamic>>> getUsers() async {
    final cacheKey = _buildCacheKey('users');
    try {
      final response = await _dio.get('/users');
      await _cacheResponse(cacheKey, response.data);
      return List<Map<String, dynamic>>.from(response.data);
    } on DioException catch (e) {
      final cached = await _getCachedResponse(cacheKey);
      if (cached is List) {
        return List<Map<String, dynamic>>.from(cached);
      }
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> createUser(Map<String, dynamic> userData) async {
    try {
      final response = await _dio.post('/users', data: userData);
      await _invalidateCacheByPrefix('users');
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> updateUser(String userId, Map<String, dynamic> userData) async {
    try {
      final response = await _dio.put('/users/$userId', data: userData);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Inventory / Stock
  Future<List<Map<String, dynamic>>> getStoreStock(String storeId) async {
    final cacheKey = _buildCacheKey('store-stock', {'storeId': storeId});
    try {
      final response = await _dio.get('/stock/$storeId');
      await _cacheResponse(cacheKey, response.data);
      return List<Map<String, dynamic>>.from(response.data);
    } on DioException catch (e) {
      final cached = await _getCachedResponse(cacheKey);
      if (cached is List) {
        return List<Map<String, dynamic>>.from(cached);
      }
      throw _handleError(e);
    }
  }

  // Warehouses
  Future<List<Map<String, dynamic>>> getWarehouses() async {
    final cacheKey = _buildCacheKey('warehouses');
    try {
      final response = await _dio.get('/warehouses');
      await _cacheResponse(cacheKey, response.data);
      return List<Map<String, dynamic>>.from(response.data);
    } on DioException catch (e) {
      final cached = await _getCachedResponse(cacheKey);
      if (cached is List) {
        return List<Map<String, dynamic>>.from(cached);
      }
      throw _handleError(e);
    }
  }

  // Transfers
  Future<List<Map<String, dynamic>>> getTransfers({String? storeId}) async {
    final cacheKey = _buildCacheKey('transfers', {'storeId': storeId});
    try {
      final response = await _dio.get('/transfers', queryParameters: {
        if (storeId != null) 'store_id': storeId,
      });
      await _cacheResponse(cacheKey, response.data);
      return List<Map<String, dynamic>>.from(response.data);
    } on DioException catch (e) {
      final cached = await _getCachedResponse(cacheKey);
      if (cached is List) {
        return List<Map<String, dynamic>>.from(cached);
      }
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> createTransfer(Map<String, dynamic> transferData) async {
    try {
      final response = await _dio.post('/transfers', data: transferData);
      await _invalidateCacheByPrefix('transfers');
      await _invalidateCacheByPrefix('store-stock');
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Health Check
  Future<bool> checkHealth() async {
    await ensureInitialized();
    try {
      if (kDebugMode) {
        print('Checking health at: ${_dio.options.baseUrl}/health');
      }
      final response = await _dio.get('/health');
      if (kDebugMode) {
        print('Health check response: ${response.data}');
      }
      return response.data['status'] == 'healthy';
    } catch (e) {
      if (kDebugMode) {
        print('Health check failed: $e');
        if (e is DioException) {
          print('Error type: ${e.type}');
          print('Error message: ${e.message}');
          print('Response: ${e.response?.data}');
        }
      }
      return false;
    }
  }
  
  // Get current API configuration for debugging
  Map<String, dynamic> getApiConfig() {
    return {
      'baseUrl': _dio.options.baseUrl,
      'defaultUrl': _defaultProductionUrl,
      'urlLoaded': _urlLoaded,
      'dioInitialized': _dioInitialized,
    };
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