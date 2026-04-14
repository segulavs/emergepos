import { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonBadge,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonTextarea,
} from '@ionic/react';
import { useStoreSelection } from '../lib/store';
import { stockAPI } from '../lib/api';

const Inventory: React.FC = () => {
  const { selectedStore } = useStoreSelection();
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [movementType, setMovementType] = useState('stock_in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedStore) {
      loadStock();
    } else {
      setLoading(false);
    }
  }, [selectedStore]);

  const loadStock = async () => {
    if (!selectedStore) return;
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

  const handleMovement = async () => {
    if (!selectedStore || !selectedProduct || !quantity) return;
    
    setSaving(true);
    try {
      await stockAPI.createMovement(selectedStore.id, {
        product_id: selectedProduct.product_id,
        movement_type: movementType,
        quantity: parseFloat(quantity),
        reason: reason || 'Manual adjustment',
      });
      setShowMovementDialog(false);
      setSelectedProduct(null);
      setQuantity('');
      setReason('');
      setMovementType('stock_in');
      loadStock();
    } catch (error) {
      console.error('Failed to update stock:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredStock = stock.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.product_name?.toLowerCase().includes(search) ||
      item.sku?.toLowerCase().includes(search) ||
      item.barcode?.toLowerCase().includes(search)
    );
  });

  if (!selectedStore) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Inventory</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonCard>
            <IonCardContent>
              <p style={{ textAlign: 'center', padding: '20px' }}>
                Please select a store in Settings to view inventory.
              </p>
              <IonButton expand="block" onClick={() => window.location.href = '/settings'}>
                Go to Settings
              </IonButton>
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Inventory</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonSearchbar
          value={searchTerm}
          onIonInput={(e) => setSearchTerm(e.detail.value!)}
          placeholder="Search products..."
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <IonSpinner />
          </div>
        ) : (
          <IonList>
            {filteredStock.length === 0 ? (
              <IonItem>
                <IonLabel>
                  <p>No stock items found</p>
                </IonLabel>
              </IonItem>
            ) : (
              filteredStock.map((item) => (
                <IonItem key={item.product_id}>
                  <IonLabel>
                    <h2>{item.product_name}</h2>
                    <p>SKU: {item.sku}</p>
                    <p>
                      Stock: <IonBadge color={item.quantity > 0 ? 'success' : 'danger'}>
                        {item.quantity || 0}
                      </IonBadge>
                    </p>
                    {item.unit && <p>Unit: {item.unit}</p>}
                  </IonLabel>
                  <IonButton
                    slot="end"
                    size="small"
                    onClick={() => {
                      setSelectedProduct(item);
                      setShowMovementDialog(true);
                    }}
                  >
                    Adjust
                  </IonButton>
                </IonItem>
              ))
            )}
          </IonList>
        )}

        {showMovementDialog && (
          <IonCard style={{ margin: '20px' }}>
          <IonCardHeader>
            <IonCardTitle>Stock Movement</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {selectedProduct && (
              <>
                <p>Product: {selectedProduct.product_name}</p>
                <IonItem>
                  <IonLabel position="stacked">Movement Type</IonLabel>
                  <IonSelect value={movementType} onIonChange={(e) => setMovementType(e.detail.value)}>
                    <IonSelectOption value="stock_in">Stock In</IonSelectOption>
                    <IonSelectOption value="stock_out">Stock Out</IonSelectOption>
                    <IonSelectOption value="adjustment">Adjustment</IonSelectOption>
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Quantity</IonLabel>
                  <IonInput
                    type="number"
                    value={quantity}
                    onIonInput={(e) => setQuantity(e.detail.value!)}
                    placeholder="Enter quantity"
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Reason</IonLabel>
                  <IonTextarea
                    value={reason}
                    onIonInput={(e) => setReason(e.detail.value!)}
                    placeholder="Reason for adjustment"
                    rows={3}
                  />
                </IonItem>
                <IonButton expand="block" onClick={handleMovement} disabled={saving || !quantity}>
                  {saving ? 'Saving...' : 'Save'}
                </IonButton>
                <IonButton expand="block" color="light" onClick={() => {
                  setShowMovementDialog(false);
                  setSelectedProduct(null);
                  setQuantity('');
                  setReason('');
                }}>
                  Cancel
                </IonButton>
              </>
            )}
          </IonCardContent>
        </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Inventory;
