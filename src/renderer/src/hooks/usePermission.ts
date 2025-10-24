// usePermission.ts
import {useAuthStore} from '../store/auth'
export const usePermission = () => {
  const { user } = useAuthStore()

  const can = (module: string, action?: string) => {
    return user?.permisos.some(
      p => p.modulo === module && (!action || p.accion === action)
    )
  }

  return { can }
}
