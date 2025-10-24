import React, {useState} from 'react'
import { useAuthStore } from '../../store/auth'
import InputSearch from '../../components/InputSearch/InputSearch';
import AvatarUser from './AvatarUser/AvatarUser';
import { CloudDownload, LoaderCircle } from 'lucide-react';

const Header: React.FC = () => {
  const {user} = useAuthStore();
  const [load, setLoad] = useState<boolean>(false)

  const handleUpload = () => {
    setLoad(true)
    setTimeout(() => {
      setLoad(false)
    }, 3000)
  }

  return (
    <header className='header'>
      <InputSearch permissions={user?.permisos || []}  />
      <div className={`updateData ${load ? 'active' : ''}`}>
        <button onClick={handleUpload}>
          {load ? <LoaderCircle size={14} /> : <CloudDownload size={14} />}
        </button>
      </div>
      <AvatarUser/>
    </header>
  )
}

export default Header