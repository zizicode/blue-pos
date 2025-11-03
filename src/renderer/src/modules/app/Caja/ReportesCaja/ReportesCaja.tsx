import CRUDManager, { CRUDConfig } from '@renderer/components/CRUDManager/CRUDManager'
import { InputConfig } from '@renderer/components/FormsInputs/FormsInputs'
import { TurnoCaja } from '@renderer/type/pos.types'
import { BookMarked, Users } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useApi } from '@renderer/services/useApi'
import { formatNumber } from '@renderer/utils/formatNumber'
import { buttonHead } from '@renderer/components/Head/Head'
import { usePOSStore } from '@renderer/store/usePOSStore'
import Toast from '@renderer/lib/toast'

const ReportesCaja: React.FC = () => {
    const { call } = useApi()
    const [historial, setHistorial] = useState<any[]>([])
    const [reportes, setReportes] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const delta = usePOSStore()

    async function fetchHistorial() {
        try {
            setLoading(true)
            const result = await call("turnosCaja", "getHistorial")

            if (result.success) {
                setHistorial(result.data)
            } else {
                Toast.error(result.message || 'Error al cargar historial')
            }
        } catch (error) {
            console.error('Error al cargar historial:', error)
            Toast.error('Error al cargar el historial de turnos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHistorial()
    }, [])

    const getFormFields = (data: TurnoCaja | null, mode: 'create' | 'edit' | 'view'): InputConfig[] => {
        const isView = mode === 'view'
        const values = data || { id: '' }

        return [
            {
                name: 'nombre',
                label: 'Nombre completo',
                type: 'text',
                value: values.id,
                placeholder: 'Ej: Juan Pérez',
                required: true,
                disabled: isView,
                icon: <Users />,
                col: 2,
                hint: 'Nombre del cliente o razón social'
            }
        ]
    }

    // Render data table
    const RenderDetails = [
        {
            key: 'id',
            label: '#'
        },
        {
            key: 'caja_nombre',
            label: 'Caja'
        },
        {
            key: 'fecha_apertura',
            label: 'Apertura',
            render: (data) =>
                new Date(data).toLocaleString('es-DO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) ?? '--'
        },
        {
            key: 'fecha_cierre',
            label: 'Cierre',
            render: (data) =>
                data !== null
                    ? new Date(data).toLocaleString('es-DO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : '--'
        },
        {
            key: 'usuario_nombre',
            label: 'Responsable'
        },
        {
            key: 'estado',
            label: 'Estado',
            render: (i) => <span className={`badge ${i === 'cerrado' ? 'error' : 'success'}`}>{i}</span>
        },
        {
            key: 'monto_final',
            label: 'Cuadre',
            render: (i) => <span>${formatNumber(i)}</span>
        }
    ]

    const handleData = (data: any[]) => {
        setReportes(data)
    }

    const handleReporte = async () => {
        if (reportes.length <= 0) {
            Toast.info("No cuentas con turnos para generar reportes")
            return
        }

        if (!confirm(`¿Seguro que quieres generar reporte de ${reportes.length} turno(s)?`)) return

        try {
            Toast.info('Generando reporte, por favor espera...')

            const turno_ids = reportes.map((t: any) => t.id)

            const turnosCompletos = historial.filter(t => turno_ids.includes(t.id))
            const result = await call("pdf", "generarReporteTurno", {
                turnos: turnosCompletos,
                configuracion: delta.configuracion
            })

            if (result?.success) {
                Toast.success(`✅ Reporte de ${turno_ids.length} turno(s) generado correctamente`)
            } else {
                Toast.error(result?.message || 'Error al generar reporte')
            }
        } catch (error) {
            console.error('Error al generar reporte:', error)
            Toast.error('Error al generar el reporte')
        }
    }

    const headerButtons: buttonHead[] = [
        {
            label: `${reportes.length <= 0 ? 'Sin turnos para generar' : `Generar reporte de (${reportes.length}) turno${reportes.length > 1 ? 's' : ''}`}`,
            disabled: reportes.length <= 0,
            private: { module: 'caja', action: 'reportes' },
            className: 'btn btn-sm btn-primary',
            icon: <BookMarked size={16} />,
            onClick: handleReporte
        }
    ]

    const configuracion: CRUDConfig = {
        headerButtons: headerButtons,
        columns: RenderDetails,
        data: historial,
        entityName: 'Historial de Turno',
        entityNamePlural: 'Historial de Turnos',
        title: 'Reporte de turnos',
        initialValues: [],
        subtitle: 'Filtra y descarga tus reportes de turnos',
        formFields: getFormFields,
        selectable: true, // ✅ Cambiado a true para poder seleccionar turnos
        showDateFilter: true,
        onFilteredDataChange: handleData,
        dateFilterColumn: 'fecha_apertura'
    }

    return (
        <div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p>Cargando historial de turnos...</p>
                </div>
            ) : (
                <CRUDManager config={configuracion} />
            )}
        </div>
    )
}

export default ReportesCaja