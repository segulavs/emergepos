import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'services/database_service.dart';
import 'services/api_service.dart';
import 'services/sync_service.dart';
import 'services/auth_service.dart';
import 'providers/auth_provider.dart';
import 'providers/products_provider.dart';
import 'providers/transactions_provider.dart';
import 'providers/sync_provider.dart';
import 'providers/store_selection_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'utils/app_theme.dart';

import 'package:flutter/foundation.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Hive for offline storage
  await Hive.initFlutter();
  
  // Initialize services (skip database on web)
  if (!kIsWeb) {
    await DatabaseService.instance.initialize();
  }
  
  runApp(const POSApp());
}

class POSApp extends StatelessWidget {
  const POSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Services
        Provider<DatabaseService?>(
          create: (_) => kIsWeb ? null : DatabaseService.instance,
        ),
        Provider<ApiService>(
          create: (_) => ApiService(),
        ),
        Provider<AuthService>(
          create: (context) => AuthService(context.read<ApiService>()),
        ),
        Provider<SyncService>(
          create: (context) => SyncService(
            context.read<ApiService>(),
            context.read<DatabaseService?>(),
          ),
        ),
        
        // State Providers
        ChangeNotifierProvider<AuthProvider>(
          create: (context) => AuthProvider(context.read<AuthService>()),
        ),
        ChangeNotifierProvider<ProductsProvider>(
          create: (context) => ProductsProvider(
            context.read<ApiService>(),
            context.read<DatabaseService?>(),
          ),
        ),
        ChangeNotifierProvider<TransactionsProvider>(
          create: (context) => TransactionsProvider(
            context.read<ApiService>(),
            context.read<DatabaseService?>(),
          ),
        ),
        ChangeNotifierProvider<SyncProvider>(
          create: (context) => SyncProvider(context.read<SyncService>()),
        ),
        ChangeNotifierProvider<StoreSelectionProvider>(
          create: (context) => StoreSelectionProvider(context.read<ApiService>()),
        ),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return MaterialApp(
            title: 'POS Mobile',
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: ThemeMode.system,
            debugShowCheckedModeBanner: false,
            home: _buildHome(authProvider),
            routes: {
              '/login': (context) => const LoginScreen(),
              '/home': (context) => const HomeScreen(),
            },
          );
        },
      ),
    );
  }

  Widget _buildHome(AuthProvider authProvider) {
    if (authProvider.isLoading) {
      return const SplashScreen();
    }
    
    if (authProvider.isAuthenticated) {
      return const HomeScreen();
    }
    
    return const LoginScreen();
  }
}