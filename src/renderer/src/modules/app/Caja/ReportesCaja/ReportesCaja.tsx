import CRUDManager, { CRUDConfig } from '@renderer/components/CRUDManager/CRUDManager'
import { InputConfig } from '@renderer/components/FormsInputs/FormsInputs';
import { TurnoCaja } from '@renderer/type/pos.types';
import { BookMarked, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { useApi } from '@renderer/services/useApi';
import { formatNumber } from '@renderer/utils/formatNumber';
import { buttonHead } from '@renderer/components/Head/Head';
import { usePOSStore } from '@renderer/store/usePOSStore';

const ReportesCaja: React.FC = () => {
    const { call } = useApi();
    const [historial, setHistorial] = useState<any[]>([]);
    const [reportes, setReportes] = useState([])
    const delta = usePOSStore();

    async function fetchHistorial() {
        const result = await call("turnosCaja", "getHistorial")
      
        if (result.success) {
          const data = await Promise.all(
            result.data.map(async (item) => {
                const detalles_turno = await call("turnosCaja", "getById", {id: item.id})
              return {
                ...item,
                detalles_turno: detalles_turno?.data.movimientos || null,
              }
            })
          )
      
          setHistorial(data)
        } else {
          console.log(result.message)
        }
      }

    useEffect(() => {
        fetchHistorial()
    }, [])


    const getFormFields = (data: TurnoCaja | null, mode: 'create' | 'edit' | 'view'): InputConfig[] => {
        const isView = mode === 'view';
        const values = data || { id: '' };

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
            },
        ];
    };

    // Render data table
    const RenderDetails = [
        {
            key: 'id',
            label: '#',
        },
        {
            key: 'caja_nombre',
            label: 'Caja'
        },
        {
            key: 'fecha_apertura',
            label: 'Apertura',
            render: (data) => new Date(data).toLocaleString('es-DO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) ?? "--"
        },
        {
            key: 'fecha_cierre',
            label: 'Cierre',
            render: (data) => data !== null ? new Date(data).toLocaleString('es-DO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : "--"
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
        setReportes(data as [])
        console.log(reportes)
    }

    const handleReporte = async () => {
        const data: {configuracion: {},turnos: any[]} = {
            configuracion: delta.configuracion,
            turnos: reportes
        }

        if(data.turnos.length <= 0) alert("No cuentas con turnos para generar reportes")
        if(!confirm(`Seguro que quieres generar reporte de ${data.turnos.length} turnos?`)) return

        await call("pdf", "generarReporteTurnos", data)
    }

    const headerButtons:buttonHead[]  = [
        {
            label: `${reportes.length <= 0 ? 'Sin turnos para generar' : `Generar reporte de (${reportes.length}) turnos`}`,
            disabled: reportes.length <= 0 ? true : false,
            private: {module: 'caja', action:'reportes'},
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
        entityNamePlural: 'Historial de Tunos',
        title: "Reporte de turnos",
        initialValues: [],
        subtitle: 'Filtra y descarga tus reportes de turnos',
        formFields: getFormFields,
        selectable: false,
        showDateFilter: true,
        onFilteredDataChange: handleData,
        dateFilterColumn: 'fecha_apertura'
    }

    return (
        <div>
            <CRUDManager config={configuracion} />
        </div>
    )
}

export default ReportesCaja