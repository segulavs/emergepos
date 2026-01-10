import React, { useState, useEffect } from 'react';
import { useStoreSelection, useOrgStore } from '@/lib/store';
import { transactionAPI, printAPI, creditNoteAPI } from '@/lib/api';
import { printReceipt, getPrinterStatus, openPrintWindow } from '@/lib/printer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { FileText, RotateCcw } from 'lucide-react';

export function Transactions() {
  const { selectedStore } = useStoreSelection();
  const { organization } = useOrgStore();
  const [transactions, setTransactions] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showCreditNoteDialog, setShowCreditNoteDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [activeTab, setActiveTab] = useState('transactions');
  
  // Credit note state
  const [creditNoteItems, setCreditNoteItems] = useState([]);
  const [creditNoteReason, setCreditNoteReason] = useState('');

  const currencySymbol = organization?.settings?.currency_symbol || 'K';

  useEffect(() => {
    if (selectedStore) {
      loadTransactions();
      loadCreditNotes();
    }
  }, [selectedStore]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await transactionAPI.getAll({ store_id: selectedStore?.id });
      setTransactions(response.data);
    } catch (error) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadCreditNotes = async () => {
    try {
      const response = await creditNoteAPI.getAll({ store_id: selectedStore?.id });
      setCreditNotes(response.data);
    } catch (error) {
      console.error('Failed to load credit notes');
    }
  };

  const viewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetails(true);
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      await transactionAPI.void(selectedTransaction.id, voidReason);
      toast.success('Transaction voided!');
      setShowVoidDialog(false);
      setShowDetails(false);
      setVoidReason('');
      loadTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to void transaction');
    }
  };

  const handlePrint = async (transaction) => {
    try {
      const response = await printAPI.getReceipt(transaction.id);
      const receiptData = response.data;
      
      // Extract receipt data from API response
      // The API returns raw_data.transaction which has the full transaction data
      const receipt = receiptData.raw_data?.transaction || transaction;
      const org = receiptData.raw_data?.header || {};
      const store = selectedStore;
      
      // Prepare print settings
      const settings = {
        storeName: store?.name || org.store_name || 'Store',
        storeAddress: store?.address?.city 
          ? `${store.address.city}, ${store.address.country || ''}`.trim()
          : org.address?.street || '',
        currencySymbol: currencySymbol,
        invoiceLogo: organization?.settings?.invoice_logo || null
      };
      
      // Check if printer is connected
      const printerStatus = getPrinterStatus();
      
      if (printerStatus.connected) {
        // Use thermal printer (USB, Bluetooth, or RawBT)
        try {
          const result = await printReceipt(receipt, settings);
          if (result.success) {
            toast.success(`Receipt printed via ${result.method}!`);
          } else {
            throw new Error('Print failed');
          }
        } catch (printError) {
          console.error('Thermal print failed, falling back to browser print:', printError);
          // Fallback to browser print
          openPrintWindow(receipt, settings);
          toast.info('Receipt opened for printing');
        }
      } else {
        // No printer connected, use browser print
        openPrintWindow(receipt, settings);
        toast.info('Receipt opened for printing');
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print receipt: ' + (error.response?.data?.detail || error.message));
    }
  };

  const openCreditNoteDialog = (transaction) => {
    setSelectedTransaction(transaction);
    // Initialize credit note items with all items from the transaction
    setCreditNoteItems(transaction.items.map(item => ({
      ...item,
      selected: false,
      return_quantity: item.quantity
    })));
    setCreditNoteReason('');
    setShowDetails(false);
    setShowCreditNoteDialog(true);
  };

  const handleCreateCreditNote = async () => {
    const selectedItems = creditNoteItems.filter(item => item.selected && item.return_quantity > 0);
    
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    // Validate quantities
    for (const item of selectedItems) {
      const original = selectedTransaction.items.find(i => i.product_id === item.product_id);
      if (item.return_quantity > original.quantity) {
        toast.error(`Return quantity cannot exceed original quantity for ${item.product_name}`);
        return;
      }
    }

    try {
      const creditNoteData = {
        original_transaction_id: selectedTransaction.id,
        items: selectedItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.return_quantity,
          unit_price: item.unit_price,
          line_total: item.return_quantity * item.unit_price
        })),
        reason: creditNoteReason
      };

      await creditNoteAPI.create(selectedStore.id, creditNoteData);
      toast.success('Credit note created successfully');
      setShowCreditNoteDialog(false);
      loadCreditNotes();
      loadTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create credit note');
    }
  };

  const updateCreditNoteItem = (productId, field, value) => {
    setCreditNoteItems(items => items.map(item => 
      item.product_id === productId ? { ...item, [field]: value } : item
    ));
  };

  const formatCurrency = (amount) => `${currencySymbol}${Math.abs(amount)?.toFixed(2) || '0.00'}`;

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-emerald-100 text-emerald-800',
      voided: 'bg-red-100 text-red-800',
      refunded: 'bg-orange-100 text-orange-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <Badge className={styles[status] || 'bg-slate-100 text-slate-800'}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  if (!selectedStore) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center">
          <p className="text-xl text-slate-500">Please select a store to view transactions</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500">{selectedStore.name} - Sales History</p>
        </div>
        <Button variant="outline" onClick={() => { loadTransactions(); loadCreditNotes(); }}>
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="credit-notes">
            Credit Notes
            {creditNotes.length > 0 && (
              <Badge variant="secondary" className="ml-2">{creditNotes.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          {/* Transactions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-mono text-sm">
                        {txn.receipt_number}
                      </TableCell>
                      <TableCell>
                        <p>{new Date(txn.created_at).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(txn.created_at).toLocaleTimeString()}
                        </p>
                      </TableCell>
                      <TableCell>{txn.items?.length || 0} items</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {txn.payments?.[0]?.method?.toUpperCase() || 'CASH'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        <span className={txn.transaction_type === 'refund' ? 'text-red-600' : 'text-emerald-600'}>
                          {txn.transaction_type === 'refund' ? '-' : ''}{formatCurrency(txn.total)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(txn.status)}</TableCell>
                      <TableCell className="text-sm">{txn.cashier_name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(txn)}
                        >
                          View
                        </Button>
                        {txn.status === 'completed' && txn.transaction_type === 'sale' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCreditNoteDialog(txn)}
                            title="Issue Credit Note"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrint(txn)}
                        >
                          Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit-notes">
          {/* Credit Notes Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note #</TableHead>
                    <TableHead>Original Receipt</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map((cn) => (
                    <TableRow key={cn.id}>
                      <TableCell className="font-mono text-sm">
                        {cn.credit_note_number}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {cn.original_receipt_number}
                      </TableCell>
                      <TableCell>
                        <p>{new Date(cn.created_at).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(cn.created_at).toLocaleTimeString()}
                        </p>
                      </TableCell>
                      <TableCell>{cn.items?.length || 0} items</TableCell>
                      <TableCell className="font-bold text-red-600">
                        -{formatCurrency(cn.total)}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          cn.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                          cn.status === 'used' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-800'
                        }>
                          {cn.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {cn.reason || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {creditNotes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No credit notes found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Receipt: {selectedTransaction?.receipt_number}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Date/Time</span>
                <span>{new Date(selectedTransaction.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cashier</span>
                <span>{selectedTransaction.cashier_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                {getStatusBadge(selectedTransaction.status)}
              </div>
              
              <Separator />
              
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {selectedTransaction.items?.map((item, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.product_name}</span>
                        <span>{formatCurrency(item.unit_price)}</span>
                        <span>x{item.quantity}</span>
                        <span className="font-medium">{formatCurrency(item.line_total)}</span>
                      </div>
                      {item.brand && (
                        <p className="text-xs text-slate-500 mt-1">Brand: {item.brand}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                </div>
                {selectedTransaction.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedTransaction.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Tax (VAT)</span>
                  <span>{formatCurrency(selectedTransaction.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-emerald-600">{formatCurrency(selectedTransaction.total)}</span>
                </div>
              </div>

              {selectedTransaction.voided_reason && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-red-800">Void Reason:</p>
                  <p className="text-sm text-red-600">{selectedTransaction.voided_reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedTransaction?.status === 'completed' && selectedTransaction?.transaction_type === 'sale' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => openCreditNoteDialog(selectedTransaction)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Issue Credit Note
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetails(false);
                    setShowVoidDialog(true);
                  }}
                >
                  Void Transaction
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Transaction</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Reason for voiding..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVoid}>
              Void Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Note Dialog */}
      <Dialog open={showCreditNoteDialog} onOpenChange={setShowCreditNoteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Issue Credit Note
            </DialogTitle>
            <DialogDescription>
              Original Receipt: {selectedTransaction?.receipt_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-500 mb-2">Select items to return (partial return allowed)</p>
            </div>

            <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox 
                        checked={creditNoteItems.every(i => i.selected)}
                        onCheckedChange={(checked) => {
                          setCreditNoteItems(items => items.map(item => ({
                            ...item,
                            selected: checked
                          })));
                        }}
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Orig. Qty</TableHead>
                    <TableHead className="text-right">Return Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNoteItems.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell>
                        <Checkbox 
                          checked={item.selected}
                          onCheckedChange={(checked) => updateCreditNoteItem(item.product_id, 'selected', checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-slate-500">{item.sku}</p>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={item.return_quantity}
                          onChange={(e) => updateCreditNoteItem(item.product_id, 'return_quantity', parseInt(e.target.value) || 0)}
                          className="w-20 text-right"
                          disabled={!item.selected}
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {item.selected ? `-${formatCurrency(item.return_quantity * item.unit_price)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="font-bold">Credit Note Total:</span>
              <span className="text-xl font-bold text-red-600">
                -{formatCurrency(
                  creditNoteItems
                    .filter(i => i.selected)
                    .reduce((sum, i) => sum + (i.return_quantity * i.unit_price), 0)
                )}
              </span>
            </div>

            <div className="space-y-2">
              <Label>Reason for Return</Label>
              <Input
                placeholder="e.g., Defective product, Wrong item, Customer changed mind..."
                value={creditNoteReason}
                onChange={(e) => setCreditNoteReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditNoteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCreditNote}
              className="bg-red-600 hover:bg-red-700"
              disabled={!creditNoteItems.some(i => i.selected && i.return_quantity > 0)}
            >
              Issue Credit Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
