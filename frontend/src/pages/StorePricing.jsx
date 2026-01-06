import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storePricingAPI, productAPI, storeAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { DollarSign, Edit, Trash2, History, Plus, Store } from 'lucide-react';
import { useOrgStore } from '@/lib/store';

export function StorePricing() {
  const queryClient = useQueryClient();
  const { organization } = useOrgStore();
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [showSetPriceDialog, setShowSetPriceDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  
  const [priceForm, setPriceForm] = useState({
    product_id: '',
    selling_price: '',
    cost_price: '',
    reason: ''
  });

  const currencySymbol = organization?.settings?.currency_symbol || 'K';
  const formatCurrency = (amount) => `${currencySymbol}${amount?.toFixed(2) || '0.00'}`;

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const res = await storeAPI.getAll();
      return res.data;
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await productAPI.getAll();
      return res.data;
    },
  });

  // Fetch store pricing when store is selected
  const { data: storePricing = [], isLoading, refetch: refetchPricing } = useQuery({
    queryKey: ['storePricing', selectedStoreId],
    queryFn: async () => {
      if (!selectedStoreId) return [];
      const res = await storePricingAPI.getAll(selectedStoreId);
      return res.data;
    },
    enabled: !!selectedStoreId,
  });

  // Auto-select first store
  useEffect(() => {
    if (stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, selectedStoreId]);

  // Set price mutation
  const setPriceMutation = useMutation({
    mutationFn: (data) => storePricingAPI.set(selectedStoreId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['storePricing', selectedStoreId]);
      setShowSetPriceDialog(false);
      setPriceForm({ product_id: '', selling_price: '', cost_price: '', reason: '' });
      toast.success('Price updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update price');
    },
  });

  // Remove price mutation
  const removePriceMutation = useMutation({
    mutationFn: (productId) => storePricingAPI.remove(selectedStoreId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries(['storePricing', selectedStoreId]);
      toast.success('Store price removed - reverted to default');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to remove price');
    },
  });

  const handleSetPrice = () => {
    if (!priceForm.product_id || !priceForm.selling_price) {
      toast.error('Please select a product and enter a price');
      return;
    }
    setPriceMutation.mutate({
      product_id: priceForm.product_id,
      selling_price: parseFloat(priceForm.selling_price),
      cost_price: priceForm.cost_price ? parseFloat(priceForm.cost_price) : null,
      reason: priceForm.reason
    });
  };

  const openEditDialog = (pricing) => {
    setPriceForm({
      product_id: pricing.product_id,
      selling_price: pricing.selling_price.toString(),
      cost_price: pricing.cost_price?.toString() || '',
      reason: ''
    });
    setShowSetPriceDialog(true);
  };

  const openAuditDialog = async (pricing) => {
    try {
      const res = await storePricingAPI.getAudit(selectedStoreId, pricing.product_id);
      setAuditTrail(res.data.audit_trail || []);
      setSelectedProduct(pricing);
      setShowAuditDialog(true);
    } catch (error) {
      toast.error('Failed to load audit trail');
    }
  };

  // Products without store pricing (available to add)
  const pricedProductIds = new Set(storePricing.map(p => p.product_id));
  const availableProducts = products.filter(p => !pricedProductIds.has(p.id));

  const selectedStore = stores.find(s => s.id === selectedStoreId);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Store Pricing</h1>
          <p className="text-sm text-slate-500">Set custom prices for products per store</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
            <SelectTrigger className="w-48">
              <Store className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => {
            setPriceForm({ product_id: '', selling_price: '', cost_price: '', reason: '' });
            setShowSetPriceDialog(true);
          }}>
            <Plus className="w-4 h-4 mr-2" /> Set Price
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-xs text-slate-500">Custom Prices</p>
                <p className="text-xl font-bold">{storePricing.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">Store</p>
                <p className="text-sm font-bold truncate">{selectedStore?.name || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div>
              <p className="text-xs text-slate-500">Total Products</p>
              <p className="text-xl font-bold">{products.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div>
              <p className="text-xs text-slate-500">Default Pricing</p>
              <p className="text-xl font-bold">{products.length - storePricing.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Store-Specific Prices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Default Price</TableHead>
                  <TableHead className="text-right">Store Price</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : storePricing.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No custom prices set for this store
                    </TableCell>
                  </TableRow>
                ) : (
                  storePricing.map((pricing) => {
                    const diff = pricing.selling_price - pricing.default_price;
                    const diffPercent = ((diff / pricing.default_price) * 100).toFixed(1);
                    
                    return (
                      <TableRow key={pricing.id}>
                        <TableCell className="font-medium">{pricing.product_name}</TableCell>
                        <TableCell className="text-slate-500">{pricing.sku}</TableCell>
                        <TableCell>{pricing.brand || '-'}</TableCell>
                        <TableCell className="text-right text-slate-500">
                          {formatCurrency(pricing.default_price)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          {formatCurrency(pricing.selling_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={diff > 0 ? 'default' : diff < 0 ? 'destructive' : 'secondary'}>
                            {diff > 0 ? '+' : ''}{diffPercent}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAuditDialog(pricing)}
                              title="View History"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(pricing)}
                              title="Edit Price"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Remove custom price? Product will use default pricing.')) {
                                  removePriceMutation.mutate(pricing.product_id);
                                }
                              }}
                              title="Remove Custom Price"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Set Price Dialog */}
      <Dialog open={showSetPriceDialog} onOpenChange={setShowSetPriceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Store Price</DialogTitle>
            <DialogDescription>
              Set a custom price for {selectedStore?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product</Label>
              <Select
                value={priceForm.product_id}
                onValueChange={(v) => {
                  const product = products.find(p => p.id === v);
                  setPriceForm({
                    ...priceForm,
                    product_id: v,
                    selling_price: product?.selling_price?.toString() || ''
                  });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {(priceForm.product_id ? products : availableProducts).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - {formatCurrency(product.selling_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Selling Price ({currencySymbol}) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={priceForm.selling_price}
                  onChange={(e) => setPriceForm({ ...priceForm, selling_price: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Cost Price ({currencySymbol})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={priceForm.cost_price}
                  onChange={(e) => setPriceForm({ ...priceForm, cost_price: e.target.value })}
                  className="mt-1"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <Label>Reason for Change</Label>
              <Input
                value={priceForm.reason}
                onChange={(e) => setPriceForm({ ...priceForm, reason: e.target.value })}
                className="mt-1"
                placeholder="e.g., Location premium, Promotional price..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetPriceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetPrice} disabled={setPriceMutation.isPending}>
              {setPriceMutation.isPending ? 'Saving...' : 'Save Price'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Price History</DialogTitle>
            <DialogDescription>
              {selectedProduct?.product_name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-64">
            {auditTrail.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No history available</p>
            ) : (
              <div className="space-y-3">
                {auditTrail.map((entry, index) => (
                  <div key={index} className="border-l-2 border-emerald-500 pl-3 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {entry.old_price ? (
                            <span>
                              {formatCurrency(entry.old_price)} → {formatCurrency(entry.new_price)}
                            </span>
                          ) : (
                            <span>Set to {formatCurrency(entry.new_price)}</span>
                          )}
                        </p>
                        {entry.reason && (
                          <p className="text-sm text-slate-500">{entry.reason}</p>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {new Date(entry.changed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
