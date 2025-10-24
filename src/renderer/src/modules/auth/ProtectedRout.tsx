import { ReactElement, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { usePOSStore } from '../../store/usePOSStore'
import { useInitializePOSData } from '../../hooks/useInitializePOSData'
import LoadingScreen from '../../components/LoadingScreen/LoadingScreen'

interface ProtectedRouteProps {
  children: ReactElement
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const isLoaded = usePOSStore((state) => state.isLoaded)
  
  const { 
    loadAllData, 
    isLoading, 
    error, 
    progress,
    currentStep,
    loadingSteps
  } = useInitializePOSData()

  // Cargar datos automáticamente cuando el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated && user && !isLoaded && !isLoading) {
      console.log('🚀 [ProtectedRoute] Iniciando carga del sistema POS')
      loadAllData(user.usuario.id as number)
    }
  }, [isAuthenticated, user, isLoaded, isLoading, loadAllData])

  // Función para reintentar la carga
  const handleRetry = () => {
    if (user) {
      console.log('🔄 [ProtectedRoute] Reintentando carga del sistema...')
      loadAllData(user.usuario.id as number)
    }
  }

  // 1. Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  // 2. Si está cargando o aún no ha cargado, mostrar loading
  if (isLoading || !isLoaded) {
    return (
      <LoadingScreen
        isLoading={isLoading}
        error={error}
        progress={progress}
        currentStep={currentStep}
        loadingSteps={loadingSteps}
        onRetry={handleRetry}
        loadingText="Inicializando Sistema POS"
        errorTitle="Error al Cargar el Sistema"
      />
    )
  }

  // 3. Si hay error y no está cargando, mostrar pantalla de error
  if (error && !isLoading) {
    return (
      <LoadingScreen
        isLoading={false}
        error={error}
        progress={progress}
        onRetry={handleRetry}
        errorTitle="Error al Cargar el Sistema"
      />
    )
  }

  // 4. Todo OK, renderizar los children (Layout con rutas)
  return children
}