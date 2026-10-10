import { apiClient } from './client';

// Mantenimiento del catálogo CUIS (Configuración).

export type EscalaCuis = 'L' | 'G' | 'MG';

export interface EscalaCuisDatos {
  escala: EscalaCuis;
  condicion: string | null;
  valorPorcentaje: number;
  medidaProvisional: string | null;
  medidaComplementaria: string | null;
}

export interface EscalaCuisRegistro extends EscalaCuisDatos {
  id: string;
  /** Intervenciones que aplicaron esta escala (si hay, no se puede quitar). */
  usos: number;
}

export interface CodigoCuisRegistro {
  id: string;
  idInterno: string;
  codigoNormativo: string;
  categoria: { numero: string; nombre: string };
  subcategoria: { id: string; numero: string; nombre: string };
  /** Descripción del código (campo real del catálogo: texto_completo_pdf). */
  textoCompletoPdf: string | null;
  fuenteNormativa: string | null;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  requiereDesambiguacion: boolean;
  activo: boolean;
  modificadoEn: string | null;
  modificadoPor: string | null;
  usos: number;
  escalas: EscalaCuisRegistro[];
}

export interface CodigoCuisDatos {
  subcategoriaId: string;
  codigoNormativo: string;
  textoCompletoPdf: string | null;
  fuenteNormativa: string | null;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  requiereDesambiguacion: boolean;
}

export type FiltroEstadoCuis = 'TODOS' | 'SIN_MEDIDA' | 'INACTIVOS';

export interface ResumenCatalogoCuis {
  activos: number;
  conMedidaComplementaria: number;
}

export interface TaxonomiaCuis {
  categorias: Array<{ numero: string; nombre: string; subcategorias: Array<{ id: string; numero: string; nombre: string }> }>;
}

const base = '/cuis/mantenimiento';
const json = (method: string, body?: unknown) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const CuisMantenimientoApi = {
  listar: (f: { q?: string; categoria?: string; estado?: FiltroEstadoCuis; pagina?: number; tamano?: number }) => {
    const p = new URLSearchParams();
    if (f.q?.trim()) p.set('q', f.q.trim());
    if (f.categoria) p.set('categoria', f.categoria);
    if (f.estado) p.set('estado', f.estado);
    p.set('pagina', String(f.pagina ?? 1));
    p.set('tamano', String(f.tamano ?? 20));
    return apiClient<{ items: CodigoCuisRegistro[]; total: number; resumen: ResumenCatalogoCuis }>(`${base}/codigos?${p.toString()}`);
  },
  taxonomia: () => apiClient<TaxonomiaCuis>(`${base}/taxonomia`),
  crear: (d: CodigoCuisDatos & { escalas: EscalaCuisDatos[] }) => apiClient<CodigoCuisRegistro>(`${base}/codigos`, json('POST', d)),
  actualizar: (id: string, d: CodigoCuisDatos) => apiClient<CodigoCuisRegistro>(`${base}/codigos/${id}`, json('PATCH', d)),
  cambiarEstado: (id: string, activo: boolean) => apiClient<{ ok: true }>(`${base}/codigos/${id}/estado`, json('PATCH', { activo })),
  eliminar: (id: string) => apiClient<{ ok: true }>(`${base}/codigos/${id}`, json('DELETE')),
  crearEscala: (codigoId: string, d: EscalaCuisDatos) => apiClient<CodigoCuisRegistro>(`${base}/codigos/${codigoId}/escalas`, json('POST', d)),
  actualizarEscala: (escalaId: string, d: EscalaCuisDatos) => apiClient<CodigoCuisRegistro>(`${base}/escalas/${escalaId}`, json('PATCH', d)),
  eliminarEscala: (escalaId: string) => apiClient<CodigoCuisRegistro>(`${base}/escalas/${escalaId}`, json('DELETE')),
};
