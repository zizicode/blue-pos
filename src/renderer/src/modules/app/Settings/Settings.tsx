import React, { useState, useMemo, useEffect } from 'react';
import Head from '@renderer/components/Head/Head';
import DynamicForm, { FormField } from '@renderer/components/DinamicForm/DynamicForm';
import { Settings2, AlertCircle } from 'lucide-react';
import BottomModal from '@renderer/components/BottomModal/BottomModal';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useAuthStore } from '@renderer/store/auth';
import Toast from '@renderer/lib/toast';

interface Configuracion {
    [key: string]: string | number | boolean;
}

// 🎯 Configuración inicial del sistema
const DEFAULT_CONFIG: Configuracion = {
    nombre_negocio: '',
    rfc: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    estado: '',
    codigo_postal: '',
    moneda: 'MXN',
    simbolo_moneda: '$',
    decimales: 2,
    iva_porcentaje: 16,
    aplicar_iva: true,
    permitir_ventas_sin_stock: false,
    alertar_stock_minimo: true,
    dias_vencimiento_credito: 30,
    limite_descuento_porcentaje: 20,
    requiere_autorizacion_descuento: true,
    formato_ticket: 'thermal',
    imprimir_automaticamente: false,
    mostrar_logo_ticket: true,
    mensaje_ticket_footer: 'Gracias por su compra',
    prefijo_folio_venta: 'V',
    prefijo_folio_compra: 'C',
    prefijo_folio_devolucion: 'D',
};

const generateFormFields = (config: Configuracion): FormField[] =>
    Object.entries(config).map(([key, value]) => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: typeof value === 'boolean' ? 'checkbox' : typeof value === 'number' ? 'number' : 'text',
        value,
        required: ['nombre_negocio', 'moneda', 'simbolo_moneda'].includes(key)
    }));

