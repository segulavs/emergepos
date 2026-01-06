import 'package:flutter/foundation.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';

class ProductsProvider extends ChangeNotifier {
  final ApiService _apiService;
  final DatabaseService? _databaseService;
  
  List<Product> _products = [];
  List<Product> _filteredProducts = [];
  bool _isLoading = false;
  String? _error;
  String _searchQuery = '';

  ProductsProvider(this._apiService, this._databaseService);

  List<Product> get products => _filteredProducts;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadProducts({String? storeId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Try to load from API first
      try {
        final apiProducts = await _apiService.getProducts(storeId: storeId);
        _products = apiProducts;
        await _databaseService?.insertProducts(apiProducts);
      } catch (e) {
        // If API fails, load from local database
        if (_databaseService != null) {
          _products = await _databaseService!.getProducts();
        }
      }

      _applyFilter();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void searchProducts(String query) {
    _searchQuery = query;
    _applyFilter();
  }

  void _applyFilter() {
    if (_searchQuery.isEmpty) {
      _filteredProducts = _products;
    } else {
      _filteredProducts = _products.where((product) {
        return product.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               product.sku.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               (product.barcode?.contains(_searchQuery) ?? false);
      }).toList();
    }
    notifyListeners();
  }

  Future<Product?> getProductByBarcode(String barcode) async {
    try {
      // Try API first
      try {
        return await _apiService.getProductByBarcode(barcode);
      } catch (e) {
        // Fallback to local database
        if (_databaseService != null) {
          return await _databaseService!.getProductByBarcode(barcode);
        }
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}