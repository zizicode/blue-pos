// src/renderer/src/App.tsx

import { useState } from 'react'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  // ✅ Login
  const handleLogin = async () => {
    const result = await window.api.call('auth', 'login', {
      username,
      password
    })
    
    if (result.success) {
      setMessage(`Bienvenido ${result.data?.username}!`)
    } else {
      setMessage(`Error: ${result.message}`)
    }
  }

  // ✅ Obtener todos los usuarios
  const handleGetUsers = async () => {
    const result = await window.api.call('users', 'getAll')
    
    if (result.success) {
      console.log('Usuarios:', result.data)
      setMessage(`Se encontraron ${result.data?.length} usuarios`)
    } else {
      setMessage(`Error: ${result.message}`)
    }
  }

  // ✅ Crear usuario
  const handleCreateUser = async () => {
    const result = await window.api.call('users', 'create', {
      username: 'nuevoUsuario',
      password: 'password123',
      email: 'nuevo@ejemplo.com'
    })
    
    if (result.success) {
      setMessage(`Usuario creado con ID: ${result.data?.id}`)
    } else {
      setMessage(`Error: ${result.message}`)
    }
  }

  // ✅ Ejemplo: Crear un producto (sin necesidad de crear el controlador primero)
  const handleCreateProduct = async () => {
    const result = await window.api.call('products', 'create', {
      name: 'Laptop',
      price: 1000,
      stock: 50
    })
    
    if (result.success) {
      setMessage(`Producto creado: ${result.data?.id}`)
    } else {
      setMessage(`Error: ${result.message}`)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Login</h1>
      
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleGetUsers}>Ver Usuarios</button>
      <button onClick={handleCreateUser}>Crear Usuario</button>
      <button onClick={handleCreateProduct}>Crear Producto</button>
      
      {message && <p>{message}</p>}
    </div>
  )
}

export default App