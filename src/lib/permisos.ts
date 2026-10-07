export type NivelPermiso = 'NINGUNO' | 'VER' | 'EDITAR';

export interface PermisosUsuario {
  modulos: Record<string, NivelPermiso>;
  acciones: string[];
}

export function puedeVerModulo(modulo: string, permisos: PermisosUsuario | undefined): boolean {
  if (!permisos) return false;

  const nivel = permisos.modulos[modulo];
  if (nivel && nivel !== 'NINGUNO') return true;

  // Caso especial: módulo 'usuarios' requiere GESTIONAR_USUARIOS o GESTIONAR_ROLES
  if (modulo === 'usuarios') {
    return tieneAccion(permisos, 'GESTIONAR_USUARIOS') || tieneAccion(permisos, 'GESTIONAR_ROLES');
  }

  return false;
}

export function puedeEditarModulo(modulo: string, permisos: PermisosUsuario | undefined): boolean {
  if (!permisos) return false;
  const nivel = permisos.modulos[modulo];
  return nivel === 'EDITAR';
}

export function tieneAccion(permisos: PermisosUsuario | undefined, accion: string): boolean {
  if (!permisos) return false;
  return permisos.acciones.includes(accion);
}
