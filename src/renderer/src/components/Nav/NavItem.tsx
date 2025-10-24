import React from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    link: string;
}

export const NavItem: React.FC<NavItemProps> = ({ icon, label, link }) => {
    const local = useLocation();

    return (
        <li>
            <Link
                to={link}
                className={local.pathname === link ? 'active' : ''}
            >
                <span className="icon">{icon}</span>
                <span>{label}</span>
            </Link>
        </li>
    )
};
