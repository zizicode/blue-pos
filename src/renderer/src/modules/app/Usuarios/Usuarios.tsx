import React, { useState } from 'react';
import './Usuarios.scss';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useApi } from '@renderer/services/useApi';
import { useAuthStore } from '@renderer/store/auth';
import { useInitializePOSData } from '@renderer/hooks/useInitializePOSData';
import Head, { buttonHead } from '@renderer/components/Head/Head';
import { CircleUser, User, Mail, Lock, Shield, Settings, Edit, Delete, Eye, UserCog } from 'lucide-react';
import { ActionButton, DataTable } from '@renderer/components/DataTable/DataTable';
import StartCard, { Card } from '@renderer/components/StatCard/StartCard';
import BottomModal from '@renderer/components/BottomModal/BottomModal';
import FormInput, { InputConfig } from '@renderer/components/FormsInputs/FormsInputs';
import PermisosManager from './PermisosManager/PermisosManager';

// ==================== TIPOS ====================
interface UsuarioFormData {
    id?: number;
    nombre: string;
    email: string;
    usuario: string;
    password?: string;
    rol_id: number | null;
    activo: boolean;
}

// ==================== VALORES INICIALES ====================
const INITIAL_FORM: UsuarioFormData = {
    nombre: '',
    email: '',
    usuario: '',
    password: '',
    rol_id: null,
    activo: true,
};

// ==================== HOOKS PERSONALIZADOS ====================
const useUsuariosModal = () => {
    const [userCreate, setUserCreate] = useState(false);
    const [userEdit, setUserEdit] = useState(false);
    const [userView, setUserView] = useState(false);
    const [rolePermisos, setRolePermisos] = useState(false);
    const [changeRole, setChangeRole] = useState(false);

    return {
        modals: { userCreate, userEdit, userView, rolePermisos, changeRole },
        setters: { setUserCreate, setUserEdit, setUserView, setRolePermisos, setChangeRole }
    };
};

