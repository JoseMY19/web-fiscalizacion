import { apiClient, BASE_URL, getToken } from './client';

// ============================================================================
// F3 — PRESCRIPCIÓN DE LA EXIGIBILIDAD DE MULTAS (art. 233-A Ley 27444)
// ============================================================================

export type MotivoSuspensionPrescripcion = 'INICIO_COACTIVA' | 'REVISION_JUDICIAL' | 'DISPOSICION_JUDICIAL';
export type DestinoMemorandoPrescripcion = 'COACTIVA' | 'RIESGOS_DESASTRES';
export type SiguientePasoPrescripcion =
  | 'AGREGAR_MULTAS'
  | 'DECIDIR_MULTAS'
  | 'ENVIAR_A_FIRMA'
  | 'REGISTRAR_FIRMA'
  | 'NOTIFICAR'
  | 'ACTUALIZAR_ESTADO_CUENTA'
  | 'COMPLETO';

export interface MultaPrescripcionItem {
  id: string;
  resolucion: { id: string; numeroExpediente: string } | null;
  codigoCuis: string | null;
  descripcionInfraccion: string | null;
  numeroResolucionSancion: string | null;
  fechaResolucion: string | null;
  fechaNotificacion: string | null;
  monto: number | null;
  ordenanza: string | null;
  fechaFirmeza: string;
  origenFirmeza: 'ACTO_FIRME' | 'SIN_RECURSOS' | 'MANUAL';
  fechaContenciosoDesfavorable: string | null;
  figuraCoaDc: boolean;
  memorando: {
    numero: string | null;
    fecha: string | null;
    dirigidoA: DestinoMemorandoPrescripcion | null;
    respuestaFecha: string | null;
    respuestaResumen: string | null;
  };
  resultado: 'PRESCRITA' | 'NO_PRESCRITA' | null;
  motivoResultado: string | null;
  suspensiones: Array<{ id: string; motivo: MotivoSuspensionPrescripcion; desde: string; hasta: string | null; detalle: string | null }>;
  calculo: {
    inicioComputo: string;
    vencimientoBase: string;
    diasSuspendidos: number;
    fechaPrescripcion: string | null;
    suspensionAbierta: boolean;
    cumplePlazo: boolean;
  };
  faltantesParaPrescribir: string[];
}

export interface SolicitudPrescripcionItem {
  id: string;
  administradoNombre: string;
  administradoTipoDocumento: string | null;
  administradoNumeroDocumento: string | null;
  codigoContribuyente: string | null;
  domicilio: string | null;
  fechaPresentacion: string;
  numeroSgd: string | null;
  resumen: string;
  analisisTexto: string | null;
  fechaEnvioFirma: string | null;
  fechaFirma: string | null;
  numeroResolucion: string | null;
  fechaNotificacion: string | null;
  estadoCuenta: { responsableId: string | null; responsableNombre: string | null; confirmada: boolean; fechaConfirmacion: string | null };
  registradoPorNombre: string | null;
  createdAt: string;
  documentos: Array<{ id: string; nombreOriginal: string; tamanoBytes: number | null; subidoEn: string }>;
  multas: MultaPrescripcionItem[];
  editable: boolean;
  resuelta: boolean;
  hayPrescritas: boolean;
  siguientePaso: SiguientePasoPrescripcion;
}

export interface ResolucionCandidataPrescripcion {
  resolucionId: string;
  expedienteId: string;
  numeroExpediente: string;
  numeroResolucion: string | null;
  fechaEmision: string | null;
  fechaNotificacion: string | null;
  monto: number | null;
  codigosCuis: string[];
  administradoNombre: string | null;
  administradoDocumento: string | null;
  situacionRecursos: string;
  firmeza: { fecha: string; origen: 'ACTO_FIRME' | 'SIN_RECURSOS' } | null;
}

