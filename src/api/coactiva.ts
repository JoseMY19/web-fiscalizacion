import { apiClient, BASE_URL, getToken } from './client';

// ============================================================================
// F4 — EJECUCIÓN COACTIVA (a continuación de Acto firme)
// ============================================================================

export type TipoResolucionCoactiva =
  | 'REQUERIMIENTO_PAGO'
  | 'MEDIDA_CAUTELAR'
  | 'SECUESTRO_BIENES'
  | 'EJECUCION_MEDIDA_COMPLEMENTARIA'
  | 'LEVANTAMIENTO_MEDIDA'
  | 'SUSPENSION'
  | 'CUMPLIMIENTO_ARCHIVO'
  | 'OTRA';
export type FormaMedidaCautelar = 'RETENCION_BANCARIA' | 'INSCRIPCION' | 'DEPOSITO_SECUESTRO' | 'INTERVENCION' | 'OTRA';
export type ClaseSuspension = 'TEMPORAL' | 'DEFINITIVA';
export type MotivoSuspension = 'PAGO' | 'NO_ES_OBLIGADO' | 'MALA_NOTIFICACION' | 'MANDATO_JUDICIAL' | 'REVISION_JUDICIAL' | 'CAUTELAR_JUDICIAL' | 'OTRO';
export type EstadoCoactivo =
  | 'EN_ESPERA'
  | 'POR_INICIAR'
  | 'INICIADO'
  | 'REQUERIDO'
  | 'MEDIDA_CAUTELAR'
  | 'SUSPENDIDO_TEMPORAL'
  | 'SUSPENDIDO_DEFINITIVO'
  | 'DEVUELTO_PAS'
  | 'PAGADO_MEDIDA_PENDIENTE'
  | 'PAGADO'
  | 'ARCHIVADO';

export interface ResolucionCoactivaItem {
  id: string;
  numeroRec: number;
  tipo: TipoResolucionCoactiva;
  formaMedidaCautelar: FormaMedidaCautelar | null;
  detalle: string | null;
  descripcion: string | null;
  fechaEmision: string;
  fechaNotificacion: string | null;
  registradoPorNombre: string | null;
  documentos: Array<{ id: string; nombreOriginal: string; tamanoBytes: number | null; subidoEn: string }>;
}

export interface SuspensionCoactivaItem {
  id: string;
  clase: ClaseSuspension;
  motivo: MotivoSuspension;
  detalle: string | null;
  fechaSolicitud: string;
  resultado: 'FUNDADA' | 'INFUNDADA' | null;
  fechaResolucion: string | null;
  resolucionCoactivaId: string | null;
  fechaFin: string | null;
}

export interface DevolucionPasItem {
  id: string;
  motivo: string;
  fechaDevolucion: string;
  decision: 'RENOTIFICAR' | 'ARCHIVAR_PRESCRITO' | null;
  fechaRenotificacion: string | null;
  fechaRetornoCoactiva: string | null;
  fechaArchivo: string | null;
  nota: string | null;
}

/** Forma real de las respuestas de /coactiva (aRespuestaCoactiva en el backend). */
export interface CasoCoactivoItem {
  actoFirmeId: string;
  expedienteId: string;
  numeroExpediente: string;
  /** N° de la resolución de sanción (se muestra junto al N° coactivo). */
  numeroSancion: string | null;
  fechaFirmeza: string;
  fechaDerivacionCoactiva: string | null;
  administradoNombre: string | null;
  administradoDocumento: string | null;
  administradoDomicilio: string | null;
  montoSancion: number | null;
  medidaComplementariaSancion: string | null;
  pago: { montoPagado: number; fechaPago: string } | null;
  situacion: {
    estado: EstadoCoactivo;
    habilitadoDesde: string;
    diasParaHabilitar: number;
    venceRequerimiento: string | null;
    requerimientoVencido: boolean;
    suspensionPendiente: boolean;
    pagado: boolean;
    medidaPendiente: boolean;
    siguienteRec: number;
  };
  expedienteCoactivo: {
    id: string;
    numeroExpedienteCoactivo: string;
    fechaInicio: string;
    ejecutorNombre: string | null;
    incluyeMedidaComplementaria: boolean;
    medidaComplementaria: string | null;
    montoDeuda: number | null;
    medidaCumplidaFecha: string | null;
    medidaCumplidaNota: string | null;
    registradoPorNombre: string | null;
    resoluciones: ResolucionCoactivaItem[];
    suspensiones: SuspensionCoactivaItem[];
    devoluciones: DevolucionPasItem[];
  } | null;
}

export interface BandejaCoactiva {
  enEspera: CasoCoactivoItem[];
  porIniciar: CasoCoactivoItem[];
  enCurso: CasoCoactivoItem[];
  suspendidos: CasoCoactivoItem[];
  devueltos: CasoCoactivoItem[];
  concluidos: CasoCoactivoItem[];
}

