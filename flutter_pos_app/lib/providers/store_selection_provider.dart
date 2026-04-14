import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class StoreSelectionProvider extends ChangeNotifier {
  final ApiService _apiService;
  
  List<Map<String, dynamic>> _stores = [];
  Map<String, dynamic>? _selectedStore;
  bool _isLoading = false;
  String? _error;

  StoreSelectionProvider(this._apiService);

  List<Map<String, dynamic>> get stores => _stores;
  Map<String, dynamic>? get selectedStore => _selectedStore;
  bool get isLoading => _isLoading;
  String? get error => _error;

  static const String _selectedStoreIdKey = 'selected_store_id';

  Future<void> loadStores() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final stores = await _apiService.getStores();
      _stores = stores;
      
      if (kDebugMode) {
        print('Loaded ${stores.length} stores from API');
      }
      
      // Try to restore selected store from preferences
      if (_selectedStore == null) {
        await _loadSelectedStoreFromPreferences();
      }
      
      // If no store selected and stores available, select first one
      if (_selectedStore == null && _stores.isNotEmpty) {
        await setSelectedStore(_stores.first);
        if (kDebugMode) {
          print('Auto-selected first store: ${_stores.first['name']}');
        }
      }
    } catch (e) {
      _error = e.toString();
      if (kDebugMode) {
        print('Error loading stores: $e');
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> setSelectedStore(Map<String, dynamic>? store) async {
    _selectedStore = store;
    
    // Save to preferences
    if (store != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_selectedStoreIdKey, store['id'] ?? '');
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_selectedStoreIdKey);
    }
    
    notifyListeners();
  }

  Future<void> _loadSelectedStoreFromPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final storeId = prefs.getString(_selectedStoreIdKey);
      
      if (storeId != null && _stores.isNotEmpty) {
        final store = _stores.firstWhere(
          (s) => s['id'] == storeId,
          orElse: () => _stores.first,
        );
        _selectedStore = store;
      }
    } catch (e) {
      // Ignore errors loading from preferences
    }
  }

  String? get selectedStoreId => _selectedStore?['id'];
  String? get selectedStoreName => _selectedStore?['name'];
  
  // Helper method to check if stores are loaded
  bool get hasStores => _stores.isNotEmpty;
  bool get hasSelectedStore => _selectedStore != null;
}
