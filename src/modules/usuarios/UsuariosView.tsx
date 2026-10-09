import React, { useCallback, useEffect, useState } from 'react';
import { UsuariosApi, Usuario } from '../../api/usuarios';
import { Alert, Badge, Button, Card, EmptyState, Input, Select, Spinner } from '../../components/common/Common';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { tieneAccion } from '../../lib/permisos';
import { formatearFecha } from '../../lib/fechas';
import { MoreVerticalIcon, PlusIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { UsuarioFormModal } from './UsuarioFormModal';
import { ContrasenaTemporalModal } from './ContrasenaTemporalModal';
import { AuditoriaUsuarioPanel } from './AuditoriaUsuarioPanel';

const ITEMS_POR_PAGINA = 10;

export const UsuariosView: React.FC = () => {
  const { user } = useAuth();
  const confirm = useConfirm();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Modales
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<Usuario | null>(null);
  const [contrasenaTemporal, setContrasenaTemporal] = useState<{ usuario: string; contrasena: string } | null>(null);
  const [auditoriaModalOpen, setAuditoriaModalOpen] = useState(false);
  const [usuarioParaAuditoria, setUsuarioParaAuditoria] = useState<{ id: string; nombre: string } | null>(null);

  // Menú de acciones
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  // Estados de acciones
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const activo = filtroEstado === 'todos' ? undefined : filtroEstado === 'activos';
      const data = await UsuariosApi.listar(busqueda, filtroRol || undefined, activo, pagina, ITEMS_POR_PAGINA);
      setUsuarios(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtroRol, filtroEstado, pagina]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroRol, filtroEstado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirFormulario = (usuarioAEditar?: Usuario) => {
    setUsuarioEnEdicion(usuarioAEditar || null);
    setFormModalOpen(true);
  };

  const manejarGuardarUsuario = (usuarioGuardado: Usuario, contrasenaTemporal?: string) => {
    if (contrasenaTemporal) {
      setContrasenaTemporal({ usuario: usuarioGuardado.nombres, contrasena: contrasenaTemporal });
    } else {
      cargar();
    }
  };

  const cambiarEstado = async (usuario: Usuario) => {
    const accion = usuario.activo ? 'desactivar' : 'activar';
    const confirmado = await confirm({
      message: `¿Confirmas ${accion} a ${usuario.nombres}?`,
      confirmLabel: accion.charAt(0).toUpperCase() + accion.slice(1),
      variant: usuario.activo ? 'danger' : 'primary',
    });

    if (!confirmado) return;

    setCambiandoEstado(usuario.id);
    setMenuAbierto(null);
    try {
      if (usuario.activo) {
        await UsuariosApi.desactivar(usuario.id);
      } else {
        await UsuariosApi.activar(usuario.id);
      }
      cargar();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el estado.');
    } finally {
      setCambiandoEstado(null);
    }
  };

  const restablecerContrasena = async (usuario: Usuario) => {
    const confirmado = await confirm({
      title: 'Restablecer contraseña',
      message: `Se generará una nueva contraseña temporal para ${usuario.nombres}.`,
      confirmLabel: 'Restablecer',
    });

    if (!confirmado) return;

    setMenuAbierto(null);
    try {
      const resultado = await UsuariosApi.restablecerContrasena(usuario.id);
      setContrasenaTemporal({ usuario: usuario.nombres, contrasena: resultado.contrasenaTemporal });
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña.');
    }
  };

  const revocarSesiones = async (usuario: Usuario) => {
    const confirmado = await confirm({
      message: `¿Revocar todas las sesiones activas de ${usuario.nombres}? Se cerrará su acceso en todos los dispositivos.`,
      variant: 'danger',
      confirmLabel: 'Revocar',
    });

    if (!confirmado) return;

    setMenuAbierto(null);
    setCambiandoEstado(usuario.id);
    try {
      await UsuariosApi.revocarSesiones(usuario.id);
      cargar();
    } catch (err: any) {
      setError(err.message || 'Error al revocar sesiones.');
    } finally {
      setCambiandoEstado(null);
    }
  };

  const liberarDispositivo = async (usuario: Usuario) => {
    const confirmado = await confirm({
      message: `¿Liberar el dispositivo vinculado de ${usuario.nombres}?`,
      confirmLabel: 'Liberar',
    });

    if (!confirmado) return;

    setMenuAbierto(null);
    setCambiandoEstado(usuario.id);
    try {
      await UsuariosApi.liberarDispositivo(usuario.id);
      cargar();
    } catch (err: any) {
      setError(err.message || 'Error al liberar el dispositivo.');
    } finally {
      setCambiandoEstado(null);
    }
  };

  const mostrarAuditoria = (usuario: Usuario) => {
    setUsuarioParaAuditoria({ id: usuario.id, nombre: usuario.nombres });
    setAuditoriaModalOpen(true);
    setMenuAbierto(null);
  };

  const inicio = (pagina - 1) * ITEMS_POR_PAGINA + 1;
  const fin = Math.min(pagina * ITEMS_POR_PAGINA, total);

  return (
    <div className="space-y-[20px]">
      <div>
        <h2 className="text-[18px] font-extrabold text-midnight-900">Usuarios</h2>
        <p className="text-[13px] text-text-muted mt-[2px]">
          Gestión de cuentas de usuario y accesos al sistema.
        </p>
      </div>

      <Card
        action={
          <Button
            variant="primary"
            size="sm"
            icon={<PlusIcon size={14} />}
            onClick={() => abrirFormulario()}
          >
            Nuevo usuario
          </Button>
        }
      >
        <div className="mb-[16px] space-y-[12px]">
          <div className="flex flex-col sm:flex-row gap-[12px]">
            <Input
              placeholder="Buscar por DNI o nombre"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1"
            />
            <Button variant="secondary" size="md" icon={<RefreshCwIcon size={14} />} onClick={() => cargar()}>
              Actualizar
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-[12px]">
            <Select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className="flex-1">
              <option value="">Todos los roles</option>
            </Select>

            <Select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'activos' | 'inactivos')}
              className="flex-1"
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </Select>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {cargando && (
          <div className="flex items-center gap-[8px] text-[13px] text-text-muted py-[32px]">
            <Spinner size={16} />
            Cargando...
          </div>
        )}

        {!cargando && usuarios.length === 0 ? (
          <EmptyState title={busqueda || filtroRol ? 'Sin resultados' : 'Sin usuarios aún'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="text-left text-text-muted text-[12px] border-b border-b-border">
                    <th className="py-[12px] pr-[12px]">DNI / Nombre</th>
                    <th className="py-[12px] pr-[12px]">Rol</th>
                    <th className="py-[12px] pr-[12px]">Estado</th>
                    <th className="py-[12px] pr-[12px]">Último acceso</th>
                    <th className="py-[12px] pr-[12px]">Dispositivo</th>
                    <th className="py-[12px]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="border-b border-b-border align-top">
                      <td className="py-[12px] pr-[12px]">
                        <div className="font-bold text-midnight-900">{u.dni}</div>
                        <div className="text-text-muted text-[12px]">
                          {u.nombres}
                          {u.cargo && <div className="text-text-muted">{u.cargo}</div>}
                        </div>
                      </td>
                      <td className="py-[12px] pr-[12px]">
                        <Badge variant="info">{u.rol.nombre}</Badge>
                      </td>
                      <td className="py-[12px] pr-[12px]">
                        <div className="flex flex-col gap-[4px]">
                          <Badge variant={u.activo ? 'success' : 'neutral'}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {u.debeCambiarContrasena && (
                            <Badge variant="warning">Debe cambiar contraseña</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-[12px] pr-[12px] text-[12px] text-text-muted">
                        {u.ultimoAcceso ? formatearFecha(u.ultimoAcceso) : 'Nunca'}
                      </td>
                      <td className="py-[12px] pr-[12px] text-[12px]">
                        {u.tieneDispositivo ? 'Vinculado' : '—'}
                      </td>
                      <td className="py-[12px]">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMenuAbierto(menuAbierto === u.id ? null : u.id)}
                            disabled={cambiandoEstado === u.id}
                          >
                            <MoreVerticalIcon size={16} />
                          </Button>

                          {menuAbierto === u.id && (
                            <div className="absolute right-0 top-full mt-[4px] bg-white border border-border rounded-[6px] shadow-lg z-[100] min-w-[140px]">
                              <button
                                onClick={() => abrirFormulario(u)}
                                className="block w-full text-left px-[12px] py-[8px] text-[12px] hover:bg-[#f8fafc] border-b border-b-border"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => cambiarEstado(u)}
                                className="block w-full text-left px-[12px] py-[8px] text-[12px] hover:bg-[#f8fafc] border-b border-b-border"
                              >
                                {u.activo ? 'Desactivar' : 'Activar'}
                              </button>
                              <button
                                onClick={() => restablecerContrasena(u)}
                                className="block w-full text-left px-[12px] py-[8px] text-[12px] hover:bg-[#f8fafc] border-b border-b-border"
                              >
                                Restablecer clave
                              </button>

                              {tieneAccion(user?.permisos, 'REVOCAR_SESIONES') && (
                                <>
                                  <button
                                    onClick={() => revocarSesiones(u)}
                                    className="block w-full text-left px-[12px] py-[8px] text-[12px] hover:bg-[#f8fafc] border-b border-b-border"
                                  >
                                    Cerrar sesiones
                                  </button>
                                  {u.tieneDispositivo && (
                                    <button
                                      onClick={() => liberarDispositivo(u)}
                                      className="block w-full text-left px-[12px] py-[8px] text-[12px] hover:bg-[#f8fafc] border-b border-b-border"
                                    >
                                      Liberar dispositivo
                                    </button>
                                  )}
                                </>
                              )}

                              <button
                                onClick={() => mostrarAuditoria(u)}
                                className="block w-full text-left px-[12px] py-[8px] text-[12px] hover:bg-[#f8fafc]"
                              >
                                Historial
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between mt-[16px] pt-[16px] border-t border-t-border">
              <p className="text-[12px] text-text-muted">
                Mostrando {inicio}–{fin} de {total}
              </p>
              <div className="flex gap-[8px]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagina(Math.max(1, pagina - 1))}
                  disabled={pagina === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagina(pagina + 1)}
                  disabled={fin >= total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modales */}
      <UsuarioFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        usuario={usuarioEnEdicion}
        onSuccess={manejarGuardarUsuario}
      />

      <ContrasenaTemporalModal
        isOpen={!!contrasenaTemporal}
        onClose={() => {
          setContrasenaTemporal(null);
          cargar();
        }}
        contrasena={contrasenaTemporal?.contrasena || ''}
        usuario={contrasenaTemporal?.usuario || ''}
      />

      {usuarioParaAuditoria && (
        <AuditoriaUsuarioPanel
          isOpen={auditoriaModalOpen}
          onClose={() => setAuditoriaModalOpen(false)}
          usuarioId={usuarioParaAuditoria.id}
          usuarioNombre={usuarioParaAuditoria.nombre}
        />
      )}
    </div>
  );
};
