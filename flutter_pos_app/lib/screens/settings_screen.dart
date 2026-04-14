import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/receipt_printer_service.dart';
import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import '../providers/store_selection_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _urlController;
  late TextEditingController _printerIpController;
  late TextEditingController _printerPortController;
  final ReceiptPrinterService _receiptPrinterService = ReceiptPrinterService();
  bool _isLoading = false;
  bool _isSaved = false;
  String? _errorMessage;
  ApiService? _apiService;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController();
    _printerIpController = TextEditingController();
    _printerPortController = TextEditingController(text: '9100');
    _loadCurrentUrl();
    _loadPrinterSettings();
  }

  Future<void> _loadPrinterSettings() async {
    final ip = await _receiptPrinterService.getPrinterIp() ?? '';
    final port = await _receiptPrinterService.getPrinterPort();
    if (mounted) {
      setState(() {
        _printerIpController.text = ip;
        _printerPortController.text = port.toString();
      });
    }
  }

  Future<void> _savePrinterSettings() async {
    final ip = _printerIpController.text.trim();
    final port = int.tryParse(_printerPortController.text.trim()) ?? 9100;
    await _receiptPrinterService.savePrinterAddress(
      ip.isEmpty ? null : ip,
      port,
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            ip.isEmpty
                ? 'Receipt printer cleared (no auto-print)'
                : 'Receipt printer saved: $ip:$port',
          ),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<void> _loadCurrentUrl() async {
    setState(() {
      _isLoading = true;
    });

    try {
      _apiService = ApiService();
      final currentUrl = _apiService!.getCurrentBaseUrl();
      final savedUrl = await _apiService!.getSavedBaseUrl();
      
      // Use saved URL if available, otherwise use current
      _urlController.text = savedUrl ?? currentUrl;
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load current URL: $e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveUrl() async {
    final url = _urlController.text.trim();
    
    // Basic URL validation
    if (url.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter a valid URL';
        _isSaved = false;
      });
      return;
    }

    // Add /api if not present (assumes API is at /api path)
    String finalUrl = url;
    if (!finalUrl.contains('/api')) {
      // Check if it ends with a slash
      if (finalUrl.endsWith('/')) {
        finalUrl = '${finalUrl}api';
      } else {
        finalUrl = '$finalUrl/api';
      }
    }

    // Basic protocol check
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      setState(() {
        _errorMessage = 'URL must start with http:// or https://';
        _isSaved = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _isSaved = false;
    });

    try {
      _apiService ??= ApiService();
      await _apiService!.setBaseUrl(finalUrl);
      
      if (mounted) {
        setState(() {
          _isSaved = true;
          _errorMessage = null;
        });
        
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Server URL updated successfully'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
        
        // Reset saved indicator after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            setState(() {
              _isSaved = false;
            });
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to save URL: $e';
          _isSaved = false;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _resetToDefault() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      _apiService ??= ApiService();
      await _apiService!.resetToDefaultUrl();
      await _loadCurrentUrl();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Reset to default server URL'),
            backgroundColor: Colors.blue,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to reset URL: $e';
        });
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
    _urlController.dispose();
    _printerIpController.dispose();
    _printerPortController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          if (_isSaved)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Icon(Icons.check_circle, color: Colors.green),
            ),
        ],
      ),
      body: _isLoading && _urlController.text.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Server Configuration',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Configure the backend server URL for API calls. The app will use this URL to connect to the POS system.',
                    style: TextStyle(
                      color: Colors.grey,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Current URL Display
                  Consumer<ApiService>(
                    builder: (context, apiService, _) {
                      final currentUrl = apiService.getCurrentBaseUrl();
                      return Card(
                        color: Colors.blue.shade50,
                        child: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Current Server URL:',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.blueGrey,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                currentUrl,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                  
                  // URL Input Field
                  TextField(
                    controller: _urlController,
                    decoration: InputDecoration(
                      labelText: 'Server URL',
                      hintText: 'https://your-server.com',
                      helperText: 'Enter the base URL (e.g., https://your-server.com)',
                      prefixIcon: const Icon(Icons.link),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      errorText: _errorMessage,
                    ),
                    keyboardType: TextInputType.url,
                    enabled: !_isLoading,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Note: The app will automatically append "/api" if not included.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Save Button
                  ElevatedButton.icon(
                    onPressed: _isLoading ? null : _saveUrl,
                    icon: _isLoading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.save),
                    label: Text(_isLoading ? 'Saving...' : 'Save Server URL'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  
                  // Reset Button
                  OutlinedButton.icon(
                    onPressed: _isLoading ? null : _resetToDefault,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Reset to Default'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Default URL Info
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.info_outline, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Default Server',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            ApiService.defaultBaseUrl,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade700,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const Divider(height: 32),
                  const Text(
                    'Receipt printer (Wi‑Fi)',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Enter your ESC/POS printer IP (same Wi‑Fi as the device). Port is usually 9100. Leave IP empty to skip printing.',
                    style: TextStyle(color: Colors.grey, fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _printerIpController,
                    decoration: InputDecoration(
                      labelText: 'Printer IP address',
                      hintText: 'e.g. 192.168.1.100',
                      prefixIcon: const Icon(Icons.print),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    keyboardType: TextInputType.url,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _printerPortController,
                    decoration: InputDecoration(
                      labelText: 'Port',
                      hintText: '9100',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: _savePrinterSettings,
                    icon: const Icon(Icons.save),
                    label: const Text('Save printer'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),

                  const Divider(height: 32),
                  const Text(
                    'Store Selection',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Consumer<StoreSelectionProvider>(
                    builder: (context, storeProvider, _) {
                      if (storeProvider.isLoading) {
                        return const Card(
                          child: Padding(
                            padding: EdgeInsets.all(16.0),
                            child: Center(child: CircularProgressIndicator()),
                          ),
                        );
                      }

                      if (storeProvider.stores.isEmpty) {
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              children: [
                                const Icon(Icons.store_outlined, size: 48, color: Colors.grey),
                                const SizedBox(height: 8),
                                const Text('No stores available'),
                                const SizedBox(height: 8),
                                ElevatedButton.icon(
                                  onPressed: () => storeProvider.loadStores(),
                                  icon: const Icon(Icons.refresh),
                                  label: const Text('Load Stores'),
                                ),
                              ],
                            ),
                          ),
                        );
                      }

                      return Card(
                        child: Column(
                          children: [
                            ListTile(
                              leading: const Icon(Icons.store),
                              title: const Text('Current Store'),
                              subtitle: Text(
                                storeProvider.selectedStoreName ?? 'No store selected',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              trailing: IconButton(
                                icon: const Icon(Icons.arrow_drop_down),
                                onPressed: () => _showStoreSelector(context, storeProvider),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),

                  // User Info Section
                  const Divider(height: 32),
                  const Text(
                    'User Information',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Consumer<AuthProvider>(
                    builder: (context, authProvider, _) {
                      final user = authProvider.user;
                      return Card(
                        child: ListTile(
                          leading: const CircleAvatar(
                            child: Icon(Icons.person),
                          ),
                          title: Text(user?.fullName ?? 'Unknown User'),
                          subtitle: Text(user?.email ?? ''),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  
                  // Sync Status
                  Consumer<SyncProvider>(
                    builder: (context, syncProvider, _) {
                      return Card(
                        child: ListTile(
                          leading: Icon(
                            syncProvider.isConnected ? Icons.cloud_done : Icons.cloud_off,
                            color: syncProvider.isConnected ? Colors.green : Colors.red,
                          ),
                          title: const Text('Sync Status'),
                          subtitle: Text(
                            syncProvider.isConnected 
                                ? 'Connected - ${syncProvider.pendingCount} pending'
                                : 'Offline - ${syncProvider.pendingCount} pending',
                          ),
                          trailing: syncProvider.isSyncing
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : IconButton(
                                  icon: const Icon(Icons.sync),
                                  onPressed: () => syncProvider.syncNow(),
                                ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                  
                  // Logout Button
                  Consumer<AuthProvider>(
                    builder: (context, authProvider, _) {
                      return OutlinedButton.icon(
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Logout'),
                              content: const Text('Are you sure you want to logout?'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.of(context).pop(),
                                  child: const Text('Cancel'),
                                ),
                                TextButton(
                                  onPressed: () {
                                    Navigator.of(context).pop();
                                    authProvider.logout();
                                    Navigator.of(context).pushReplacementNamed('/login');
                                  },
                                  style: TextButton.styleFrom(
                                    foregroundColor: Colors.red,
                                  ),
                                  child: const Text('Logout'),
                                ),
                              ],
                            ),
                          );
                        },
                        icon: const Icon(Icons.logout, color: Colors.red),
                        label: const Text(
                          'Logout',
                          style: TextStyle(color: Colors.red),
                        ),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          side: const BorderSide(color: Colors.red),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
    );
  }

  void _showStoreSelector(BuildContext context, StoreSelectionProvider storeProvider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Select Store',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (storeProvider.isLoading)
                const Center(child: CircularProgressIndicator())
              else if (storeProvider.stores.isEmpty)
                Center(
                  child: Column(
                    children: [
                      const Icon(Icons.store_outlined, size: 48, color: Colors.grey),
                      const SizedBox(height: 16),
                      const Text('No stores available'),
                      const SizedBox(height: 8),
                      ElevatedButton.icon(
                        onPressed: () {
                          storeProvider.loadStores();
                        },
                        icon: const Icon(Icons.refresh),
                        label: const Text('Load Stores'),
                      ),
                    ],
                  ),
                )
              else
                Expanded(
                  child: ListView.builder(
                    controller: scrollController,
                    itemCount: storeProvider.stores.length,
                    itemBuilder: (context, index) {
                      final store = storeProvider.stores[index];
                      final isSelected = storeProvider.selectedStore?['id'] == store['id'];
                      return ListTile(
                        leading: Icon(
                          isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                          color: isSelected ? Colors.green : Colors.grey,
                        ),
                        title: Text(store['name'] ?? 'Unknown'),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Code: ${store['code'] ?? 'N/A'}'),
                            if (store['address'] != null && store['address']['city'] != null)
                              Text('📍 ${store['address']['city']}'),
                            if (store['is_active'] != null)
                              Chip(
                                label: Text(
                                  store['is_active'] == true ? 'Active' : 'Inactive',
                                  style: const TextStyle(fontSize: 10),
                                ),
                                backgroundColor: store['is_active'] == true
                                    ? Colors.green.shade50
                                    : Colors.grey.shade200,
                              ),
                          ],
                        ),
                        onTap: () {
                          storeProvider.setSelectedStore(store);
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Store selected: ${store['name']}'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
