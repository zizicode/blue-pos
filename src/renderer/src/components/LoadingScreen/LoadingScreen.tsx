import React from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import './LoadingScreen.scss'

interface LoadingStep {
  name: string
  description: string
  completed: boolean
}

interface LoadingScreenProps {
  isLoading: boolean
  error?: string | null
  progress?: number
  onRetry?: () => void
  loadingText?: string
  errorTitle?: string
  currentStep?: string
  loadingSteps?: LoadingStep[]
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isLoading,
  error = '',
  progress = 0,
  onRetry,
  loadingText = 'Cargando Sistema POS...',
  errorTitle = 'Error al Cargar',
  currentStep = '',
  loadingSteps = []
}) => {
  if (isLoading) {
    return (
      <div className='loading'>
        <div className='loading-content'>
          <div className='loading-spinner'>
            <Loader2 className='spinner-icon' />
          </div>
          
          <h2 className='loading-title'>{loadingText}</h2>
          
          {currentStep && (
            <p className='loading-step'>{currentStep}</p>
          )}
          
          <div className='progress-container'>
            <div className='progress-bar'>
              <div 
                className='progress-fill' 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className='progress-text'>{progress}%</p>
          </div>

          {loadingSteps.length > 0 && (
            <div className='loading-steps'>
              {loadingSteps.map((step, index) => (
                <div 
                  key={step.name} 
                  className={`step-item ${step.completed ? 'completed' : ''}`}
                >
                  {step.completed ? (
                    <CheckCircle2 className='step-icon completed' />
                  ) : (
                    <div className='step-icon pending'>
                      {index + 1}
                    </div>
                  )}
                  <span className='step-description'>{step.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='loading error-screen'>
        <div className='loading-content'>
          <AlertCircle className='error-icon' />
          <h2 className='error-title'>{errorTitle}</h2>
          <p className='error-message'>{error}</p>
          {onRetry && (
            <button onClick={onRetry} className='retry-button'>
              Reintentar
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}

export default LoadingScreen