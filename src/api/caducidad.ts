import { apiClient, BASE_URL, getToken } from './client';

// ============================================================================
// F2 — CADUCIDAD DEL PAS (art. 237-A Ley 27444)
// ============================================================================

export type EstadoPlazoCaducidad = 'SIN_NC_NOTIFICADA' | 'CORRIENDO' | 'POR_CADUCAR' | 'VENCIDO' | 'DETENIDO';
export type SiguientePasoCaducidad = 'INICIAR' | 'EVALUAR' | 'ENVIAR_A_FIRMA' | 'REGISTRAR_FIRMA' | 'NOTIFICAR' | 'DECIDIR' | 'COMPLETO';

export interface RegistroCaducidad {
  origen: 'DE_OFICIO' | 'A_PEDIDO';
  fechaSolicitud: string | null;
  numeroRegistro: string | null;
  resumenSolicitud: string | null;
  resultado: 'DECLARADA' | 'DENEGADA' | null;
  fundamentacion: string | null;
  evaluadoEn: string | null;
  fechaEnvioFirma: string | null;
  fechaFirma: string | null;
  numeroResolucion: string | null;
  fechaNotificacion: string | null;
  decisionPosterior: 'NUEVO_PAS' | 'ARCHIVO' | null;
  notaDecision: string | null;
  fechaDecision: string | null;
  nuevoExpediente: { id: string; numeroExpediente: string } | null;
  registradoPorNombre: string | null;
  createdAt: string;
  documentos: Array<{ id: string; nombreOriginal: string; tamanoBytes: number | null; subidoEn: string }>;
}

export interface CaducidadExpedienteItem {
  expedienteId: string;
  numeroExpediente: string;
  administradoNombre: string | null;
  administradoDocumento: string | null;
  numeroNotificacionCargo: string | null;
  ncFechaNotificacion: string | null;
  fechaInfraccion: string;
  ampliacionFirmada: boolean;
  resolucionFinal: { tipo: string; estado: string; fechaNotificacion: string | null } | null;
  plazo: { estado: EstadoPlazoCaducidad; fechaLimite: string | null; diasRestantes: number | null };
  potestad: { fechaInfraccion: string; fechaPrescripcion: string; prescrita: boolean };
  caducado: boolean;
  puedeDeclararDeOficio: boolean;
  siguientePaso: SiguientePasoCaducidad;
  /** Trámite vigente (el último registrado). */
  caducidad: RegistroCaducidad | null;
  /** Trámites anteriores cerrados (denegatorias notificadas), del más reciente al más antiguo. */
  historial: RegistroCaducidad[];
}

export interface BandejaCaducidad {
  porCaducar: CaducidadExpedienteItem[];
  caducadosSinDeclarar: CaducidadExpedienteItem[];
  enTramite: CaducidadExpedienteItem[];
  declarados: CaducidadExpedienteItem[];
}

const ok = { method: 'PATCH' } as const;
const base = (expedienteId: string) => `/caducidad/expediente/${expedienteId}`;

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

export const CaducidadApi = {
  getBandeja: () => apiClient<BandejaCaducidad>('/caducidad/bandeja'),
  getExpedientes: () => apiClient<CaducidadExpedienteItem[]>('/caducidad/expedientes'),
  getExpediente: (expedienteId: string) => apiClient<CaducidadExpedienteItem>(base(expedienteId)),
  declararDeOficio: (expedienteId: string, fundamentacion: string) =>
    apiClient<{ id: string }>(`${base(expedienteId)}/de-oficio`, { method: 'POST', body: JSON.stringify({ fundamentacion: fundamentacion || undefined }) }),
  registrarSolicitud: (expedienteId: string, p: { fechaSolicitud: string; numeroRegistro?: string; resumen: string; archivos: File[] }) => {
    const fd = new FormData();
    fd.append('fechaSolicitud', p.fechaSolicitud);
    if (p.numeroRegistro) fd.append('numeroRegistro', p.numeroRegistro);
    fd.append('resumen', p.resumen);
    p.archivos.forEach((a) => fd.append('archivos', a));
    return apiClient<{ id: string }>(`${base(expedienteId)}/solicitud`, { method: 'POST', body: fd });
  },
  adjuntarDocumentos: (expedienteId: string, archivos: File[]) => {
    const fd = new FormData();
    archivos.forEach((a) => fd.append('archivos', a));
    return apiClient<{ ok: true }>(`${base(expedienteId)}/documentos`, { method: 'POST', body: fd });
  },
  evaluar: (expedienteId: string, resultado: 'DECLARADA' | 'DENEGADA', fundamentacion: string) =>
    apiClient<{ ok: true }>(`${base(expedienteId)}/evaluacion`, { ...ok, body: JSON.stringify({ resultado, fundamentacion: fundamentacion || undefined }) }),
  enviarAFirma: (expedienteId: string, fechaEnvio: string) =>
    apiClient<{ ok: true }>(`${base(expedienteId)}/enviar-a-firma`, { ...ok, body: JSON.stringify({ fechaEnvio }) }),
  firmar: (expedienteId: string, fechaFirma: string, numeroResolucion: string) =>
    apiClient<{ ok: true }>(`${base(expedienteId)}/firmar`, { ...ok, body: JSON.stringify({ fechaFirma, numeroResolucion }) }),
  notificar: (expedienteId: string, fechaNotificacion: string) =>
    apiClient<{ ok: true }>(`${base(expedienteId)}/notificar`, { ...ok, body: JSON.stringify({ fechaNotificacion }) }),
  decidir: (expedienteId: string, decision: 'NUEVO_PAS' | 'ARCHIVO', nota: string) =>
    apiClient<{ ok: true }>(`${base(expedienteId)}/decision-posterior`, { ...ok, body: JSON.stringify({ decision, nota: nota || undefined }) }),
  vincularNuevoExpediente: (expedienteId: string, numeroExpediente: string) =>
    apiClient<{ ok: true }>(`${base(expedienteId)}/nuevo-expediente`, { ...ok, body: JSON.stringify({ numeroExpediente }) }),
};

/** Descarga el Word de la RSG (declara / denegatoria). */
export async function descargarRsgCaducidad(expedienteId: string, nombre: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${base(expedienteId)}/documento`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) await lanzarError(res);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export async function abrirDocumentoCaducidad(documentoId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/caducidad/documentos/${documentoId}/archivo`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) await lanzarError(res);
  window.open(URL.createObjectURL(await res.blob()), '_blank');
}
