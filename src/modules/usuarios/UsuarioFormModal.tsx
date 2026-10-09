import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, Select, Alert, Spinner } from '../../components/common/Common';
import { UsuariosApi, Usuario, Rol } from '../../api/usuarios';

interface UsuarioFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario?: Usuario | null;
  onSuccess: (usuario: Usuario, contrasenaTemporal?: string) => void;
}

const validarDNI = (dni: string): boolean => {
  const dniTrimmed = dni.trim();
  if (dniTrimmed.length === 8) {
    return /^\d{8}$/.test(dniTrimmed);
  }
  if (dniTrimmed.length >= 9 && dniTrimmed.length <= 12) {
    return /^[a-zA-Z0-9]{9,12}$/.test(dniTrimmed);
  }
  return false;
};

const validarContrasena = (contrasena: string): boolean => {
  if (contrasena.length < 8) return false;
  const tieneLetra = /[a-zA-Z]/.test(contrasena);
  const tieneNumero = /[0-9]/.test(contrasena);
  return tieneLetra && tieneNumero;
};

export const UsuarioFormModal: React.FC<UsuarioFormModalProps> = ({
  isOpen,
  onClose,
  usuario,
  onSuccess,
}) => {
  const esEdicion = !!usuario;

  // Datos del formulario
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [rolId, setRolId] = useState('');
  const [cargo, setCargo] = useState('');
  const [correo, setCorreo] = useState('');

  // Contraseña (solo al crear)
  const [generarTemporal, setGenerarTemporal] = useState(true);
  const [contrasena, setContrasena] = useState('');

  // Estados
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [erroresValidacion, setErroresValidacion] = useState<Record<string, string>>({});

  // Cargar roles al abrir
  useEffect(() => {
    if (!isOpen) return;

    const cargarRoles = async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await UsuariosApi.listarRolesParaSelect();
        const rolesActivos = (data.roles || []).filter((r) => r.activo);
        setRoles(rolesActivos);
      } catch (err: any) {
        setError(err.message || 'No se pudieron cargar los roles.');
      } finally {
        setCargando(false);
      }
    };

    cargarRoles();

    if (esEdicion && usuario) {
      setDni(usuario.dni);
      setNombres(usuario.nombres);
      setRolId(usuario.rolId);
      setCargo(usuario.cargo || '');
      setCorreo(usuario.correo || '');
    } else {
      setDni('');
      setNombres('');
      setRolId('');
      setCargo('');
      setCorreo('');
      setGenerarTemporal(true);
      setContrasena('');
    }
    setErroresValidacion({});
  }, [isOpen, usuario, esEdicion]);

  const validar = (): boolean => {
    const errores: Record<string, string> = {};

    if (!dni.trim()) {
      errores.dni = 'El DNI es requerido.';
    } else if (!validarDNI(dni)) {
      errores.dni = 'DNI inválido (8 dígitos o 9-12 alfanuméricos).';
    }

    if (!nombres.trim()) {
      errores.nombres = 'El nombre es requerido.';
    }

    if (!rolId) {
      errores.rolId = 'Debe seleccionar un rol.';
    }

    if (!esEdicion && !generarTemporal && contrasena && !validarContrasena(contrasena)) {
      errores.contrasena = 'La contraseña debe tener mínimo 8 caracteres (con letra y número).';
    }

    setErroresValidacion(errores);
    return Object.keys(errores).length === 0;
  };

  const manejarGuardar = async () => {
    if (!validar()) return;

    setGuardando(true);
    setError(null);

    try {
      if (esEdicion && usuario) {
        // Editar
        const usuarioActualizado = await UsuariosApi.editar(usuario.id, {
          nombres,
          cargo: cargo || undefined,
          correo: correo || undefined,
          rolId,
        });
        onSuccess(usuarioActualizado);
      } else {
        // Crear
        const payload = {
          dni,
          nombres,
          rolId,
          cargo: cargo || undefined,
          correo: correo || undefined,
          contrasena: !generarTemporal && contrasena ? contrasena : undefined,
        };
        const resultado = await UsuariosApi.crear(payload);
        onSuccess(resultado.usuario, resultado.contrasenaTemporal || undefined);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
      maxWidth="520px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" loading={guardando} onClick={manejarGuardar}>
            {esEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </>
      }
    >
      {cargando && (
        <div className="flex items-center justify-center gap-[12px] py-[32px]">
          <Spinner size={20} />
          <span className="text-[13px] text-text-muted">Cargando...</span>
        </div>
      )}

      {!cargando && (
        <div className="space-y-[4px]">
          {error && <Alert type="error">{error}</Alert>}

          <Input
            label="DNI"
            placeholder="8 dígitos o carné de extranjería"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            disabled={esEdicion}
            error={erroresValidacion.dni}
          />

          <Input
            label="Nombre completo"
            placeholder="Nombre del usuario"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            error={erroresValidacion.nombres}
          />

          <Select
            label="Rol"
            value={rolId}
            onChange={(e) => setRolId(e.target.value)}
            error={erroresValidacion.rolId}
          >
            <option value="">Seleccionar rol...</option>
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>
                {rol.nombre}
              </option>
            ))}
          </Select>

          <Input
            label="Cargo (opcional)"
            placeholder="P. ej.: Fiscalizador"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
          />

          <Input
            label="Correo (opcional)"
            type="email"
            placeholder="usuario@ejemplo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />

          {!esEdicion && (
            <div className="mt-[20px] p-[12px] bg-[#f0f9ff] border border-[#bae6fd] rounded-[6px]">
              <p className="text-[12px] text-[#0369a1] font-semibold mb-[12px]">Contraseña:</p>
              <label className="flex items-center gap-[8px] mb-[10px]">
                <input
                  type="radio"
                  checked={generarTemporal}
                  onChange={() => {
                    setGenerarTemporal(true);
                    setContrasena('');
                  }}
                  className="cursor-pointer"
                />
                <span className="text-[12px]">Generar contraseña temporal (recomendado)</span>
              </label>
              <label className="flex items-center gap-[8px]">
                <input
                  type="radio"
                  checked={!generarTemporal}
                  onChange={() => setGenerarTemporal(false)}
                  className="cursor-pointer"
                />
                <span className="text-[12px]">Definir contraseña ahora</span>
              </label>

              {!generarTemporal && (
                <Input
                  label="Contraseña"
                  type="password"
                  placeholder="Min. 8 caracteres (letra + número)"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  error={erroresValidacion.contrasena}
                  className="mt-[12px]"
                />
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
