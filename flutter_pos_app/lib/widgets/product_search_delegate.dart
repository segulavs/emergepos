import 'package:flutter/material.dart';
import '../models/product.dart';
import '../utils/currency_formatter.dart';

class ProductSearchDelegate extends SearchDelegate<Product?> {
  final List<Product> products;

  ProductSearchDelegate({required this.products});

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      IconButton(
        icon: const Icon(Icons.clear),
        onPressed: () {
          query = '';
        },
      ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () {
        close(context, null);
      },
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    return _buildProductList();
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    return _buildProductList();
  }

  Widget _buildProductList() {
    final filteredProducts = products.where((product) {
      return product.name.toLowerCase().contains(query.toLowerCase()) ||
             product.sku.toLowerCase().contains(query.toLowerCase()) ||
             (product.barcode?.contains(query) ?? false);
    }).toList();

    if (filteredProducts.isEmpty) {
      return const Center(
        child: Text('No products found'),
      );
    }

    return ListView.builder(
      itemCount: filteredProducts.length,
      itemBuilder: (context, index) {
        final product = filteredProducts[index];
        return ListTile(
          leading: Container(
            width: 50,
            height: 50,
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
                : const Icon(Icons.inventory_2, color: Colors.grey),
          ),
          title: Text(product.name),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('SKU: ${product.sku}'),
              if (product.barcode != null)
                Text('Barcode: ${product.barcode}'),
            ],
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                CurrencyFormatter.format(product.sellingPrice),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.green,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: product.isOutOfStock
                      ? Colors.red
                      : product.isLowStock
                          ? Colors.orange
                          : Colors.green,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${product.stockQuantity.toInt()}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          onTap: () {
            close(context, product);
          },
        );
      },
    );
  }
}