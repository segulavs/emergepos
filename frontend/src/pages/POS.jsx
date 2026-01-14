import React, { useState, useEffect, useRef, useCallback } from 'react';
import { productAPI, transactionAPI, sessionAPI, orgAPI, creditNoteAPI } from '@/lib/api';
import { useStoreSelection, useCartStore, useOfflineStore, useAuthStore } from '@/lib/store';
import { openPrintWindow, getPrinterStatus, connectUSBPrinter, connectRawBTPrinter, printReceipt } from '@/lib/printer';
import { logPrintInfo, logPrintWarn, logPrintError, logPrintDebug, updatePrintLoggerContext } from '@/lib/printLogger';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
import { toast } from 'sonner';
import { Search, ShoppingCart, Banknote, CreditCard, Smartphone, Printer, X, User, Phone, Wifi, WifiOff, Usb, RotateCcw, FileText, Calendar, ClipboardList } from 'lucide-react';

const DEFAULT_PAYMENT_METHODS = [
  { code: 'cash', name: 'Cash', icon: <Banknote className="w-5 h-5" />, requires_reference: false },
  { code: 'card', name: 'Card', icon: <CreditCard className="w-5 h-5" />, requires_reference: true },
  { code: 'mobile_money', name: 'Mobile', icon: <Smartphone className="w-5 h-5" />, requires_reference: true },
];

