// Proveedores.tsx
import React, { useMemo, useState } from 'react';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useAuthStore } from '@renderer/store/auth';
import { ActionButton, DataTable } from '@renderer/components/DataTable/DataTable';
import { ChartNoAxesGantt, SquarePen, Trash2, Truck } from 'lucide-react';
import { useDateFormat } from '@renderer/hooks/useDateFormat';

// ============================================
// INTERFACES
// ============================================
interface Proveedor {
    id?: number;
    nombre: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    rfc?: string;
    dias_credito: number;
    activo: boolean;
    creado_en?: string;
    actualizado_en?: string;
}

type ModoFormulario = 'crear' | 'actualizar' | 'ver';

// ============================================
// ESTADO INICIAL
// ============================================
const PROVEEDOR_INICIAL: Proveedor = {
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
    rfc: '',
    dias_credito: 0,
    activo: true,
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const Proveedores: React.FC = () => {
    const usuario_id = useAuthStore((state) => state.user?.usuario.id) as number;
    const { proveedores } = usePOSStore();

    const [prov, setProv] = useState<Proveedor>(PROVEEDOR_INICIAL);
    const [mode, setMode] = useState<ModoFormulario>('crear');
    const [loading, setLoading] = useState(false);

    const fechaCreacion = useDateFormat(prov.creado_en || Date.now(), { autoUpdate: false });
    const fechaActualizacion = useDateFormat(prov.actualizado_en || Date.now(), { autoUpdate: false });

    // =========================================================
    // VALIDACIÓN MÍNIMA: SOLO nombre + dias_credito requerido
    // =========================================================
    const formularioValido = useMemo(() => {
        return prov.nombre.trim().length > 0 && prov.dias_credito >= 0;
    }, [prov.nombre, prov.dias_credito]);

    // =========================================================
    // LIMPIAR / CANCELAR
    // =========================================================
    const handleLimpiar = () => {
        setProv(PROVEEDOR_INICIAL);
        setMode('crear');
    };

    const handleCancelar = () => {
        if (confirm('¿Cancelar cambios no guardados?')) {
            handleLimpiar();
        }
    };

    // =========================================================
    // CRUD - Temporales (solo console.log)
    // =========================================================
    async function handleCreate() {
        if (!formularioValido) return;
        setLoading(true);
        console.log('Creando proveedor:', prov, 'usuario:', usuario_id);
        setLoading(false);
        handleLimpiar();
    }

    async function handleUpdate() {
        if (!formularioValido || !prov.id) return;
        setLoading(true);
        console.log('Actualizando proveedor:', prov, 'usuario:', usuario_id);
        setLoading(false);
        handleLimpiar();
    }

    async function handleDelete() {
        if (!prov.id) return;
        if (!confirm(`¿Eliminar proveedor "${prov.nombre}"?`)) return;
        setLoading(true);
        console.log('Eliminando proveedor:', prov, 'usuario:', usuario_id);
        setLoading(false);
        handleLimpiar();
    }

    // =========================================================
    // Acciones de tabla
    // =========================================================
    const handleEditar = (items: Proveedor[]) => {
        if (items.length !== 1) return;
        setProv(items[0]);
        setMode('actualizar');
    };

    const handleVer = (items: Proveedor[]) => {
        if (items.length !== 1) return;
        setProv(items[0]);
        setMode('ver');
    };

    // =========================================================
    // Columnas
    // =========================================================
    const columns = useMemo(() => [
        { label: 'Nombre', key: 'nombre' },
        { label: 'Contacto', key: 'contacto' },
        { label: 'Teléfono', key: 'telefono' },
        { label: 'Email', key: 'email' },
        {
            label: 'Días crédito',
            key: 'dias_credito',
            render: (item: Proveedor) => `${item.dias_credito} días`,
        },
        {
            label: 'Estado',
            key: 'activo',
            render: (item: Proveedor) => (
                <span className={`badge badge-${item.activo ? 'success' : 'secondary'}`}>
                    {item.activo ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            label: 'Creado',
            key: 'creado_en',
            render: (item: Proveedor) => {
                const RelDate: React.FC = () => {
                    const fecha = useDateFormat(item.creado_en || Date.now(), {
                        autoUpdate: true,
                        updateInterval: 60000,
                    });
                    return <span title={fecha.full}>{fecha.relativeShort}</span>;
                };
                return <RelDate />;
            },
        },
    ], []);

    const ButtonsTable: ActionButton[] = useMemo(() => [
        { label: 'Editar', icon: <SquarePen size={14} />, onClick: handleEditar },
        { label: 'Ver', icon: <ChartNoAxesGantt size={14} />, onClick: handleVer },
    ], []);

    // =========================================================
    // RENDER
    // =========================================================
    return (
        <div className="Proveedores">
            <form className={`form form_${mode}`} onSubmit={(e) => e.preventDefault()}>
                <div className="container-field">
                    <input type="hidden" name="id" value={prov.id || ''} />

                    <label className="form-label">
                        <span className="label-text">Nombre *</span>
                        <input
                            type="text"
                            disabled={mode === 'ver' || loading}
                            value={prov.nombre}
                            onChange={(e) => setProv({ ...prov, nombre: e.target.value })}
                            className="form-input"
                        />
                    </label>

                    <label className="form-label">
                        <span className="label-text">Contacto</span>
                        <input
                            type="text"
                            disabled={mode === 'ver' || loading}
                            value={prov.contacto || ''}
                            onChange={(e) => setProv({ ...prov, contacto: e.target.value })}
                            className="form-input"
                        />
                    </label>

                    <label className="form-label">
                        <span className="label-text">Teléfono</span>
                        <input
                            type="text"
                            disabled={mode === 'ver' || loading}
                            value={prov.telefono || ''}
                            onChange={(e) => setProv({ ...prov, telefono: e.target.value })}
                            className="form-input"
                        />
                    </label>

                    <label className="form-label">
                        <span className="label-text">Email</span>
                        <input
                            type="text"
                            disabled={mode === 'ver' || loading}
                            value={prov.email || ''}
                            onChange={(e) => setProv({ ...prov, email: e.target.value })}
                            className="form-input"
                        />
                    </label>

                    <label className="form-label">
                        <span className="label-text">Dirección</span>
                        <input
                            type="text"
                            disabled={mode === 'ver' || loading}
                            value={prov.direccion || ''}
                            onChange={(e) => setProv({ ...prov, direccion: e.target.value })}
                            className="form-input"
                        />
                    </label>

                    <label className="form-label">
                        <span className="label-text">RFC</span>
                        <input
                            type="text"
                            disabled={mode === 'ver' || loading}
                            value={prov.rfc || ''}
                            onChange={(e) => setProv({ ...prov, rfc: e.target.value })}
                            className="form-input"
                        />
                    </label>

                    <label className="form-label">
                        <span className="label-text">Días crédito *</span>
                        <input
                            type="number"
                            min={0}
                            disabled={mode === 'ver' || loading}
                            value={prov.dias_credito}
                            onChange={(e) => setProv({ ...prov, dias_credito: Number(e.target.value) })}
                            className="form-input"
                        />
                    </label>

                    {mode === 'ver' ? (
                        <label className="form-label">
                            <span className="label-text">Estado</span>
                            <input
                                type="text"
                                value={prov.activo ? 'Activo' : 'Inactivo'}
                                disabled
                                className="form-input"
                            />
                        </label>
                    ) : (
                        <label className="form-label form-checkbox">
                            <input
                                type="checkbox"
                                checked={prov.activo}
                                onChange={(e) => setProv({ ...prov, activo: e.target.checked })}
                                disabled={loading}
                            />
                            <span className="checkbox-text">Proveedor activo</span>
                        </label>
                    )}
                </div>

                {/* Campos Auditoría */}
                {mode === 'ver' && prov.id && (
                    <div className="audit-fields">
                        <label className="form-label">
                            <span className="label-text">Creado</span>
                            <input type="text" disabled value={fechaCreacion.datetime} className="form-input" />
                            <small className="field-hint">{fechaCreacion.relativeShort}</small>
                        </label>

                        {prov.actualizado_en && (
                            <label className="form-label">
                                <span className="label-text">Última actualización</span>
                                <input type="text" disabled value={fechaActualizacion.datetime} className="form-input" />
                                <small className="field-hint">{fechaActualizacion.relativeShort}</small>
                            </label>
                        )}
                    </div>
                )}

                <div className="button_form">
                    {mode === 'actualizar' && prov.id && (
                        <>
                            <button type="button" className="btn btn-primary" disabled={!formularioValido || loading} onClick={handleUpdate}>
                                Actualizar
                            </button>
                            <button type="button" className="btn btn-danger" disabled={loading} onClick={handleDelete}>
                                <Trash2 size={16} /> Eliminar
                            </button>
                        </>
                    )}

                    {mode === 'crear' && (
                        <button type="button" className="btn btn-success" disabled={!formularioValido || loading} onClick={handleCreate}>
                            Crear
                        </button>
                    )}

                    {mode === 'ver' && prov.id && (
                        <button type="button" className="btn btn-info" onClick={handleLimpiar}>Agregar Proveedor</button>
                    )}

                    {mode !== 'ver' && (
                        <button type="button" className="btn btn-secondary" disabled={loading} onClick={handleCancelar}>
                            Cancelar
                        </button>
                    )}
                </div>
            </form>

            <DataTable
                title="Proveedores"
                icon={<Truck />}
                selectable
                actionButtonsWithSelection={ButtonsTable}
                data={proveedores}
                columns={columns}
            />
        </div>
    );
};

export default Proveedores;
