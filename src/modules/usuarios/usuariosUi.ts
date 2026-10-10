export function iniciales(nombres: string): string {
  const partes = nombres.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function haceCuanto(iso: string | null): string {
  if (!iso) return 'Nunca';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const ETIQUETA_ACCION_AUDITORIA: Record<string, string> = {
  USUARIO_CREADO: 'Usuario creado',
  USUARIO_EDITADO: 'Datos editados',
  USUARIO_ROL_CAMBIADO: 'Rol cambiado',
  USUARIO_ACTIVADO: 'Usuario activado',
  USUARIO_DESACTIVADO: 'Usuario desactivado',
  USUARIO_CONTRASENA_RESET: 'Contraseña restablecida',
  USUARIO_SESIONES_REVOCADAS: 'Sesiones cerradas',
  USUARIO_DISPOSITIVO_LIBERADO: 'Dispositivo liberado',
};

export const ETIQUETA_CAMPO: Record<string, string> = {
  nombres: 'Nombres',
  cargo: 'Cargo',
  correo: 'Correo',
  rolId: 'Rol',
  rol: 'Rol',
  rolCodigo: 'Rol',
  activo: 'Activo',
  dni: 'DNI',
};

export const DNI_VALIDO = /^(\d{8}|[A-Za-z0-9]{9,12})$/;
export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function motivoContrasenaInvalida(c: string): string | null {
  if (c.length < 8) return 'Debe tener al menos 8 caracteres.';
  if (!/\p{L}/u.test(c) || !/\d/.test(c)) return 'Debe tener al menos una letra y un número.';
  return null;
}