const Settings: React.FC = () => {
    const userId = useAuthStore(state => state.user?.usuario.id);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);

    const configuracion = usePOSStore(state => state.configuracion);
    const updateStoreConfig = usePOSStore(state => state.setConfiguracion);
    const lastSync = usePOSStore(state => state.lastSync);

    const [editedData, setEditedData] = useState<FormField[]>([]);
    const generateDataConfig = (config: Configuracion) => generateFormFields(config);

    // Detectar si la configuración está vacía
    const isConfigEmpty = useMemo(() => 
        !configuracion || Object.keys(configuracion).length === 0,
        [configuracion]
    );

    // Generar campos con valores por defecto si está vacío
    const dataConfig = useMemo(() => {
        const config = isConfigEmpty ? DEFAULT_CONFIG : configuracion;
        return generateFormFields(config);
    }, [configuracion, isConfigEmpty]);

    // Abrir modal automáticamente si no hay configuración
    useEffect(() => {
        if (isConfigEmpty && !open) {
            setIsInitializing(true);
            handleOpenModal();
            Toast.info('Por favor, configure los datos básicos del sistema');
        }
    }, [isConfigEmpty]);

    const handleOpenModal = () => {
        const configToEdit = Object.keys(configuracion).length === 0
            ? DEFAULT_CONFIG
            : configuracion;
        const fields = generateDataConfig(configToEdit);
        setEditedData(fields);
        setOpen(true);
    };

    const validateRequiredFields = (): boolean => {
        const requiredFields = ['nombre_negocio', 'moneda', 'simbolo_moneda'];
        const missingFields: string[] = [];

        requiredFields.forEach(key => {
            const field = editedData.find(f => f.key === key);
            if (!field?.value || field.value === '') {
                missingFields.push(field?.label || key);
            }
        });

        if (missingFields.length > 0) {
            Toast.error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
            return false;
        }

        return true;
    };


    
    const handleSave = async () => {
        if (!validateRequiredFields()) return;
    
        setIsSaving(true);
    
        const payload: Configuracion = {};
        editedData.forEach(field => {
            payload[field.key] = field.value;
        });
    
        try {
            const result = await window.api.call("configuracion", "updateMultiple", {
                configuraciones: payload,
                usuario_id: userId
            });
    
            if (result.success) {
                // Fusionamos payload con configuración existente para no perder campos
                const newConfig = { ...configuracion, ...payload };
    
                // Actualizamos store
                updateStoreConfig(newConfig);
    
                // Actualizamos DynamicForm con la configuración completa
                const updatedFields = generateDataConfig(newConfig);
                setEditedData(updatedFields);
                setOpen(false);
    
                if (isInitializing) {
                    Toast.success('¡Configuración inicial completada exitosamente!');
                    setIsInitializing(false);
                } else {
                    Toast.success('Configuración actualizada exitosamente');
                }
            } else {
                Toast.error(result.message || 'Error al guardar la configuración');
            }
        } catch (error) {
            Toast.error('Error al guardar la configuración');
            console.error('Error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // No permitir cancelar si es la configuración inicial
        if (isInitializing && isConfigEmpty) {
            Toast.info('Debe completar la configuración inicial del sistema');
            return;
        }
        setOpen(false);
    };

    const formatLastUpdate = (dateString: string | null) => {
        if (!dateString) return 'Nunca';

        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Hace unos segundos';
        if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
        if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;

        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div>
            <Head
                title="Configuración"
                subtitle="Gestiona la información del sistema"
                buttons={[
                    {
                        label: 'Abrir configuración',
                        onClick: handleOpenModal,
                        icon: <Settings2 size={16} />,
                        className: 'btn-primary',
                        disabled: isInitializing && open
                    }
                ]}
            />

            {/* Alerta si no hay configuración */}
            {isConfigEmpty && (
                <div style={{
                    padding: '15px',
                    margin: '10px 0',
                    background: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#856404'
                }}>
                    <AlertCircle size={24} />
                    <div>
                        <strong>⚠️ Configuración inicial requerida</strong>
                        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                            El sistema necesita ser configurado antes de poder usarlo. 
                            Por favor complete los datos básicos del negocio.
                        </p>
                    </div>
                </div>
            )}

            {/* Última actualización */}
            {!isConfigEmpty && (
                <div style={{
                    padding: '10px',
                    margin: '10px 0',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#666'
                }}>
                    <strong>📅 Última actualización:</strong> {formatLastUpdate(lastSync)}
                </div>
            )}

            {/* Vista de solo lectura */}
            {dataConfig.length > 0 && !isConfigEmpty && (
                <DynamicForm
                    mode="view"
                    title="Configuración del sistema"
                    schema={dataConfig}
                />
            )}

            {/* Modal para editar/inicializar */}
            <BottomModal
                isOpen={open}
                onClose={handleCancel}
                actions={
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={handleCancel}
                            disabled={isSaving || (isInitializing && isConfigEmpty)}
                        >
                            {isInitializing && isConfigEmpty ? 'No cancelable' : 'Cancelar'}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Guardando...' : isInitializing ? 'Completar configuración' : 'Guardar'}
                        </button>
                    </>
                }
            >
                {editedData.length > 0 && (
                    <>
                        {isInitializing && (
                            <div style={{
                                padding: '15px',
                                marginBottom: '15px',
                                background: '#e3f2fd',
                                borderRadius: '4px',
                                border: '1px solid #2196f3'
                            }}>
                                <strong>🚀 Configuración inicial del sistema</strong>
                                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                                    Complete los siguientes datos. Los campos marcados con (*) son obligatorios.
                                </p>
                            </div>
                        )}
                        <DynamicForm
                            mode="edit"
                            title={isInitializing ? "Datos del negocio" : "Configuración del negocio"}
                            schema={editedData}
                            onChange={(key, value) => {
                                setEditedData(prev =>
                                    prev.map(field =>
                                        field.key === key ? { ...field, value } : field
                                    )
                                );
                            }}
                        />
                    </>
                )}
            </BottomModal>
        </div>
    );
};

export default Settings;