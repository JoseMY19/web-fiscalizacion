import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, EmptyState, Modal, Spinner } from '../../components/common/Common';
import { CatalogoPermisos, RolDetalle, RolResumen, RolesApi } from '../../api/roles';
import { RolFormModal } from './RolFormModal';
import { useConfirm } from '../../context/ConfirmContext';
import { PlusIcon } from '../../components/icons/Icons';
import { cn } from '../../lib/cn';

interface ModalDuplicar {
  rol: RolResumen;
  codigo: string;
  nombre: string;
}

export const RolesView: React.FC = () => {
  const [roles, setRoles] = useState<RolResumen[] | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoPermisos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [rolEditando, setRolEditando] = useState<RolDetalle | null>(null);

  const [modalDuplicarAbierto, setModalDuplicarAbierto] = useState(false);
  const [duplicarData, setDuplicarData] = useState<ModalDuplicar | null>(null);
  const [codigoDuplicar, setCodigoDuplicar] = useState('');
  const [nombreDuplicar, setNombreDuplicar] = useState('');
  const [guardandoDuplicar, setGuardandoDuplicar] = useState(false);
  const [errorDuplicar, setErrorDuplicar] = useState<string | null>(null);

  const confirm = useConfirm();

  const cargarRoles = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [datosRoles, datosCatalogo] = await Promise.all([RolesApi.listar(), RolesApi.catalogo()]);
      setRoles(datosRoles.roles);
      setCatalogo(datosCatalogo);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los roles.');
      setRoles([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarRoles();
  }, [cargarRoles]);

  const abrirCrear = () => {
    setRolEditando(null);
    setModalFormAbierto(true);
  };

  const abrirEditar = async (rolId: string) => {
    try {
      const rol = await RolesApi.obtener(rolId);
      setRolEditando(rol);
      setModalFormAbierto(true);
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo cargar el rol.' });
    }
  };

  const abrirDuplicar = (rol: RolResumen) => {
    setDuplicarData(rol);
    setCodigoDuplicar('');
    setNombreDuplicar(rol.nombre);
    setErrorDuplicar(null);
    setModalDuplicarAbierto(true);
  };

  const ejecutarDuplicar = async () => {
    if (!duplicarData) return;
    if (!codigoDuplicar.trim()) {
      setErrorDuplicar('El código es requerido.');
      return;
    }
    if (!nombreDuplicar.trim()) {
      setErrorDuplicar('El nombre es requerido.');
      return;
    }
    setGuardandoDuplicar(true);
    setErrorDuplicar(null);
    try {
      await RolesApi.duplicar(duplicarData.id, {
        codigo: codigoDuplicar.toUpperCase(),
        nombre: nombreDuplicar.trim(),
      });
      setMensaje({ type: 'success', text: `Rol ${codigoDuplicar} duplicado correctamente.` });
      setModalDuplicarAbierto(false);
      cargarRoles();
    } catch (err: any) {
      setErrorDuplicar(err.message || 'No se pudo duplicar el rol.');
    } finally {
      setGuardandoDuplicar(false);
    }
  };

  const cambiarEstado = async (rol: RolResumen, nuevoEstado: boolean) => {
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    const confirmado = await confirm({
      title: nuevoEstado ? 'Activar rol' : 'Desactivar rol',
      message: `¿${nuevoEstado ? 'Activar' : 'Desactivar'} el rol ${rol.codigo}?`,
      confirmLabel: nuevoEstado ? 'Activar' : 'Desactivar',
      variant: nuevoEstado ? 'primary' : 'warning',
    });
    if (!confirmado) return;

    try {
      if (nuevoEstado) {
        await RolesApi.activar(rol.id);
      } else {
        await RolesApi.desactivar(rol.id);
      }
      setMensaje({
        type: 'success',
        text: `Rol ${rol.codigo} ${nuevoEstado ? 'activado' : 'desactivado'}.`,
      });
      cargarRoles();
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || `No se pudo ${accion} el rol.` });
    }
  };

  const eliminar = async (rol: RolResumen) => {
    const confirmado = await confirm({
      title: 'Eliminar rol',
      message: `¿Eliminar el rol ${rol.codigo}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmado) return;

    try {
      await RolesApi.eliminar(rol.id);
      setMensaje({ type: 'success', text: `Rol ${rol.codigo} eliminado.` });
      cargarRoles();
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo eliminar el rol.' });
    }
  };

  const puedeEliminar = (rol: RolResumen) => rol.cantidadUsuarios === 0 && !rol.esSistema;

  return (
    <div className="max-w-[1200px] mx-auto">
      {mensaje && (
        <div className="mb-[16px]">
          <Alert type={mensaje.type}>{mensaje.text}</Alert>
        </div>
      )}

      <Card
        title="Roles y permisos"
        subtitle="Gestiona los roles del sistema y sus permisos por módulo y acciones especiales"
        action={
          <Button size="sm" icon={<PlusIcon size={14} />} onClick={abrirCrear}>
            Nuevo rol
          </Button>
        }
      >
        {error && <Alert type="error">{error}</Alert>}

        {cargando ? (
          <div className="flex items-center gap-[8px] text-[13px] text-text-muted py-[24px]">
            <Spinner size={16} /> Cargando…
          </div>
        ) : !roles || roles.length === 0 ? (
          <EmptyState title="Todavía no hay roles" description="Crea el primer rol del sistema" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-left text-text-muted text-[12px] border-b border-b-border">
                  <th className="py-[8px] pr-[12px]">Código</th>
                  <th className="py-[8px] pr-[12px]">Nombre</th>
                  <th className="py-[8px] pr-[12px]">Usuarios</th>
                  <th className="py-[8px] pr-[12px]">Estado</th>
                  <th className="py-[8px]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((rol) => (
                  <tr key={rol.id} className="border-b border-b-border align-top hover:bg-bg-hover">
                    <td className="py-[10px] pr-[12px]">
                      <span className="font-mono font-semibold text-midnight-900">{rol.codigo}</span>
                      {rol.esSistema && <Badge variant="midnight" className="ml-[8px]">Sistema</Badge>}
                    </td>
                    <td className="py-[10px] pr-[12px]">
                      <div className="font-semibold text-text-main">{rol.nombre}</div>
                      {rol.descripcion && (
                        <div className="text-[12px] text-text-muted mt-[2px]">{rol.descripcion}</div>
                      )}
                    </td>
                    <td className="py-[10px] pr-[12px] text-[12px]">
                      {rol.cantidadUsuarios === 0 ? (
                        <span className="text-text-muted">Sin usuarios</span>
                      ) : (
                        <>
                          {rol.cantidadUsuariosActivos} activos / {rol.cantidadUsuarios}
                        </>
                      )}
                    </td>
                    <td className="py-[10px] pr-[12px]">
                      <Badge variant={rol.activo ? 'success' : 'neutral'}>
                        {rol.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="py-[10px] text-right">
                      <div className="flex items-center gap-[6px] justify-end">
                        <button
                          onClick={() => abrirEditar(rol.id)}
                          className="text-[12px] text-primary-600 font-semibold hover:underline cursor-pointer"
                        >
                          {rol.esSistema ? 'Ver' : 'Editar'}
                        </button>
                        <span className="text-border">|</span>
                        <button
                          onClick={() => abrirDuplicar(rol)}
                          className="text-[12px] text-primary-600 font-semibold hover:underline cursor-pointer"
                        >
                          Duplicar
                        </button>
                        {!rol.esSistema && (
                          <>
                            <span className="text-border">|</span>
                            <button
                              onClick={() => cambiarEstado(rol, !rol.activo)}
                              className="text-[12px] text-warning hover:underline cursor-pointer font-semibold"
                            >
                              {rol.activo ? 'Desactivar' : 'Activar'}
                            </button>
                            {puedeEliminar(rol) && (
                              <>
                                <span className="text-border">|</span>
                                <button
                                  onClick={() => eliminar(rol)}
                                  className="text-[12px] text-danger font-semibold hover:underline cursor-pointer"
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de creación/edición */}
      {catalogo && (
        <RolFormModal
          isOpen={modalFormAbierto}
          onClose={() => {
            setModalFormAbierto(false);
            setRolEditando(null);
          }}
          rol={rolEditando}
          catalogo={catalogo}
          onGuardado={() => {
            setMensaje({
              type: 'success',
              text: rolEditando ? 'Rol actualizado.' : 'Rol creado correctamente.',
            });
            cargarRoles();
          }}
        />
      )}

      {/* Modal de duplicación */}
      <Modal
        isOpen={modalDuplicarAbierto}
        onClose={() => setModalDuplicarAbierto(false)}
        title={`Duplicar rol: ${duplicarData?.codigo}`}
        maxWidth="440px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalDuplicarAbierto(false)}>
              Cancelar
            </Button>
            <Button loading={guardandoDuplicar} onClick={ejecutarDuplicar}>
              Duplicar
            </Button>
          </>
        }
      >
        {errorDuplicar && <Alert type="error">{errorDuplicar}</Alert>}
        <div className="space-y-[14px]">
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Código nuevo</label>
            <input
              type="text"
              value={codigoDuplicar}
              onChange={(e) => setCodigoDuplicar(e.target.value.toUpperCase())}
              placeholder="Ej. VALIDADOR_2"
              maxLength={40}
              className="w-full py-[10px] px-[14px] text-[14px] rounded-sm border border-border bg-[#ffffff] text-text-main outline-none focus:border-primary-600 [transition:border-color_var(--transition-fast)]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Nombre nuevo</label>
            <input
              type="text"
              value={nombreDuplicar}
              onChange={(e) => setNombreDuplicar(e.target.value)}
              className="w-full py-[10px] px-[14px] text-[14px] rounded-sm border border-border bg-[#ffffff] text-text-main outline-none focus:border-primary-600 [transition:border-color_var(--transition-fast)]"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
