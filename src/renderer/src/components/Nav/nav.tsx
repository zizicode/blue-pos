import React from "react";
import { Permiso } from "../../type/auth.type";
import { NavItem } from "./NavItem";
import { Home, ShoppingCart, Package, Users, Settings, FileText, Box, DollarSign, CreditCard, UserCog, Truck, Database, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface NavProps {
    permisos: Permiso[];
}

const iconMap: Record<string, React.ElementType> = {
    ventas: ShoppingCart,
    caja: DollarSign,
    productos: Package,
    clientes: Users,
    compras: Box,
    inventario: Database,
    reportes: FileText,
    cuentas: CreditCard,
    usuarios: UserCog,
    proveedores: Truck,
    configuracion: Settings,
    logs: Home, // o LogOut, puedes cambiarlo
};

export const Nav: React.FC<NavProps> = ({ permisos }) => {
    // Agrupar permisos por módulo
    const modulos = Array.from(new Set(permisos.map(p => p.modulo)));
    const local = useLocation();

    return (
        <nav className="menu">
            <div className="label-menu">
                Menu
            </div>
            <ul>
                <li>
                    <Link
                        to="/"
                        className={local.pathname === '/' ? 'active' : ''}
                    >
                        <span className="icon">{<LayoutDashboard/>}</span>
                        <span>{"Tablero"}</span>
                    </Link>
                </li>
                {modulos.map((modulo) => {
                    const Icon = iconMap[modulo] || Home;
                    return (
                        <NavItem
                            key={modulo}
                            icon={<Icon />}
                            label={modulo.charAt(0).toUpperCase() + modulo.slice(1)}
                            link={`/${modulo}`}
                        />
                    );
                })}
            </ul>
        </nav>
    );
};
