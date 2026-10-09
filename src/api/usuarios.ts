import { apiClient, BASE_URL, getToken } from './client';

// ============================================================================
// TIPOS
// ============================================================================

export interface Rol {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  esSistema?: boolean;
  activo: boolean;
  cantidadUsuarios?: number;
  cantidadUsuariosActivos?: number;
}

export interface Usuario {
  id: string;
  dni: string;
  nombres: string;
  cargo?: string;
  correo?: string;
  rolId: string;
  rol: Rol;
  activo: boolean;
  debeCambiarContrasena: boolean;
  ultimoAcceso: string | null;
  tieneDispositivo: boolean;
  tieneFirmaRegistrada?: boolean;
  createdAt: string;
}

export interface UsuarioListaResponse {
  items: Usuario[];
  total: number;
}

export interface CrearUsuarioPayload {
  dni: string;
  nombres: string;
  rolId: string;
  cargo?: string;
  correo?: string;
  contrasena?: string;
}

export interface CrearUsuarioResponse {
  usuario: Usuario;
  contrasenaTemporal: string | null;
}

export interface EditarUsuarioPayload {
  nombres?: string;
  cargo?: string;
  correo?: string;
  rolId?: string;
}

export interface RestablecerContraResponse {
  contrasenaTemporal: string;
}

export interface AuditoriaItem {
  id: string;
  actorNombres: string;
  accion: string;
  antes?: Record<string, any>;
  despues?: Record<string, any>;
  createdAt: string;
}

export interface RolesResponse {
  roles: Rol[];
}

// ============================================================================
// API
// ============================================================================

export const UsuariosApi = {
  listar: (busqueda?: string, rolId?: string, activo?: boolean, pagina: number = 1, porPagina: number = 10) => {
    const params = new URLSearchParams();
    if (busqueda) params.append('busqueda', busqueda);
    if (rolId) params.append('rolId', rolId);
    if (activo !== undefined) params.append('activo', activo.toString());
    params.append('pagina', pagina.toString());
    params.append('porPagina', porPagina.toString());
    return apiClient<UsuarioListaResponse>(`/usuarios?${params.toString()}`);
  },

  opciones: (modulo: string, nivel: 'VER' | 'EDITAR' = 'EDITAR') =>
    apiClient<{ id: string; dni: string; nombres: string }[]>(`/usuarios/opciones?modulo=${modulo}&nivel=${nivel}`),

  obtener: (id: string) => apiClient<Usuario>(`/usuarios/${id}`),

  crear: (payload: CrearUsuarioPayload) =>
    apiClient<CrearUsuarioResponse>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editar: (id: string, payload: EditarUsuarioPayload) =>
    apiClient<Usuario>(`/usuarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  activar: (id: string) =>
    apiClient<{ id: string; activo: boolean }>(`/usuarios/${id}/activar`, {
      method: 'PATCH',
    }),

  desactivar: (id: string) =>
    apiClient<{ id: string; activo: boolean }>(`/usuarios/${id}/desactivar`, {
      method: 'PATCH',
    }),

  restablecerContrasena: (id: string) =>
    apiClient<RestablecerContraResponse>(`/usuarios/${id}/resetear-contrasena`, {
      method: 'POST',
    }),

  revocarSesiones: (id: string) =>
    apiClient<{ ok: true }>(`/usuarios/${id}/revocar-sesiones`, {
      method: 'POST',
    }),

  liberarDispositivo: (id: string) =>
    apiClient<{ ok: true }>(`/usuarios/${id}/liberar-dispositivo`, {
      method: 'POST',
    }),

  obtenerAuditoria: (id: string) => apiClient<AuditoriaItem[]>(`/usuarios/${id}/auditoria`),

  listarRolesParaSelect: () => apiClient<RolesResponse>('/roles'),

  // Obtiene la URL de la firma del usuario (blob PNG)
  obtenerFirmaUrl: async (id: string): Promise<string | null> => {
    const token = getToken();
    try {
      const res = await fetch(`${BASE_URL}/usuarios/${id}/firma`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (err: any) {
      throw new Error('No se pudo cargar la firma');
    }
  },

  // Elimina la firma del usuario
  quitarFirma: (id: string) =>
    apiClient<void>(`/usuarios/${id}/firma`, {
      method: 'DELETE',
    }),
};
