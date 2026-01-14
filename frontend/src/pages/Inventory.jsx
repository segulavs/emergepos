import React, { useState, useEffect } from 'react';
import { useStoreSelection, useOrgStore, useAuthStore } from '@/lib/store';
import { stockAPI, productAPI } from '@/lib/api';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function Inventory() {
  const { selectedStore } = useStoreSelection();
  const { organization } = useOrgStore();
  const { user } = useAuthStore();
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'stock_in',
    quantity: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const currencySymbol = organization?.settings?.currency_symbol || 'K';
  const canUploadStocks = ['super_admin', 'org_admin'].includes(user?.role);

  useEffect(() => {
    if (selectedStore) {
      loadStock();
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const loadStock = async () => {
    setLoading(true);
    try {
      const response = await stockAPI.getByStore(selectedStore.id);
      setStock(response.data);
    } catch (error) {
      console.error('Failed to load stock:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await stockAPI.createMovement(selectedStore.id, {
        product_id: formData.product_id,
        movement_type: formData.movement_type,
        quantity: parseFloat(formData.quantity),
        reason: formData.reason,
      });
      toast.success('Stock updated!');
      setShowDialog(false);
      setFormData({ product_id: '', movement_type: 'stock_in', quantity: '', reason: '' });
      loadStock();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (item) => {
    if (item.quantity <= 0) return { label: 'Out of Stock', color: 'destructive' };
    if (item.quantity <= item.reorder_level) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
  };

  if (!selectedStore) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
            <p className="text-slate-500">Stock Management</p>
          </div>
          {canUploadStocks && (
            <div className="flex gap-2">
              <Button 
                onClick={async () => {
                  setDownloadingTemplate(true);
                  try {
                    await stockAPI.downloadTemplate();
                    toast.success('Template downloaded successfully!');
                  } catch (error) {
                    toast.error(error.message || 'Failed to download template');
                  } finally {
                    setDownloadingTemplate(false);
                  }
                }}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                disabled={downloadingTemplate}
              >
                {downloadingTemplate ? 'Downloading...' : '📥 Download Template'}
              </Button>
              <Button 
                onClick={() => setShowImportDialog(true)} 
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                📤 Upload Excel
              </Button>
            </div>
          )}
        </div>
        <Card className="p-8 text-center">
          <p className="text-xl text-slate-500">Please select a store to view inventory</p>
          {canUploadStocks && (
            <p className="text-sm text-slate-400 mt-2">Or use the Excel upload to load stocks for all stores</p>
          )}
        </Card>
        {canUploadStocks && (
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Stocks from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel file to load stocks for all stores. Make sure to use the template format with Store Code, SKU, Quantity, and Reorder Level columns.
                </DialogDescription>
              </DialogHeader>
              
              {!importResult ? (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="excel-file">Select Excel File</Label>
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        setImporting(true);
                        try {
                          const result = await stockAPI.uploadFromExcel(file);
                          setImportResult(result);
                          if (result.errors && result.errors.length > 0) {
                            toast.warning(`Upload completed with ${result.errors.length} errors`);
                          } else {
                            toast.success(`Successfully uploaded stocks: ${result.created} created, ${result.updated} updated`);
                          }
                        } catch (error) {
                          toast.error(error.detail || error.message || 'Failed to upload stocks');
                        } finally {
                          setImporting(false);
                        }
                      }}
                      disabled={importing}
                    />
                    <p className="text-xs text-slate-500">
                      Supported formats: .xlsx, .xls. Required columns: Store Code, SKU, Quantity
                    </p>
                  </div>
                  
                  {importing && (
                    <div className="text-center py-4">
                      <p className="text-slate-600">Processing file...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Upload Summary</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Created:</span> {importResult.created} stock records</p>
                      <p><span className="font-medium">Updated:</span> {importResult.updated} stock records</p>
                      <p><span className="font-medium">Total Processed:</span> {importResult.total_processed} records</p>
                      <p><span className="font-medium">Total Rows:</span> {importResult.total_rows} rows</p>
                    </div>
                  </div>
                  
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <h4 className="font-semibold text-red-800 mb-2">Errors ({importResult.errors.length})</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx} className="text-xs">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowImportDialog(false);
                    setImportResult(null);
                    const fileInput = document.getElementById('excel-file');
                    if (fileInput) fileInput.value = '';
                  }}
                >
                  {importResult ? 'Close' : 'Cancel'}
                </Button>
                {importResult && (
                  <Button 
                    type="button"
                    onClick={() => {
                      setImportResult(null);
                      const fileInput = document.getElementById('excel-file');
                      if (fileInput) fileInput.value = '';
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Upload Another
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500">{selectedStore.name} - Stock Management</p>
        </div>
        <div className="flex gap-2">
          {canUploadStocks && (
            <>
              <Button 
                onClick={async () => {
                  setDownloadingTemplate(true);
                  try {
                    await stockAPI.downloadTemplate();
                    toast.success('Template downloaded successfully!');
                  } catch (error) {
                    toast.error(error.message || 'Failed to download template');
                  } finally {
                    setDownloadingTemplate(false);
                  }
                }}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                disabled={downloadingTemplate}
              >
                {downloadingTemplate ? 'Downloading...' : '📥 Download Template'}
              </Button>
              <Button 
                onClick={() => setShowImportDialog(true)} 
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                📤 Upload Excel
              </Button>
            </>
          )}
          <Button onClick={() => setShowDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
            + Stock Movement
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Products</p>
            <p className="text-2xl font-bold">{stock.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">In Stock</p>
            <p className="text-2xl font-bold text-emerald-600">
              {stock.filter(s => s.quantity > s.reorder_level).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Low Stock</p>
            <p className="text-2xl font-bold text-orange-600">
              {stock.filter(s => s.quantity > 0 && s.quantity <= s.reorder_level).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600">
              {stock.filter(s => s.quantity <= 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.map((item) => {
                const status = getStockStatus(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.product_name}</p>
                      {item.barcode && (
                        <p className="text-xs text-slate-500">{item.barcode}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>
                      <span className={`font-bold ${
                        item.quantity <= 0 ? 'text-red-600' :
                        item.quantity <= item.reorder_level ? 'text-orange-600' :
                        'text-emerald-600'
                      }`}>
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell>{item.reorder_level}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={status.color === 'success' ? 'default' : status.color}
                        className={status.color === 'success' ? 'bg-emerald-100 text-emerald-800' : 
                                   status.color === 'warning' ? 'bg-orange-100 text-orange-800' : ''}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {currencySymbol}{(item.quantity * item.selling_price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {stock.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No stock records found. Add products first, then adjust stock.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stock Movement Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Movement</DialogTitle>
            <DialogDescription>
              Add stock in, stock out, or make adjustments
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Product *</Label>
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
                <Label>Movement Type *</Label>
                <Select 
                  value={formData.movement_type} 
                  onValueChange={(v) => setFormData({ ...formData, movement_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock_in">Stock In (Add)</SelectItem>
                    <SelectItem value="stock_out">Stock Out (Remove)</SelectItem>
                    <SelectItem value="adjustment">Adjustment (Set Exact)</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="expiry">Expiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Reason for movement..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-700" 
                disabled={saving || !formData.product_id || !formData.quantity}
              >
                {saving ? 'Saving...' : 'Save Movement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Excel Dialog - Super Admin and Org Admin Only */}
      {canUploadStocks && (
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Stocks from Excel</DialogTitle>
              <DialogDescription>
                Upload an Excel file to load stocks for all stores. Make sure to use the template format with Store Code, SKU, Quantity, and Reorder Level columns.
              </DialogDescription>
            </DialogHeader>
            
            {!importResult ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="excel-file">Select Excel File</Label>
                  <Input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      
                      setImporting(true);
                      try {
                        const result = await stockAPI.uploadFromExcel(file);
                        setImportResult(result);
                        if (result.errors && result.errors.length > 0) {
                          toast.warning(`Upload completed with ${result.errors.length} errors`);
                        } else {
                          toast.success(`Successfully uploaded stocks: ${result.created} created, ${result.updated} updated`);
                        }
                        // Reload stock for current store if selected
                        if (selectedStore) {
                          loadStock();
                        }
                      } catch (error) {
                        toast.error(error.detail || error.message || 'Failed to upload stocks');
                      } finally {
                        setImporting(false);
                      }
                    }}
                    disabled={importing}
                  />
                  <p className="text-xs text-slate-500">
                    Supported formats: .xlsx, .xls. Required columns: Store Code, SKU, Quantity
                  </p>
                </div>
                
                {importing && (
                  <div className="text-center py-4">
                    <p className="text-slate-600">Processing file...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Upload Summary</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Created:</span> {importResult.created} stock records</p>
                    <p><span className="font-medium">Updated:</span> {importResult.updated} stock records</p>
                    <p><span className="font-medium">Total Processed:</span> {importResult.total_processed} records</p>
                    <p><span className="font-medium">Total Rows:</span> {importResult.total_rows} rows</p>
                  </div>
                </div>
                
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <h4 className="font-semibold text-red-800 mb-2">Errors ({importResult.errors.length})</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {importResult.errors.map((error, idx) => (
                        <li key={idx} className="text-xs">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowImportDialog(false);
                  setImportResult(null);
                  // Reset file input
                  const fileInput = document.getElementById('excel-file');
                  if (fileInput) fileInput.value = '';
                }}
              >
                {importResult ? 'Close' : 'Cancel'}
              </Button>
              {importResult && (
                <Button 
                  type="button"
                  onClick={() => {
                    setImportResult(null);
                    const fileInput = document.getElementById('excel-file');
                    if (fileInput) fileInput.value = '';
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Upload Another
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
