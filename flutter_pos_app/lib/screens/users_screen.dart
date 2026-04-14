import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../widgets/offline_cached_notice.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  List<Map<String, dynamic>> _users = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() => _isLoading = true);
    try {
      final apiService = context.read<ApiService>();
      final users = await apiService.getUsers();
      setState(() {
        _users = users;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load users: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final canEdit = authProvider.user?.isStoreAdmin == true || 
                    authProvider.user?.isOrgAdmin == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Users'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadUsers,
            tooltip: 'Refresh',
          ),
          if (canEdit)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _showUserDialog(context, null),
              tooltip: 'Add User',
            ),
        ],
      ),
      body: Column(
        children: [
          const OfflineCachedNotice(),
          Expanded(
            child: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _users.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.people_outline, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text(
                        'No users found',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadUsers,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _users.length,
                    itemBuilder: (context, index) {
                      final user = _users[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.green.shade600,
                            child: Text(
                              '${user['first_name']?[0] ?? ''}${user['last_name']?[0] ?? ''}',
                              style: const TextStyle(color: Colors.white),
                            ),
                          ),
                          title: Text(
                            '${user['first_name'] ?? ''} ${user['last_name'] ?? ''}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(user['email'] ?? ''),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Chip(
                                    label: Text(_getRoleLabel(user['role'])),
                                    backgroundColor: _getRoleColor(user['role']).withOpacity(0.1),
                                    labelStyle: TextStyle(
                                      color: _getRoleColor(user['role']),
                                      fontSize: 11,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Chip(
                                    label: Text(user['is_active'] == true ? 'Active' : 'Inactive'),
                                    backgroundColor: user['is_active'] == true
                                        ? Colors.green.shade50
                                        : Colors.grey.shade200,
                                    labelStyle: TextStyle(
                                      color: user['is_active'] == true ? Colors.green : Colors.grey,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          trailing: canEdit && user['id'] != authProvider.user?.id
                              ? PopupMenuButton(
                                  itemBuilder: (context) => [
                                    const PopupMenuItem(
                                      value: 'edit',
                                      child: Row(
                                        children: [
                                          Icon(Icons.edit, size: 20),
                                          SizedBox(width: 8),
                                          Text('Edit'),
                                        ],
                                      ),
                                    ),
                                  ],
                                  onSelected: (value) {
                                    if (value == 'edit') {
                                      _showUserDialog(context, user);
                                    }
                                  },
                                )
                              : null,
                        ),
                      );
                    },
                  ),
                ),
          ),
        ],
      ),
    );
  }

  String _getRoleLabel(String? role) {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'org_admin':
        return 'Org Admin';
      case 'store_admin':
        return 'Store Admin';
      case 'cashier':
        return 'Cashier';
      default:
        return role ?? 'Unknown';
    }
  }

  Color _getRoleColor(String? role) {
    switch (role) {
      case 'super_admin':
        return Colors.purple;
      case 'org_admin':
        return Colors.blue;
      case 'store_admin':
        return Colors.green;
      case 'cashier':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  void _showUserDialog(BuildContext context, Map<String, dynamic>? user) {
    // TODO: Implement user create/edit dialog
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('User dialog coming soon')),
    );
  }
}
