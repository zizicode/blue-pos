import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Usuario, Permiso } from '@renderer/type/auth.type'

interface User {
  usuario: Usuario
  permisos: Permiso[]  // Debería ser array de permisos
}

export interface db {
  id?: string
  name: string
  host: string
  port: number
  user: string
  password: string
  database: string
  isDefault: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  dbConnection: db | null
  
  // Acciones
  login: (user: User) => void
  setDbConnection: (value: db) => void
  logout: () => void
}

const ORDER = [
  'Tablero',
  'Ventas',
  'Caja',
  'Productos',
  'Inventario',
  'Clientes',
  'Proveedores',
  'Compras',
  'Cuentas',
  'Reportes',
  'Usuarios',
  'Configuracion',
  'Logs'
]

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      dbConnection: null,

      login: (user) =>
        set({
          user: {
            ...user,
            permisos: [...user.permisos]
              // Primero ordenar por módulo según ORDER
              .sort((a, b) => ORDER.indexOf(a.modulo) - ORDER.indexOf(b.modulo))
              // Después, dentro del mismo módulo, ordenar por acción alfabético
              .sort((a, b) => {
                if (a.modulo === b.modulo) {
                  return a.accion.localeCompare(b.accion)
                }
                return 0
              })
          },
          isAuthenticated: true,
        }),

      setDbConnection: (value) => set({ dbConnection: value }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          dbConnection: null,
        }),
    }),
    {
      name: 'auth-session',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return window.sessionStorage
        }

        const memoryStorage = {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
          clear: () => {},
          key: () => null,
          length: 0,
        }

        return memoryStorage as unknown as Storage
      }),
    }
  )
)