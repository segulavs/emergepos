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
} from '@ionic/react';
import { transactionAPI } from '../lib/api';
import { useStoreSelection } from '../lib/store';

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedStore } = useStoreSelection();

  useEffect(() => {
    loadTransactions();
  }, [selectedStore]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedStore) {
        params.store_id = selectedStore.id;
      }
      const response = await transactionAPI.getAll(params);
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Transactions</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <IonSpinner />
          </div>
        ) : (
          <IonList>
            {transactions.map((transaction) => (
              <IonItem key={transaction.id}>
                <IonLabel>
                  <h2>Transaction #{transaction.id}</h2>
                  <p>Date: {new Date(transaction.created_at).toLocaleString()}</p>
                  <p>Total: {transaction.total}</p>
                  <p>Items: {transaction.items?.length || 0}</p>
                </IonLabel>
              </IonItem>
            ))}
            {transactions.length === 0 && (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>No transactions found</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p>Transactions will appear here once you make sales.</p>
                </IonCardContent>
              </IonCard>
            )}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Transactions;
