import { apiClient } from './client';

export type NivelAlerta = 'VENCIDO' | 'CRITICO' | 'POR_VENCER' | 'EN_PLAZO';
export type CategoriaAlerta = 'LIMITE' | 'ESPERA' | 'ACCION';
export type FaseExpediente = 'VALIDACION' | 'NOTIFICACION_NC' | 'INSTRUCCION' | 'RESOLUCION' | 'RECURSOS' | 'ACTO_FIRME' | 'COACTIVA' | 'CONCLUIDO';

export interface Alerta {
  clave: string;
  tipo: string;
  categoria: CategoriaAlerta;
  expedienteId: string | null;
  numeroExpediente: string;
  titulo: string;
  detalle: string;
  /** Id del módulo del menú al que lleva la alerta. */
  modulo: string;
  plazoLimite: string | null;
  restante: number | null;
  unidad: 'HORAS' | 'DIAS_HABILES' | 'DIAS_CALENDARIO' | null;
  restanteTexto: string | null;
  nivel: NivelAlerta;
  baseLegal?: string;
  fase: FaseExpediente;
  faseEtiqueta: string;
  faseDetalle: string;
  pagado: boolean;
}

export interface ResumenAlertas {
  total: number;
  criticas: number;
  porNivel: Record<NivelAlerta, number>;
  porModulo: Record<string, { total: number; criticas: number }>;
  masUrgente: Alerta | null;
}

export interface ResultadoAlertas {
  items: Alerta[];
  total: number;
  pagina: number;
  porPagina: number;
  resumen: ResumenAlertas;
}

export interface FiltrosAlertas {
  niveles?: NivelAlerta[];
  categoria?: CategoriaAlerta;
  fase?: FaseExpediente;
  busqueda?: string;
  pagina?: number;
  porPagina?: number;
}

export const AlertasApi = {
  listar: (f: FiltrosAlertas = {}) => {
    const q = new URLSearchParams();
    if (f.niveles?.length) q.set('niveles', f.niveles.join(','));
    if (f.categoria) q.set('categoria', f.categoria);
    if (f.fase) q.set('fase', f.fase);
    if (f.busqueda?.trim()) q.set('busqueda', f.busqueda.trim());
    if (f.pagina) q.set('pagina', String(f.pagina));
    if (f.porPagina) q.set('porPagina', String(f.porPagina));
    const texto = q.toString();
    return apiClient<ResultadoAlertas>(`/alertas${texto ? `?${texto}` : ''}`);
  },
};
