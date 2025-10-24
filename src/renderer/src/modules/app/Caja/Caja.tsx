import React, { useState } from 'react';
import { CreditCard, Clock } from 'lucide-react';
import Cajas from './Cajas/Cajas';
import TurnosCaja from './TurnosCaja/TurnosCaja';
import './Caja.scss';

// ==================== COMPONENTE ====================
const Caja: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'turno' | 'cajas'>('turno');

  const tabs = [
    {
      id: 'turno',
      label: 'Turno de Caja',
      icon: <Clock size={18} />,
      component: <TurnosCaja />
    },
    {
      id: 'cajas',
      label: 'Administrar Cajas',
      icon: <CreditCard size={18} />,
      component: <Cajas />
    },
  ];

  return (
    <div className="Caja">
      {/* Tabs */}
      <div className="Caja__tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`Caja__tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="Caja__content">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  );
};

export default Caja;