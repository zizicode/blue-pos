import React from 'react'
import { Outlet } from "react-router-dom"
import Header from './header/Header'
import Sidebar from './sidebar/Sidebar'
import './layout.scss'

const Layout: React.FC = () => {
  // Ya no necesitamos lógica de carga aquí
  // El ProtectedRoute se encarga de todo antes de llegar aquí
  
  return (
    <div className='container-layout'>
      <Sidebar />
      <main>
        <Header />
        <Outlet />
      </main>
    </div>
  )
}

export default Layout