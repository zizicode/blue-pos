import { Route, Routes } from 'react-router-dom';
import Layout from './layout/layout';
import Auth from './modules/auth/Auth';
import Dashboard from './modules/app/Dashboard/Dashboard';

import AuthRoute from './modules/auth/AuthRoute';
import ProtectedRoute from './modules/auth/ProtectedRout';
import Settings from './modules/app/Settings/Settings';
import Caja from './modules/app/Caja/Caja';
import Inventario from './modules/app/Inventario/Inventario';
import Almacenes from './modules/app/Inventario/Almacenes/Almacenes';
import Producto from './modules/app/Producto/Producto';
import Usuarios from './modules/app/Usuarios/Usuarios';
import CuentasPorCobrar from './modules/app/Cuentas/CuentasPorCobrar';
import Ventas from './modules/app/Ventas/Ventas';
import NotFound from './modules/NotFound';
import Clientes from './modules/app/Clientes/Clientes';

const App = () => {
  return (
    <Routes>
      {/* Rutas de autenticación */}
      <Route path="/auth" element={
        <AuthRoute>
          <Auth />
        </AuthRoute>
      }/>

      {/* Layout protegido */}
      <Route element={<ProtectedRoute><Layout/></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="caja" element={<Caja />} />
        <Route path="productos" element={<Producto />} />
        <Route path="cuentas" element={<CuentasPorCobrar />} />
        <Route path="clientes" element={<Clientes />} />
        
        <Route path="inventario" element={<Inventario />}>
          <Route path="almacenes" element={<Almacenes />} />
        </Route>

        <Route path="usuarios" element={<Usuarios />} />
        <Route path="configuracion" element={<Settings />} />

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
