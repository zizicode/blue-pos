import React, { ReactNode } from 'react';
import './StartCard.scss';
import { Can } from '@renderer/hooks/Can';
import { Inbox } from 'lucide-react';
import { Accion, Modulo } from '@renderer/type/auth.type';

interface PrivateAccess {
  modulo: Modulo;
  action: Accion;
  accion?: Accion
}

interface Badge {
  label: string;
  className?: string;
}

export interface Card {
  icon: ReactNode;
  title: string;
  value: string | number;
  subValue?: string | number | ReactNode;
  badge?: Badge;
  private?: PrivateAccess;
}

interface StartCardProps {
  cards?: Card[];
}

const defaultCard: Card = {
  icon: <Inbox />,
  title: 'Custom',
  value: 0,
  subValue: '0 valores',
  badge: { label: 'Label badge', className: 'badge' },
  private: { action: 'crear', modulo: 'ventas' },
};

const StartCard: React.FC<StartCardProps> = ({ cards = [defaultCard] }) => {
  return (
    <div className="StartCard">
      {cards.map((card, i) => (
        <React.Fragment key={i}>
          {card.private ? (
            <Can module={card.private.modulo} action={card.private.action}>
              <div className="StartCard__start-card">
                <div className="StartCard__start-card_icon">{card.icon}</div>
                <div className="StartCard__start_content">
                  {card.badge && (
                    <span className={`${card.badge.className}`}>{card.badge.label}</span>
                  )}
                  <p>{card.title}</p>
                  <div className="value">{card.value}</div>
                  <span>{card.subValue}</span>
                </div>
              </div>
            </Can>
          ) : (
            <div className="StartCard__start-card">
              <div className="StartCard__start-card_icon">{card.icon}</div>
              <div className="StartCard__start_content">
                {card.badge && (
                  <span className={card.badge.className}>{card.badge.label}</span>
                )}
                <p>{card.title}</p>
                <div className="value">{card.value}</div>
                <span>{card.subValue}</span>
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StartCard;
