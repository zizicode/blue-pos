import React, { ReactNode } from 'react';
import './PageHeader.scss';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    align?: 'left' | 'center' | 'right';
    buttons: ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    align = 'left',
    buttons
}) => {
    return (
        <header className={`page-header page-header--${align}`}>
            <div className="title">
                <h1 className="page-header__title">{title}</h1>
                {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
            </div>
            {buttons && (
                <div className="buttons">
                    {buttons}
                </div>
            )}
        </header>
    );
};
