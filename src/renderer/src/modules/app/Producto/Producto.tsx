import { ListCheck, Shirt } from 'lucide-react';
import React, { useState } from 'react'
import './Producto.scss'
import Categorias from './Categorias/Categorias';
import Productos from './ItemsProductos';

const Producto: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'productos' | 'categorias' | 'proveedores'>('productos');
    const tabs = [
        {
            id: 'productos',
            label: 'Productos',
            icon: <Shirt size={18} />,
            component: <Productos />
        },
        {
            id: 'categorias',
            label: 'Categorias',
            icon: <ListCheck size={18} />,
            component: <Categorias />
        }
    ];
    return (
        <div className='Producto'>
            <div className="Producto__tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`Producto__tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id as any)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
            {/* Content */}
            <div className="Producto__content">
                {tabs.find(tab => tab.id === activeTab)?.component}
            </div>
        </div>
    )
}

export default Producto