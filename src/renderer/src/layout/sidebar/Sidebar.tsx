import React from 'react'
import { Nav } from '../../components/Nav';
import { useAuthStore } from '../../store/auth';
import logo from '../../assets/logo_1.svg';
import { CircleArrowOutDownLeft } from 'lucide-react';
import Toast from '../../lib/toast';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore()

  const handleLougout = () => {
    Toast.loading('Cerrando sesion')
    setTimeout(()=>{
      logout()
    }, 2000)
  }
  return (
    <div className='sidebar'>
      <div className="logo">
        <div className="content-logo">
          <img src={logo} alt="logo" />
        </div>
      </div>
      {user?.permisos && <Nav permisos={user.permisos} />}

      <div className="footer-sidebar">
        <div className="logout" onClick={handleLougout}>
          <span><CircleArrowOutDownLeft /></span>
          <span>Cerrar sesion</span>
        </div>
      </div>
    </div>
  )
}

export default Sidebar