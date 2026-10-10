import React, { useState } from 'react';
import { Alert, Badge, Button, EmptyState, Input, Modal } from '../../components/common/Common';
import { PlusIcon, SearchIcon, ShieldAlertIcon, UsersIcon } from '../../components/icons/Icons';
import { useConfirm } from '../../context/ConfirmContext';
import { cn } from '../../lib/cn';
import { RolesApi, RolResumen } from '../../api/roles';
import { RolFormModal } from './RolFormModal';
import { MenuAcciones, OpcionMenu } from './MenuAcciones';

const CODIGO_VALIDO = /^[A-Z][A-Z0-9_]{2,39}$/;
type Filtro = 'activos' | 'inactivos' | 'todos';

interface Props {
  roles: RolResumen[];
  onCambio: () => void;
}

export const RolesView: React.FC<Props> = ({ roles, onCambio }) => {
  const confirm = useConfirm();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('activos');
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [formulario, setFormulario] = useState<{ abierto: boolean; rolId: string | null }>({ abierto: false, rolId: null });
  const [duplicando, setDuplicando] = useState<RolResumen | null>(null);

  const texto = busqueda.trim().toLowerCase();
  const visibles = roles
    .filter((r) => (filtro === 'todos' ? true : filtro === 'activos' ? r.activo : !r.activo))
    .filter((r) => !texto || r.nombre.toLowerCase().includes(texto) || r.codigo.toLowerCase().includes(texto))
    .sort((a, b) => Number(b.esSistema) - Number(a.esSistema) || a.nombre.localeCompare(b.nombre));

  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    setMensaje(null);
    try {
      await accion();
      setMensaje({ tipo: 'success', texto: exito });
      onCambio();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo completar la acción.' });
    }
  };

  const cambiarEstado = async (r: RolResumen) => {
    const ok = await confirm(
      r.activo
        ? {
            title: 'Desactivar rol',
            message:
              r.cantidadUsuariosActivos > 0
                ? `${r.cantidadUsuariosActivos} usuario(s) con el rol "${r.nombre}" no podrán iniciar sesión mientras esté desactivado.`
                : `El rol "${r.nombre}" ya no se podrá asignar a usuarios nuevos.`,
            confirmLabel: 'Desactivar',
            variant: 'danger',
          }
        : { title: 'Activar rol', message: `El rol "${r.nombre}" se podrá volver a asignar.`, confirmLabel: 'Activar' },
    );
    if (!ok) return;
    await ejecutar(
      () => (r.activo ? RolesApi.desactivar(r.id) : RolesApi.activar(r.id)),
      r.activo ? `Rol "${r.nombre}" desactivado.` : `Rol "${r.nombre}" activado.`,
    );
  };

  const eliminar = async (r: RolResumen) => {
    const ok = await confirm({
      title: 'Eliminar rol',
      message: `Se eliminará el rol "${r.nombre}" con sus permisos. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (ok) await ejecutar(() => RolesApi.eliminar(r.id), `Rol "${r.nombre}" eliminado.`);
  };

  const opcionesDe = (r: RolResumen): OpcionMenu[] => {
    const ops: OpcionMenu[] = [{ etiqueta: 'Duplicar como rol nuevo', onClick: () => setDuplicando(r) }];
    if (r.esSistema) return ops;
    ops.push(
      r.activo
        ? { etiqueta: 'Desactivar rol', onClick: () => cambiarEstado(r), separadorAntes: true }
        : { etiqueta: 'Activar rol', onClick: () => cambiarEstado(r), separadorAntes: true },
    );
    if (r.cantidadUsuarios === 0) ops.push({ etiqueta: 'Eliminar rol', onClick: () => eliminar(r), peligro: true });
    return ops;
  };

  return (
    <>
      <div className="py-[14px] px-[20px] border-b border-border flex items-center gap-[10px] flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-[320px]">
          <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-text-light flex">
            <SearchIcon size={15} />
          </span>
          <input
            className="w-full h-[38px] pl-[34px] pr-[12px] text-[13px] rounded-sm border border-border bg-white text-text-main outline-none focus:border-primary-500"
            placeholder="Buscar rol"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="inline-flex border border-border rounded-sm overflow-hidden h-[38px]">
          {(['activos', 'inactivos', 'todos'] as Filtro[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={cn(
                'px-[14px] text-[13px] border-0 cursor-pointer capitalize [transition:all_150ms]',
                filtro === f ? 'bg-primary-50 text-primary-700 font-bold' : 'bg-white text-text-muted font-medium hover:bg-bg-subtle',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button icon={<PlusIcon size={15} />} onClick={() => setFormulario({ abierto: true, rolId: null })}>
            Nuevo rol
          </Button>
        </div>
      </div>

      <div className="p-[20px]">
        {mensaje && <Alert type={mensaje.tipo}>{mensaje.texto}</Alert>}

        {visibles.length === 0 ? (
          <EmptyState icon={<ShieldAlertIcon size={36} />} title="No hay roles con ese filtro" description="Cambia la búsqueda o el estado." />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[16px]">
            {visibles.map((r) => (
              <article
                key={r.id}
                className={cn(
                  'flex flex-col rounded-md border bg-white [transition:all_150ms] hover:shadow-md',
                  r.esSistema ? 'border-midnight-700/40' : 'border-border',
                  !r.activo && 'bg-bg-subtle',
                )}
              >
                <div className="p-[16px] flex-1">
                  <div className="flex items-start justify-between gap-[8px]">
                    <div className="min-w-0">
                      <h4 className={cn('text-[15px] font-bold m-0 truncate', r.activo ? 'text-text-main' : 'text-text-muted')}>{r.nombre}</h4>
                      <code className="text-[11px] text-text-muted">{r.codigo}</code>
                    </div>
                    <div className="flex gap-[4px] shrink-0">
                      {r.esSistema && <Badge variant="midnight">Sistema</Badge>}
                      {!r.activo && <Badge variant="neutral">Inactivo</Badge>}
                    </div>
                  </div>
                  <p className="text-[12.5px] text-text-secondary leading-[1.5] mt-[10px] mb-0 line-clamp-2 min-h-[38px]">
                    {r.descripcion || <span className="text-text-light italic">Sin descripción</span>}
                  </p>
                </div>
                <div className="px-[16px] py-[10px] border-t border-border-subtle flex items-center justify-between gap-[8px]">
                  <span className="inline-flex items-center gap-[6px] text-[12px] text-text-muted">
                    <UsersIcon size={14} />
                    <strong className="text-text-main">{r.cantidadUsuariosActivos}</strong>
                    {r.cantidadUsuariosActivos === 1 ? 'usuario activo' : 'usuarios activos'}
                    {r.cantidadUsuarios > r.cantidadUsuariosActivos && (
                      <span className="text-text-light">· {r.cantidadUsuarios - r.cantidadUsuariosActivos} inactivo(s)</span>
                    )}
                  </span>
                  <div className="flex items-center gap-[2px]">
                    <Button size="sm" variant="ghost" onClick={() => setFormulario({ abierto: true, rolId: r.id })}>
                      {r.esSistema ? 'Ver permisos' : 'Editar'}
                    </Button>
                    <MenuAcciones opciones={opcionesDe(r)} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <RolFormModal
        abierto={formulario.abierto}
        rolId={formulario.rolId}
        onCerrar={() => setFormulario({ abierto: false, rolId: null })}
        onGuardado={(nombre, creado) => {
          setFormulario({ abierto: false, rolId: null });
          setMensaje({ tipo: 'success', texto: creado ? `Rol "${nombre}" creado.` : `Permisos de "${nombre}" guardados.` });
          onCambio();
        }}
      />
      <DuplicarRolModal
        origen={duplicando}
        onCerrar={() => setDuplicando(null)}
        onDuplicado={(nombre) => {
          setDuplicando(null);
          setMensaje({ tipo: 'success', texto: `Se creó el rol "${nombre}". Ajusta sus permisos con "Editar".` });
          onCambio();
        }}
      />
    </>
  );
};

const DuplicarRolModal: React.FC<{ origen: RolResumen | null; onCerrar: () => void; onDuplicado: (nombre: string) => void }> = ({
  origen,
  onCerrar,
  onDuplicado,
}) => {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  React.useEffect(() => {
    if (!origen) return;
    setCodigo(`${origen.codigo}_2`.slice(0, 40));
    setNombre(`${origen.nombre} (copia)`);
    setError(null);
  }, [origen]);

  const guardar = async () => {
    if (!origen) return;
    if (!CODIGO_VALIDO.test(codigo)) return setError('El código va en MAYÚSCULAS, empieza con letra y usa solo letras, números o _ (3 a 40).');
    if (!nombre.trim()) return setError('Ingresa el nombre del rol.');
    setGuardando(true);
    setError(null);
    try {
      await RolesApi.duplicar(origen.id, { codigo, nombre: nombre.trim() });
      onDuplicado(nombre.trim());
    } catch (err: any) {
      setError(err.message || 'No se pudo duplicar el rol.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={!!origen}
      onClose={onCerrar}
      title="Duplicar rol"
      maxWidth="480px"
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} loading={guardando}>
            Duplicar
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-text-secondary mt-0 mb-[14px]">
        Se crea un rol nuevo con los mismos permisos de <strong className="text-text-main">{origen?.nombre}</strong>. Sirve, por ejemplo, para alguien que cumple dos funciones.
      </p>
      {error && <Alert type="error">{error}</Alert>}
      <Input
        label="Código"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
        className="font-mono"
        maxLength={40}
        helperText="No se puede cambiar después."
      />
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
    </Modal>
  );
};
