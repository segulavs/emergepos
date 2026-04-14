import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _serverUrlController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _showServerConfig = false;

  @override
  void initState() {
    super.initState();
    _loadServerUrl();
  }

  Future<void> _loadServerUrl() async {
    try {
      final apiService = ApiService();
      final savedUrl = await apiService.getSavedBaseUrl();
      final currentUrl = apiService.getCurrentBaseUrl();
      _serverUrlController.text = savedUrl ?? currentUrl;
    } catch (e) {
      // Ignore errors, use default
      _serverUrlController.text = ApiService.defaultBaseUrl;
    }
  }

  Future<void> _saveServerUrl() async {
    String url = _serverUrlController.text.trim();
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a server URL'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    try {
      // Add /api if not present
      if (!url.contains('/api')) {
        if (url.endsWith('/')) {
          url = '${url}api';
        } else {
          url = '$url/api';
        }
      }
      // Remove trailing slash
      if (url.endsWith('/')) {
        url = url.substring(0, url.length - 1);
      }

      final apiService = ApiService();
      await apiService.setBaseUrl(url);
      
      if (mounted) {
        setState(() {
          _showServerConfig = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Server URL saved successfully'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save server URL: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Logo and Title
                    const Icon(
                      Icons.store,
                      size: 80,
                      color: Colors.blue,
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'POS Mobile',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Sign in to continue',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.grey,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 48),

                    // Email Field
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your email';
                        }
                        if (!value.contains('@')) {
                          return 'Please enter a valid email';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Password Field
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword ? Icons.visibility : Icons.visibility_off,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscurePassword = !_obscurePassword;
                            });
                          },
                        ),
                        border: const OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your password';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),

                    // Login Button
                    ElevatedButton(
                      onPressed: _isLoading ? null : _login,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text(
                              'Sign In',
                              style: TextStyle(fontSize: 16),
                            ),
                    ),
                    const SizedBox(height: 16),

                    // Server Configuration Button
                    TextButton.icon(
                      onPressed: () {
                        setState(() {
                          _showServerConfig = !_showServerConfig;
                        });
                      },
                      icon: Icon(_showServerConfig ? Icons.arrow_drop_up : Icons.arrow_drop_down),
                      label: const Text('Server Configuration'),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.grey,
                      ),
                    ),

                    // Server URL Configuration
                    if (_showServerConfig)
                      Card(
                        color: Colors.blue.shade50,
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Server URL',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextField(
                                controller: _serverUrlController,
                                decoration: const InputDecoration(
                                  hintText: 'https://your-server.com/api',
                                  border: OutlineInputBorder(),
                                  isDense: true,
                                  contentPadding: EdgeInsets.all(12),
                                ),
                                keyboardType: TextInputType.url,
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Default: https://disciplined-recreation-production.up.railway.app/api',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  TextButton(
                                    onPressed: () {
                                      _serverUrlController.text = ApiService.defaultBaseUrl;
                                    },
                                    child: const Text('Use Default'),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    onPressed: _saveServerUrl,
                                    child: const Text('Save'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),

                    const SizedBox(height: 24),

                    // Demo Credentials
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Demo Credentials:',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _buildDemoCredential(
                              'Cashier',
                              'cashier@posystem.com',
                              'Cashier123!',
                            ),
                            _buildDemoCredential(
                              'Store Admin',
                              'storeadmin@posystem.com',
                              'StoreAdmin123!',
                            ),
                            _buildDemoCredential(
                              'Org Admin',
                              'orgadmin@posystem.com',
                              'OrgAdmin123!',
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDemoCredential(String role, String email, String password) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        onTap: () {
          _emailController.text = email;
          _passwordController.text = password;
        },
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    role,
                    style: const TextStyle(
                      fontWeight: FontWeight.w500,
                      fontSize: 12,
                    ),
                  ),
                  Text(
                    email,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.touch_app,
              size: 16,
              color: Colors.grey,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      await context.read<AuthProvider>().login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    } catch (e, stackTrace) {
      if (mounted) {
        // Print detailed error for debugging
        debugPrint('Login error: $e');
        debugPrint('Stack trace: $stackTrace');
        
        // Show user-friendly error message
        String errorMessage = 'Login failed';
        if (e.toString().contains('connection') || e.toString().contains('timeout')) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (e.toString().contains('401') || e.toString().contains('Invalid credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (e.toString().contains('parse') || e.toString().contains('No user data')) {
          errorMessage = 'Invalid response from server. Please check server configuration.';
        } else {
          errorMessage = e.toString().replaceAll('Exception: ', '');
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }
}