import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import '../providers/store_selection_provider.dart';
import '../screens/pos_screen.dart';
import '../screens/products_screen.dart';
import '../screens/transactions_screen.dart';
import '../screens/analytics_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/inventory_screen.dart';
import '../screens/stores_screen.dart';
import '../screens/users_screen.dart';
import '../screens/warehouses_screen.dart';
import '../screens/transfers_screen.dart';
import '../screens/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  SyncProvider? _syncProvider;
  bool? _lastConnected;
  
  // Main navigation items (shown in bottom nav/rail)
  List<Widget> get _mainScreens => [
    const POSScreen(),
    const ProductsScreen(),
    const TransactionsScreen(),
    const DashboardScreen(),
    const SettingsScreen(),
  ];

  // All available screens for drawer navigation
  final List<NavItem> _allScreens = [];

  @override
  void initState() {
    super.initState();
    // Start sync when app opens and load stores
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SyncProvider>().startSync();
      // Load stores for selection
      context.read<StoreSelectionProvider>().loadStores();
      _syncProvider = context.read<SyncProvider>();
      _lastConnected = _syncProvider!.isConnected;
      _syncProvider!.addListener(_handleSyncStatusChanged);
    });
  }

  void _handleSyncStatusChanged() {
    final provider = _syncProvider;
    if (!mounted || provider == null) return;

    final currentConnected = provider.isConnected;
    if (_lastConnected == currentConnected) return;
    _lastConnected = currentConnected;

    final message = currentConnected
        ? 'Back online: refreshing from server'
        : 'Offline mode: showing cached data';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 3),
        backgroundColor: currentConnected ? Colors.green : Colors.orange,
      ),
    );
  }

  List<NavItem> _getAllNavItems(AuthProvider authProvider) {
    final user = authProvider.user;
    final items = <NavItem>[
      NavItem(title: 'POS', icon: Icons.point_of_sale, screen: const POSScreen()),
      NavItem(title: 'Dashboard', icon: Icons.dashboard, screen: const DashboardScreen(), roles: ['super_admin', 'org_admin', 'store_admin']),
      NavItem(title: 'Products', icon: Icons.inventory, screen: const ProductsScreen()),
      NavItem(title: 'Inventory', icon: Icons.inventory_2, screen: const InventoryScreen(), roles: ['super_admin', 'org_admin', 'store_admin']),
      NavItem(title: 'Transactions', icon: Icons.receipt_long, screen: const TransactionsScreen()),
      NavItem(title: 'Transfers', icon: Icons.swap_horiz, screen: const TransfersScreen(), roles: ['super_admin', 'org_admin', 'store_admin']),
      NavItem(title: 'Warehouses', icon: Icons.warehouse, screen: const WarehousesScreen(), roles: ['super_admin', 'org_admin']),
      NavItem(title: 'Stores', icon: Icons.store, screen: const StoresScreen(), roles: ['super_admin', 'org_admin']),
      NavItem(title: 'Users', icon: Icons.people, screen: const UsersScreen(), roles: ['super_admin', 'org_admin', 'store_admin']),
      NavItem(title: 'Analytics', icon: Icons.analytics, screen: const AnalyticsScreen(), roles: ['super_admin', 'org_admin']),
      NavItem(title: 'Settings', icon: Icons.settings, screen: const SettingsScreen()),
    ];

    // Filter by role
    return items.where((item) {
      if (item.roles == null || item.roles!.isEmpty) return true;
      return item.roles!.contains(user?.role);
    }).toList();
  }

  @override
  void dispose() {
    _syncProvider?.removeListener(_handleSyncStatusChanged);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isTablet = MediaQuery.of(context).size.width >= 600;
    final authProvider = context.watch<AuthProvider>();
    final allNavItems = _getAllNavItems(authProvider);
    
    // Find current screen index in main screens
    Widget currentScreen = _mainScreens[_selectedIndex];
    
    final navItems = [
      const NavigationDestination(icon: Icon(Icons.point_of_sale), label: 'POS'),
      const NavigationDestination(icon: Icon(Icons.inventory), label: 'Products'),
      const NavigationDestination(icon: Icon(Icons.receipt_long), label: 'Transactions'),
      if (user?.isStoreAdmin == true || user?.isOrgAdmin == true)
        const NavigationDestination(icon: Icon(Icons.dashboard), label: 'Dashboard'),
      const NavigationDestination(icon: Icon(Icons.settings), label: 'Settings'),
    ];

    final railDestinations = [
      const NavigationRailDestination(icon: Icon(Icons.point_of_sale), label: Text('POS')),
      const NavigationRailDestination(icon: Icon(Icons.inventory), label: Text('Products')),
      const NavigationRailDestination(icon: Icon(Icons.receipt_long), label: Text('Transactions')),
      if (user?.isStoreAdmin == true || user?.isOrgAdmin == true)
        const NavigationRailDestination(icon: Icon(Icons.dashboard), label: Text('Dashboard')),
      const NavigationRailDestination(icon: Icon(Icons.settings), label: Text('Settings')),
    ];

    return Scaffold(
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(
                color: Colors.green.shade600,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.store, size: 48, color: Colors.white),
                  const SizedBox(height: 8),
                  Text(
                    'POS Mobile',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (user != null)
                    Text(
                      '${user.firstName} ${user.lastName}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white70,
                      ),
                    ),
                  const SizedBox(height: 8),
                  Consumer<StoreSelectionProvider>(
                    builder: (context, storeProvider, _) {
                      if (storeProvider.selectedStoreName != null) {
                        return Row(
                          children: [
                            const Icon(Icons.store, size: 16, color: Colors.white70),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                storeProvider.selectedStoreName!,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.white70,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        );
                      }
                      return TextButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          // Navigate to settings to select store
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const SettingsScreen(),
                            ),
                          );
                        },
                        icon: const Icon(Icons.store, size: 16, color: Colors.white70),
                        label: const Text(
                          'Select Store',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            ...allNavItems.map((item) {
              // Check if this is a main screen
              final isMainScreen = _mainScreens.any((screen) => screen.runtimeType == item.screen.runtimeType);
              final mainIndex = isMainScreen 
                  ? _mainScreens.indexWhere((screen) => screen.runtimeType == item.screen.runtimeType)
                  : -1;
              
              return ListTile(
                leading: Icon(item.icon),
                title: Text(item.title),
                selected: isMainScreen && _selectedIndex == mainIndex,
                onTap: () {
                  Navigator.pop(context);
                  if (isMainScreen && mainIndex >= 0) {
                    // Update main navigation
                    setState(() {
                      _selectedIndex = mainIndex;
                    });
                  } else {
                    // Navigate to screen not in main nav
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => item.screen),
                    );
                  }
                },
              );
            }),
          ],
        ),
      ),
      body: Row(
        children: [
          if (isTablet)
            NavigationRail(
              selectedIndex: _selectedIndex,
              onDestinationSelected: (index) {
                setState(() {
                  _selectedIndex = index;
                });
              },
              labelType: NavigationRailLabelType.all,
              leading: Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Image.asset(
                  'assets/images/logo.png',
                  width: 40,
                  errorBuilder: (context, error, stackTrace) => const Icon(Icons.store, size: 40),
                ),
              ),
              destinations: railDestinations,
            ),
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: _mainScreens,
            ),
          ),
        ],
      ),
      bottomNavigationBar: isTablet ? null : NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: navItems,
      ),
      floatingActionButton: Consumer<SyncProvider>(
        builder: (context, syncProvider, child) {
          if (!syncProvider.hasPendingData) {
            return const SizedBox.shrink();
          }

          return FloatingActionButton.small(
            onPressed: syncProvider.isSyncing ? null : () {
              syncProvider.syncNow();
            },
            backgroundColor: syncProvider.isConnected ? Colors.blue : Colors.orange,
            child: syncProvider.isSyncing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Icon(
                    syncProvider.isConnected ? Icons.sync : Icons.sync_disabled,
                    color: Colors.white,
                  ),
          );
        },
      ),
    );
  }
}

class NavItem {
  final String title;
  final IconData icon;
  final Widget screen;
  final List<String>? roles;

  NavItem({
    required this.title,
    required this.icon,
    required this.screen,
    this.roles,
  });
}
