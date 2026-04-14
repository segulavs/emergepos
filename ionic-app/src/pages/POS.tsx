import { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
  IonSpinner,
  IonIcon,
  IonBadge,
  IonModal,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { add, remove, trash, checkmark, cash, card, phonePortrait, print, close } from 'ionicons/icons';
import { useCartStore, useStoreSelection } from '../lib/store';
import { productAPI, transactionAPI, orgAPI } from '../lib/api';

const POS: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [error, setError] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('K');
  const history = useHistory();
  const { items, addItem, updateQuantity, removeItem, clearCart, getSubtotal, getTotal } = useCartStore();
  const { selectedStore } = useStoreSelection();

  useEffect(() => {
    if (selectedStore) {
      loadProducts();
    } else {
      setLoading(false);
    }
    loadOrganizationSettings();
  }, [selectedStore]);

  const loadOrganizationSettings = async () => {
    try {
      const response = await orgAPI.getCurrent();
      const settings = response.data?.settings || {};
      setCurrencySymbol(settings.currency_symbol || 'K');
    } catch (error) {
      console.error('Failed to load organization settings:', error);
    }
  };

  const loadProducts = async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const response = await productAPI.getWithStock(selectedStore.id, { search: searchTerm });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    if (!selectedStore || items.length === 0) {
      setError('Please add items to cart');
      return;
    }
    
    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }
    
    // Reset form
    setCustomerName('');
    setPaymentReference('');
    setError('');
    setShowPaymentDialog(true);
  };

  const processPayment = async () => {
    if (!selectedStore) {
      setError('No store selected');
      return;
    }

    // Validate customer name (mandatory for all payment methods)
    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }
    
    setProcessing(true);
    setError('');
    
    try {
      // Prepare items for transaction (backend will calculate tax)
      const processedItems = items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        brand: item.brand || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount || 0,
        tax_type: item.tax_type,
        tax_amount: 0, // Backend will calculate
        line_total: item.line_total,
      }));

      const total = getTotal();

      const transactionData = {
        items: processedItems,
        payments: [{
          method: selectedPaymentMethod,
          amount: total,
          reference: paymentReference.trim() || null,
        }],
        discount_amount: 0,
        customer_name: customerName.trim() || null,
        customer_phone: null,
        notes: '',
      };
      
      console.log('Creating transaction:', transactionData);
      const response = await transactionAPI.create(selectedStore.id, transactionData);
      console.log('Transaction created successfully:', response.data);
      
      // Store receipt for display
      const receipt = {
        ...response.data,
        customer_name: customerName.trim() || null,
      };
      setLastReceipt(receipt);
      
      // Clear cart and reset
      clearCart();
      setCustomerName('');
      setPaymentReference('');
      setShowPaymentDialog(false);
      
      // Show receipt screen
      setShowReceipt(true);
    } catch (error: any) {
      console.error('Failed to create transaction:', error);
      let errorMessage = 'Failed to create transaction';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          if (typeof error.response.data.detail === 'string') {
            errorMessage = error.response.data.detail;
          } else if (error.response.data.detail.message) {
            errorMessage = error.response.data.detail.message;
            if (error.response.data.detail.errors) {
              errorMessage += ': ' + error.response.data.detail.errors.join(', ');
            }
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    if (!lastReceipt) return;
    
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setError('Please allow popups to print');
        return;
      }

      const formatCurrency = (amount: number) => `${currencySymbol}${(amount || 0).toFixed(2)}`;
      const total = lastReceipt.total || (lastReceipt.items || []).reduce((sum: number, i: any) => sum + (i.line_total || i.quantity * i.unit_price), 0) || 0;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${lastReceipt.receipt_number}</title>
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
          .separator { border-top: 1px dashed #000; margin: 5px 0; }
          .header { font-size: 16px; font-weight: bold; }
          .item { display: flex; justify-content: space-between; }
          .item-detail { padding-left: 10px; color: #666; }
          .total { font-size: 14px; font-weight: bold; margin-top: 10px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="center header">${selectedStore?.name || 'Store'}</div>
        ${selectedStore && selectedStore.address && typeof selectedStore.address === 'object' && selectedStore.address.city 
          ? `<div class="center">${selectedStore.address.city}, ${selectedStore.address.country || ''}</div>` 
          : ''}
        <div class="separator"></div>
        <div>Receipt: ${lastReceipt.receipt_number}</div>
        <div>Date: ${new Date(lastReceipt.created_at).toLocaleString()}</div>
        ${lastReceipt.cashier_name ? `<div>Cashier: ${lastReceipt.cashier_name}</div>` : ''}
        <div class="separator"></div>
        ${lastReceipt.customer_name ? `
          <div class="bold">Customer: ${lastReceipt.customer_name}</div>
          <div class="separator"></div>
        ` : ''}
        ${(lastReceipt.items || []).map((item: any) => `
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
        ${lastReceipt.payments?.[0] ? `
          <div class="item">
            <span>Paid (${lastReceipt.payments[0].method.toUpperCase()}):</span>
            <span>${formatCurrency(lastReceipt.payments[0].amount)}</span>
          </div>
          ${lastReceipt.payments[0].amount > total ? `
            <div class="item">
              <span>Change:</span>
              <span>${formatCurrency(lastReceipt.payments[0].amount - total)}</span>
            </div>
          ` : ''}
        ` : ''}
        <div class="separator"></div>
        <div class="center">Thank you for your purchase!</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleCompleteSale = () => {
    setShowReceipt(false);
    setLastReceipt(null);
    setSelectedPaymentMethod('cash');
    loadProducts();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Point of Sale</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {!selectedStore ? (
          <IonCard>
            <IonCardContent>
              <p style={{ textAlign: 'center', padding: '20px' }}>
                Please select a store in Settings to use POS.
              </p>
              <IonButton expand="block" onClick={() => history.push('/settings')}>
                Go to Settings
              </IonButton>
            </IonCardContent>
          </IonCard>
        ) : (
          <>
            <IonCard>
              <IonCardContent>
                <IonItem>
                  <IonLabel position="stacked">Search Products</IonLabel>
                  <IonInput
                    value={searchTerm}
                    onIonInput={(e) => {
                      setSearchTerm(e.detail.value!);
                      loadProducts();
                    }}
                    placeholder="Search by name, SKU, or barcode"
                  />
                </IonItem>
              </IonCardContent>
            </IonCard>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <IonSpinner />
              </div>
            ) : (
              <IonList>
                {products.length === 0 ? (
                  <IonItem>
                    <IonLabel>
                      <p>No products found. Try a different search term.</p>
                    </IonLabel>
                  </IonItem>
                ) : (
                  products.map((product) => (
                    <IonItem key={product.id}>
                      <IonLabel>
                        <h2>{product.name}</h2>
                        <p>SKU: {product.sku} | Stock: {product.stock_quantity || 0}</p>
                        <p>Price: {product.store_selling_price || product.selling_price}</p>
                      </IonLabel>
                      <IonButton
                        slot="end"
                        onClick={() => {
                          const price = product.store_selling_price || product.selling_price;
                          addItem({
                            ...product,
                            unit_price: price,
                            selling_price: price,
                          });
                        }}
                        disabled={!product.stock_quantity || product.stock_quantity <= 0}
                      >
                        <IonIcon icon={add} />
                      </IonButton>
                    </IonItem>
                  ))
                )}
              </IonList>
            )}
          </>
        )}

        <IonCard>
          <IonCardContent>
            <h2>Cart ({items.length})</h2>
            <IonList>
              {items.map((item) => (
                <IonItem key={item.product_id}>
                  <IonLabel>
                    <h3>{item.product_name}</h3>
                    <p>Qty: {item.quantity} × {item.unit_price}</p>
                  </IonLabel>
                  <IonButton
                    size="small"
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                  >
                    <IonIcon icon={remove} />
                  </IonButton>
                  <IonBadge>{item.quantity}</IonBadge>
                  <IonButton
                    size="small"
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                  >
                    <IonIcon icon={add} />
                  </IonButton>
                  <IonButton
                    size="small"
                    color="danger"
                    onClick={() => removeItem(item.product_id)}
                  >
                    <IonIcon icon={trash} />
                  </IonButton>
                </IonItem>
              ))}
            </IonList>
            <div style={{ marginTop: '20px' }}>
              <h3>Subtotal: {getSubtotal().toFixed(2)}</h3>
              <h2>Total: {getTotal().toFixed(2)}</h2>
            </div>

            {/* Payment Method Selection */}
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <IonLabel>
                <h3>Payment Method</h3>
              </IonLabel>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                <IonButton
                  size="small"
                  color={selectedPaymentMethod === 'cash' ? 'primary' : 'light'}
                  onClick={() => setSelectedPaymentMethod('cash')}
                >
                  <IonIcon icon={cash} slot="start" />
                  Cash
                </IonButton>
                <IonButton
                  size="small"
                  color={selectedPaymentMethod === 'mobile_money' ? 'primary' : 'light'}
                  onClick={() => setSelectedPaymentMethod('mobile_money')}
                >
                  <IonIcon icon={phonePortrait} slot="start" />
                  Mobile Money
                </IonButton>
                <IonButton
                  size="small"
                  color={selectedPaymentMethod === 'card' ? 'primary' : 'light'}
                  onClick={() => setSelectedPaymentMethod('card')}
                >
                  <IonIcon icon={card} slot="start" />
                  Card
                </IonButton>
              </div>
            </div>

            {error && (
              <div style={{ 
                padding: '10px', 
                marginBottom: '10px', 
                backgroundColor: '#f8d7da', 
                color: '#721c24', 
                borderRadius: '4px' 
              }}>
                {error}
              </div>
            )}

            <IonButton
              expand="block"
              onClick={handleCheckout}
              disabled={items.length === 0 || processing || !selectedStore || !selectedPaymentMethod}
            >
              {processing ? <IonSpinner /> : <><IonIcon icon={checkmark} /> Complete Sale</>}
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Payment Dialog */}
        <IonModal isOpen={showPaymentDialog} onDidDismiss={() => setShowPaymentDialog(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Payment Details</IonTitle>
              <IonButton slot="end" fill="clear" onClick={() => setShowPaymentDialog(false)}>
                <IonIcon icon={close} />
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonCard>
              <IonCardContent>
                <h2>Total: {currencySymbol}{getTotal().toFixed(2)}</h2>
                <p>Payment Method: {selectedPaymentMethod.toUpperCase()}</p>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardContent>
                <IonItem>
                  <IonLabel position="stacked">
                    Customer Name <span style={{ color: 'red' }}>*</span>
                  </IonLabel>
                  <IonInput
                    value={customerName}
                    onIonInput={(e) => setCustomerName(e.detail.value!)}
                    placeholder="Enter customer name"
                    required
                  />
                </IonItem>

                {(selectedPaymentMethod === 'mobile_money' || selectedPaymentMethod === 'card') && (
                  <IonItem>
                    <IonLabel position="stacked">Reference Number (Optional)</IonLabel>
                    <IonInput
                      value={paymentReference}
                      onIonInput={(e) => setPaymentReference(e.detail.value!)}
                      placeholder="Enter reference number"
                    />
                  </IonItem>
                )}

                {error && (
                  <div style={{ 
                    padding: '10px', 
                    marginTop: '10px',
                    backgroundColor: '#f8d7da', 
                    color: '#721c24', 
                    borderRadius: '4px' 
                  }}>
                    {error}
                  </div>
                )}

                <IonButton
                  expand="block"
                  onClick={processPayment}
                  disabled={processing || !customerName.trim()}
                  style={{ marginTop: '20px' }}
                >
                  {processing ? <IonSpinner /> : 'Process Payment'}
                </IonButton>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </IonModal>

        {/* Receipt Screen */}
        <IonModal isOpen={showReceipt} onDidDismiss={() => handleCompleteSale()}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Receipt</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {lastReceipt && (
              <>
                <IonCard>
                  <IonCardContent>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <h2>{selectedStore ? selectedStore.name : 'Store'}</h2>
                      {selectedStore?.address && typeof selectedStore.address === 'object' && selectedStore.address.city && (
                        <p>{selectedStore.address.city}, {selectedStore.address.country || ''}</p>
                      )}
                    </div>
                    
                    <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', marginBottom: '10px' }}>
                      <p><strong>Receipt:</strong> {lastReceipt.receipt_number}</p>
                      <p><strong>Date:</strong> {new Date(lastReceipt.created_at).toLocaleString()}</p>
                      {lastReceipt.cashier_name && <p><strong>Cashier:</strong> {lastReceipt.cashier_name}</p>}
                    </div>

                    {lastReceipt.customer_name && (
                      <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', marginBottom: '10px' }}>
                        <p><strong>Customer:</strong> {lastReceipt.customer_name}</p>
                      </div>
                    )}

                    <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', marginBottom: '10px' }}>
                      <h3>Items:</h3>
                      {(lastReceipt.items || []).map((item: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: '10px' }}>
                          <p><strong>{item.product_name}</strong></p>
                          <p style={{ fontSize: '0.9em', color: '#666' }}>
                            {currencySymbol}{item.unit_price.toFixed(2)} × {item.quantity} = {currencySymbol}{(item.line_total || item.quantity * item.unit_price).toFixed(2)}
                          </p>
                          {item.brand && <p style={{ fontSize: '0.85em', color: '#999' }}>Brand: {item.brand}</p>}
                        </div>
                      ))}
                    </div>

                    <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold' }}>
                        <span>TOTAL:</span>
                        <span>{currencySymbol}{lastReceipt.total.toFixed(2)}</span>
                      </div>
                      {lastReceipt.payments?.[0] && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                            <span>Paid ({lastReceipt.payments[0].method.toUpperCase()}):</span>
                            <span>{currencySymbol}{lastReceipt.payments[0].amount.toFixed(2)}</span>
                          </div>
                          {lastReceipt.payments[0].amount > lastReceipt.total && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                              <span>Change:</span>
                              <span>{currencySymbol}{(lastReceipt.payments[0].amount - lastReceipt.total).toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
                      <p>Thank you for your purchase!</p>
                    </div>
                  </IonCardContent>
                </IonCard>

                <IonButton expand="block" onClick={handlePrint} style={{ marginTop: '20px' }}>
                  <IonIcon icon={print} slot="start" />
                  Print Receipt
                </IonButton>

                <IonButton expand="block" color="success" onClick={handleCompleteSale} style={{ marginTop: '10px' }}>
                  <IonIcon icon={checkmark} slot="start" />
                  Complete Sale
                </IonButton>
              </>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default POS;
