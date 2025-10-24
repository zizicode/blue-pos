import React from 'react'
import { useAuthStore } from '../../../store/auth'

const AvatarUser: React.FC = () => {
    const {user} = useAuthStore()
    const letter = user?.usuario.usuario.charAt(0)
  return (
    <div className='AvatarUser'>
        <div className="avatar">{letter}</div>
        <span className='username'>{user?.usuario?.rol_nombre}</span>
    </div>
  )
}

export default AvatarUser