import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService;

  AuthService(this._apiService);

  Future<User> login(String email, String password) async {
    final response = await _apiService.login(email, password);
    return User.fromJson(response['user']);
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