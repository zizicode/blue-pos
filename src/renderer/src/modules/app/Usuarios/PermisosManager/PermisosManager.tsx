import React, { useState, useMemo, useEffect } from 'react';
import { Check, X, Search, Shield, Loader } from 'lucide-react';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useApi } from '@renderer/services/useApi';
import './PermisosManager.scss';

// ==================== TIPOS ====================
interface PermisoItem {
    id: number;
    modulo: string;
    accion: string;
    descripcion?: string;
}

interface PermisosManagerProps {
    rolId: number;
    onChange: (permisosIds: number[]) => void;
}

// ==================== LABELS ====================
const ACCIONES_LABELS: Record<string, string> = {
    ver: 'Ver',
    crear: 'Crear',
    editar: 'Editar',
    eliminar: 'Eliminar',
    ajustar: 'Ajustar',
    transferir: 'Transferir',
    anular: 'Anular',
    reimprimir: 'Reimprimir',
    exportar: 'Exportar',
};

// ==================== COMPONENTE ====================
const PermisosManager: React.FC<PermisosManagerProps> = ({ rolId, onChange }) => {
    const { roles } = usePOSStore();
    const { call } = useApi();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [permisosSeleccionados, setPermisosSeleccionados] = useState<number[]>([]);
    const [todosLosPermisos, setTodosLosPermisos] = useState<PermisoItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Cargar permisos disponibles y permisos actuales del rol
    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            
            try {
                // 1. Cargar TODOS los permisos disponibles
                const resultPermisos = await call('permisos', 'getAll');
                if (resultPermisos?.success) {
                    setTodosLosPermisos(resultPermisos.data);
                }

                // 2. Cargar permisos actuales del rol
                const resultRol = await call('roles', 'getById', { id: rolId });
                if (resultRol?.success && resultRol.data?.permisos) {
                    const idsActuales = resultRol.data.permisos.map((p: any) => p.id);
                    setPermisosSeleccionados(idsActuales);
                }
            } catch (error) {
                console.error('Error al cargar permisos:', error);
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, [rolId]);

    // Agrupar permisos por módulo
    const permisosPorModulo = useMemo(() => {
        const grupos: Record<string, PermisoItem[]> = {};

        todosLosPermisos.forEach((permiso: PermisoItem) => {
            if (!grupos[permiso.modulo]) {
                grupos[permiso.modulo] = [];
            }
            grupos[permiso.modulo].push(permiso);
        });

        return grupos;
    }, [todosLosPermisos]);

    // Filtrar módulos por búsqueda
    const modulosFiltrados = useMemo(() => {
        if (!searchTerm) return Object.keys(permisosPorModulo);

        return Object.keys(permisosPorModulo).filter(modulo =>
            modulo.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, permisosPorModulo]);

    // Verificar si un permiso está seleccionado
    const tienePermiso = (permisoId: number): boolean => {
        return permisosSeleccionados.includes(permisoId);
    };

    // Toggle permiso individual
    const togglePermiso = (permisoId: number) => {
        let nuevosPermisos: number[];

        if (tienePermiso(permisoId)) {
            nuevosPermisos = permisosSeleccionados.filter(id => id !== permisoId);
        } else {
            nuevosPermisos = [...permisosSeleccionados, permisoId];
        }

        setPermisosSeleccionados(nuevosPermisos);
        onChange(nuevosPermisos);
    };

    // Toggle todos los permisos de un módulo
    const toggleModuloCompleto = (modulo: string) => {
        const permisosDelModulo = permisosPorModulo[modulo];
        const idsDelModulo = permisosDelModulo.map(p => p.id);
        const todasActivas = idsDelModulo.every(id => tienePermiso(id));

        let nuevosPermisos: number[];

        if (todasActivas) {
            // Remover todos los permisos del módulo
            nuevosPermisos = permisosSeleccionados.filter(id => !idsDelModulo.includes(id));
        } else {
            // Agregar todos los permisos del módulo
            const permisosNoSeleccionados = idsDelModulo.filter(id => !tienePermiso(id));
            nuevosPermisos = [...permisosSeleccionados, ...permisosNoSeleccionados];
        }

        setPermisosSeleccionados(nuevosPermisos);
        onChange(nuevosPermisos);
    };

    // Calcular estadísticas
    const stats = useMemo(() => {
        const totalPermisos = todosLosPermisos.length;
        const permisosActivos = permisosSeleccionados.length;
        const porcentaje = totalPermisos > 0 ? Math.round((permisosActivos / totalPermisos) * 100) : 0;

        return { totalPermisos, permisosActivos, porcentaje };
    }, [todosLosPermisos, permisosSeleccionados]);

    // Obtener nombre del rol
    const nombreRol = useMemo(() => {
        const rol = roles.find(r => r.id === rolId);
        return rol?.nombre || 'Rol';
    }, [rolId, roles]);

    // Loading state
    if (loading) {
        return (
            <div className="PermisosManager__loading">
                <Loader size={32} className="spin" />
                <p>Cargando permisos...</p>
            </div>
        );
    }

    return (
        <div className="PermisosManager">
            {/* Header con información del rol */}
            <div className="PermisosManager__rol-info">
                <Shield size={20} />
                <div>
                    <h4>Editando permisos del rol</h4>
                    <p className="PermisosManager__rol-name">{nombreRol}</p>
                </div>
            </div>

            {/* Header con estadísticas */}
            <div className="PermisosManager__header">
                <div className="PermisosManager__stats">
                    <div className="PermisosManager__stat">
                        <span className="PermisosManager__stat-value">{stats.permisosActivos}</span>
                        <span className="PermisosManager__stat-label">Permisos activos</span>
                    </div>
                    <div className="PermisosManager__stat">
                        <span className="PermisosManager__stat-value">{stats.totalPermisos}</span>
                        <span className="PermisosManager__stat-label">Total disponibles</span>
                    </div>
                    <div className="PermisosManager__stat">
                        <span className="PermisosManager__stat-value">{stats.porcentaje}%</span>
                        <span className="PermisosManager__stat-label">Cobertura</span>
                    </div>
                </div>

                {/* Buscador */}
                <div className="PermisosManager__search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Buscar módulo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Lista de módulos */}
            <div className="PermisosManager__modules">
                {modulosFiltrados.map((modulo) => {
                    const permisosDelModulo = permisosPorModulo[modulo];
                    const idsDelModulo = permisosDelModulo.map(p => p.id);
                    const todasActivas = idsDelModulo.every(id => tienePermiso(id));
                    const algunaActiva = idsDelModulo.some(id => tienePermiso(id));
                    const activasCount = idsDelModulo.filter(id => tienePermiso(id)).length;

                    return (
                        <div key={modulo} className="PermisosManager__module">
                            <div className="PermisosManager__module-header">
                                <button
                                    type="button"
                                    className={`PermisosManager__module-toggle ${todasActivas ? 'active' : algunaActiva ? 'partial' : ''}`}
                                    onClick={() => toggleModuloCompleto(modulo)}
                                    title={todasActivas ? 'Desmarcar todas' : 'Marcar todas'}
                                >
                                    {todasActivas ? <Check size={16} /> : <X size={16} />}
                                </button>
                                <h4 className="PermisosManager__module-title">
                                    {modulo.charAt(0).toUpperCase() + modulo.slice(1)}
                                </h4>
                                <span className="PermisosManager__module-count">
                                    {activasCount}/{permisosDelModulo.length}
                                </span>
                            </div>

                            <div className="PermisosManager__actions">
                                {permisosDelModulo.map((permiso) => {
                                    const activo = tienePermiso(permiso.id);

                                    return (
                                        <button
                                            key={permiso.id}
                                            type="button"
                                            className={`PermisosManager__action ${activo ? 'active' : ''}`}
                                            onClick={() => togglePermiso(permiso.id)}
                                            title={permiso.descripcion || `${permiso.accion} en ${permiso.modulo}`}
                                        >
                                            <span className="PermisosManager__action-icon">
                                                {activo ? <Check size={14} /> : <X size={14} />}
                                            </span>
                                            <span className="PermisosManager__action-label">
                                                {ACCIONES_LABELS[permiso.accion] || permiso.accion}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mensaje si no hay resultados */}
            {modulosFiltrados.length === 0 && (
                <div className="PermisosManager__empty">
                    <p>No se encontraron módulos que coincidan con "{searchTerm}"</p>
                </div>
            )}
        </div>
    );
};

export default PermisosManager;