export function POS() {
  const { selectedStore } = useStoreSelection();
  const { user } = useAuthStore();
  const cart = useCartStore();
  const { isOnline, addPendingTransaction } = useOfflineStore();
  const searchRef = useRef(null);

  // UI State
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Session State
  const [session, setSession] = useState(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');

  // Payment State
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);

  // Customer Info State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Receipt State - Full Screen
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  // Day Report State
  const [showDayReport, setShowDayReport] = useState(false);
  const [dayReport, setDayReport] = useState(null);

  // Credit Note State
  const [showCreditNoteDialog, setShowCreditNoteDialog] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [searchedTransaction, setSearchedTransaction] = useState(null);
  const [creditNoteItems, setCreditNoteItems] = useState([]);
  const [creditNoteReason, setCreditNoteReason] = useState('');
  const [searchingReceipt, setSearchingReceipt] = useState(false);
  const [showCreditNoteReceipt, setShowCreditNoteReceipt] = useState(false);
  const [lastCreditNote, setLastCreditNote] = useState(null);
  const [creatingCreditNote, setCreatingCreditNote] = useState(false);

  // Daily Report State
  const [showDailyReportDialog, setShowDailyReportDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyReport, setDailyReport] = useState(null);
  const [loadingDailyReport, setLoadingDailyReport] = useState(false);

  // Settings
  const [currencySymbol, setCurrencySymbol] = useState('K');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [invoiceLogo, setInvoiceLogo] = useState(null);

  // Load organization settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await orgAPI.getCurrent();
        const settings = response.data?.settings || {};
        setCurrencySymbol(settings.currency_symbol || 'K');
        setAllowNegativeStock(settings.allow_negative_stock || false);
        setInvoiceLogo(settings.invoice_logo || null);
        
        if (settings.payment_methods && settings.payment_methods.length > 0) {
          const configuredMethods = settings.payment_methods
            .filter(pm => pm.is_active)
            .map(pm => {
              const defaultMethod = DEFAULT_PAYMENT_METHODS.find(dm => dm.code === pm.code);
              return {
                ...pm,
                icon: defaultMethod?.icon || <Banknote className="w-5 h-5" />,
                requires_reference: pm.code !== 'cash'
              };
            });
          if (configuredMethods.length > 0) {
            setPaymentMethods(configuredMethods);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Load products
  const loadProducts = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (brandFilter) params.brand = brandFilter;
      
      const response = await productAPI.getWithStock(selectedStore.id, params);
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [selectedStore, search, brandFilter]);

  // Load brands
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await productAPI.getBrands();
        setBrands(response.data || []);
      } catch (error) {
        console.error('Failed to load brands');
      }
    };
    loadBrands();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Check for active session
  useEffect(() => {
    const checkSession = async () => {
      if (!selectedStore) return;
      try {
        const response = await sessionAPI.getCurrent(selectedStore.id);
        setSession(response.data);
        // Update print logger context
        if (response.data) {
          updatePrintLoggerContext(response.data.id, selectedStore.id, user?.id);
        }
        if (!response.data) {
          setShowSessionDialog(true);
        }
      } catch (error) {
        setShowSessionDialog(true);
      }
    };
    checkSession();
  }, [selectedStore, user]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const startSession = async () => {
    try {
      const response = await sessionAPI.start(selectedStore.id, {
        opening_balance: parseFloat(openingBalance) || 0
      });
      setSession(response.data);
      setShowSessionDialog(false);
      toast.success('Session started');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start session');
    }
  };

  const endSession = async () => {
    try {
      const response = await sessionAPI.end(selectedStore.id, {
        closing_balance: parseFloat(closingBalance) || 0
      });
      setSession(null);
      setShowEndSessionDialog(false);
      
      try {
        const reportResponse = await sessionAPI.getReport(response.data.id);
        setDayReport(reportResponse.data);
        setShowDayReport(true);
      } catch (reportError) {
        console.error('Failed to load day report:', reportError);
      }
      
      toast.success('Session ended');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to end session');
    }
  };

  const handleAddToCart = (product) => {
    const stockQty = product.stock_quantity ?? 0;
    const cartItem = cart.items.find(item => item.product_id === product.id);
    const currentCartQty = cartItem?.quantity || 0;

    if (!allowNegativeStock && currentCartQty >= stockQty) {
      toast.error(`Only ${stockQty} in stock`);
      return;
    }

    const price = product.store_selling_price || product.selling_price;
    
    cart.addItem({
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      brand: product.brand || '',
      unit_price: price,
      quantity: 1,
      tax_type: product.tax_type || 'standard',
    });
  };

  const handleQuantityChange = (productId, delta) => {
    const item = cart.items.find(i => i.product_id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      cart.removeItem(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    const stockQty = product?.stock_quantity ?? 0;

    if (!allowNegativeStock && newQty > stockQty) {
      toast.error(`Only ${stockQty} in stock`);
      return;
    }

    cart.updateQuantity(productId, newQty);
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setPaymentAmount(cart.getTotal().toFixed(2));
    setCustomerName('');
    setCustomerPhone('');
    setShowPaymentDialog(true);
  };

  const processPayment = async () => {
    // Validate customer name (mandatory)
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setProcessing(true);
    try {
      const selectedPaymentMethod = paymentMethods.find(pm => pm.code === paymentMethod);
      
      if (selectedPaymentMethod?.requires_reference && !paymentReference) {
        toast.error('Reference number required');
        setProcessing(false);
        return;
      }

      const transactionData = {
        items: cart.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          brand: item.brand || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount || 0,
          discount: item.discount || 0,
          tax_type: item.tax_type || 'standard'
        })),
        payments: [{
          method: paymentMethod,
          amount: parseFloat(paymentAmount),
          reference: paymentReference || null
        }],
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        notes: ''
      };

      let newReceipt = null;
      
      if (isOnline) {
        const response = await transactionAPI.create(selectedStore.id, transactionData);
        // Ensure items have brand field from cart items
        newReceipt = {
          ...response.data,
          items: (response.data.items || []).map(item => {
            // Find matching cart item to preserve brand
            const cartItem = cart.items.find(ci => ci.product_id === item.product_id);
            return {
              ...item,
              brand: item.brand || cartItem?.brand || ''
            };
          }),
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim()
        };
        setLastReceipt(newReceipt);
        setShowReceipt(true);
      } else {
        addPendingTransaction({
          ...transactionData,
          store_id: selectedStore.id,
          created_at: new Date().toISOString()
        });
        toast.info('Saved offline. Will sync when online.');
        newReceipt = {
          receipt_number: `OFF-${Date.now()}`,
          items: cart.items.map(item => ({
            ...item,
            brand: item.brand || ''
          })),
          total: cart.getTotal(),
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          created_at: new Date().toISOString()
        };
        setLastReceipt(newReceipt);
        setShowReceipt(true);
      }
      
      cart.clearCart();
      setShowPaymentDialog(false);
      setPaymentAmount('');
      setPaymentReference('');
      loadProducts();
      
      // Auto-print receipt automatically without confirmations
      if (newReceipt) {
        logPrintInfo('AUTO-PRINT', 'Starting automatic print process', {
          receipt_number: newReceipt.receipt_number,
          total: newReceipt.total,
          items_count: newReceipt.items?.length || 0,
          created_at: newReceipt.created_at
        }, newReceipt.receipt_number, newReceipt.id);
        
        try {
          const printSettings = {
            storeName: selectedStore?.name,
            storeAddress: selectedStore?.address?.city ? `${selectedStore.address.city}, ${selectedStore.address.country}` : '',
            currencySymbol,
            invoiceLogo
          };
          
          logPrintDebug('AUTO-PRINT', 'Print settings configured', printSettings, newReceipt.receipt_number);
          
          const printerStatus = getPrinterStatus();
          const isAndroid = /Android/i.test(navigator.userAgent);
          
          logPrintInfo('AUTO-PRINT', 'Printer status checked', {
            type: printerStatus.type,
            connected: printerStatus.connected,
            serialSupported: printerStatus.serialSupported,
            bluetoothSupported: printerStatus.bluetoothSupported,
            rawbtSupported: printerStatus.rawbtSupported,
            rawbtConnected: printerStatus.rawbtConnected,
            rawbtUrl: printerStatus.rawbtUrl,
            isAndroid: isAndroid,
            window_location: window.location.href
          }, newReceipt.receipt_number);
          
          // Use same simple print mechanism as reports
          printReceiptSimple(newReceipt, printSettings);
        } catch (printError) {
          logPrintError('AUTO-PRINT', 'Fatal error during print process', {
            error: printError.message,
            stack: printError.stack,
            name: printError.name,
            receipt_number: newReceipt.receipt_number
          }, newReceipt.receipt_number);
          // Silently fail - receipt is still shown on screen
        }
      }
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      toast.error(typeof errorDetail === 'string' ? errorDetail : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = async () => {
    if (!lastReceipt) return;
    
    const settings = {
      storeName: selectedStore?.name,
      storeAddress: selectedStore?.address?.city ? `${selectedStore.address.city}, ${selectedStore.address.country}` : '',
      currencySymbol,
      invoiceLogo
    };
    
    // Use same simple print mechanism as reports
    printReceiptSimple(lastReceipt, settings);
  };

  const handleConnectPrinter = async () => {
    try {
      await connectUSBPrinter();
      toast.success('USB Printer connected');
    } catch (error) {
      toast.error('Failed to connect USB printer: ' + error.message);
    }
  };

  const handleConnectRawBT = async () => {
    try {
      // Try default RawBT URL (localhost:8080 on Android)
      // If using a different device/IP, you can pass a custom URL
      await connectRawBTPrinter();
      toast.success('RawBT printer connected');
    } catch (error) {
      toast.error('Failed to connect RawBT printer: ' + error.message + '. Make sure RawBT app is installed and running on your Android device.');
    }
  };

  const formatCurrency = (amount) => `${currencySymbol}${amount?.toFixed(2) || '0.00'}`;

  // Search for receipt to create credit note
  const searchReceipt = async () => {
    if (!receiptSearch.trim()) {
      toast.error('Please enter a receipt number');
      return;
    }
    
    setSearchingReceipt(true);
    try {
      const response = await transactionAPI.getAll({ 
        store_id: selectedStore?.id,
        receipt_number: receiptSearch.trim()
      });
      
      const transactions = response.data;
      const foundTx = transactions.find(tx => 
        tx.receipt_number?.toLowerCase() === receiptSearch.trim().toLowerCase()
      );
      
      if (foundTx) {
        if (foundTx.status === 'voided') {
          toast.error('Cannot create credit note for voided transaction');
          return;
        }
        if (foundTx.transaction_type !== 'sale') {
          toast.error('Can only create credit note for sale transactions');
          return;
        }
        setSearchedTransaction(foundTx);
        setCreditNoteItems(foundTx.items.map(item => ({
          ...item,
          selected: false,
          return_quantity: item.quantity
        })));
      } else {
        toast.error('Receipt not found');
        setSearchedTransaction(null);
      }
    } catch (error) {
      toast.error('Failed to search receipt');
    } finally {
      setSearchingReceipt(false);
    }
  };

  // Create credit note
  const handleCreateCreditNote = async () => {
    const selectedItems = creditNoteItems.filter(item => item.selected && item.return_quantity > 0);
    
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    for (const item of selectedItems) {
      const original = searchedTransaction.items.find(i => i.product_id === item.product_id);
      if (item.return_quantity > original.quantity) {
        toast.error(`Return quantity cannot exceed original quantity for ${item.product_name}`);
        return;
      }
    }

    setCreatingCreditNote(true);
    try {
      const itemsForApi = selectedItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.return_quantity,
        unit_price: item.unit_price,
        line_total: item.return_quantity * item.unit_price
      }));

      const creditNoteData = {
        original_transaction_id: searchedTransaction.id,
        items: itemsForApi,
        reason: creditNoteReason
      };

      // Create credit note
      const creditNoteResponse = await creditNoteAPI.create(selectedStore.id, creditNoteData);
      const creditNote = creditNoteResponse.data;

      // Also create a refund transaction so it appears in Transactions list
      try {
        await transactionAPI.refund(searchedTransaction.id, creditNoteReason || 'Credit Note Issued', itemsForApi);
      } catch (refundError) {
        // Refund transaction creation is optional - credit note is the main record
        console.warn('Refund transaction creation failed:', refundError);
      }

      // Prepare receipt data for display
      const creditNoteReceipt = {
        credit_note_number: creditNote.credit_note_number,
        original_receipt_number: creditNote.original_receipt_number || searchedTransaction.receipt_number,
        items: itemsForApi,
        subtotal: creditNote.subtotal,
        tax_amount: creditNote.tax_amount,
        total: creditNote.total,
        reason: creditNoteReason,
        customer_name: searchedTransaction.customer_name,
        customer_phone: searchedTransaction.customer_phone,
        created_at: creditNote.created_at || new Date().toISOString(),
        issued_by_name: creditNote.issued_by_name || `${user?.first_name} ${user?.last_name}`
      };

      setLastCreditNote(creditNoteReceipt);
      setShowCreditNoteDialog(false);
      setShowCreditNoteReceipt(true);
      toast.success(`Credit note ${creditNote.credit_note_number} created successfully`);
      loadProducts(); // Refresh stock
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create credit note');
    } finally {
      setCreatingCreditNote(false);
    }
  };

  const resetCreditNoteForm = () => {
    setReceiptSearch('');
    setSearchedTransaction(null);
    setCreditNoteItems([]);
    setCreditNoteReason('');
  };

  // Print credit note receipt
  const printCreditNoteReceipt = () => {
    if (!lastCreditNote) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Credit Note - ${lastCreditNote.credit_note_number}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 20px; }
          h1 { font-size: 16px; text-align: center; margin-bottom: 5px; }
          .header { text-align: center; margin-bottom: 15px; }
          .logo { max-height: 50px; max-width: 150px; margin: 0 auto 10px; display: block; }
          .credit-badge { background: #dc2626; color: white; padding: 5px 10px; display: inline-block; font-weight: bold; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .row.total { font-weight: bold; border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; font-size: 14px; }
          .item { margin: 8px 0; padding-bottom: 5px; border-bottom: 1px dotted #ccc; }
          .item-name { font-weight: bold; }
          .item-detail { font-size: 11px; color: #666; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .customer { background: #f5f5f5; padding: 8px; margin: 10px 0; }
          .reason { background: #fef2f2; padding: 8px; margin: 10px 0; border-left: 3px solid #dc2626; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${invoiceLogo ? `<img src="${invoiceLogo}" alt="Logo" class="logo" />` : ''}
          <h1>${selectedStore?.name}</h1>
          <p>${selectedStore?.address?.city || ''}, ${selectedStore?.address?.country || ''}</p>
          <div class="credit-badge">CREDIT NOTE</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="row"><span>Credit Note #:</span><span><strong>${lastCreditNote.credit_note_number}</strong></span></div>
        <div class="row"><span>Original Receipt:</span><span>${lastCreditNote.original_receipt_number}</span></div>
        <div class="row"><span>Date:</span><span>${new Date(lastCreditNote.created_at).toLocaleString()}</span></div>
        <div class="row"><span>Issued By:</span><span>${lastCreditNote.issued_by_name}</span></div>
        
        ${lastCreditNote.customer_name ? `
        <div class="customer">
          <strong>Customer:</strong> ${lastCreditNote.customer_name}
          ${lastCreditNote.customer_phone ? `<br>Phone: ${lastCreditNote.customer_phone}` : ''}
        </div>
        ` : ''}
        
        <div class="divider"></div>
        <p style="text-align: center; font-weight: bold;">RETURNED ITEMS</p>
        
        ${lastCreditNote.items.map(item => `
          <div class="item">
            <div class="row">
              <span class="item-name">${item.product_name}</span>
              <span>${currencySymbol}${item.unit_price.toFixed(2)}</span>
              <span>x${item.quantity}</span>
              <span style="color: #dc2626;">-${currencySymbol}${item.line_total.toFixed(2)}</span>
            </div>
            <div class="item-detail">Brand: ${item.brand || 'N/A'}</div>
          </div>
        `).join('')}
        
        <div class="divider"></div>
        
        <div class="row"><span>Subtotal:</span><span>-${currencySymbol}${lastCreditNote.subtotal?.toFixed(2) || lastCreditNote.total?.toFixed(2)}</span></div>
        ${lastCreditNote.tax_amount > 0 ? `<div class="row"><span>Tax:</span><span>-${currencySymbol}${lastCreditNote.tax_amount.toFixed(2)}</span></div>` : ''}
        <div class="row total"><span>CREDIT TOTAL:</span><span style="color: #dc2626;">-${currencySymbol}${lastCreditNote.total.toFixed(2)}</span></div>
        
        ${lastCreditNote.reason ? `
        <div class="reason">
          <strong>Reason:</strong> ${lastCreditNote.reason}
        </div>
        ` : ''}
        
        <div class="divider"></div>
        <p style="text-align: center; font-size: 10px;">This credit note can be used for future purchases</p>
        <p style="text-align: center; font-size: 10px;">Powered by NG POS</p>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const updateCreditNoteItem = (productId, field, value) => {
    setCreditNoteItems(items => items.map(item => 
      item.product_id === productId ? { ...item, [field]: value } : item
    ));
  };

  // Load daily report
  const loadDailyReport = async () => {
    if (!selectedStore) return;
    
    setLoadingDailyReport(true);
    try {
      // Get all sessions for the selected date
      const response = await sessionAPI.getAll(selectedStore.id);
      const allSessions = response.data || [];
      
      // Filter sessions for the selected date
      const dateStart = new Date(selectedDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(selectedDate);
      dateEnd.setHours(23, 59, 59, 999);
      
      const daySessions = allSessions.filter(s => {
        const sessionDate = new Date(s.started_at);
        return sessionDate >= dateStart && sessionDate <= dateEnd;
      });
      
      if (daySessions.length === 0) {
        setDailyReport(null);
        toast.info('No sessions found for this date');
        return;
      }
      
      // Aggregate data from all sessions
      let totalSales = 0;
      let totalTransactions = 0;
      const paymentSummary = {};
      const productsSold = {};
      
      for (const session of daySessions) {
        try {
          if (session.ended_at) {
            const reportResponse = await sessionAPI.getReport(session.id);
            const report = reportResponse.data;
            
            totalSales += report.total_sales || 0;
            totalTransactions += report.transaction_count || 0;
            
            // Aggregate payment methods
            (report.payment_summary || []).forEach(pm => {
              if (!paymentSummary[pm.method]) {
                paymentSummary[pm.method] = { 
                  method: pm.method, 
                  method_name: pm.method_name, 
                  total_amount: 0, 
                  transaction_count: 0 
                };
              }
              paymentSummary[pm.method].total_amount += pm.total_amount;
              paymentSummary[pm.method].transaction_count += pm.transaction_count;
            });
            
            // Aggregate products
            (report.products_sold || []).forEach(p => {
              if (!productsSold[p.product_id]) {
                productsSold[p.product_id] = { 
                  product_id: p.product_id, 
                  product_name: p.product_name, 
                  quantity_sold: 0, 
                  total_revenue: 0 
                };
              }
              productsSold[p.product_id].quantity_sold += p.quantity_sold;
              productsSold[p.product_id].total_revenue += p.total_revenue;
            });
          }
        } catch (e) {
          console.error('Failed to get session report:', e);
        }
      }
      
      setDailyReport({
        date: selectedDate,
        session_count: daySessions.length,
        total_sales: totalSales,
        transaction_count: totalTransactions,
        payment_summary: Object.values(paymentSummary),
        products_sold: Object.values(productsSold).sort((a, b) => b.total_revenue - a.total_revenue)
      });
    } catch (error) {
      toast.error('Failed to load daily report');
    } finally {
      setLoadingDailyReport(false);
    }
  };

  // Print receipt using same mechanism as reports
  const printReceiptSimple = (receipt, settings = {}) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const receiptCurrencySymbol = settings.currencySymbol || currencySymbol || 'K';
    const formatCurrency = (amount) => `${receiptCurrencySymbol}${(amount || 0).toFixed(2)}`;
    const total = receipt.total || receipt.items?.reduce((sum, i) => sum + (i.line_total || i.quantity * i.unit_price), 0) || 0;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receipt.receipt_number}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            width: 80mm; 
            margin: 0 auto; 
            padding: 5mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .right { text-align: right; }
          .separator { border-top: 1px dashed #000; margin: 5px 0; }
          .header { font-size: 16px; font-weight: bold; }
          .item { display: flex; justify-content: space-between; }
          .item-detail { padding-left: 10px; color: #666; }
          .total { font-size: 14px; font-weight: bold; margin-top: 10px; }
          .logo { max-height: 50px; max-width: 150px; margin: 0 auto 10px; display: block; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        ${settings.invoiceLogo ? `<img src="${settings.invoiceLogo}" alt="Logo" class="logo" />` : ''}
        <div class="center header">${settings.storeName || selectedStore?.name || 'Store'}</div>
        ${settings.storeAddress ? `<div class="center">${settings.storeAddress}</div>` : ''}
        <div class="separator"></div>
        <div>Receipt: ${receipt.receipt_number}</div>
        <div>Date: ${new Date(receipt.created_at).toLocaleString()}</div>
        ${receipt.cashier_name ? `<div>Cashier: ${receipt.cashier_name}</div>` : ''}
        <div class="separator"></div>
        ${receipt.customer_name ? `
          <div class="bold">Customer: ${receipt.customer_name}</div>
          ${receipt.customer_phone ? `<div>Phone: ${receipt.customer_phone}</div>` : ''}
          <div class="separator"></div>
        ` : ''}
        ${(receipt.items || []).map(item => `
          <div class="item">
            <div>
              <div>${item.product_name} ${formatCurrency(item.unit_price)} x${item.quantity} ${formatCurrency(item.line_total || item.quantity * item.unit_price)}</div>
              <div class="item-detail">Brand: ${item.brand || 'N/A'}</div>
            </div>
          </div>
        `).join('')}
        <div class="separator"></div>
        <div class="item total">
          <span>TOTAL:</span>
          <span>${formatCurrency(total)}</span>
        </div>
        ${receipt.payments?.[0] ? `
          <div class="item">
            <span>Paid (${receipt.payments[0].method.toUpperCase()}):</span>
            <span>${formatCurrency(receipt.payments[0].amount)}</span>
          </div>
          ${receipt.payments[0].amount > total ? `
            <div class="item">
              <span>Change:</span>
              <span>${formatCurrency(receipt.payments[0].amount - total)}</span>
            </div>
          ` : ''}
        ` : ''}
        <div class="separator"></div>
        <div class="center">Thank you for your purchase!</div>
        <div class="center" style="font-size: 10px; margin-top: 5px;">Powered by NG POS</div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Print session report
  const printSessionReport = (report, title = 'Session Report') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 20px; }
          h1 { font-size: 16px; text-align: center; margin-bottom: 5px; }
          h2 { font-size: 14px; text-align: center; margin: 10px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; }
          .header { text-align: center; margin-bottom: 15px; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .row.total { font-weight: bold; border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; }
          .section { margin: 15px 0; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${selectedStore?.name}</h1>
          <p>${title}</p>
          <p>${report.date ? new Date(report.date).toLocaleDateString() : new Date().toLocaleString()}</p>
        </div>
        
        <div class="divider"></div>
        
        ${report.opening_balance !== undefined ? `
        <div class="section">
          <div class="row"><span>Opening Balance:</span><span>${formatCurrency(report.opening_balance)}</span></div>
          <div class="row"><span>Total Sales:</span><span>${formatCurrency(report.total_sales)}</span></div>
          <div class="row"><span>Closing Balance:</span><span>${formatCurrency(report.closing_balance)}</span></div>
          <div class="row ${report.variance >= 0 ? '' : 'text-red'}"><span>Variance:</span><span>${formatCurrency(report.variance)}</span></div>
        </div>
        ` : `
        <div class="section">
          <div class="row"><span>Sessions:</span><span>${report.session_count || 0}</span></div>
          <div class="row"><span>Transactions:</span><span>${report.transaction_count || 0}</span></div>
          <div class="row total"><span>Total Sales:</span><span>${formatCurrency(report.total_sales)}</span></div>
        </div>
        `}
        
        <h2>Payment Summary</h2>
        <div class="section">
          ${(report.payment_summary || []).map(pm => `
            <div class="row">
              <span>${pm.method_name} (${pm.transaction_count})</span>
              <span>${formatCurrency(pm.total_amount)}</span>
            </div>
          `).join('')}
        </div>
        
        <h2>Top Products</h2>
        <div class="section">
          ${(report.products_sold || []).slice(0, 10).map(p => `
            <div class="row">
              <span>${p.product_name} x${p.quantity_sold}</span>
              <span>${formatCurrency(p.total_revenue)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="divider"></div>
        <p style="text-align: center; font-size: 10px;">Printed: ${new Date().toLocaleString()}</p>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (!selectedStore) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="p-6 text-center">
          <p className="text-lg text-slate-500">Please select a store</p>
        </Card>
      </div>
    );
  }

  // Full Screen Receipt View
  if (showReceipt && lastReceipt) {
    const printerStatus = getPrinterStatus();
    
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col print:block">
        {/* Receipt Header - Hidden in print */}
        <div className="flex items-center justify-between p-3 bg-slate-900 text-white print:hidden">
          <h2 className="text-lg font-bold">Receipt</h2>
          <div className="flex gap-2 flex-wrap">
            {printerStatus.serialSupported && !printerStatus.connected && (
              <Button onClick={handleConnectPrinter} variant="outline" className="text-white border-white hover:bg-slate-800">
                <Usb className="w-4 h-4 mr-2" /> Connect USB
              </Button>
            )}
            {printerStatus.rawbtSupported && !printerStatus.connected && (
              <Button onClick={handleConnectRawBT} variant="outline" className="text-white border-white hover:bg-slate-800">
                <Printer className="w-4 h-4 mr-2" /> Connect RawBT
              </Button>
            )}
            {printerStatus.connected && (
              <Badge className="bg-emerald-600 mr-2">
                {printerStatus.type === 'rawbt' ? 'RawBT Connected' : printerStatus.type === 'usb' ? 'USB Printer Connected' : 'Printer Connected'}
              </Badge>
            )}
            <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" onClick={() => setShowReceipt(false)} className="text-white border-white hover:bg-slate-800">
              <X className="w-4 h-4 mr-2" /> Close
            </Button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-auto p-4 flex justify-center">
          <div className="w-full max-w-md bg-white border-2 border-slate-200 rounded-lg p-6 font-mono text-sm print:border-0 print:max-w-full">
            {/* Store Header with Logo */}
            <div className="text-center mb-4">
              {invoiceLogo && (
                <div className="flex justify-center mb-3">
                  <img 
                    src={invoiceLogo} 
                    alt="Logo" 
                    className="max-h-16 max-w-32 object-contain"
                  />
                </div>
              )}
              <h1 className="text-xl font-bold">{selectedStore?.name}</h1>
              <p className="text-xs text-slate-500">{selectedStore?.address?.city}, {selectedStore?.address?.country}</p>
            </div>

            <div className="border-t border-dashed border-slate-300 my-3" />

            {/* Receipt Info */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-bold">{lastReceipt.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(lastReceipt.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{user?.first_name} {user?.last_name}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-3" />

            {/* Customer Info */}
            <div className="bg-slate-50 p-2 rounded mb-3">
              <p className="font-bold">Customer: {lastReceipt.customer_name}</p>
              {lastReceipt.customer_phone && (
                <p className="text-xs">Phone: {lastReceipt.customer_phone}</p>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 my-3" />

            {/* Items */}
            <div className="space-y-3">
              {(lastReceipt.items || []).map((item, idx) => {
                // Ensure brand is always available
                const brandValue = (item.brand !== undefined && item.brand !== null && String(item.brand).trim() !== '') 
                  ? String(item.brand).trim() 
                  : 'N/A';
                return (
                  <div key={idx} className="text-xs border-b border-slate-100 pb-2">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{item.product_name}</span>
                      <span>{formatCurrency(item.unit_price)}</span>
                      <span>x{item.quantity}</span>
                      <span className="font-bold">{formatCurrency(item.line_total || item.quantity * item.unit_price)}</span>
                    </div>
                    <p className="text-slate-500 mt-1 ml-0">Brand: {brandValue}</p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-slate-300 my-3" />

            {/* Totals */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(lastReceipt.subtotal || lastReceipt.total)}</span>
              </div>
              {lastReceipt.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{formatCurrency(lastReceipt.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold mt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(lastReceipt.total)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-3" />

            {/* Payment */}
            <div className="text-xs">
              <p>Payment: {lastReceipt.payments?.[0]?.method?.toUpperCase() || 'CASH'}</p>
              {lastReceipt.payments?.[0]?.reference && (
                <p>Ref: {lastReceipt.payments[0].reference}</p>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 my-3" />

            {/* Footer */}
            <div className="text-center text-xs text-slate-500">
              <p>Thank you for your purchase!</p>
              <p className="mt-2">Powered by NG POS</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full Screen Credit Note Receipt View
  if (showCreditNoteReceipt && lastCreditNote) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col print:block">
        {/* Credit Note Header - Hidden in print */}
        <div className="flex items-center justify-between p-3 bg-red-700 text-white print:hidden">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Credit Note Receipt
          </h2>
          <div className="flex gap-2">
            <Button onClick={printCreditNoteReceipt} className="bg-white text-red-700 hover:bg-red-50">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { setShowCreditNoteReceipt(false); resetCreditNoteForm(); }} 
              className="text-white border-white hover:bg-red-800"
            >
              <X className="w-4 h-4 mr-2" /> Close
            </Button>
          </div>
        </div>

        {/* Credit Note Content */}
        <div className="flex-1 overflow-auto p-4 flex justify-center bg-slate-100">
          <div className="w-full max-w-md bg-white border-2 border-red-200 rounded-lg p-6 font-mono text-sm print:border-0 print:max-w-full">
            {/* Store Header with Logo */}
            <div className="text-center mb-4">
              {invoiceLogo && (
                <div className="flex justify-center mb-3">
                  <img 
                    src={invoiceLogo} 
                    alt="Logo" 
                    className="max-h-16 max-w-32 object-contain"
                  />
                </div>
              )}
              <h1 className="text-xl font-bold">{selectedStore?.name}</h1>
              <p className="text-xs text-slate-500">{selectedStore?.address?.city}, {selectedStore?.address?.country}</p>
              <div className="bg-red-600 text-white font-bold py-2 px-4 rounded mt-3 inline-block">
                CREDIT NOTE
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-3" />

            {/* Credit Note Info */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Credit Note #:</span>
                <span className="font-bold text-red-600">{lastCreditNote.credit_note_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Original Receipt:</span>
                <span>{lastCreditNote.original_receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(lastCreditNote.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Issued By:</span>
                <span>{lastCreditNote.issued_by_name}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-3" />

            {/* Customer Info */}
            {lastCreditNote.customer_name && (
              <>
                <div className="bg-slate-50 p-2 rounded mb-3">
                  <p className="font-bold">Customer: {lastCreditNote.customer_name}</p>
                  {lastCreditNote.customer_phone && (
                    <p className="text-xs">Phone: {lastCreditNote.customer_phone}</p>
                  )}
                </div>
                <div className="border-t border-dashed border-slate-300 my-3" />
              </>
            )}

            {/* Returned Items */}
            <p className="font-bold text-center text-sm mb-2 text-red-600">RETURNED ITEMS</p>
            <div className="space-y-2">
              {lastCreditNote.items.map((item, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">{item.product_name}</span>
                    <span>{formatCurrency(item.unit_price)}</span>
                    <span>x{item.quantity}</span>
                    <span className="font-bold text-red-600">-{formatCurrency(item.line_total)}</span>
                  </div>
                  <p className="text-slate-500 mt-1">Brand: {item.brand || 'N/A'}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-300 my-3" />

            {/* Totals */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="text-red-600">-{formatCurrency(lastCreditNote.subtotal || lastCreditNote.total)}</span>
              </div>
              {lastCreditNote.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span className="text-red-600">-{formatCurrency(lastCreditNote.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold mt-2 bg-red-50 p-2 rounded">
                <span>CREDIT TOTAL:</span>
                <span className="text-red-600">-{formatCurrency(lastCreditNote.total)}</span>
              </div>
            </div>

            {/* Reason */}
            {lastCreditNote.reason && (
              <>
                <div className="border-t border-dashed border-slate-300 my-3" />
                <div className="bg-red-50 p-2 rounded border-l-4 border-red-500">
                  <p className="text-xs font-bold">Reason for Return:</p>
                  <p className="text-xs">{lastCreditNote.reason}</p>
                </div>
              </>
            )}

            <div className="border-t border-dashed border-slate-300 my-3" />

            {/* Footer */}
            <div className="text-center text-xs text-slate-500">
              <p>This credit note can be used for future purchases</p>
              <p className="mt-2">Powered by NG POS</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main POS Interface - Optimized for 7" tablet landscape (1024x600)
  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4 ml-12">
          <span className="text-sm font-medium">{selectedStore?.name}</span>
          <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
            {isOnline ? <><Wifi className="w-3 h-3 mr-1" /> Online</> : <><WifiOff className="w-3 h-3 mr-1" /> Offline</>}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-white border-slate-600 hover:bg-slate-800"
            onClick={() => { setShowCreditNoteDialog(true); resetCreditNoteForm(); }}
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Credit Note
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="text-white border-slate-600 hover:bg-slate-800"
            onClick={() => { setShowDailyReportDialog(true); setDailyReport(null); }}
          >
            <Calendar className="w-4 h-4 mr-1" /> Daily Report
          </Button>
          {session && (
            <Button size="sm" variant="destructive" onClick={() => setShowEndSessionDialog(true)}>
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Products */}
        <div className="flex-1 flex flex-col p-2 min-w-0">
          {/* Search & Filter */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                ref={searchRef}
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={brandFilter || "all"} onValueChange={(v) => setBrandFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products List - Clickable rows */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1 pr-2">
              {products.map((product) => {
                const isOutOfStock = !allowNegativeStock && (product.stock_quantity ?? 0) <= 0;
                const displayPrice = product.store_selling_price || product.selling_price;
                const cartItem = cart.items.find(item => item.product_id === product.id);
                const inCart = cartItem?.quantity || 0;
                
                return (
                  <button
                    key={product.id}
                    onClick={() => !isOutOfStock && handleAddToCart(product)}
                    disabled={isOutOfStock}
                    className={`flex items-center gap-3 p-3 bg-white rounded-lg border text-left transition-all ${
                      isOutOfStock 
                        ? 'opacity-50 cursor-not-allowed border-slate-200' 
                        : 'hover:border-emerald-500 hover:bg-emerald-50 active:scale-[0.99] border-slate-200'
                    } ${inCart > 0 ? 'ring-2 ring-emerald-400 bg-emerald-50' : ''}`}
                  >
                    {/* Product Icon/Thumbnail */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isOutOfStock ? 'bg-slate-100' : 'bg-emerald-100'
                    }`}>
                      <span className="text-lg">{product.name.charAt(0).toUpperCase()}</span>
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-slate-500 truncate">{product.brand || product.sku}</p>
                    </div>
                    
                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <span className="text-emerald-600 font-bold text-sm block">{formatCurrency(displayPrice)}</span>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <Badge variant={isOutOfStock ? "destructive" : "secondary"} className="text-xs px-1.5">
                          {isOutOfStock ? 'Out' : `${product.stock_quantity} in stock`}
                        </Badge>
                        {inCart > 0 && (
                          <Badge className="bg-emerald-600 text-xs px-1.5">
                            {inCart} in cart
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {products.length === 0 && !loading && (
                <div className="text-center py-8 text-slate-500">
                  No products found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Cart */}
        <div className="w-72 bg-white border-l flex flex-col flex-shrink-0">
          {/* Cart Header */}
          <div className="p-2 bg-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-bold text-sm">Cart ({cart.items.length})</span>
            </div>
            {cart.items.length > 0 && (
              <Button size="sm" variant="ghost" className="text-white h-6 px-2 text-xs" onClick={() => cart.clearCart()}>
                Clear
              </Button>
            )}
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {cart.items.map((item) => (
                <div key={item.product_id} className="bg-slate-50 rounded p-2">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium truncate flex-1 pr-2">{item.product_name}</p>
                    <button
                      onClick={() => cart.removeItem(item.product_id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs" onClick={() => handleQuantityChange(item.product_id, -1)}>-</Button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-xs" onClick={() => handleQuantityChange(item.product_id, 1)}>+</Button>
                    </div>
                    <span className="text-emerald-600 font-bold text-sm">{formatCurrency(item.line_total)}</span>
                  </div>
                </div>
              ))}
              {cart.items.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Cart is empty
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Cart Footer */}
          <div className="border-t p-2 bg-slate-50 space-y-2">
            {/* Payment Method Buttons */}
            <div className="grid grid-cols-3 gap-1">
              {paymentMethods.map((method) => (
                <Button
                  key={method.code}
                  size="sm"
                  variant={paymentMethod === method.code ? 'default' : 'outline'}
                  className={`h-8 text-xs ${paymentMethod === method.code ? 'bg-emerald-600' : ''}`}
                  onClick={() => setPaymentMethod(method.code)}
                >
                  {method.icon}
                </Button>
              ))}
            </div>

            {/* Total & Pay */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-xl font-bold text-emerald-600">{formatCurrency(cart.getTotal())}</span>
            </div>
            <Button
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-base font-bold"
              onClick={handleCheckout}
              disabled={cart.items.length === 0 || !session}
            >
              Pay {formatCurrency(cart.getTotal())}
            </Button>
          </div>
        </div>
      </div>

      {/* Session Start Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Start Session</DialogTitle>
            <DialogDescription>Enter opening cash balance</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Opening Balance ({currencySymbol})</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={startSession} className="w-full bg-emerald-600">Start Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Session Dialog */}
      <Dialog open={showEndSessionDialog} onOpenChange={setShowEndSessionDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>End Session</DialogTitle>
            <DialogDescription>Count cash and enter closing balance</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="bg-slate-100 p-3 rounded">
              <p className="text-xs text-slate-500">Expected Balance</p>
              <p className="text-xl font-bold">{formatCurrency((session?.opening_balance || 0) + (session?.total_sales || 0))}</p>
            </div>
            <div>
              <Label>Closing Balance ({currencySymbol})</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEndSessionDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={endSession}>End Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog with Customer Info */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>Total: <span className="font-bold text-emerald-600 text-lg">{formatCurrency(cart.getTotal())}</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="bg-slate-50 p-3 rounded-lg space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <User className="w-4 h-4" /> Customer Information
              </h4>
              <div>
                <Label className="text-xs">Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Customer name (required)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone (optional)
                </Label>
                <Input
                  placeholder="Phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-xs">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.code}
                    type="button"
                    variant={paymentMethod === method.code ? 'default' : 'outline'}
                    className={paymentMethod === method.code ? 'bg-emerald-600' : ''}
                    onClick={() => setPaymentMethod(method.code)}
                  >
                    {method.icon}
                    <span className="ml-1 text-xs">{method.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {paymentMethods.find(pm => pm.code === paymentMethod)?.requires_reference && (
              <div>
                <Label className="text-xs">Reference Number</Label>
                <Input
                  placeholder="Transaction reference..."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            
            <div>
              <Label className="text-xs">Amount Received ({currencySymbol})</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="mt-1 text-lg"
              />
            </div>

            {parseFloat(paymentAmount) > cart.getTotal() && paymentMethod === 'cash' && (
              <div className="bg-emerald-50 p-3 rounded-lg text-center">
                <p className="text-xs text-slate-600">Change Due</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(parseFloat(paymentAmount) - cart.getTotal())}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button 
              onClick={processPayment} 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={processing || parseFloat(paymentAmount) < cart.getTotal() || !customerName.trim()}
            >
              {processing ? 'Processing...' : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day Report Dialog (End of Session) */}
      <Dialog open={showDayReport} onOpenChange={setShowDayReport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Session End Report
            </DialogTitle>
          </DialogHeader>
          {dayReport && (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-100 p-2 rounded">
                  <p className="text-xs text-slate-500">Opening</p>
                  <p className="font-bold">{formatCurrency(dayReport.opening_balance)}</p>
                </div>
                <div className="bg-emerald-100 p-2 rounded">
                  <p className="text-xs text-slate-500">Sales</p>
                  <p className="font-bold text-emerald-700">{formatCurrency(dayReport.total_sales)}</p>
                </div>
                <div className="bg-slate-100 p-2 rounded">
                  <p className="text-xs text-slate-500">Closing</p>
                  <p className="font-bold">{formatCurrency(dayReport.closing_balance)}</p>
                </div>
                <div className={`p-2 rounded ${dayReport.variance >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <p className="text-xs text-slate-500">Variance</p>
                  <p className={`font-bold ${dayReport.variance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(dayReport.variance)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-2">Payment Summary</h4>
                {dayReport.payment_summary.map((pm) => (
                  <div key={pm.method} className="flex justify-between text-sm py-1 border-b">
                    <span>{pm.method_name} ({pm.transaction_count})</span>
                    <span className="font-bold">{formatCurrency(pm.total_amount)}</span>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-bold text-sm mb-2">Top Products</h4>
                {dayReport.products_sold.slice(0, 5).map((p) => (
                  <div key={p.product_id} className="flex justify-between text-sm py-1 border-b">
                    <span>{p.product_name} (x{p.quantity_sold})</span>
                    <span className="font-bold">{formatCurrency(p.total_revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => dayReport && printSessionReport(dayReport, 'Session End Report')}
              disabled={!dayReport}
            >
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" onClick={() => setShowDayReport(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Note Dialog */}
      <Dialog open={showCreditNoteDialog} onOpenChange={setShowCreditNoteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Create Credit Note
            </DialogTitle>
            <DialogDescription>
              Search for an existing receipt to create a credit note (return/refund)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Receipt Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Enter receipt number (e.g., RCP-20240101-0001)"
                  value={receiptSearch}
                  onChange={(e) => setReceiptSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchReceipt()}
                  className="pl-9"
                />
              </div>
              <Button onClick={searchReceipt} disabled={searchingReceipt}>
                {searchingReceipt ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {/* Found Transaction */}
            {searchedTransaction && (
              <>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Receipt:</span>
                    <span className="font-mono font-bold">{searchedTransaction.receipt_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Date:</span>
                    <span>{new Date(searchedTransaction.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Customer:</span>
                    <span>{searchedTransaction.customer_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Original Total:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(searchedTransaction.total)}</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">Select items to return (you can adjust quantities for partial returns)</p>
                </div>

                <ScrollArea className="h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox 
                            checked={creditNoteItems.length > 0 && creditNoteItems.every(i => i.selected)}
                            onCheckedChange={(checked) => {
                              setCreditNoteItems(items => items.map(item => ({
                                ...item,
                                selected: checked
                              })));
                            }}
                          />
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Orig Qty</TableHead>
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
                            <p className="font-medium text-sm">{item.product_name}</p>
                            <p className="text-xs text-slate-500">{item.sku}</p>
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              max={item.quantity}
                              value={item.return_quantity}
                              onChange={(e) => updateCreditNoteItem(item.product_id, 'return_quantity', parseInt(e.target.value) || 0)}
                              className="w-16 text-right h-8"
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
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreditNoteDialog(false)}>
              Cancel
            </Button>
            {searchedTransaction && (
              <Button 
                onClick={handleCreateCreditNote}
                className="bg-red-600 hover:bg-red-700"
                disabled={creatingCreditNote || !creditNoteItems.some(i => i.selected && i.return_quantity > 0)}
              >
                {creatingCreditNote ? 'Creating...' : 'Create Credit Note'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Report Dialog */}
      <Dialog open={showDailyReportDialog} onOpenChange={setShowDailyReportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Daily Sales Report
            </DialogTitle>
            <DialogDescription>
              View and print sales report for any date
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Date Selector */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Select Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadDailyReport} disabled={loadingDailyReport}>
                  {loadingDailyReport ? 'Loading...' : 'Load Report'}
                </Button>
              </div>
            </div>

            {/* Daily Report Content */}
            {dailyReport && (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <h3 className="font-bold text-emerald-800 mb-2">
                    {new Date(dailyReport.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500">Sessions</p>
                      <p className="font-bold">{dailyReport.session_count}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Transactions</p>
                      <p className="font-bold">{dailyReport.transaction_count}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Total Sales</p>
                      <p className="font-bold text-emerald-700">{formatCurrency(dailyReport.total_sales)}</p>
                    </div>
                  </div>
                </div>

                {dailyReport.payment_summary.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2">Payment Methods</h4>
                    {dailyReport.payment_summary.map((pm) => (
                      <div key={pm.method} className="flex justify-between text-sm py-1 border-b">
                        <span>{pm.method_name} ({pm.transaction_count} txns)</span>
                        <span className="font-bold">{formatCurrency(pm.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {dailyReport.products_sold.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2">Top Selling Products</h4>
                    {dailyReport.products_sold.slice(0, 10).map((p) => (
                      <div key={p.product_id} className="flex justify-between text-sm py-1 border-b">
                        <span>{p.product_name} (x{p.quantity_sold})</span>
                        <span className="font-bold">{formatCurrency(p.total_revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!dailyReport && !loadingDailyReport && (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Select a date and click "Load Report" to view sales data</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => dailyReport && printSessionReport(dailyReport, `Daily Report - ${new Date(dailyReport.date).toLocaleDateString()}`)}
              disabled={!dailyReport}
            >
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" onClick={() => setShowDailyReportDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
