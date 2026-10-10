import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { CatalogoPermisos, NivelPermiso, RolDetalle, RolesApi } from '../../api/roles';
import { MatrizPermisos } from './MatrizPermisos';

const CODIGO_VALIDO = /^[A-Z][A-Z0-9_]{2,39}$/;

interface Props {
  abierto: boolean;
  rolId: string | null;
  onCerrar: () => void;
  onGuardado: (nombre: string, creado: boolean) => void;
}

export const RolFormModal: React.FC<Props> = ({ abierto, rolId, onCerrar, onGuardado }) => {
  const esEdicion = !!rolId;
  const [catalogo, setCatalogo] = useState<CatalogoPermisos | null>(null);
  const [rol, setRol] = useState<RolDetalle | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [permisos, setPermisos] = useState<Record<string, NivelPermiso>>({});
  const [acciones, setAcciones] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    setCargando(true);
    Promise.all([RolesApi.catalogo(), rolId ? RolesApi.obtener(rolId) : Promise.resolve(null)])
      .then(([cat, detalle]) => {
        setCatalogo(cat);
        setRol(detalle);
        setCodigo(detalle?.codigo ?? '');
        setNombre(detalle?.nombre ?? '');
        setDescripcion(detalle?.descripcion ?? '');
        setPermisos(detalle?.permisos ?? Object.fromEntries(cat.modulos.map((m) => [m.id, 'NINGUNO' as NivelPermiso])));
        setAcciones(detalle?.acciones ?? ['APP_OFICINA']);
      })
      .catch((err) => setError(err.message || 'No se pudo cargar el rol.'))
      .finally(() => setCargando(false));
  }, [abierto, rolId]);

  const soloLectura = !!rol?.esSistema;

  const guardar = async () => {
    if (!catalogo) return;
    if (!esEdicion && !CODIGO_VALIDO.test(codigo)) return setError('El código va en MAYÚSCULAS, empieza con letra y usa solo letras, números o _ (3 a 40).');
    if (!nombre.trim()) return setError('Ingresa el nombre del rol.');
    const matriz = Object.fromEntries(catalogo.modulos.map((m) => [m.id, permisos[m.id] ?? 'NINGUNO'])) as Record<string, NivelPermiso>;
    setGuardando(true);
    setError(null);
    try {
      if (rolId) {
        await RolesApi.actualizar(rolId, { nombre: nombre.trim(), descripcion: descripcion.trim(), permisos: matriz, acciones });
      } else {
        await RolesApi.crear({ codigo, nombre: nombre.trim(), descripcion: descripcion.trim() || undefined, permisos: matriz, acciones });
      }
      onGuardado(nombre.trim(), !rolId);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el rol.');
    } finally {
      setGuardando(false);
    }
  };

  const titulo = soloLectura ? `Permisos de ${rol?.nombre}` : esEdicion ? 'Editar rol' : 'Nuevo rol';

  return (
    <Modal
      isOpen={abierto}
      onClose={onCerrar}
      title={titulo}
      maxWidth="880px"
      footer={
        soloLectura ? (
          <Button variant="secondary" onClick={onCerrar}>
            Cerrar
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} loading={guardando} disabled={cargando || !catalogo}>
              {esEdicion ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </>
        )
      }
    >
      {error && <Alert type="error">{error}</Alert>}

      {cargando || !catalogo ? (
        <div className="py-[60px] flex justify-center">{cargando && <Spinner size={28} />}</div>
      ) : (
        <>
          {soloLectura && (
            <Alert type="info">Es el rol del sistema: siempre tiene acceso total y no se puede modificar, para que nunca falte un administrador.</Alert>
          )}

          <div className="grid grid-cols-[220px_1fr] gap-x-[14px] max-sm:grid-cols-1">
            <Input
              label="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              disabled={esEdicion}
              placeholder="EJ_ROL"
              helperText={esEdicion ? 'No se puede cambiar.' : 'MAYÚSCULAS y _. No se cambia después.'}
              className="font-mono"
              maxLength={40}
            />
            <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={soloLectura} placeholder="Ej. Abogado resolutor" />
          </div>
          <Textarea
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={soloLectura}
            placeholder="Qué hace este rol en el día a día. Se muestra al asignarlo a un usuario."
            className="min-h-[60px]!"
            rows={2}
          />

          <div className="mt-[6px]">
            <MatrizPermisos
              catalogo={catalogo}
              permisos={permisos}
              acciones={acciones}
              soloLectura={soloLectura}
              onChange={(p, a) => {
                setPermisos(p);
                setAcciones(a);
              }}
            />
          </div>
        </>
      )}
    </Modal>
  );
};
