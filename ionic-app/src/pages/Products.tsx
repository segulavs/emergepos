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
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/react';
import { productAPI } from '../lib/api';

const Products: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await productAPI.getAll({ search: searchTerm || undefined });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    loadProducts();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Products</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonSearchbar
          value={searchTerm}
          onIonInput={(e) => handleSearch(e.detail.value!)}
          placeholder="Search products..."
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <IonSpinner />
          </div>
        ) : (
          <IonList>
            {products.map((product) => (
              <IonItem key={product.id}>
                <IonLabel>
                  <h2>{product.name}</h2>
                  <p>SKU: {product.sku}</p>
                  <p>Price: {product.selling_price}</p>
                  {product.barcode && <p>Barcode: {product.barcode}</p>}
                </IonLabel>
              </IonItem>
            ))}
            {products.length === 0 && (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>No products found</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p>Try adjusting your search terms.</p>
                </IonCardContent>
              </IonCard>
            )}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Products;