const PATCH = { method: 'PATCH' } as const;
const exp = (id: string) => `/coactiva/${id}`;

export const CoactivaApi = {
  getBandeja: () => apiClient<BandejaCoactiva>('/coactiva/bandeja'),
  getPorActoFirme: (actoFirmeId: string) => apiClient<CasoCoactivoItem>(`/coactiva/acto-firme/${actoFirmeId}`),
  getPorExpedientePas: (expedienteId: string) => apiClient<CasoCoactivoItem | null>(`/coactiva/expediente-pas/${expedienteId}`),
  iniciar: (actoFirmeId: string, p: { numeroExpedienteCoactivo: string; fechaInicio: string; ejecutorNombre?: string }) =>
    apiClient<{ id: string }>(`/coactiva/acto-firme/${actoFirmeId}/iniciar`, { method: 'POST', body: JSON.stringify(p) }),
  registrarResolucion: (
    id: string,
    p: {
      numeroRec: number;
      tipo: TipoResolucionCoactiva;
      formaMedidaCautelar?: FormaMedidaCautelar;
      detalle?: string;
      descripcion?: string;
      otraCausal?: boolean;
      fechaEmision: string;
      archivos: File[];
    },
  ) => {
    const fd = new FormData();
    fd.append('numeroRec', String(p.numeroRec));
    fd.append('tipo', p.tipo);
    if (p.formaMedidaCautelar) fd.append('formaMedidaCautelar', p.formaMedidaCautelar);
    if (p.detalle) fd.append('detalle', p.detalle);
    if (p.descripcion) fd.append('descripcion', p.descripcion);
    if (p.otraCausal) fd.append('otraCausal', 'true');
    fd.append('fechaEmision', p.fechaEmision);
    p.archivos.forEach((a) => fd.append('archivos', a));
    return apiClient<{ id: string }>(`${exp(id)}/resoluciones`, { method: 'POST', body: fd });
  },
  notificarResolucion: (id: string, resolucionId: string, fecha: string) =>
    apiClient<{ ok: true }>(`${exp(id)}/resoluciones/${resolucionId}/notificar`, { ...PATCH, body: JSON.stringify({ fecha }) }),
  adjuntarPdf: (id: string, resolucionId: string, archivos: File[]) => {
    const fd = new FormData();
    archivos.forEach((a) => fd.append('archivos', a));
    return apiClient<{ ok: true }>(`${exp(id)}/resoluciones/${resolucionId}/documentos`, { method: 'POST', body: fd });
  },
  registrarSuspension: (id: string, p: { clase: ClaseSuspension; motivo: MotivoSuspension; detalle?: string; fechaSolicitud: string }) =>
    apiClient<{ id: string }>(`${exp(id)}/suspensiones`, { method: 'POST', body: JSON.stringify(p) }),
  resolverSuspension: (id: string, suspensionId: string, p: { resultado: 'FUNDADA' | 'INFUNDADA'; fechaResolucion: string; resolucionCoactivaId?: string }) =>
    apiClient<{ ok: true }>(`${exp(id)}/suspensiones/${suspensionId}/resolver`, { ...PATCH, body: JSON.stringify(p) }),
  finalizarSuspension: (id: string, suspensionId: string, fecha: string) =>
    apiClient<{ ok: true }>(`${exp(id)}/suspensiones/${suspensionId}/finalizar`, { ...PATCH, body: JSON.stringify({ fecha }) }),
  registrarDevolucion: (id: string, p: { motivo: string; fechaDevolucion: string; nota?: string }) =>
    apiClient<{ id: string }>(`${exp(id)}/devoluciones`, { method: 'POST', body: JSON.stringify(p) }),
  renotificar: (id: string, devolucionId: string, fecha: string) =>
    apiClient<{ ok: true }>(`${exp(id)}/devoluciones/${devolucionId}/renotificacion`, { ...PATCH, body: JSON.stringify({ fecha }) }),
  retornar: (id: string, devolucionId: string, fecha: string) =>
    apiClient<{ ok: true }>(`${exp(id)}/devoluciones/${devolucionId}/retorno`, { ...PATCH, body: JSON.stringify({ fecha }) }),
  archivarPrescrito: (id: string, devolucionId: string, fecha: string, nota?: string) =>
    apiClient<{ ok: true }>(`${exp(id)}/devoluciones/${devolucionId}/archivar`, { ...PATCH, body: JSON.stringify({ fecha, nota }) }),
  cumplimientoMedida: (id: string, fecha: string, nota?: string) =>
    apiClient<{ ok: true }>(`${exp(id)}/cumplimiento-medida`, { ...PATCH, body: JSON.stringify({ fecha, nota }) }),
};

export async function abrirDocumentoCoactivo(documentoId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/coactiva/documentos/${documentoId}/archivo`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      msg = (await res.json()).message || msg;
    } catch {
      // sin body JSON
    }
    throw new Error(msg);
  }
  window.open(URL.createObjectURL(await res.blob()), '_blank');
}
