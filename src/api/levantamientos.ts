import { apiClient, BASE_URL, getToken } from './client';

// ============================================================================
// F1 — LEVANTAMIENTO DE MEDIDAS PROVISIONALES (expediente incidental)
// ============================================================================

export type EstadoSolicitudLevantamiento = 'EN_EVALUACION' | 'LEVANTADA' | 'DENEGADA' | 'LEVANTADA_POR_VENCIMIENTO';
export type SiguientePasoLevantamiento =
  | 'EVALUAR'
  | 'GENERAR_CARTA_VENCIMIENTO'
  | 'ENVIAR_A_FIRMA'
  | 'REGISTRAR_FIRMA'
  | 'NOTIFICAR'
  | 'COMPLETO';
export type TipoCartaLevantamiento = 'LEVANTAMIENTO' | 'DENEGATORIA' | 'LEVANTAMIENTO_VENCIMIENTO';
export type CanalSolicitudLevantamiento = 'PRESENCIAL' | 'VIRTUAL';
export type MedioNotificacionCarta = 'CORREO' | 'PRESENCIAL';

export interface MedidaProvisionalItem {
  actaMedidaProvisionalId: string;
  numeroActa: string;
  tipoMedida: string;
  descripcion: string | null;
  lugarEjecucion: string | null;
  fechaIntervencion: string;
  expedienteId: string | null;
  numeroExpediente: string | null;
  numeroNotificacionCargo: string | null;
  administradoNombre: string | null;
  administradoDocumento: string | null;
  domicilio: string | null;
}

export interface SolicitudLevantamientoItem {
  id: string;
  medida: MedidaProvisionalItem;
  numeroRegistro: string | null;
  fechaHoraPresentacion: string;
  canal: CanalSolicitudLevantamiento;
  correoNotificacion: string | null;
  resumen: string;
  venceEn: string;
  esClausura: boolean;
  plazoTexto: string;
  baseLegal: string;
  estado: EstadoSolicitudLevantamiento;
  vencida: boolean;
  horasRestantes: number;
  urgente: boolean;
  siguientePaso: SiguientePasoLevantamiento;
  resultado: 'FAVORABLE' | 'DESFAVORABLE' | null;
  fundamentacion: string | null;
  evaluadoEn: string | null;
  tipoCarta: TipoCartaLevantamiento | null;
  fechaEnvioFirma: string | null;
  fechaHoraFirma: string | null;
  numeroCarta: string | null;
  /** Se levantó con acta (excepcional) en lugar de carta. */
  esActaLevantamiento: boolean;
  atendidaDentroDelPlazo: boolean | null;
  fechaNotificacion: string | null;
  medioNotificacion: MedioNotificacionCarta | null;
  registradoPorNombre: string | null;
  createdAt: string;
  documentos: Array<{ id: string; nombreOriginal: string; tamanoBytes: number | null; subidoEn: string }>;
}

export interface MedidaLevantamientoItem {
  medida: MedidaProvisionalItem;
  estado: 'VIGENTE' | 'LEVANTADA';
  fechaLevantamiento: string | null;
  motivoLevantamiento: 'FAVORABLE' | 'VENCIMIENTO_PLAZO' | null;
  evaluacionFavorable: boolean;
  solicitudAbierta: SolicitudLevantamientoItem | null;
  puedeRegistrarSolicitud: boolean;
  totalSolicitudes: number;
  solicitudes: SolicitudLevantamientoItem[];
}

export interface BandejaLevantamientos {
  enEvaluacion: SolicitudLevantamientoItem[];
  resueltas: SolicitudLevantamientoItem[];
  levantadasPorVencimiento: SolicitudLevantamientoItem[];
}

export interface NuevaSolicitudLevantamientoPayload {
  actaMedidaProvisionalId: string;
  /** ISO con zona de Lima (…-05:00). */
  fechaHoraPresentacion: string;
  canal: CanalSolicitudLevantamiento;
  numeroRegistro?: string;
  correoNotificacion?: string;
  resumen: string;
  archivos: File[];
}

