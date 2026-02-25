import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import '../services/api_service.dart';
import '../services/receipt_printer_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final TextEditingController _serverUrlController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _serverUrlController.text = ApiService.baseUrl;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          final user = authProvider.user;

          return ListView(
            children: [
              ListTile(
                leading: const CircleAvatar(
                  child: Icon(Icons.person),
                ),
                title: Text(user?.fullName ?? 'Unknown User'),
                subtitle: Text(user?.email ?? ''),
              ),

              const Divider(),

              Consumer<SyncProvider>(
                builder: (context, syncProvider, child) {
                  return ListTile(
                    leading: Icon(
                      syncProvider.isConnected
                          ? Icons.cloud_done
                          : Icons.cloud_off,
                      color:
                          syncProvider.isConnected ? Colors.green : Colors.red,
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
                  );
                },
              ),

              const Divider(),

              ListTile(
                leading: const Icon(Icons.dns),
                title: const Text('Server URL'),
                subtitle: Text(_serverUrlController.text),
                onTap: _showServerUrlDialog,
              ),

              const Divider(),

              ListTile(
                leading: const Icon(Icons.print),
                title: const Text('Receipt Printer'),
                subtitle: Text(ReceiptPrinterService.instance.isConfigured
                    ? 'Configured'
                    : 'Not configured'),
                onTap: _showPrinterDialog,
              ),

              const Divider(),

              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Logout'),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Logout'),
                      content:
                          const Text('Are you sure you want to logout?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.of(context).pop();
                            authProvider.logout();
                            Navigator.of(context)
                                .pushReplacementNamed('/login');
                          },
                          child: const Text('Logout'),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }

  void _showServerUrlDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Server URL'),
        content: TextField(
          controller: _serverUrlController,
          decoration: const InputDecoration(
            labelText: 'API Base URL',
            hintText: 'http://192.168.1.100:8000/api',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              final apiService = context.read<ApiService>();
              await apiService.setBaseUrl(_serverUrlController.text.trim());
              if (mounted) {
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Server URL updated')),
                );
                setState(() {});
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showPrinterDialog() {
    final ipController = TextEditingController();
    final portController = TextEditingController(text: '9100');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Receipt Printer'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: ipController,
              decoration: const InputDecoration(
                labelText: 'Printer IP Address',
                hintText: '192.168.1.100',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: portController,
              decoration: const InputDecoration(
                labelText: 'Port',
                hintText: '9100',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final ip = ipController.text.trim();
              final port = int.tryParse(portController.text.trim()) ?? 9100;
              if (ip.isNotEmpty) {
                ReceiptPrinterService.instance.configure(ip: ip, port: port);
                Navigator.of(context).pop();
                setState(() {});
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Printer configured')),
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    super.dispose();
  }
}
