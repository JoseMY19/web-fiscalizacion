import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, EmptyState, Spinner } from '../../components/common/Common';
import { PlusIcon, SearchIcon, UsersIcon } from '../../components/icons/Icons';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { tieneAccion } from '../../lib/permisos';
import { cn } from '../../lib/cn';
import { Usuario, UsuariosApi } from '../../api/usuarios';
import { RolResumen } from '../../api/roles';
import { UsuarioFormModal } from './UsuarioFormModal';
import { ContrasenaTemporalModal } from './ContrasenaTemporalModal';
import { AuditoriaUsuarioPanel } from './AuditoriaUsuarioPanel';
import { MenuAcciones, OpcionMenu } from './MenuAcciones';
import { haceCuanto, fechaHora, iniciales } from './usuariosUi';

const POR_PAGINA = 10;
type Estado = 'todos' | 'activos' | 'inactivos';

const CONTROL = 'h-[38px] px-[12px] text-[13px] rounded-sm border border-border bg-white text-text-main outline-none focus:border-primary-500';

interface Props {
  roles: RolResumen[];
  onCambio: () => void;
}

export const UsuariosView: React.FC<Props> = ({ roles, onCambio }) => {
  const confirm = useConfirm();
  const { user } = useAuth();
  const puedeRevocar = tieneAccion(user?.permisos, 'REVOCAR_SESIONES');

  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [rolId, setRolId] = useState('');
  const [estado, setEstado] = useState<Estado>('activos');
  const [pagina, setPagina] = useState(1);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  const [formulario, setFormulario] = useState<{ abierto: boolean; usuario: Usuario | null }>({ abierto: false, usuario: null });
  const [temporal, setTemporal] = useState<{ nombres: string; contrasena: string } | null>(null);
  const [historial, setHistorial] = useState<Usuario | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setBusquedaAplicada(busqueda.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const activo = estado === 'todos' ? undefined : estado === 'activos';
      const r = await UsuariosApi.listar(busquedaAplicada || undefined, rolId || undefined, activo, pagina, POR_PAGINA);
      setUsuarios(r.items);
      setTotal(r.total);
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo cargar la lista de usuarios.' });
    } finally {
      setCargando(false);
    }
  }, [busquedaAplicada, rolId, estado, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    setMensaje(null);
    try {
      await accion();
      setMensaje({ tipo: 'success', texto: exito });
      cargar();
      onCambio();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo completar la acción.' });
    }
  };

  const cambiarEstado = async (u: Usuario) => {
    const ok = await confirm(
      u.activo
        ? {
            title: 'Desactivar usuario',
            message: `${u.nombres} ya no podrá iniciar sesión y se cerrarán sus sesiones abiertas. Su historial se conserva y puedes reactivarlo cuando quieras.`,
            confirmLabel: 'Desactivar',
            variant: 'danger',
          }
        : { title: 'Activar usuario', message: `${u.nombres} podrá volver a iniciar sesión con su contraseña actual.`, confirmLabel: 'Activar' },
    );
    if (!ok) return;
    await ejecutar(
      () => (u.activo ? UsuariosApi.desactivar(u.id) : UsuariosApi.activar(u.id)),
      u.activo ? `${u.nombres} fue desactivado.` : `${u.nombres} fue activado.`,
    );
  };

  const resetear = async (u: Usuario) => {
    const ok = await confirm({
      title: 'Restablecer contraseña',
      message: `Se generará una contraseña temporal para ${u.nombres} y se cerrarán sus sesiones. Deberá cambiarla al ingresar.`,
      confirmLabel: 'Restablecer',
    });
    if (!ok) return;
    setMensaje(null);
    try {
      const r = await UsuariosApi.restablecerContrasena(u.id);
      setTemporal({ nombres: u.nombres, contrasena: r.contrasenaTemporal });
      cargar();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo restablecer la contraseña.' });
    }
  };

  const revocar = async (u: Usuario) => {
    const ok = await confirm({
      title: 'Cerrar sesiones',
      message: `Se cerrarán todas las sesiones abiertas de ${u.nombres} (web y celular). Tendrá que volver a iniciar sesión.`,
      confirmLabel: 'Cerrar sesiones',
      variant: 'danger',
    });
    if (ok) await ejecutar(() => UsuariosApi.revocarSesiones(u.id), `Se cerraron las sesiones de ${u.nombres}.`);
  };

  const liberar = async (u: Usuario) => {
    const ok = await confirm({
      title: 'Liberar dispositivo',
      message: `${u.nombres} podrá iniciar sesión en la app de campo desde otro celular.`,
      confirmLabel: 'Liberar',
    });
    if (ok) await ejecutar(() => UsuariosApi.liberarDispositivo(u.id), `Se liberó el dispositivo de ${u.nombres}.`);
  };

  const opcionesDe = (u: Usuario): OpcionMenu[] => {
    const esYo = u.id === user?.id;
    const ops: OpcionMenu[] = [
      { etiqueta: 'Ver historial', onClick: () => setHistorial(u) },
      { etiqueta: 'Restablecer contraseña', onClick: () => resetear(u) },
    ];
    if (puedeRevocar) {
      ops.push({ etiqueta: 'Cerrar sesiones', onClick: () => revocar(u) });
      if (u.tieneDispositivo) ops.push({ etiqueta: 'Liberar dispositivo', onClick: () => liberar(u) });
    }
    if (!esYo) {
      ops.push(
        u.activo
          ? { etiqueta: 'Desactivar usuario', onClick: () => cambiarEstado(u), peligro: true, separadorAntes: true }
          : { etiqueta: 'Activar usuario', onClick: () => cambiarEstado(u), separadorAntes: true },
      );
    }
    return ops;
  };

  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));
  const hayFiltros = !!busquedaAplicada || !!rolId || estado !== 'activos';

  return (
    <>
      <div className="py-[14px] px-[20px] border-b border-border flex items-center gap-[10px] flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-[360px]">
          <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-text-light flex">
            <SearchIcon size={15} />
          </span>
          <input
            className={cn(CONTROL, 'w-full pl-[34px]')}
            placeholder="Buscar por nombre o DNI"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className={cn(CONTROL, 'min-w-[190px]')}
          value={rolId}
          onChange={(e) => {
            setRolId(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todos los roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
        <div className="inline-flex border border-border rounded-sm overflow-hidden h-[38px]">
          {(['activos', 'inactivos', 'todos'] as Estado[]).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setEstado(e);
                setPagina(1);
              }}
              className={cn(
                'px-[14px] text-[13px] border-0 cursor-pointer capitalize [transition:all_150ms]',
                estado === e ? 'bg-primary-50 text-primary-700 font-bold' : 'bg-white text-text-muted font-medium hover:bg-bg-subtle',
              )}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button icon={<PlusIcon size={15} />} onClick={() => setFormulario({ abierto: true, usuario: null })}>
            Nuevo usuario
          </Button>
        </div>
      </div>

      {mensaje && (
        <div className="px-[20px] pt-[16px]">
          <Alert type={mensaje.tipo} className="mb-0!">
            {mensaje.texto}
          </Alert>
        </div>
      )}

      {cargando && usuarios.length === 0 ? (
        <div className="py-[60px] flex justify-center">
          <Spinner size={28} />
        </div>
      ) : usuarios.length === 0 ? (
        <div className="px-[20px] pb-[8px]">
          <EmptyState
            icon={<UsersIcon size={36} />}
            title={hayFiltros ? 'No hay usuarios con esos filtros' : 'Todavía no hay usuarios'}
            description={hayFiltros ? 'Prueba con otro nombre, rol o estado.' : 'Crea el primer usuario para darle acceso al sistema.'}
          />
        </div>
      ) : (
        <div className={cn('overflow-x-auto', cargando && 'opacity-60')}>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.5px] text-text-muted bg-bg-subtle border-b border-border">
                <th className="py-[10px] pl-[20px] pr-[12px] font-bold">Usuario</th>
                <th className="py-[10px] pr-[12px] font-bold">Rol</th>
                <th className="py-[10px] pr-[12px] font-bold">Estado</th>
                <th className="py-[10px] pr-[12px] font-bold">Último acceso</th>
                <th className="py-[10px] pr-[20px] font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={cn('border-b border-border-subtle hover:bg-bg-subtle', !u.activo && 'text-text-muted')}>
                  <td className="py-[12px] pl-[20px] pr-[12px]">
                    <div className="flex items-center gap-[12px]">
                      <div
                        className={cn(
                          'w-[36px] h-[36px] rounded-full flex items-center justify-center text-[12px] font-bold shrink-0',
                          u.activo ? 'bg-primary-50 text-primary-700' : 'bg-bg-hover text-text-light',
                        )}
                      >
                        {iniciales(u.nombres)}
                      </div>
                      <div className="min-w-0">
                        <div className={cn('font-semibold truncate', u.activo ? 'text-text-main' : 'text-text-muted')}>
                          {u.nombres}
                          {u.id === user?.id && <span className="ml-[6px] text-[11px] font-semibold text-primary-600">(tú)</span>}
                        </div>
                        <div className="text-[12px] text-text-muted truncate">
                          <span className="font-mono">{u.dni}</span>
                          {u.cargo && <> · {u.cargo}</>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-[12px] pr-[12px]">
                    <Badge variant={u.activo ? 'info' : 'neutral'}>{u.rol.nombre}</Badge>
                  </td>
                  <td className="py-[12px] pr-[12px]">
                    <div className="flex flex-col items-start gap-[4px]">
                      <Badge variant={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                      {u.activo && u.debeCambiarContrasena && <span className="text-[11px] font-semibold text-warning">Contraseña temporal</span>}
                    </div>
                  </td>
                  <td className="py-[12px] pr-[12px] whitespace-nowrap">
                    <span title={u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : undefined}>{haceCuanto(u.ultimoAcceso)}</span>
                    {u.tieneDispositivo && <div className="text-[11px] text-text-muted">Celular vinculado</div>}
                  </td>
                  <td className="py-[12px] pr-[20px]">
                    <div className="flex items-center justify-end gap-[4px]">
                      <Button size="sm" variant="ghost" onClick={() => setFormulario({ abierto: true, usuario: u })}>
                        Editar
                      </Button>
                      <MenuAcciones opciones={opcionesDe(u)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="py-[12px] px-[20px] flex items-center justify-between text-[12px] text-text-muted bg-bg-subtle border-t border-border">
          <span>
            Mostrando <strong className="text-text-main">{desde}–{hasta}</strong> de <strong className="text-text-main">{total}</strong>
          </span>
          <div className="flex items-center gap-[8px]">
            <Button size="sm" variant="secondary" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
              Anterior
            </Button>
            <span>
              Página {pagina} de {ultimaPagina}
            </span>
            <Button size="sm" variant="secondary" disabled={pagina >= ultimaPagina} onClick={() => setPagina(pagina + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <UsuarioFormModal
        abierto={formulario.abierto}
        usuario={formulario.usuario}
        roles={roles}
        onCerrar={() => setFormulario({ abierto: false, usuario: null })}
        onGuardado={(r) => {
          setFormulario({ abierto: false, usuario: null });
          setMensaje({ tipo: 'success', texto: r.creado ? `Se creó el usuario ${r.nombres}.` : `Se guardaron los cambios de ${r.nombres}.` });
          if (r.contrasenaTemporal) setTemporal({ nombres: r.nombres, contrasena: r.contrasenaTemporal });
          cargar();
          onCambio();
        }}
      />
      <ContrasenaTemporalModal datos={temporal} onCerrar={() => setTemporal(null)} />
      <AuditoriaUsuarioPanel usuario={historial} onCerrar={() => setHistorial(null)} />
    </>
  );
};