async function lanzarErrorDeRespuesta(res: Response): Promise<never> {
  let errorMsg = `Error ${res.status}: ${res.statusText}`;
  try {
    const errJson = await res.json();
    errorMsg = Array.isArray(errJson.message) ? errJson.message.join(' ') : errJson.message || errorMsg;
  } catch {
    // sin body JSON
  }
  throw new Error(errorMsg);
}

export const LevantamientosApi = {
  getBandeja: () => apiClient<BandejaLevantamientos>('/levantamientos/bandeja'),
  buscarMedidas: (q: string) => apiClient<MedidaLevantamientoItem[]>(`/levantamientos/medidas?q=${encodeURIComponent(q)}`),
  porExpediente: (expedienteId: string) => apiClient<MedidaLevantamientoItem[]>(`/levantamientos/expediente/${expedienteId}`),
  getDetalle: (id: string) =>
    apiClient<{ solicitud: SolicitudLevantamientoItem; medida: MedidaLevantamientoItem }>(`/levantamientos/${id}`),
  registrar: (p: NuevaSolicitudLevantamientoPayload) => {
    const fd = new FormData();
    fd.append('actaMedidaProvisionalId', p.actaMedidaProvisionalId);
    fd.append('fechaHoraPresentacion', p.fechaHoraPresentacion);
    fd.append('canal', p.canal);
    if (p.numeroRegistro) fd.append('numeroRegistro', p.numeroRegistro);
    if (p.correoNotificacion) fd.append('correoNotificacion', p.correoNotificacion);
    fd.append('resumen', p.resumen);
    p.archivos.forEach((a) => fd.append('archivos', a));
    return apiClient<{ id: string }>('/levantamientos', { method: 'POST', body: fd });
  },
  adjuntarDocumentos: (id: string, archivos: File[]) => {
    const fd = new FormData();
    archivos.forEach((a) => fd.append('archivos', a));
    return apiClient<{ ok: true }>(`/levantamientos/${id}/documentos`, { method: 'POST', body: fd });
  },
  evaluar: (id: string, resultado: 'FAVORABLE' | 'DESFAVORABLE', fundamentacion: string) =>
    apiClient<{ ok: true }>(`/levantamientos/${id}/evaluacion`, { method: 'PATCH', body: JSON.stringify({ resultado, fundamentacion }) }),
  disponerCartaVencimiento: (id: string) => apiClient<{ ok: true }>(`/levantamientos/${id}/carta-vencimiento`, { method: 'PATCH' }),
  enviarAFirma: (id: string, fechaEnvio: string) =>
    apiClient<{ ok: true }>(`/levantamientos/${id}/enviar-a-firma`, { method: 'PATCH', body: JSON.stringify({ fechaEnvio }) }),
  firmar: (id: string, fechaHoraFirma: string, numeroCarta: string) =>
    apiClient<{ ok: true; atendidaDentroDelPlazo: boolean }>(`/levantamientos/${id}/firmar`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaHoraFirma, numeroCarta }),
    }),
  /** Excepcional: acta de levantamiento en lugar de carta. */
  registrarActa: (id: string, fechaHoraFirma: string, numeroCarta: string) =>
    apiClient<{ ok: true; atendidaDentroDelPlazo: boolean }>(`/levantamientos/${id}/acta`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaHoraFirma, numeroCarta }),
    }),
  notificar: (id: string, fechaNotificacion: string, medio: MedioNotificacionCarta) =>
    apiClient<{ ok: true }>(`/levantamientos/${id}/notificar`, { method: 'PATCH', body: JSON.stringify({ fechaNotificacion, medio }) }),
};

/**
 * Descarga el Word de la carta que corresponde; relanza el mensaje del
 * backend si lo rechaza. `nombre`: el Content-Disposition no llega al
 * navegador en peticiones de otro origen (CORS), así que la UI lo arma.
 */
export async function descargarCartaLevantamiento(id: string, nombre: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/levantamientos/${id}/carta`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) await lanzarErrorDeRespuesta(res);
  const url = URL.createObjectURL(await res.blob());
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

/** Abre el PDF de la solicitud en una pestaña nueva. */
export async function abrirDocumentoLevantamiento(documentoId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/levantamientos/documentos/${documentoId}/archivo`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) await lanzarErrorDeRespuesta(res);
  window.open(URL.createObjectURL(await res.blob()), '_blank');
}
