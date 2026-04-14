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
  IonList,
  IonSpinner,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuthStore, useStoreSelection } from '../lib/store';
import { storeAPI } from '../lib/api';
import { useEffect, useState } from 'react';

const Settings: React.FC = () => {
  const history = useHistory();
  const { user, logout } = useAuthStore();
  const { selectedStore, setSelectedStore, stores, setStores } = useStoreSelection();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const response = await storeAPI.getAll();
      setStores(response.data);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardContent>
            <IonList>
              <IonItem>
                <IonLabel>
                  <h2>User</h2>
                  <p>{user?.first_name} {user?.last_name}</p>
                  <p>{user?.email}</p>
                  <p>Role: {user?.role}</p>
                </IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardContent>
            <h2>Store Selection</h2>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <IonSpinner />
              </div>
            ) : stores.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center' }}>No stores available</p>
            ) : (
              <IonList>
                {stores.map((store) => (
                  <IonItem
                    key={store.id}
                    button
                    onClick={() => setSelectedStore(store)}
                  >
                  <IonLabel>
                    <h2>{store.name}</h2>
                    {store.address && typeof store.address === 'string' && <p>{store.address}</p>}
                    {store.address && typeof store.address === 'object' && store.address.street && (
                      <p>{store.address.street}, {store.address.city}</p>
                    )}
                  </IonLabel>
                    {selectedStore?.id === store.id && (
                      <IonLabel slot="end">Selected</IonLabel>
                    )}
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardContent>
            <IonButton expand="block" color="danger" onClick={handleLogout}>
              Logout
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default Settings;
