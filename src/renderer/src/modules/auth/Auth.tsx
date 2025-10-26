import React, { useEffect, useState } from 'react'
import { type db, useAuthStore } from '@renderer/store/auth'
import { BsDatabaseCheck, BsDatabaseExclamation } from "react-icons/bs"
import { RiUser6Line } from "react-icons/ri"
import Toast from '@renderer/lib/toast'
import logo from '../../assets/icon.png'
import './auth.scss'

const Auth: React.FC = () => {
  const [version, setVersion] = useState('')
  const [showDbForm, setShowDbForm] = useState(false)
  const { dbConnection, setDbConnection, login } = useAuthStore()

  const [dbForm, setDbForm] = useState<db>({
    name: '',
    host: '',
    port: 3306,
    user: '',
    password: '',
    database: '',
    isDefault: true
  })

  const handleDbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setDbForm({ ...dbForm, [name]: type === 'checkbox' ? checked : value })
  }

  const handleDbSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const test = await window.api.call('dbConfig', 'testing', dbForm)

    if (!test.success) {
      Toast.error(test.message)
      return
    }

    // Si pasa la conexión, se guarda
    const result = await window.api.call('dbConfig', 'create', dbForm)
    if (result.success) {
      setDbConnection(result.data)
      setShowDbForm(false)
      Toast.success(result.message)
    } else {
      Toast.error(result.message)
    }
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const usuario = (e.target as any).usuario.value
    const password = (e.target as any).password.value
    const result = await window.api.call('auth', 'login', { usuario, password, db: dbConnection })
    Toast[result.success ? 'success' : 'error'](
      result.message
    )

    if(result.success  && result.data){
      login(result.data)
    }
  }

  async function handleVersion() {
    const result = await window.api.call('app', 'getVersion')
    setVersion(result.version)
  }

  // Prueba conexión manual (botón "Guardar")
  async function handleConectar() {
    const result = await window.api.call('dbConfig', 'testing', dbForm)
    Toast[result.success ? 'success' : 'error'](result.message)
    if (result.success) {
      setDbConnection(result.data)
      setShowDbForm(false)
    }
  }

  // Detectar credenciales y conexión inicial
  useEffect(() => {
    handleVersion()

    const initDbConnection = async () => {
      const result = await window.api.call('dbConfig', 'getDefault')

      if (result.success) {
        const test = await window.api.call('dbConfig', 'testing', result.data)
        if (test.success) {
          setDbConnection(test.data)
          setDbForm(test.data)
          Toast.success('Conexión establecida')
        } else {
          setShowDbForm(true)
          Toast.error('Sin conexión, revisa los datos')
        }
      } else {
        Toast.info('No hay base de datos configurada')
        setShowDbForm(true)
      }
    }

    if (!dbConnection?.id) initDbConnection()
    else setDbForm(dbConnection)
  }, [dbConnection])

  return (
    <div className="auth-container">
      <div className="content-auth">
        <div className="title">
          <img src={logo} alt="logo" width={140} />
          <h1>Bienvenido a <span>Blue POS</span></h1>
          <p>Versión {version}</p>
        </div>

        <div className="content-form">
          {/* Login */}
          <form className="user-auth" onSubmit={handleUserSubmit}>
            <div className="logo_user"><RiUser6Line /></div>
            <label className='input-label'>
              <p>Nombre de usuario</p>
              <input type="text" name="usuario" className='input'
                disabled={!dbConnection?.id}
                required placeholder="GANTIRES" />
            </label>
            <label className='input-label'>
              <p>Contraseña</p>
              <input type="password" name="password" className='input'
                disabled={!dbConnection?.id}
                required placeholder="**********" />
            </label>
            <button className="btn btn-primary" disabled={!dbConnection?.id} type="submit">Acceder</button>
          </form>

          {/* Config DB */}
          <div className="form-db">
            <label
              onClick={() => setShowDbForm(!showDbForm)}
              className={`setting-db ${dbConnection ? 'done' : 'invalid'}`}
              style={{ cursor: 'pointer', marginTop: '1rem' }}
            >
              {dbConnection?.id ? <BsDatabaseCheck /> : <BsDatabaseExclamation />}
            </label>

            {showDbForm && (
              <form onSubmit={handleDbSubmit}>
                <input className='input' name="name" placeholder="Nombre" value={dbForm.name} onChange={handleDbChange} required />
                <input className='input' name="host" placeholder="Host" value={dbForm.host} onChange={handleDbChange} required />
                <input className='input' type="number" name="port" placeholder="Puerto" value={dbForm.port} onChange={handleDbChange} />
                <input className='input' name="user" placeholder="Usuario" value={dbForm.user} onChange={handleDbChange} required />
                <input className='input' type="password" name="password" placeholder="Contraseña" value={dbForm.password} onChange={handleDbChange} />
                <input className='input' name="database" placeholder="Base de datos" value={dbForm.database} onChange={handleDbChange} />
                <label>
                  <input type="checkbox" name="isDefault" checked={dbForm.isDefault} onChange={handleDbChange} /> Predeterminada
                </label>
                <div className="button">
                  <button type="submit" className='btn btn-primary'>Guardar</button>
                  <button onClick={handleConectar} type="button" className='btn'>Probar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth
