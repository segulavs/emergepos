import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/products_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/product.dart';
import '../widgets/offline_cached_notice.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final TextEditingController _searchController = TextEditingController();
  
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductsProvider>().loadProducts();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productsProvider = context.watch<ProductsProvider>();
    final authProvider = context.watch<AuthProvider>();
    final canEdit = authProvider.user?.isStoreAdmin == true || 
                    authProvider.user?.isOrgAdmin == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          if (canEdit)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _showProductDialog(context, null),
              tooltip: 'Add Product',
            ),
        ],
      ),
      body: Column(
        children: [
          const OfflineCachedNotice(),
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by name, SKU, or barcode...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          productsProvider.searchProducts('');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (value) {
                productsProvider.searchProducts(value);
              },
            ),
          ),
          
          // Products List
          Expanded(
            child: productsProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : productsProvider.products.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey),
                            const SizedBox(height: 16),
                            Text(
                              'No products found',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => productsProvider.loadProducts(),
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: productsProvider.products.length,
                          itemBuilder: (context, index) {
                            final product = productsProvider.products[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                title: Text(
                                  product.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('SKU: ${product.sku}'),
                                    if (product.barcode != null && product.barcode!.isNotEmpty)
                                      Text('Barcode: ${product.barcode}'),
                                    Text('Category: ${product.category}'),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Chip(
                                          label: Text('K${product.sellingPrice.toStringAsFixed(2)}'),
                                          backgroundColor: Colors.green.shade50,
                                          labelStyle: TextStyle(
                                            color: Colors.green.shade700,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Chip(
                                          label: Text(product.taxType == 'standard' ? 'VAT 16%' : 
                                                      product.taxType == 'zero_rated' ? '0% Tax' : 'No Tax'),
                                          backgroundColor: product.taxType == 'standard' 
                                              ? Colors.blue.shade50 
                                              : Colors.grey.shade100,
                                          labelStyle: TextStyle(
                                            color: product.taxType == 'standard' 
                                                ? Colors.blue.shade700 
                                                : Colors.grey.shade700,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                trailing: canEdit
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
                                          const PopupMenuItem(
                                            value: 'delete',
                                            child: Row(
                                              children: [
                                                Icon(Icons.delete, size: 20, color: Colors.red),
                                                SizedBox(width: 8),
                                                Text('Delete', style: TextStyle(color: Colors.red)),
                                              ],
                                            ),
                                          ),
                                        ],
                                        onSelected: (value) {
                                          if (value == 'edit') {
                                            _showProductDialog(context, product);
                                          } else if (value == 'delete') {
                                            _deleteProduct(context, product);
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

  void _showProductDialog(BuildContext context, Product? product) {
    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController(text: product?.name ?? '');
    final descriptionController = TextEditingController(text: product?.description ?? '');
    final skuController = TextEditingController(text: product?.sku ?? '');
    final barcodeController = TextEditingController(text: product?.barcode ?? '');
    final brandController = TextEditingController(text: product?.brand ?? '');
    final costPriceController = TextEditingController(text: product?.costPrice.toString() ?? '');
    final sellingPriceController = TextEditingController(text: product?.sellingPrice.toString() ?? '');
    
    String category = product?.category ?? 'General';
    String taxType = product?.taxType ?? 'exempt';
    String unit = product?.unit ?? 'piece';

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(product == null ? 'Add Product' : 'Edit Product'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Product Name *'),
                    validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: skuController,
                    decoration: const InputDecoration(labelText: 'SKU *'),
                    validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: barcodeController,
                    decoration: const InputDecoration(labelText: 'Barcode'),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: brandController,
                    decoration: const InputDecoration(labelText: 'Brand'),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: category,
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: ['General', 'Food', 'Beverages', 'Electronics', 'Clothing', 'Health', 'Home']
                        .map((cat) => DropdownMenuItem(value: cat, child: Text(cat)))
                        .toList(),
                    onChanged: (value) => setState(() => category = value ?? 'General'),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: costPriceController,
                          decoration: const InputDecoration(labelText: 'Cost Price (K) *'),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          validator: (value) {
                            if (value?.isEmpty ?? true) return 'Required';
                            if (double.tryParse(value!) == null) return 'Invalid number';
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: sellingPriceController,
                          decoration: const InputDecoration(labelText: 'Selling Price (K) *'),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          validator: (value) {
                            if (value?.isEmpty ?? true) return 'Required';
                            if (double.tryParse(value!) == null) return 'Invalid number';
                            return null;
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: taxType,
                    decoration: const InputDecoration(labelText: 'Tax Setting'),
                    items: const [
                      DropdownMenuItem(value: 'exempt', child: Text('No Tax (Default)')),
                      DropdownMenuItem(value: 'zero_rated', child: Text('Zero-rated (0%)')),
                      DropdownMenuItem(value: 'standard', child: Text('Charge VAT (16%)')),
                    ],
                    onChanged: (value) => setState(() => taxType = value ?? 'exempt'),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: unit,
                    decoration: const InputDecoration(labelText: 'Unit'),
                    items: const [
                      DropdownMenuItem(value: 'piece', child: Text('Piece')),
                      DropdownMenuItem(value: 'kg', child: Text('Kilogram')),
                      DropdownMenuItem(value: 'g', child: Text('Gram')),
                      DropdownMenuItem(value: 'l', child: Text('Liter')),
                      DropdownMenuItem(value: 'ml', child: Text('Milliliter')),
                      DropdownMenuItem(value: 'box', child: Text('Box')),
                      DropdownMenuItem(value: 'pack', child: Text('Pack')),
                    ],
                    onChanged: (value) => setState(() => unit = value ?? 'piece'),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: descriptionController,
                    decoration: const InputDecoration(labelText: 'Description'),
                    maxLines: 2,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (formKey.currentState!.validate()) {
                  final apiService = context.read<ApiService>();
                  final productsProvider = context.read<ProductsProvider>();
                  
                  final data = {
                    'name': nameController.text,
                    'description': descriptionController.text,
                    'sku': skuController.text,
                    'barcode': barcodeController.text.isEmpty ? null : barcodeController.text,
                    'brand': brandController.text.isEmpty ? null : brandController.text,
                    'category': category,
                    'cost_price': double.parse(costPriceController.text),
                    'selling_price': double.parse(sellingPriceController.text),
                    'tax_type': taxType,
                    'unit': unit,
                  };

                  try {
                    if (product == null) {
                      await apiService.createProduct(data);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Product created!')),
                        );
                      }
                    } else {
                      await apiService.updateProduct(product.id, data);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Product updated!')),
                        );
                      }
                    }
                    productsProvider.loadProducts();
                    if (context.mounted) {
                      Navigator.pop(context);
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error: ${e.toString()}')),
                      );
                    }
                  }
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _deleteProduct(BuildContext context, Product product) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Product'),
        content: Text('Are you sure you want to delete ${product.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final apiService = context.read<ApiService>();
              final productsProvider = context.read<ProductsProvider>();
              
              try {
                await apiService.deleteProduct(product.id);
                productsProvider.loadProducts();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Product deleted!')),
                  );
                  Navigator.pop(context);
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: ${e.toString()}')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
