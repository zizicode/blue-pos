import React from "react";
import "./NotFound.scss";

interface NotFoundProps {
  message?: string; // mensaje opcional
}

const NotFound: React.FC<NotFoundProps> = ({ message }) => {
  return (
    <div className="notfound-container">
      <div className="notfound-content">
        <h1 className="notfound-title">404</h1>
        <p className="notfound-message">
          {message || "La página que buscas no existe o no tienes acceso."}
        </p>
      </div>
    </div>
  );
};

export default NotFound;
