import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Inventory from './pages/Inventory';
import PrivateRoute from './components/PrivateRoute';

setupIonicReact();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/login" component={Login} />
          <PrivateRoute exact path="/dashboard" component={Dashboard} />
          <PrivateRoute exact path="/pos" component={POS} />
          <PrivateRoute exact path="/products" component={Products} />
          <PrivateRoute exact path="/inventory" component={Inventory} />
          <PrivateRoute exact path="/transactions" component={Transactions} />
          <PrivateRoute exact path="/settings" component={Settings} />
          <Route exact path="/" render={() => <Redirect to="/dashboard" />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  </QueryClientProvider>
);

export default App;
