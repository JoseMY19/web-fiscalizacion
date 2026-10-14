import { apiClient } from './client';

// ============================================================================
// TIPOS
// ============================================================================

export type NivelPermiso = 'NINGUNO' | 'VER' | 'EDITAR';

export interface RolResumen {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  esSistema: boolean;
  activo: boolean;
  cantidadUsuarios: number;
  cantidadUsuariosActivos: number;
}

export interface RolDetalle extends RolResumen {
  permisos: Record<string, NivelPermiso>;
  acciones: string[];
}

export interface CatalogoPermisos {
  modulos: Array<{ id: string; etiqueta: string }>;
  acciones: Array<{ id: string; etiqueta: string; descripcion: string }>;
  niveles: NivelPermiso[];
}

export interface CrearRolPayload {
  codigo: string;
  nombre: string;
  descripcion?: string;
  permisos: Record<string, NivelPermiso>;
  acciones: string[];
}

export interface ActualizarRolPayload {
  nombre?: string;
  descripcion?: string;
  permisos?: Record<string, NivelPermiso>;
  acciones?: string[];
}

export interface DuplicarRolPayload {
  codigo: string;
  nombre: string;
}

// ============================================================================
// API CLIENT
// ============================================================================

export const RolesApi = {
  listar: () =>
    apiClient<{ roles: RolResumen[] }>('/roles'),

  catalogo: () =>
    apiClient<CatalogoPermisos>('/roles/catalogo'),

  obtener: (id: string) =>
    apiClient<RolDetalle>(`/roles/${id}`),

  crear: (payload: CrearRolPayload) =>
    apiClient<{ id: string; codigo: string }>('/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  actualizar: (id: string, payload: ActualizarRolPayload) =>
    apiClient<void>(`/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  activar: (id: string) =>
    apiClient<void>(`/roles/${id}/activar`, { method: 'PATCH' }),

  desactivar: (id: string) =>
    apiClient<void>(`/roles/${id}/desactivar`, { method: 'PATCH' }),

  eliminar: (id: string) =>
    apiClient<void>(`/roles/${id}`, { method: 'DELETE' }),

  duplicar: (id: string, payload: DuplicarRolPayload) =>
    apiClient<{ id: string; codigo: string }>(`/roles/${id}/duplicar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
