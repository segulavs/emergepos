import { Redirect, Route, RouteProps } from 'react-router-dom';
import { IonPage } from '@ionic/react';
import { useAuthStore } from '../lib/store';

interface PrivateRouteProps extends RouteProps {
  component: React.ComponentType<any>;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ component: Component, ...rest }) => {
  const { isAuthenticated } = useAuthStore();

  return (
    <Route
      {...rest}
      render={(props: any) =>
        isAuthenticated ? (
          <IonPage>
            <Component {...props} />
          </IonPage>
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

export default PrivateRoute;
