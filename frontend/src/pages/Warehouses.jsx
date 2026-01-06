import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseAPI, productAPI, warehouseTransferAPI, storeAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Package, ArrowRightLeft, Building2, Edit, Trash2, Search, Send, Check } from 'lucide-react';

export function Warehouses() {
  const queryClient = useQueryClient();
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('warehouses');

  // Fetch warehouses
  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await warehouseAPI.getAll();
      return res.data;
    },
  });

  // Fetch stores for transfers
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

  // Fetch warehouse stock when a warehouse is selected
  const { data: warehouseStock = [], refetch: refetchStock } = useQuery({
    queryKey: ['warehouseStock', selectedWarehouse?.id],
    queryFn: async () => {
      if (!selectedWarehouse?.id) return [];
      const res = await warehouseAPI.getStock(selectedWarehouse.id);
      return res.data;
    },
    enabled: !!selectedWarehouse?.id,
  });

  // Fetch warehouse transfers
  const { data: transfers = [] } = useQuery({
    queryKey: ['warehouseTransfers', selectedWarehouse?.id],
    queryFn: async () => {
      const res = await warehouseTransferAPI.getAll({ warehouse_id: selectedWarehouse?.id });
      return res.data;
    },
    enabled: !!selectedWarehouse?.id,
  });

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: (data) => warehouseAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['warehouses']);
      setShowAddWarehouse(false);
      toast.success('Warehouse created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create warehouse');
    },
  });

  // Update warehouse mutation
  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }) => warehouseAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['warehouses']);
      setEditingWarehouse(null);
      toast.success('Warehouse updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update warehouse');
    },
  });

  // Delete warehouse mutation
  const deleteWarehouseMutation = useMutation({
    mutationFn: (id) => warehouseAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['warehouses']);
      if (selectedWarehouse?.id === editingWarehouse?.id) {
        setSelectedWarehouse(null);
      }
      toast.success('Warehouse deactivated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete warehouse');
    },
  });

  // Add stock mutation
  const addStockMutation = useMutation({
    mutationFn: ({ warehouseId, data }) => warehouseAPI.createStockMovement(warehouseId, data),
    onSuccess: () => {
      refetchStock();
      setShowAddStock(false);
      toast.success('Stock added successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add stock');
    },
  });

  // Create transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: (data) => warehouseTransferAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['warehouseTransfers']);
      setShowTransfer(false);
      toast.success('Transfer created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create transfer');
    },
  });

  // Dispatch transfer mutation
  const dispatchTransferMutation = useMutation({
    mutationFn: (id) => warehouseTransferAPI.dispatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['warehouseTransfers']);
      refetchStock();
      toast.success('Transfer dispatched successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to dispatch transfer');
    },
  });

  const filteredWarehouses = warehouses.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeWarehouses = filteredWarehouses.filter(w => w.is_active);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse Management</h1>
          <p className="text-slate-500">Manage central warehouses and stock distribution</p>
        </div>
        <Button onClick={() => setShowAddWarehouse(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Warehouse
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Warehouses</p>
                <p className="text-2xl font-bold">{activeWarehouses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Stock Items</p>
                <p className="text-2xl font-bold">{warehouseStock.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ArrowRightLeft className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Transfers</p>
                <p className="text-2xl font-bold">
                  {transfers.filter(t => t.status === 'draft' || t.status === 'dispatched').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Low Stock Items</p>
                <p className="text-2xl font-bold">
                  {warehouseStock.filter(s => s.quantity < s.reorder_level).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouse List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Warehouses</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search warehouses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-96 overflow-auto">
              {loadingWarehouses ? (
                <div className="p-4 text-center text-slate-500">Loading...</div>
              ) : activeWarehouses.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No warehouses found</div>
              ) : (
                activeWarehouses.map((warehouse) => (
                  <div
                    key={warehouse.id}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                      selectedWarehouse?.id === warehouse.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => setSelectedWarehouse(warehouse)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{warehouse.name}</h3>
                        <p className="text-sm text-slate-500">{warehouse.code}</p>
                        {warehouse.is_central && (
                          <Badge variant="secondary" className="mt-1">Central</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWarehouse(warehouse);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to deactivate this warehouse?')) {
                              deleteWarehouseMutation.mutate(warehouse.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {warehouse.address?.city && (
                      <p className="text-xs text-slate-400 mt-1">
                        📍 {warehouse.address.city}, {warehouse.address.country}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Details */}
        <Card className="lg:col-span-2">
          {selectedWarehouse ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedWarehouse.name}</CardTitle>
                    <p className="text-sm text-slate-500">{selectedWarehouse.code}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAddStock(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Add Stock
                    </Button>
                    <Button onClick={() => setShowTransfer(true)}>
                      <Send className="w-4 h-4 mr-2" /> Create Transfer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="stock">Stock Levels</TabsTrigger>
                    <TabsTrigger value="transfers">Transfers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="stock">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Reorder Level</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {warehouseStock.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                                No stock in this warehouse
                              </TableCell>
                            </TableRow>
                          ) : (
                            warehouseStock.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                <TableCell>{item.sku}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{item.reorder_level}</TableCell>
                                <TableCell>
                                  {item.quantity <= 0 ? (
                                    <Badge variant="destructive">Out of Stock</Badge>
                                  ) : item.quantity < item.reorder_level ? (
                                    <Badge variant="warning" className="bg-amber-100 text-amber-800">Low Stock</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">In Stock</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="transfers">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transfer #</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transfers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                                No transfers found
                              </TableCell>
                            </TableRow>
                          ) : (
                            transfers.map((transfer) => (
                              <TableRow key={transfer.id}>
                                <TableCell className="font-medium">{transfer.transfer_number}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {transfer.transfer_type === 'warehouse_to_store' ? 'To Store' : 'To Warehouse'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {transfer.destination_store_id ? 
                                    stores.find(s => s.id === transfer.destination_store_id)?.name || 'Unknown Store'
                                    : warehouses.find(w => w.id === transfer.destination_warehouse_id)?.name || 'Unknown Warehouse'
                                  }
                                </TableCell>
                                <TableCell>{transfer.items?.length || 0} items</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={
                                      transfer.status === 'received' ? 'default' :
                                      transfer.status === 'dispatched' ? 'secondary' :
                                      transfer.status === 'cancelled' ? 'destructive' : 'outline'
                                    }
                                    className={
                                      transfer.status === 'received' ? 'bg-emerald-100 text-emerald-800' :
                                      transfer.status === 'dispatched' ? 'bg-blue-100 text-blue-800' : ''
                                    }
                                  >
                                    {transfer.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {transfer.status === 'draft' && (
                                    <Button
                                      size="sm"
                                      onClick={() => dispatchTransferMutation.mutate(transfer.id)}
                                      disabled={dispatchTransferMutation.isPending}
                                    >
                                      <Send className="w-3 h-3 mr-1" /> Dispatch
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-96">
              <div className="text-center text-slate-500">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a warehouse to view details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Add Warehouse Dialog */}
      <AddWarehouseDialog
        open={showAddWarehouse}
        onOpenChange={setShowAddWarehouse}
        onSubmit={(data) => createWarehouseMutation.mutate(data)}
        isLoading={createWarehouseMutation.isPending}
      />

      {/* Edit Warehouse Dialog */}
      {editingWarehouse && (
        <AddWarehouseDialog
          open={!!editingWarehouse}
          onOpenChange={(open) => !open && setEditingWarehouse(null)}
          onSubmit={(data) => updateWarehouseMutation.mutate({ id: editingWarehouse.id, data })}
          isLoading={updateWarehouseMutation.isPending}
          initialData={editingWarehouse}
          isEdit
        />
      )}

      {/* Add Stock Dialog */}
      <AddStockDialog
        open={showAddStock}
        onOpenChange={setShowAddStock}
        products={products}
        warehouseId={selectedWarehouse?.id}
        onSubmit={(data) => addStockMutation.mutate({ warehouseId: selectedWarehouse.id, data })}
        isLoading={addStockMutation.isPending}
      />

      {/* Create Transfer Dialog */}
      <CreateTransferDialog
        open={showTransfer}
        onOpenChange={setShowTransfer}
        sourceWarehouse={selectedWarehouse}
        warehouses={warehouses.filter(w => w.id !== selectedWarehouse?.id && w.is_active)}
        stores={stores}
        products={products}
        warehouseStock={warehouseStock}
        onSubmit={(data) => createTransferMutation.mutate(data)}
        isLoading={createTransferMutation.isPending}
      />
    </div>
  );
}

// Add Warehouse Dialog Component
function AddWarehouseDialog({ open, onOpenChange, onSubmit, isLoading, initialData, isEdit }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    is_central: false,
    address: {
      street: '',
      city: '',
      province: '',
      postal_code: '',
      country: 'Zambia',
    },
    location: {
      latitude: null,
      longitude: null,
    },
  });

  // Helper function to get initial form data
  const getDefaultFormData = () => ({
    name: '',
    code: '',
    phone: '',
    email: '',
    is_central: false,
    address: {
      street: '',
      city: '',
      province: '',
      postal_code: '',
      country: 'Zambia',
    },
    location: {
      latitude: null,
      longitude: null,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          code: initialData.code || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
          is_central: initialData.is_central || false,
          address: initialData.address || getDefaultFormData().address,
          location: initialData.location || getDefaultFormData().location,
        });
      } else {
        setFormData(getDefaultFormData());
      }
    }
  }, [initialData, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Warehouse' : 'Add New Warehouse'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Warehouse Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code*</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                placeholder="WH001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_central"
              checked={formData.is_central}
              onCheckedChange={(checked) => setFormData({ ...formData, is_central: checked })}
            />
            <Label htmlFor="is_central">Mark as Central Warehouse</Label>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Address</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="street">Street</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, street: e.target.value }
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Input
                    id="province"
                    value={formData.address.province}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, province: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">GPS Coordinates (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.location.latitude || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: { ...formData.location, latitude: e.target.value ? parseFloat(e.target.value) : null }
                  })}
                  placeholder="-15.4167"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.location.longitude || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: { ...formData.location, longitude: e.target.value ? parseFloat(e.target.value) : null }
                  })}
                  placeholder="28.2833"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Stock Dialog Component
function AddStockDialog({ open, onOpenChange, products, warehouseId, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'stock_in',
    quantity: '',
    reason: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      quantity: parseFloat(formData.quantity),
    });
    setFormData({ product_id: '', movement_type: 'stock_in', quantity: '', reason: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stock to Warehouse</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select
              value={formData.product_id}
              onValueChange={(v) => setFormData({ ...formData, product_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Movement Type</Label>
            <Select
              value={formData.movement_type}
              onValueChange={(v) => setFormData({ ...formData, movement_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock_in">Stock In</SelectItem>
                <SelectItem value="stock_out">Stock Out</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="expiry">Expiry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Reason/Notes</Label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Initial stock, supplier delivery, etc."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.product_id || !formData.quantity}>
              {isLoading ? 'Adding...' : 'Add Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Transfer Dialog Component
function CreateTransferDialog({ 
  open, 
  onOpenChange, 
  sourceWarehouse, 
  warehouses, 
  stores, 
  products, 
  warehouseStock, 
  onSubmit, 
  isLoading 
}) {
  const [transferType, setTransferType] = useState('warehouse_to_store');
  const [destinationId, setDestinationId] = useState('');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');

  const addItem = () => {
    setItems([...items, { product_id: '', quantity_requested: 0 }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === 'quantity_requested' ? parseFloat(value) || 0 : value;
    
    // Auto-fill product details
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      const stock = warehouseStock.find(s => s.product_id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].sku = product.sku;
        newItems[index].available = stock?.quantity || 0;
      }
    }
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      source_warehouse_id: sourceWarehouse.id,
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        quantity_requested: item.quantity_requested,
      })),
      notes,
    };

    if (transferType === 'warehouse_to_store') {
      data.destination_store_id = destinationId;
    } else {
      data.destination_warehouse_id = destinationId;
    }

    onSubmit(data);
    // Reset form
    setItems([]);
    setDestinationId('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Stock Transfer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transfer Type</Label>
              <Select value={transferType} onValueChange={(v) => {
                setTransferType(v);
                setDestinationId('');
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse_to_store">To Store</SelectItem>
                  <SelectItem value="warehouse_to_warehouse">To Another Warehouse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
              <Select value={destinationId} onValueChange={setDestinationId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${transferType === 'warehouse_to_store' ? 'store' : 'warehouse'}`} />
                </SelectTrigger>
                <SelectContent>
                  {transferType === 'warehouse_to_store' 
                    ? stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))
                    : warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items to Transfer</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-4">
                        No items added. Click &quot;Add Item&quot; to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.product_id}
                            onValueChange={(v) => updateItem(index, 'product_id', v)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouseStock.map((stock) => (
                                <SelectItem key={stock.product_id} value={stock.product_id}>
                                  {stock.product_name} ({stock.quantity} available)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">{item.available || 0}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max={item.available || 0}
                            value={item.quantity_requested || ''}
                            onChange={(e) => updateItem(index, 'quantity_requested', e.target.value)}
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Transfer notes..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !destinationId || items.length === 0 || items.some(i => !i.product_id || !i.quantity_requested)}
            >
              {isLoading ? 'Creating...' : 'Create Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
