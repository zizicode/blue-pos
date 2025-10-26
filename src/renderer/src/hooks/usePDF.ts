/**
 * Hook personalizado para generar PDFs desde React
 */

import { useState } from 'react'
import Toast from '@renderer/lib/toast'
import { useApi } from '@renderer/services/useApi'

interface DatosReporte {
  turno: any
  configuracion: any
}

const {call} = useApi();

export function usePDF() {
  const [generando, setGenerando] = useState(false)

  /**
   * Generar PDF y guardarlo en Descargas
   */
  const generarPDF = async (datos: DatosReporte) => {
    setGenerando(true)
    try {
      const result = await call('pdf', 'generar', datos)

      if (result.success) {
        Toast.success(`✅ PDF guardado en: ${result.ruta}`)
        return result.ruta
      } else {
        Toast.error(`❌ ${result.message}`)
        return null
      }
    } catch (error) {
      console.error('Error al generar PDF:', error)
      Toast.error('❌ Error al generar PDF')
      return null
    } finally {
      setGenerando(false)
    }
  }

  /**
   * Generar PDF y abrirlo automáticamente
   */
  const generarYAbrirPDF = async (datos: DatosReporte) => {
    setGenerando(true)
    try {
      const result = await call('pdf', 'generarYAbrir', datos)

      if (result.success) {
        Toast.success('✅ PDF generado y abierto')
        return true
      } else {
        Toast.error(`❌ ${result.message}`)
        return false
      }
    } catch (error) {
      console.error('Error al generar/abrir PDF:', error)
      Toast.error('❌ Error al generar PDF')
      return false
    } finally {
      setGenerando(false)
    }
  }

  /**
   * Generar PDF con diálogo para elegir ubicación
   */
  const generarPDFConDialogo = async (datos: DatosReporte) => {
    setGenerando(true)
    try {
      const result = await call("pdf", "generarConDialogo", datos)

      if (result.success) {
        Toast.success(`✅ PDF guardado en: ${result.ruta}`)
        return result.ruta
      } else if (result.message !== 'Guardado cancelado') {
        Toast.error(`❌ ${result.message}`)
      }
      return null
    } catch (error) {
      console.error('Error al generar PDF:', error)
      Toast.error('❌ Error al generar PDF')
      return null
    } finally {
      setGenerando(false)
    }
  }

  return {
    generando,
    generarPDF,
    generarYAbrirPDF,
    generarPDFConDialogo,
  }
}

// ==================== EJEMPLO DE USO ====================
/*
import { usePDF } from '@renderer/hooks/usePDF'

function TurnosCaja() {
  const { generando, generarYAbrirPDF } = usePDF()

  const handleGenerarReporte = async () => {
    const datos = {
      turno: turnoActivo,
      configuracion: configuracion
    }

    await generarYAbrirPDF(datos)
  }

  return (
    <button 
      onClick={handleGenerarReporte}
      disabled={generando}
    >
      {generando ? 'Generando...' : 'Generar Reporte PDF'}
    </button>
  )
}
*/