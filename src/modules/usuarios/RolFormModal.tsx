import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { CatalogoPermisos, NivelPermiso, RolDetalle, RolesApi } from '../../api/roles';
import { MatrizPermisos } from './MatrizPermisos';
import { cn } from '../../lib/cn';

interface RolFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  rol?: RolDetalle | null;
  catalogo: CatalogoPermisos;
  onGuardado: () => void;
}

const CODIGO_REGEX = /^[A-Z][A-Z0-9_]{2,39}$/;

export const RolFormModal: React.FC<RolFormModalProps> = ({
  isOpen,
  onClose,
  rol,
  catalogo,
  onGuardado,
}) => {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [permisos, setPermisos] = useState<Record<string, NivelPermiso>>({});
  const [acciones, setAcciones] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esCreacion = !rol;
  const esSistema = rol?.esSistema ?? false;
  const soloLectura = esSistema && !esCreacion;

  useEffect(() => {
    if (isOpen && rol) {
      setNombre(rol.nombre);
      setCodigo(rol.codigo);
      setDescripcion(rol.descripcion);
      setPermisos({ ...rol.permisos });
      setAcciones([...rol.acciones]);
      setError(null);
    } else if (isOpen && !rol) {
      setNombre('');
      setCodigo('');
      setDescripcion('');
      // Inicializar permisos con NINGUNO para todos los módulos
      const permisosIniciales = {} as Record<string, NivelPermiso>;
      for (const m of catalogo.modulos) {
        permisosIniciales[m.id] = 'NINGUNO';
      }
      setPermisos(permisosIniciales);
      setAcciones([]);
      setError(null);
    }
  }, [isOpen, rol, catalogo]);

  const validar = (): string | null => {
    if (!nombre.trim()) return 'El nombre del rol es requerido.';
    if (esCreacion) {
      if (!codigo.trim()) return 'El código es requerido.';
      if (!CODIGO_REGEX.test(codigo)) {
        return 'El código debe tener 3-40 caracteres, comenzar con letra mayúscula y contener solo mayúsculas, números o guiones bajos.';
      }
    }
    return null;
  };

  const guardar = async () => {
    const validacion = validar();
    if (validacion) {
      setError(validacion);
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      if (esCreacion) {
        await RolesApi.crear({
          codigo: codigo.toUpperCase(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          permisos,
          acciones,
        });
      } else {
        await RolesApi.actualizar(rol!.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          permisos,
          acciones,
        });
      }
      onGuardado();
      onClose();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el rol.');
    } finally {
      setGuardando(false);
    }
  };

  const handlePermisosChange = (nuevosPermisos: Record<string, NivelPermiso>, nuevasAcciones: string[]) => {
    setPermisos(nuevosPermisos);
    setAcciones(nuevasAcciones);
  };

  const titulo = esCreacion ? 'Crear nuevo rol' : soloLectura ? `Ver rol: ${rol!.nombre}` : `Editar rol: ${rol!.nombre}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titulo}
      maxWidth="900px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {!soloLectura && (
            <Button loading={guardando} onClick={guardar}>
              {esCreacion ? 'Crear rol' : 'Guardar cambios'}
            </Button>
          )}
        </>
      }
    >
      {soloLectura && (
        <Alert type="info">El rol del sistema no se puede modificar.</Alert>
      )}

      {error && <Alert type="error">{error}</Alert>}

      <div className="space-y-[14px]">
        {/* Campos básicos */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-x-[12px]">
          <Input
            label="Nombre del rol"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Validador"
            disabled={soloLectura}
          />
          {esCreacion && (
            <Input
              label="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej. VALIDADOR"
              disabled={soloLectura}
              helperText="3-40 caracteres, mayúsculas"
              maxLength={40}
            />
          )}
        </div>

        <Textarea
          label="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Propósito y responsabilidades del rol..."
          disabled={soloLectura}
        />

        {/* Matriz de permisos */}
        <div className="border-t border-border pt-[16px]">
          <MatrizPermisos
            catalogo={catalogo}
            permisos={permisos}
            acciones={acciones}
            onChange={handlePermisosChange}
            soloLectura={soloLectura}
          />
        </div>
      </div>
    </Modal>
  );
};
