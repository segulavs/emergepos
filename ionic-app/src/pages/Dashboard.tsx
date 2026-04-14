import { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { analyticsAPI } from '../lib/api';
import { useAuthStore, useStoreSelection } from '../lib/store';
import { statsChart, cart, receipt, storefront, cube } from 'ionicons/icons';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const history = useHistory();
  const { user } = useAuthStore();
  const { selectedStore } = useStoreSelection();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await analyticsAPI.getDashboard(selectedStore?.id);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Dashboard</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', paddingTop: '50px' }}>
            <IonSpinner />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonGrid>
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Welcome, {user?.first_name} {user?.last_name}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {selectedStore ? (
                    <p>Current Store: {selectedStore.name}</p>
                  ) : (
                    <p>No store selected</p>
                  )}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="6">
              <IonButton
                expand="block"
                onClick={() => history.push('/pos')}
                style={{ height: '100px' }}
              >
                <div>
                  <IonIcon icon={cart} size="large" />
                  <div>POS</div>
                </div>
              </IonButton>
            </IonCol>
            <IonCol size="6">
              <IonButton
                expand="block"
                onClick={() => history.push('/products')}
                style={{ height: '100px' }}
              >
                <div>
                  <IonIcon icon={storefront} size="large" />
                  <div>Products</div>
                </div>
              </IonButton>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="6">
              <IonButton
                expand="block"
                onClick={() => history.push('/inventory')}
                style={{ height: '100px' }}
              >
                <div>
                  <IonIcon icon={cube} size="large" />
                  <div>Inventory</div>
                </div>
              </IonButton>
            </IonCol>
            <IonCol size="6">
              <IonButton
                expand="block"
                onClick={() => history.push('/transactions')}
                style={{ height: '100px' }}
              >
                <div>
                  <IonIcon icon={receipt} size="large" />
                  <div>Transactions</div>
                </div>
              </IonButton>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="6">
              <IonButton
                expand="block"
                onClick={() => history.push('/settings')}
                style={{ height: '100px' }}
              >
                <div>
                  <IonIcon icon={statsChart} size="large" />
                  <div>Settings</div>
                </div>
              </IonButton>
            </IonCol>
          </IonRow>

          {stats && (
            <IonRow>
              <IonCol size="12">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Today's Stats</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p>Sales: {stats.today_sales || 0}</p>
                    <p>Transactions: {stats.today_transactions || 0}</p>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          )}
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
