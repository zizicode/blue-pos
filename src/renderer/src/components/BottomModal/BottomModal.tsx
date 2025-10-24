import React, { useEffect, useState } from "react";
import "./BottomModal.scss";

interface BottomModalProps {
    isOpen: boolean;
    onClose: () => void;
    children?: React.ReactNode;
    actions?: React.ReactNode; // zona inferior de botones o acciones
}

const BottomModal: React.FC<BottomModalProps> = ({ isOpen, onClose, children, actions }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Controla animación de carga
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setIsLoading(true);
            const timer = setTimeout(() => setIsLoading(false), 1600);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
            setIsLoading(true);
        }
        return
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className={`bottom-modal-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
            <div
                className={`bottom-modal ${isOpen ? "open" : ""}`}
                onClick={(e) => e.stopPropagation()} // evitar cerrar al click interno
            >
                {isLoading ? (
                    <div className="bottom-modal__loader">
                        <div className="spinner"></div>
                        <span>Cargando...</span>
                    </div>
                ) : (
                    <div className="bottom-modal__content">{children}</div>
                )}
                {actions && <div className="bottom-modal__actions">{actions}</div>}
            </div>
        </div>
    );
};

export default BottomModal;
