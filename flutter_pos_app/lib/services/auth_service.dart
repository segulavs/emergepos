import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService;

  AuthService(this._apiService);

  Future<User> login(String email, String password) async {
    try {
      final response = await _apiService.login(email, password);
      
      if (response['user'] == null) {
        throw Exception('No user data in login response');
      }
      
      // Convert snake_case from backend to camelCase for Flutter model
      final userData = Map<String, dynamic>.from(response['user']);
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
      
      try {
        final user = User.fromJson(convertedUserData);
        return user;
      } catch (e) {
        throw Exception('Failed to parse user data: $e. User data: $convertedUserData');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    await _apiService.logout();
  }

  Future<User?> getCurrentUser() async {
    final token = await _apiService.getStoredToken();
    if (token == null) return null;

    try {
      return await _apiService.getCurrentUser();
    } catch (e) {
      await _apiService.clearToken();
      return null;
    }
  }
}