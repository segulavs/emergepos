import React, { useState, useEffect } from 'react';
import { useStoreSelection, useOrgStore, useAuthStore } from '@/lib/store';
import { transferAPI, storeAPI, productAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { toast } from 'sonner';

const statusColors = {
  draft: 'bg-slate-100 text-slate-800',
  dispatched: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  received: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function Transfers() {
  const { selectedStore, stores } = useStoreSelection();
  const { user } = useAuthStore();
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [formData, setFormData] = useState({
    source_store_id: '',
    destination_store_id: '',
    items: [],
    notes: '',
  });
  const [newItem, setNewItem] = useState({ product_id: '', quantity: '' });
  const [saving, setSaving] = useState(false);

  const canManage = ['super_admin', 'org_admin', 'store_admin'].includes(user?.role);

  useEffect(() => {
    loadTransfers();
    loadProducts();
  }, [selectedStore]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const response = await transferAPI.getAll({ store_id: selectedStore?.id });
      setTransfers(response.data);
    } catch (error) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      source_store_id: selectedStore?.id || '',
      destination_store_id: '',
      items: [],
      notes: '',
    });
    setNewItem({ product_id: '', quantity: '' });
    setShowDialog(true);
  };

  const addItem = () => {
    if (!newItem.product_id || !newItem.quantity) {
      toast.error('Select a product and enter quantity');
      return;
    }
    const product = products.find(p => p.id === newItem.product_id);
    if (!product) return;

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          quantity_dispatched: parseFloat(newItem.quantity),
          quantity_received: 0,
        },
      ],
    });
    setNewItem({ product_id: '', quantity: '' });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    setSaving(true);

    try {
      await transferAPI.create(formData);
      toast.success('Transfer created!');
      setShowDialog(false);
      loadTransfers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create transfer');
    } finally {
      setSaving(false);
    }
  };

  const handleDispatch = async (transfer) => {
    try {
      await transferAPI.dispatch(transfer.id);
      toast.success('Transfer dispatched!');
      loadTransfers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to dispatch');
    }
  };

  const openReceiveDialog = (transfer) => {
    setSelectedTransfer({
      ...transfer,
      items: transfer.items.map(item => ({
        ...item,
        quantity_received: item.quantity_dispatched,
      })),
    });
    setShowReceiveDialog(true);
  };

  const handleReceive = async () => {
    try {
      const receivedItems = selectedTransfer.items.map(item => ({
        product_id: item.product_id,
        quantity_received: item.quantity_received,
      }));
      await transferAPI.receive(selectedTransfer.id, receivedItems);
      toast.success('Transfer received!');
      setShowReceiveDialog(false);
      loadTransfers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to receive');
    }
  };

  const getStoreName = (storeId) => {
    return stores.find(s => s.id === storeId)?.name || 'Unknown';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Transfers</h1>
          <p className="text-slate-500">Transfer inventory between stores</p>
        </div>
        {canManage && (
          <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700">
            + New Transfer
          </Button>
        )}
      </div>

      {/* Transfers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer #</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="font-mono">{transfer.transfer_number}</TableCell>
                  <TableCell>{getStoreName(transfer.source_store_id)}</TableCell>
                  <TableCell>{getStoreName(transfer.destination_store_id)}</TableCell>
                  <TableCell>{transfer.items?.length || 0} items</TableCell>
                  <TableCell>
                    <Badge className={statusColors[transfer.status]}>
                      {transfer.status?.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(transfer.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {transfer.status === 'draft' && canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDispatch(transfer)}
                      >
                        Dispatch
                      </Button>
                    )}
                    {transfer.status === 'dispatched' && 
                     transfer.destination_store_id === selectedStore?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReceiveDialog(transfer)}
                      >
                        Receive
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {transfers.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No transfers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Transfer Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
            <DialogDescription>
              Transfer inventory from one store to another
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source Store *</Label>
                  <Select 
                    value={formData.source_store_id} 
                    onValueChange={(v) => setFormData({ ...formData, source_store_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map(store => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destination Store *</Label>
                  <Select 
                    value={formData.destination_store_id} 
                    onValueChange={(v) => setFormData({ ...formData, destination_store_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores
                        .filter(s => s.id !== formData.source_store_id)
                        .map(store => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Add Item */}
              <div className="border rounded-lg p-4">
                <Label className="mb-2 block">Add Items</Label>
                <div className="flex gap-2">
                  <Select 
                    value={newItem.product_id} 
                    onValueChange={(v) => setNewItem({ ...newItem, product_id: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    className="w-24"
                  />
                  <Button type="button" variant="outline" onClick={addItem}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Items List */}
              {formData.items.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {formData.items.map((item, index) => (
                    <div key={index} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold">{item.quantity_dispatched} units</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => removeItem(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-700" 
                disabled={saving || formData.items.length === 0}
              >
                {saving ? 'Creating...' : 'Create Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Transfer Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receive Transfer</DialogTitle>
            <DialogDescription>
              {selectedTransfer?.transfer_number} - Confirm received quantities
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {selectedTransfer?.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-slate-500">Dispatched: {item.quantity_dispatched}</p>
                </div>
                <Input
                  type="number"
                  value={item.quantity_received}
                  onChange={(e) => {
                    const newItems = [...selectedTransfer.items];
                    newItems[index].quantity_received = parseFloat(e.target.value) || 0;
                    setSelectedTransfer({ ...selectedTransfer, items: newItems });
                  }}
                  className="w-24"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceive} className="bg-emerald-600 hover:bg-emerald-700">
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