export interface MultaManualPayload {
  codigoCuis?: string;
  descripcionInfraccion?: string;
  numeroResolucionSancion: string;
  fechaResolucion?: string;
  fechaNotificacion?: string;
  monto?: number;
  ordenanza?: string;
  fechaFirmeza: string;
  fechaContenciosoDesfavorable?: string;
  figuraCoaDc?: boolean;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
const multa = (id: string, multaId: string) => `/prescripcion/${id}/multas/${multaId}`;

async function lanzarError(res: Response): Promise<never> {
  let msg = `Error ${res.status}: ${res.statusText}`;
  try {
    const j = await res.json();
    msg = Array.isArray(j.message) ? j.message.join(' ') : j.message || msg;
  } catch {
    // sin body JSON
  }
  throw new Error(msg);
}

export const PrescripcionApi = {
  getBandeja: () => apiClient<{ enEvaluacion: SolicitudPrescripcionItem[]; resueltas: SolicitudPrescripcionItem[] }>('/prescripcion/bandeja'),
  getDetalle: (id: string) => apiClient<SolicitudPrescripcionItem>(`/prescripcion/${id}`),
  buscarResoluciones: (q = '') => apiClient<ResolucionCandidataPrescripcion[]>(`/prescripcion/resoluciones?q=${encodeURIComponent(q)}`),
  registrar: (p: {
    administradoNombre: string;
    administradoTipoDocumento?: string;
    administradoNumeroDocumento?: string;
    codigoContribuyente?: string;
    domicilio?: string;
    fechaPresentacion: string;
    numeroSgd?: string;
    resumen: string;
    archivos: File[];
  }) => {
    const fd = new FormData();
    Object.entries(p).forEach(([k, v]) => {
      if (k !== 'archivos' && typeof v === 'string' && v.trim()) fd.append(k, v.trim());
    });
    p.archivos.forEach((a) => fd.append('archivos', a));
    return apiClient<{ id: string }>('/prescripcion', { method: 'POST', body: fd });
  },
  adjuntarDocumentos: (id: string, archivos: File[]) => {
    const fd = new FormData();
    archivos.forEach((a) => fd.append('archivos', a));
    return apiClient<{ ok: true }>(`/prescripcion/${id}/documentos`, { method: 'POST', body: fd });
  },
  guardarAnalisis: (id: string, analisisTexto: string) => apiClient<{ ok: true }>(`/prescripcion/${id}/analisis`, json('PATCH', { analisisTexto })),
  agregarMultaSistema: (id: string, p: { resolucionId: string; figuraCoaDc?: boolean; fechaContenciosoDesfavorable?: string }) =>
    apiClient<{ id: string }>(`/prescripcion/${id}/multas/sistema`, json('POST', p)),
  agregarMultaManual: (id: string, p: MultaManualPayload) => apiClient<{ id: string }>(`/prescripcion/${id}/multas/manual`, json('POST', p)),
  editarMulta: (id: string, multaId: string, p: Partial<MultaManualPayload> & { fechaContenciosoDesfavorable?: string | null }) =>
    apiClient<{ ok: true }>(multa(id, multaId), json('PATCH', p)),
  eliminarMulta: (id: string, multaId: string) => apiClient<{ ok: true }>(multa(id, multaId), json('DELETE')),
  agregarSuspension: (id: string, multaId: string, p: { motivo: MotivoSuspensionPrescripcion; desde: string; hasta?: string; detalle?: string }) =>
    apiClient<{ ok: true }>(`${multa(id, multaId)}/suspensiones`, json('POST', p)),
  eliminarSuspension: (id: string, multaId: string, suspensionId: string) =>
    apiClient<{ ok: true }>(`${multa(id, multaId)}/suspensiones/${suspensionId}`, json('DELETE')),
  registrarMemorando: (
    id: string,
    multaId: string,
    p: { numero: string; fecha: string; dirigidoA: DestinoMemorandoPrescripcion; respuestaFecha?: string; respuestaResumen?: string },
  ) => apiClient<{ ok: true }>(`${multa(id, multaId)}/memorando`, json('PATCH', p)),
  decidir: (id: string, multaId: string, resultado: 'PRESCRITA' | 'NO_PRESCRITA', motivo: string) =>
    apiClient<{ ok: true }>(`${multa(id, multaId)}/decision`, json('PATCH', { resultado, motivo: motivo || undefined })),
  enviarAFirma: (id: string, fechaEnvio: string) => apiClient<{ ok: true }>(`/prescripcion/${id}/enviar-a-firma`, json('PATCH', { fechaEnvio })),
  firmar: (id: string, fechaFirma: string, numeroResolucion: string) =>
    apiClient<{ ok: true }>(`/prescripcion/${id}/firmar`, json('PATCH', { fechaFirma, numeroResolucion })),
  notificar: (id: string, fechaNotificacion: string) => apiClient<{ ok: true }>(`/prescripcion/${id}/notificar`, json('PATCH', { fechaNotificacion })),
  estadoCuenta: (id: string, responsableId: string, confirmada: boolean) =>
    apiClient<{ ok: true }>(`/prescripcion/${id}/estado-cuenta`, json('PATCH', { responsableId, confirmada })),
};

export async function descargarRsgPrescripcion(id: string, nombre: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/prescripcion/${id}/documento`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) await lanzarError(res);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export async function abrirDocumentoPrescripcion(documentoId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/prescripcion/documentos/${documentoId}/archivo`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) await lanzarError(res);
  window.open(URL.createObjectURL(await res.blob()), '_blank');
}
