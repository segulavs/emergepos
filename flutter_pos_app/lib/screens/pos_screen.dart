import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../models/product.dart';
import '../models/transaction.dart';
import '../providers/products_provider.dart';
import '../providers/transactions_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/store_selection_provider.dart';
import '../widgets/product_search_delegate.dart';
import 'settings_screen.dart';
import '../widgets/cart_item_widget.dart';
import '../widgets/payment_dialog.dart';
import '../utils/currency_formatter.dart';
import '../services/receipt_printer_service.dart';
import '../widgets/offline_cached_notice.dart';

class POSScreen extends StatefulWidget {
  const POSScreen({super.key});

  @override
  State<POSScreen> createState() => _POSScreenState();
}

class _POSScreenState extends State<POSScreen> {
  final List<CartItem> _cartItems = [];
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _customerNameController = TextEditingController();
  final TextEditingController _customerPhoneController = TextEditingController();
  
  double _discountAmount = 0;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductsProvider>().loadProducts();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.width >= 600;
    final storeProvider = context.watch<StoreSelectionProvider>();
    final hasSelectedStore = storeProvider.selectedStore != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Point of Sale'),
        actions: [
          if (hasSelectedStore)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: Center(
                child: Chip(
                  avatar: const Icon(Icons.store, size: 18),
                  label: Text(
                    storeProvider.selectedStoreName ?? '',
                    style: const TextStyle(fontSize: 12),
                  ),
                  backgroundColor: Colors.green.shade100,
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: _showBarcodeScanner,
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: _showProductSearch,
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineCachedNotice(),
          Expanded(
            child: !hasSelectedStore
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.store_outlined, size: 64, color: Colors.orange),
                  const SizedBox(height: 16),
                  const Text(
                    'No Store Selected',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Please select a store in Settings to use POS',
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SettingsScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.settings),
                    label: const Text('Go to Settings'),
                  ),
                ],
              ),
            )
          : Row(
        children: [
          // Products Panel
          Expanded(
            flex: isTablet ? 3 : 2,
            child: _buildProductsPanel(isTablet),
          ),
          
          // Cart Panel
          Expanded(
            flex: isTablet ? 2 : 1,
            child: _buildCartPanel(isTablet),
          ),
        ],
      ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductsPanel(bool isTablet) {
    return Column(
      children: [
        // Search Bar
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: TextField(
            controller: _searchController,
            decoration: const InputDecoration(
              hintText: 'Search products...',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
              filled: true,
              fillColor: Colors.white,
            ),
            onChanged: (value) {
              context.read<ProductsProvider>().searchProducts(value);
            },
          ),
        ),
        
        // Products Grid/List
        Expanded(
          child: Consumer<ProductsProvider>(
            builder: (context, provider, child) {
              if (provider.isLoading) {
                return const Center(child: CircularProgressIndicator());
              }

              if (provider.products.isEmpty) {
                return const Center(
                  child: Text('No products found'),
                );
              }

              if (isTablet) {
                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 200,
                    childAspectRatio: 0.8,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: provider.products.length,
                  itemBuilder: (context, index) {
                    final product = provider.products[index];
                    return _buildProductGridItem(product);
                  },
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: provider.products.length,
                itemBuilder: (context, index) {
                  final product = provider.products[index];
                  return _buildProductListItem(product);
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildProductGridItem(Product product) {
    final cartItem = _cartItems.where((item) => item.product.id == product.id).toList();
    final inCart = cartItem.isNotEmpty ? cartItem.first.quantity.toInt() : 0;

    return Card(
      elevation: inCart > 0 ? 4 : 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: inCart > 0 ? Colors.blue : Colors.transparent,
          width: 2,
        ),
      ),
      child: InkWell(
        onTap: () => _addToCart(product),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Image
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: product.imageBase64 != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.memory(
                            Uri.parse(product.imageBase64!).data!.contentAsBytes(),
                            fit: BoxFit.cover,
                          ),
                        )
                      : Icon(Icons.image, size: 40, color: Colors.grey[400]),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                product.name,
                style: const TextStyle(fontWeight: FontWeight.bold),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    CurrencyFormatter.format(product.sellingPrice),
                    style: TextStyle(
                      color: Colors.blue[700],
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (inCart > 0)
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.blue,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '$inCart',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProductListItem(Product product) {
    // Check if product is in cart
    final cartItem = _cartItems.where((item) => item.product.id == product.id).toList();
    final inCart = cartItem.isNotEmpty ? cartItem.first.quantity.toInt() : 0;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: inCart > 0 ? 3 : 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: inCart > 0 ? Colors.blue : Colors.transparent,
          width: 2,
        ),
      ),
      child: InkWell(
        onTap: () => _addToCart(product),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              // Product Icon/Thumbnail
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: product.imageBase64 != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.memory(
                          Uri.parse(product.imageBase64!).data!.contentAsBytes(),
                          fit: BoxFit.cover,
                        ),
                      )
                    : Center(
                        child: Text(
                          product.name.isNotEmpty 
                              ? product.name[0].toUpperCase() 
                              : '?',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue[700],
                          ),
                        ),
                      ),
              ),
              
              const SizedBox(width: 12),
              
              // Product Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      product.brand ?? product.sku,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(width: 12),
              
              // Price and Stock Info
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    CurrencyFormatter.format(product.sellingPrice),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: Colors.blue[700],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: product.isOutOfStock
                              ? Colors.red
                              : product.isLowStock
                                  ? Colors.orange
                                  : Colors.green,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          product.isOutOfStock 
                              ? 'Out' 
                              : '${product.stockQuantity.toInt()} in stock',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCartPanel(bool isTablet) {
    final subtotal = _calculateSubtotal();
    final taxAmount = _calculateTax(subtotal - _discountAmount);
    final total = subtotal - _discountAmount + taxAmount;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          left: BorderSide(color: Colors.grey[300]!),
        ),
      ),
      child: Column(
        children: [
          // Cart Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              border: Border(
                bottom: BorderSide(color: Colors.grey[300]!),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Cart',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (_cartItems.isNotEmpty)
                  TextButton(
                    onPressed: _clearCart,
                    child: const Text('Clear'),
                  ),
              ],
            ),
          ),

          // Cart Items
          Expanded(
            child: _cartItems.isEmpty
                ? const Center(
                    child: Text('Cart is empty'),
                  )
                : ListView.builder(
                    itemCount: _cartItems.length,
                    itemBuilder: (context, index) {
                      final item = _cartItems[index];
                      return CartItemWidget(
                        item: item,
                        onQuantityChanged: (quantity) {
                          setState(() {
                            if (quantity <= 0) {
                              _cartItems.removeAt(index);
                            } else {
                              _cartItems[index] = item.copyWith(quantity: quantity);
                            }
                          });
                        },
                        onRemove: () {
                          setState(() {
                            _cartItems.removeAt(index);
                          });
                        },
                      );
                    },
                  ),
          ),

          // Customer Info
          if (_cartItems.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: Colors.grey[300]!),
                ),
              ),
              child: Column(
                children: [
                  TextField(
                    controller: _customerNameController,
                    decoration: const InputDecoration(
                      labelText: 'Customer Name (Optional)',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (isTablet) const SizedBox(height: 8),
                  TextField(
                    controller: _customerPhoneController,
                    decoration: const InputDecoration(
                      labelText: 'Customer Phone (Optional)',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    keyboardType: TextInputType.phone,
                  ),
                ],
              ),
            ),

            // Totals
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                border: Border(
                  top: BorderSide(color: Colors.grey[300]!),
                ),
              ),
              child: Column(
                children: [
                  _buildTotalRow('Subtotal', subtotal),
                  if (_discountAmount > 0)
                    _buildTotalRow('Discount', -_discountAmount, color: Colors.red),
                  _buildTotalRow('Tax (16%)', taxAmount),
                  const Divider(),
                  _buildTotalRow(
                    'Total',
                    total,
                    isTotal: true,
                  ),
                ],
              ),
            ),

            // Action Buttons
            Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _showDiscountDialog,
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: const Text('Discount'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: _isProcessing ? null : _processPayment,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            backgroundColor: Colors.blue[700],
                            foregroundColor: Colors.white,
                          ),
                          child: _isProcessing
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : Text('Pay ${CurrencyFormatter.format(total)}'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTotalRow(String label, double amount, {Color? color, bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            fontSize: isTotal ? 18 : 14,
          ),
        ),
        Text(
          CurrencyFormatter.format(amount),
          style: TextStyle(
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            fontSize: isTotal ? 18 : 14,
            color: color,
          ),
        ),
      ],
    );
  }

  void _addToCart(Product product) {
    if (product.isOutOfStock) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Product is out of stock')),
      );
      return;
    }

    setState(() {
      final existingIndex = _cartItems.indexWhere(
        (item) => item.product.id == product.id,
      );

      if (existingIndex >= 0) {
        final existingItem = _cartItems[existingIndex];
        final newQuantity = existingItem.quantity + 1;
        
        if (newQuantity <= product.stockQuantity) {
          _cartItems[existingIndex] = existingItem.copyWith(quantity: newQuantity);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Insufficient stock')),
          );
        }
      } else {
        _cartItems.add(CartItem(product: product, quantity: 1));
      }
    });
  }

  void _clearCart() {
    setState(() {
      _cartItems.clear();
      _discountAmount = 0;
      _customerNameController.clear();
      _customerPhoneController.clear();
    });
  }

  double _calculateSubtotal() {
    return _cartItems.fold(0, (sum, item) => sum + (item.product.sellingPrice * item.quantity));
  }

  double _calculateTax(double amount) {
    return amount * 0.16; // 16% VAT
  }

  void _showBarcodeScanner() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: SizedBox(
          height: 400,
          child: MobileScanner(
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              if (barcodes.isNotEmpty) {
                final barcode = barcodes.first.rawValue;
                if (barcode != null) {
                  Navigator.of(context).pop();
                  _searchProductByBarcode(barcode);
                }
              }
            },
          ),
        ),
      ),
    );
  }

  void _searchProductByBarcode(String barcode) async {
    final product = await context.read<ProductsProvider>().getProductByBarcode(barcode);
    if (product != null) {
      _addToCart(product);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Product not found')),
      );
    }
  }

  void _showProductSearch() async {
    final product = await showSearch<Product?>(
      context: context,
      delegate: ProductSearchDelegate(
        products: context.read<ProductsProvider>().products,
      ),
    );

    if (product != null) {
      _addToCart(product);
    }
  }

  void _showDiscountDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Apply Discount'),
        content: TextField(
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Discount Amount',
            prefixText: 'K ',
          ),
          onChanged: (value) {
            final amount = double.tryParse(value) ?? 0;
            setState(() {
              _discountAmount = amount;
            });
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Apply'),
          ),
        ],
      ),
    );
  }

  void _processPayment() async {
    if (_cartItems.isEmpty) return;

    final subtotal = _calculateSubtotal();
    final taxAmount = _calculateTax(subtotal - _discountAmount);
    final total = subtotal - _discountAmount + taxAmount;

    final payments = await showDialog<List<Payment>>(
      context: context,
      useRootNavigator: true,
      barrierDismissible: true,
      builder: (context) => PaymentDialog(totalAmount: total),
    );

    if (payments != null && payments.isNotEmpty) {
      setState(() {
        _isProcessing = true;
      });

      try {
        final user = context.read<AuthProvider>().user!;
        final storeProvider = context.read<StoreSelectionProvider>();
        
        // Get selected store or fallback to first store in user's store list
        final storeId = storeProvider.selectedStoreId ?? 
                        (user.storeIds.isNotEmpty ? user.storeIds.first : null);
        
        if (storeId == null) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Please select a store in Settings'),
                backgroundColor: Colors.orange,
              ),
            );
          }
          return;
        }
        
        final transaction = await context.read<TransactionsProvider>().createTransaction(
          storeId: storeId,
          items: _cartItems.map((item) => TransactionItem(
            productId: item.product.id,
            productName: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            unitPrice: item.product.sellingPrice,
            discountAmount: 0,
            taxType: item.product.taxType,
            taxAmount: _calculateTax(item.product.sellingPrice * item.quantity),
            lineTotal: item.product.sellingPrice * item.quantity,
          )).toList(),
          payments: payments,
          customerName: _customerNameController.text.trim().isEmpty 
              ? null 
              : _customerNameController.text.trim(),
          customerPhone: _customerPhoneController.text.trim().isEmpty 
              ? null 
              : _customerPhoneController.text.trim(),
          discountAmount: _discountAmount,
        );

        _clearCart();

        try {
          await ReceiptPrinterService().printReceiptIfConfigured(
            transaction,
            storeName: storeProvider.selectedStoreName,
          );
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Receipt print failed: $e'),
                backgroundColor: Colors.orange,
              ),
            );
          }
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Transaction completed: ${transaction.receiptNumber}'),
              backgroundColor: Colors.green,
            ),
          );
        }

      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Transaction failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      } finally {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _customerNameController.dispose();
    _customerPhoneController.dispose();
    super.dispose();
  }
}

class CartItem {
  final Product product;
  final double quantity;

  CartItem({
    required this.product,
    required this.quantity,
  });

  CartItem copyWith({
    Product? product,
    double? quantity,
  }) {
    return CartItem(
      product: product ?? this.product,
      quantity: quantity ?? this.quantity,
    );
  }
}