import React, { useMemo } from 'react';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useAuthStore } from '@renderer/store/auth';
import './Dashboars.scss';

import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Clock,
  RefreshCw,
  Tag,
} from 'lucide-react';

import Head from '@renderer/components/Head/Head';
import StartCard, { Card } from '@renderer/components/StatCard/StartCard';
import { useVentasStats } from '@renderer/hooks/useVentasStats';
import { formatNumber } from '@renderer/utils/formatNumber';
import { type TurnoActivo } from "@renderer/modules/app/Caja/TurnosCaja/TurnosCaja"

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    productos,
    clientes,
    categorias,
    usuarios,
    turnoActivo,
    configuracion,
    ventas,
  } = usePOSStore();


  // ✅ Hook correctamente usado
  const turno = turnoActivo
  const ventasStats = useVentasStats(ventas, turno as TurnoActivo | null);
  console.log(ventasStats)

  const simboloMoneda = useMemo(
    () => configuracion.simbolo_moneda || '$',
    [configuracion]
  );

  const totalProductos = productos.length;
  const valorInventario = productos.reduce(
    (sum, p) => sum + Number(p.precio_compra) * p.stock_actual,
    0
  );

  const clientesActivos = clientes.length;
  const categoriasActivas = categorias.length;
  const usuariosActivos = usuarios.filter(u => u.activo).length;

  const cajaAbierta = turnoActivo?.estado === 'abierto';
  const montoCaja = turnoActivo?.monto_inicial || 0;

  const cards: Card[] = useMemo(
    () => [
      {
        icon: <ShoppingCart className="icon-primary" />,
        title: 'Ventas Hoy',
        value: `${simboloMoneda}${formatNumber(ventasStats.totalTurno.totalVentas)}`,
        subValue: `Facturas: ${ventasStats.facturasHoy} | ${formatNumber(ventasStats.variacion)}%`,
        private: { modulo: 'ventas', action: 'ver' },
      },
      {
        icon: <DollarSign className="icon-success" />,
        title: 'Valor Inventario',
        value: `${simboloMoneda}${formatNumber(valorInventario)}`,
        subValue: 'Total en productos',
        private: { modulo: 'inventario', action: 'ver' },
      },
      {
        icon: <Clock className={cajaAbierta ? 'icon-success' : 'icon-error'} />,
        title: 'Caja',
        value: cajaAbierta ? 'Abierta' : 'Cerrada',
        subValue: cajaAbierta
          ? `Monto inicial: ${simboloMoneda}${montoCaja}`
          : 'No hay caja activa',
        private: { modulo: 'caja', action: 'ver' },
      },
      {
        icon: <Package className="icon-warning" />,
        title: 'Total Productos',
        value: totalProductos,
        subValue: 'Registrados',
        private: { modulo: 'productos', action: 'ver' },
      },
      {
        icon: <Users className="icon-info" />,
        title: 'Clientes Registrados',
        value: clientesActivos,
        subValue: 'Activos',
        private: { modulo: 'clientes', action: 'ver' },
      },
      {
        icon: <Tag className="icon-success" />,
        title: 'Categorías',
        value: categoriasActivas,
        subValue: 'Registradas',
        private: { modulo: 'categorias', action: 'ver' },
      },
      {
        icon: <Users className="icon-primary" />,
        title: 'Usuarios Activos',
        value: usuariosActivos,
        subValue: 'Registrados',
        private: { modulo: 'usuarios', action: 'ver' },
      },
    ],
    [
      valorInventario,
      totalProductos,
      clientesActivos,
      categoriasActivas,
      usuariosActivos,
      cajaAbierta,
      montoCaja,
      simboloMoneda,
      ventasStats,
    ]
  );

  return (
    <div className="dashboard">
      <Head
        title="Tablero"
        subtitle={
          <>
            Bienvenido, <span className="user-name">{user?.usuario.nombre}</span>
          </>
        }
        buttons={[
          {
            label: 'Actualizar',
            icon: <RefreshCw size={16} />,
            className: 'btn-secondary',
            onClick: () => window.location.reload(),
          },
        ]}
      />

      <StartCard cards={cards} />
    </div>
  );
};

export default Dashboard;
