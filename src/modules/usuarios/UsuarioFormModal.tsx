import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Select } from '../../components/common/Common';
import { cn } from '../../lib/cn';
import { Usuario, UsuariosApi } from '../../api/usuarios';
import { RolResumen } from '../../api/roles';
import { CORREO_VALIDO, DNI_VALIDO, motivoContrasenaInvalida } from './usuariosUi';
import { useConfirm } from '../../context/ConfirmContext';

interface Props {
  abierto: boolean;
  usuario: Usuario | null;
  roles: RolResumen[];
  onCerrar: () => void;
  onGuardado: (r: { creado: boolean; nombres: string; contrasenaTemporal: string | null }) => void;
}

type ModoContrasena = 'temporal' | 'definir';

const Seccion: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <section className="mb-[18px] last:mb-0">
    <h4 className="text-[11px] font-bold uppercase tracking-[0.6px] text-text-muted mb-[10px] pb-[6px] border-b border-border-subtle">{titulo}</h4>
    {children}
  </section>
);

export const UsuarioFormModal: React.FC<Props> = ({ abierto, usuario, roles, onCerrar, onGuardado }) => {
  const esEdicion = !!usuario;
  const confirm = useConfirm();
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [cargo, setCargo] = useState('');
  const [correo, setCorreo] = useState('');
  const [rolId, setRolId] = useState('');
  const [modo, setModo] = useState<ModoContrasena>('temporal');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setDni(usuario?.dni ?? '');
    setNombres(usuario?.nombres ?? '');
    setCargo(usuario?.cargo ?? '');
    setCorreo(usuario?.correo ?? '');
    setRolId(usuario?.rolId ?? '');
    setModo('temporal');
    setContrasena('');
    setErrores({});
    setErrorGeneral(null);
  }, [abierto, usuario]);

  // Firma registrada (solo edición). La URL del blob se libera al cambiar de usuario o cerrar.
  useEffect(() => {
    if (!abierto || !esEdicion || !usuario?.tieneFirmaRegistrada) {
      setFirmaUrl(null);
      return;
    }
    let vigente = true;
    let url: string | null = null;
    UsuariosApi.obtenerFirmaUrl(usuario.id)
      .then((u) => {
        url = u;
        if (vigente) setFirmaUrl(u);
        else if (u) URL.revokeObjectURL(u);
      })
      .catch(() => vigente && setFirmaUrl(null));
    return () => {
      vigente = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [abierto, esEdicion, usuario?.id, usuario?.tieneFirmaRegistrada]);

  // Un rol inactivo no se asigna, pero si el usuario ya lo tiene se muestra para no perderlo.
  const opcionesRol = roles.filter((r) => r.activo || r.id === usuario?.rolId);
  const rolElegido = roles.find((r) => r.id === rolId);

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!esEdicion && !DNI_VALIDO.test(dni.trim())) e.dni = 'DNI de 8 dígitos o carné de extranjería de 9 a 12 caracteres.';
    if (!nombres.trim()) e.nombres = 'Ingresa los nombres y apellidos.';
    if (correo.trim() && !CORREO_VALIDO.test(correo.trim())) e.correo = 'El correo no tiene un formato válido.';
    if (!rolId) e.rolId = 'Elige un rol.';
    if (!esEdicion && modo === 'definir') {
      const motivo = motivoContrasenaInvalida(contrasena);
      if (motivo) e.contrasena = motivo;
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    setErrorGeneral(null);
    try {
      if (usuario) {
        await UsuariosApi.editar(usuario.id, {
          nombres: nombres.trim(),
          cargo: cargo.trim(),
          correo: correo.trim() || undefined,
          ...(rolId !== usuario.rolId ? { rolId } : {}),
        });
        onGuardado({ creado: false, nombres: nombres.trim(), contrasenaTemporal: null });
      } else {
        const r = await UsuariosApi.crear({
          dni: dni.trim(),
          nombres: nombres.trim(),
          rolId,
          cargo: cargo.trim() || undefined,
          correo: correo.trim() || undefined,
          contrasena: modo === 'definir' ? contrasena : undefined,
        });
        onGuardado({ creado: true, nombres: r.usuario.nombres, contrasenaTemporal: r.contrasenaTemporal });
      }
    } catch (err: any) {
      setErrorGeneral(err.message || 'No se pudo guardar el usuario.');
    } finally {
      setGuardando(false);
    }
  };

  // Maneja la eliminación de la firma del usuario
  const handleQuitarFirma = async () => {
    const confirmado = await confirm({
      title: 'Quitar firma',
      message: 'El usuario tendrá que volver a firmar en su próxima intervención.',
      confirmLabel: 'Quitar',
      variant: 'danger',
    });
    if (!confirmado || !usuario) return;

    try {
      await UsuariosApi.quitarFirma(usuario.id);
      setFirmaUrl(null);
    } catch (err) {
      setErrorGeneral(err instanceof Error ? err.message : 'No se pudo quitar la firma.');
    }
  };

  const OpcionContrasena: React.FC<{ valor: ModoContrasena; titulo: string; detalle: string }> = ({ valor, titulo, detalle }) => (
    <button
      type="button"
      onClick={() => setModo(valor)}
      className={cn(
        'flex-1 text-left p-[12px] rounded-sm border cursor-pointer bg-white [transition:all_150ms]',
        modo === valor ? 'border-primary-600 bg-primary-50 shadow-[0_0_0_1px_var(--color-primary-600)]' : 'border-border hover:border-border-dark',
      )}
    >
      <div className="flex items-center gap-[8px]">
        <span
          className={cn(
            'w-[14px] h-[14px] rounded-full border-2 shrink-0',
            modo === valor ? 'border-primary-600 bg-primary-600 shadow-[inset_0_0_0_2px_white]' : 'border-border-dark',
          )}
        />
        <span className="text-[13px] font-semibold text-text-main">{titulo}</span>
      </div>
      <p className="text-[12px] text-text-muted mt-[4px] ml-[22px] mb-0">{detalle}</p>
    </button>
  );

  return (
    <Modal
      isOpen={abierto}
      onClose={onCerrar}
      title={esEdicion ? 'Editar usuario' : 'Nuevo usuario'}
      maxWidth="640px"
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} loading={guardando}>
            {esEdicion ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      {errorGeneral && <Alert type="error">{errorGeneral}</Alert>}

      <Seccion titulo="Identificación">
        <div className="grid grid-cols-[180px_1fr] gap-x-[14px] max-sm:grid-cols-1">
          <Input
            label="DNI / CE"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            disabled={esEdicion}
            error={errores.dni}
            helperText={esEdicion ? 'Es el usuario de ingreso: no se edita.' : undefined}
            className="font-mono"
            maxLength={12}
            autoFocus={!esEdicion}
          />
          <Input label="Nombres y apellidos" value={nombres} onChange={(e) => setNombres(e.target.value)} error={errores.nombres} autoFocus={esEdicion} />
        </div>
      </Seccion>

      <Seccion titulo="Cargo y contacto (opcional)">
        <div className="grid grid-cols-2 gap-x-[14px] max-sm:grid-cols-1">
          <Input label="Cargo" placeholder="Ej. Abogado instructor" value={cargo} onChange={(e) => setCargo(e.target.value)} />
          <Input label="Correo" type="email" placeholder="nombre@munisjl.gob.pe" value={correo} onChange={(e) => setCorreo(e.target.value)} error={errores.correo} />
        </div>
      </Seccion>

      <Seccion titulo="Acceso">
        <Select
          label="Rol"
          value={rolId}
          onChange={(e) => setRolId(e.target.value)}
          error={errores.rolId}
          helperText={
            rolElegido?.descripcion ||
            (esEdicion ? 'Si cambias el rol, se cerrarán las sesiones abiertas del usuario.' : 'Define a qué módulos entra y qué puede modificar.')
          }
        >
          <option value="">Elige un rol…</option>
          {opcionesRol.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
              {!r.activo ? ' (inactivo)' : ''}
            </option>
          ))}
        </Select>

        {!esEdicion && (
          <>
            <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Contraseña inicial</label>
            <div className="flex gap-[10px] max-sm:flex-col">
              <OpcionContrasena valor="temporal" titulo="Generar temporal" detalle="El sistema crea una y te la muestra una sola vez." />
              <OpcionContrasena valor="definir" titulo="Definirla ahora" detalle="Tú la escribes y se la comunicas al usuario." />
            </div>
            {modo === 'definir' && (
              <div className="mt-[12px]">
                <Input
                  type="text"
                  placeholder="Mínimo 8 caracteres, con letras y números"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  error={errores.contrasena}
                  className="font-mono"
                />
              </div>
            )}
            <p className="text-[12px] text-text-muted mt-[10px] mb-0">En ambos casos, el usuario deberá cambiarla en su primer ingreso.</p>
          </>
        )}
      </Seccion>

      {/* Sección de firma registrada - solo en edición */}
      {esEdicion && (
        <Seccion titulo="Firma registrada">
          {firmaUrl ? (
            <div className="rounded-md border border-border bg-white p-[12px] flex items-center justify-between gap-[12px]">
              <img src={firmaUrl} alt="Firma del usuario" className="max-h-[70px] w-auto object-contain" />
              <Button variant="danger" size="sm" onClick={handleQuitarFirma}>
                Quitar firma
              </Button>
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">Sin firma registrada. Se guarda la primera vez que el usuario firma en la app de campo.</p>
          )}
        </Seccion>
      )}
    </Modal>
  );
};