// ==================== COMPONENTE PRINCIPAL ====================
const Usuarios: React.FC = () => {
    const { usuarios, roles } = usePOSStore();
    const { user } = useAuthStore();
    const { call } = useApi();
    const { loadAllData } = useInitializePOSData();
    const { modals, setters } = useUsuariosModal();

    // Estados
    const [formData, setFormData] = useState<UsuarioFormData>(INITIAL_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    // ==================== HELPERS ====================
    const resetForm = () => {
        setFormData(INITIAL_FORM);
        setErrors({});
    };

    const reloadData = async () => {
        if (user?.usuario.id) {
            await loadAllData(user.usuario.id);
        }
    };

    // ==================== HANDLERS DE FORMULARIO ====================
    const handleChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = (isEdit: boolean = false): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.nombre.trim()) {
            newErrors.nombre = 'El nombre es requerido';
        }
        if (!formData.email?.trim()) {
            newErrors.email = 'El email es requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }
        if (!formData.usuario?.trim()) {
            newErrors.usuario = 'El nombre de usuario es requerido';
        }
        
        // La contraseña solo es requerida al crear
        if (!isEdit && !formData.password) {
            newErrors.password = 'La contraseña es requerida';
        } else if (formData.password && formData.password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }
        
        if (!formData.rol_id) {
            newErrors.rol_id = 'Selecciona un rol';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ==================== CRUD HANDLERS ====================
    
    // CREAR
    const handleCreateUser = async () => {
        if (!validateForm(false)) return;
        if (!user?.usuario.id) return;

        try {
            const payload = {
                ...formData,
                usuario_id: user.usuario.id,
            };

            const result = await call('users', 'create', payload);

            if (result?.success) {
                await reloadData();
                resetForm();
                setters.setUserCreate(false);
                alert('✅ Usuario creado exitosamente');
            }
        } catch (error) {
            console.error('Error al crear usuario:', error);
            alert('❌ Error al crear usuario');
        }
    };

    // VER DETALLES
    const handleViewUser = (rows: any[]) => {
        const usuario = usuarios.find(u => u.id === rows[0]?.id);
        if (!usuario) return;

        setFormData({
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email || '',
            usuario: usuario.usuario,
            rol_id: usuario.rol_id,
            activo: !!usuario.activo,
        });
        setters.setUserView(true);
    };

    // EDITAR
    const handleEditUser = (rows: any[]) => {
        const usuario = usuarios.find(u => u.id === rows[0]?.id);
        if (!usuario) return;

        setFormData({
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email || '',
            usuario: usuario.usuario,
            password: '', // No mostrar password actual
            rol_id: usuario.rol_id,
            activo: formData.activo
        });
        setters.setUserEdit(true);
    };

    const handleSaveEdit = async () => {
        if (!validateForm(true)) return;
        if (!user?.usuario.id) return;

        try {
            const payload: any = {
                id: formData.id,
                nombre: formData.nombre,
                email: formData.email,
                usuario: formData.usuario,
                rol_id: formData.rol_id,
                activo: formData.activo,
                usuario_id: user.usuario.id,
            };

            // Solo incluir password si se cambió
            if (formData.password && formData.password.length > 0) {
                payload.password = formData.password;
            }

            const result = await call('users', 'update', payload);

            if (result?.success) {
                await reloadData();
                resetForm();
                setters.setUserEdit(false);
                alert('✅ Usuario actualizado exitosamente');
            }
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            alert('❌ Error al actualizar usuario');
        }
    };

    // ELIMINAR
    const handleDeleteUsers = async (rows: any[]) => {
        const count = rows.length;
        const message = count === 1
            ? `¿Estás seguro de eliminar al usuario "${rows[0].nombre}"?`
            : `¿Estás seguro de eliminar ${count} usuarios?`;

        if (!confirm(message)) return;
        if (!user?.usuario.id) return;

        try {
            await Promise.all(
                rows.map(row =>
                    call('users', 'delete', {
                        id: row.id,
                        usuario_id: user.usuario.id
                    })
                )
            );

            await reloadData();
            alert(`✅ ${count === 1 ? 'Usuario eliminado' : 'Usuarios eliminados'} exitosamente`);
        } catch (error) {
            console.error('Error al eliminar usuarios:', error);
            alert('❌ Error al eliminar usuarios');
        }
    };

    // CAMBIAR ROL
    const handleOpenChangeRole = (rows: any[]) => {
        const usuario = usuarios.find(u => u.id === rows[0]?.id);
        if (!usuario) return;

        setSelectedUserId(usuario.id);
        setFormData({
            ...formData,
            id: usuario.id,
            rol_id: usuario.rol_id,
        });
        setters.setChangeRole(true);
    };

    const handleSaveRoleChange = async () => {
        if (!selectedUserId || !formData.rol_id || !user?.usuario.id) return;

        try {
            const payload = {
                id: selectedUserId,
                nuevo_rol_id: formData.rol_id,
                usuario_actualizador_id: user.usuario.id,
            };

            const result = await call('users', 'updateRol', payload);

            if (result?.success) {
                await reloadData();
                setters.setChangeRole(false);
                setSelectedUserId(null);
                resetForm();
                alert('✅ Rol actualizado exitosamente');
            }
        } catch (error) {
            console.error('Error al cambiar rol:', error);
            alert('❌ Error al cambiar rol');
        }
    };

    // ==================== PERMISOS DEL ROL ====================
    const handleOpenPermisos = (rows: any[]) => {
        const usuario = usuarios.find(u => u.id === rows[0]?.id);
        if (!usuario) return;

        setSelectedRoleId(usuario.rol_id);
        setters.setRolePermisos(true);
    };

    const handleSavePermisos = async (permisosIds: number[]) => {
        if (!selectedRoleId || !user?.usuario.id) return;

        try {
            const rol = roles.find(r => r.id === selectedRoleId);

            const payload = {
                id: selectedRoleId,
                nombre: rol?.nombre,
                descripcion: rol?.descripcion,
                permisos: permisosIds,
                usuario_id: user.usuario.id,
            };

            const result = await call('roles', 'update', payload);

            if (result?.success) {
                alert('✅ Permisos del rol actualizados exitosamente');
            }
        } catch (error) {
            console.error('Error al actualizar permisos:', error);
            alert('❌ Error al actualizar permisos');
        }
    };

    // ==================== CONFIGURACIÓN DE INPUTS ====================
    const getInputsUsuario = (mode: 'create' | 'edit' | 'view'): InputConfig[] => {
        const isView = mode === 'view';
        const isEdit = mode === 'edit';

        return [
            {
                name: 'nombre',
                label: 'Nombre completo',
                type: 'text',
                value: formData.nombre,
                placeholder: 'Ej: Juan Pérez',
                required: true,
                disabled: isView,
                icon: <User />,
                error: errors.nombre,
                col: 2,
            },
            {
                name: 'email',
                label: 'Correo electrónico',
                type: 'text',
                value: formData.email,
                placeholder: 'usuario@empresa.com',
                required: true,
                disabled: isView,
                icon: <Mail />,
                error: errors.email,
                col: 2,
            },
            {
                name: 'usuario',
                label: 'Nombre de usuario',
                type: 'text',
                value: formData.usuario,
                placeholder: 'vrodriguez',
                required: true,
                disabled: isView,
                icon: <User />,
                error: errors.usuario,
                col: 2,
            },
            {
                name: 'password',
                label: isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña',
                type: 'password',
                value: formData.password,
                placeholder: '••••••••',
                required: !isEdit,
                disabled: isView,
                icon: <Lock />,
                error: errors.password,
                hint: isEdit ? 'Dejar vacío para mantener la actual' : 'Mínimo 6 caracteres',
                col: 2,
            },
            {
                name: 'rol_id',
                label: 'Rol',
                type: 'select',
                value: formData.rol_id,
                placeholder: 'Selecciona un rol',
                required: true,
                disabled: isView,
                icon: <Shield />,
                error: errors.rol_id,
                options: roles.map(r => ({
                    label: r.nombre,
                    value: r.id
                })),
                col: 2,
            },
            {
                name: 'activo',
                label: 'Usuario activo',
                type: 'checkbox',
                value: formData.activo,
                disabled: isView,
                col: 2,
            },
        ];
    };

    // ==================== UI CONFIG ====================
    const StartArray: Card[] = [
        {
            title: 'Total de usuarios',
            value: usuarios.length,
            icon: <CircleUser />,
        },
        {
            title: 'Usuarios activos',
            value: usuarios.filter(u => u.activo).length,
            icon: <CircleUser />,
        },
        {
            title: 'Usuarios inactivos',
            value: usuarios.filter(u => !u.activo).length,
            icon: <CircleUser />,
        },
    ];

    const buttonsHeader: buttonHead[] = [
        {
            label: 'Crear usuario',
            className: 'btn btn-sm btn-success',
            icon: <User size={16} />,
            onClick: () => setters.setUserCreate(true),
        },
    ];

    const actionButtons: ActionButton[] = [
        {
            label: 'Ver detalles',
            icon: <Eye size={15} />,
            variant: 'secondary',
            showWhen: 'single',
            permission: { modulo: 'usuarios', accion: 'ver' },
            onClick: handleViewUser,
        },
        {
            label: 'Editar',
            icon: <Edit size={15} />,
            variant: 'primary',
            showWhen: 'single',
            permission: { modulo: 'usuarios', accion: 'editar' },
            onClick: handleEditUser,
        },
        {
            label: 'Cambiar rol',
            icon: <UserCog size={15} />,
            showWhen: 'single',
            permission: { modulo: 'usuarios', accion: 'editar' },
            onClick: handleOpenChangeRole,
            variant: 'success'
        },
        {
            label: 'Gestionar permisos del rol',
            icon: <Settings size={15} />,
            showWhen: 'single',
            permission: { modulo: 'usuarios', accion: 'editar' },
            onClick: handleOpenPermisos,
            variant: 'success'
        },
        {
            label: 'Eliminar',
            icon: <Delete size={15} />,
            variant: 'danger',
            showWhen: 'any',
            permission: { modulo: 'usuarios', accion: 'eliminar' },
            onClick: handleDeleteUsers,
        },
    ];

    // ==================== RENDER ====================
    return (
        <div className="Usuarios">
            <Head
                title="Gestión de usuarios"
                subtitle="Actualiza, crea y elimina usuarios del sistema"
                buttons={buttonsHeader}
            />

            <StartCard cards={StartArray} />

            <DataTable
                title="Tabla de usuarios"
                selectable
                actionButtonsWithSelection={actionButtons}
                userPermissions={user?.permisos}
                columns={[
                    { key: 'id', label: 'ID' },
                    { key: 'nombre', label: 'Nombre' },
                    { key: 'usuario', label: 'Usuario' },
                    { key: 'email', label: 'Email' },
                    {
                        key: 'rol_id',
                        label: 'Rol',
                        render: (data) => (
                            <span className="badge badge-primary badge-sm">
                                {roles.find((i) => i.id === data)?.nombre}
                            </span>
                        )
                    },
                    {
                        key: 'activo',
                        label: 'Estado',
                        render: (data) => (
                            <span className={`badge badge-${data ? 'success' : 'error'} badge-xs`}>
                                {data ? 'Activo' : 'Inactivo'}
                            </span>
                        )
                    },
                ]}
                data={usuarios}
            />

            {/* Modal CREAR Usuario */}
            <BottomModal
                isOpen={modals.userCreate}
                onClose={() => {
                    resetForm();
                    setters.setUserCreate(false);
                }}
                actions={
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                resetForm();
                                setters.setUserCreate(false);
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={handleCreateUser}
                        >
                            Crear Usuario
                        </button>
                    </>
                }
            >
                <div className="Usuarios__modal-content">
                    <div className="Usuarios__modal-header">
                        <User size={24} />
                        <h3>Crear Nuevo Usuario</h3>
                    </div>

                    <FormInput
                        inputs={getInputsUsuario('create')}
                        onChange={handleChange}
                        columns={4}
                        gap="md"
                    />
                </div>
            </BottomModal>

            {/* Modal EDITAR Usuario */}
            <BottomModal
                isOpen={modals.userEdit}
                onClose={() => {
                    resetForm();
                    setters.setUserEdit(false);
                }}
                actions={
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                resetForm();
                                setters.setUserEdit(false);
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSaveEdit}
                        >
                            Guardar Cambios
                        </button>
                    </>
                }
            >
                <div className="Usuarios__modal-content">
                    <div className="Usuarios__modal-header">
                        <Edit size={24} />
                        <h3>Editar Usuario</h3>
                    </div>

                    <FormInput
                        inputs={getInputsUsuario('edit')}
                        onChange={handleChange}
                        columns={4}
                        gap="md"
                    />
                </div>
            </BottomModal>

            {/* Modal VER Usuario */}
            <BottomModal
                isOpen={modals.userView}
                onClose={() => {
                    resetForm();
                    setters.setUserView(false);
                }}
            >
                <div className="Usuarios__modal-content">
                    <div className="Usuarios__modal-header">
                        <Eye size={24} />
                        <h3>Detalles del Usuario</h3>
                    </div>

                    <FormInput
                        inputs={getInputsUsuario('view')}
                        onChange={() => { }}
                        columns={4}
                        gap="md"
                    />
                </div>
            </BottomModal>

            {/* Modal CAMBIAR ROL */}
            <BottomModal
                isOpen={modals.changeRole}
                onClose={() => {
                    resetForm();
                    setSelectedUserId(null);
                    setters.setChangeRole(false);
                }}
                actions={
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                resetForm();
                                setSelectedUserId(null);
                                setters.setChangeRole(false);
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn btn-warning"
                            onClick={handleSaveRoleChange}
                        >
                            Cambiar Rol
                        </button>
                    </>
                }
            >
                <div className="Usuarios__modal-content">
                    <div className="Usuarios__modal-header">
                        <UserCog size={24} />
                        <h3>Cambiar Rol del Usuario</h3>
                    </div>

                    <FormInput
                        inputs={[
                            {
                                name: 'rol_id',
                                label: 'Nuevo rol',
                                type: 'select',
                                value: formData.rol_id,
                                placeholder: 'Selecciona un rol',
                                required: true,
                                icon: <Shield />,
                                options: roles.map(r => ({
                                    label: `${r.nombre} - ${r.descripcion}`,
                                    value: r.id
                                })),
                                col: 4,
                            },
                        ]}
                        onChange={handleChange}
                        columns={1}
                        gap="md"
                    />
                </div>
            </BottomModal>

            {/* Modal PERMISOS DEL ROL */}
            <BottomModal
                isOpen={modals.rolePermisos}
                onClose={() => {
                    setters.setRolePermisos(false);
                    setSelectedRoleId(null);
                }}
                actions={
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            setters.setRolePermisos(false);
                            setSelectedRoleId(null);
                        }}
                    >
                        Cerrar
                    </button>
                }
            >
                <div className="Usuarios__modal-content">
                    <div className="Usuarios__modal-header">
                        <Settings size={24} />
                        <div>
                            <h3>Gestionar Permisos del Rol</h3>
                            <p className="Usuarios__modal-subtitle">
                                Los cambios afectarán a todos los usuarios con este rol
                            </p>
                        </div>
                    </div>

                    {selectedRoleId && (
                        <PermisosManager
                            rolId={selectedRoleId}
                            onChange={handleSavePermisos}
                        />
                    )}
                </div>
            </BottomModal>
        </div>
    );
};

export default Usuarios;