import { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSpinner,
  IonAlert,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { authAPI } from '../lib/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const history = useHistory();
  const { setAuth } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login({ email, password });
      const { user, access_token } = response.data;
      
      setAuth(user, access_token);
      history.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error') || !err.response) {
        errorMessage = 'Network error: Cannot connect to server. Please ensure the backend is running at http://localhost:8000';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>EmergePOS</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100%',
          padding: '20px'
        }}>
          <IonCard style={{ maxWidth: '400px', width: '100%' }}>
            <IonCardHeader>
              <IonCardTitle>Login</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <form onSubmit={handleLogin}>
                <IonItem>
                  <IonLabel position="stacked">Email</IonLabel>
                  <IonInput
                    type="email"
                    value={email}
                    onIonInput={(e) => setEmail(e.detail.value!)}
                    required
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Password</IonLabel>
                  <IonInput
                    type="password"
                    value={password}
                    onIonInput={(e) => setPassword(e.detail.value!)}
                    required
                  />
                </IonItem>
                <IonButton
                  expand="block"
                  type="submit"
                  disabled={loading}
                  style={{ marginTop: '20px' }}
                >
                  {loading ? <IonSpinner /> : 'Login'}
                </IonButton>
              </form>
            </IonCardContent>
          </IonCard>
        </div>
        <IonAlert
          isOpen={!!error}
          onDidDismiss={() => setError('')}
          header="Error"
          message={error}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;
