import { apiClient, BASE_URL, getToken, nombreDeDescarga } from './client';

// ============================================================================
// CONTROL DOCUMENTARIO — lo que entra, lo que sale y el expediente foliado
// ============================================================================

export type OrigenExterno = 'DENUNCIA' | 'FISCALIA' | 'PNP' | 'PROCURADURIA' | 'DEFENSORIA' | 'RIESGOS' | 'OTRO';

export const LABEL_ORIGEN_EXTERNO: Record<OrigenExterno, string> = {
  DENUNCIA: 'Denuncia',
  FISCALIA: 'Fiscalía',
  PNP: 'Policía Nacional (PNP)',
  PROCURADURIA: 'Procuraduría',
  DEFENSORIA: 'Defensoría del Pueblo',
  RIESGOS: 'Riesgos y Desastres',
  OTRO: 'Otro',
};

/** Orígenes de los documentos emitidos a los que se les puede anotar el N° de SGD. */
export type OrigenSalida = 'IFI' | 'RESOLUCION' | 'CARTA_LEVANTAMIENTO' | 'RSG_CADUCIDAD' | 'RSG_PRESCRIPCION' | 'RESOLUCION_COACTIVA';

/** Forma real de cada fila de GET /control-documentario/entradas y /salidas (DocumentoControl en el backend). */
export interface DocumentoControl {
  /** `${origen}:${id}`: identifica el documento en toda la lista. */
  clave: string;
  origen: string;
  /** Nombre legible del tipo de documento ("Descargo", "IFI", "Carta de levantamiento"…). */
  tipo: string;
  /** N° propio del documento (informe, resolución, carta, registro), si lo tiene. */
  numero: string | null;
  numeroSgd: string | null;
  /** Fecha del documento: presentación (entrada) o emisión (salida). */
  fecha: string;
  fechaNotificacion: string | null;
  expedienteId: string | null;
  numeroExpediente: string | null;
  asunto: string | null;
  /** Quién lo emitió (el fiscalizador, en las actas de campo). */
  emitidoPor?: string | null;
  estado: string | null;
  /** Módulo de la web donde se trabaja este documento. */
  modulo: string | null;
  /** Solo salidas: se le puede anotar el N° de SGD. */
  editableSgd: boolean;
}

export interface DocumentoFoliado extends DocumentoControl {
  folio: number;
  direccion: 'CAMPO' | 'ENTRADA' | 'SALIDA';
}

export interface ExpedienteFoliado {
  expediente: { id: string; numeroExpediente: string; administrado: string | null };
  totalDocumentos: number;
  documentos: DocumentoFoliado[];
}

export interface NuevaEntradaExternaPayload {
  numeroSgd?: string;
  origen: OrigenExterno;
  remitente: string;
  asunto: string;
  /** Fecha y hora reales de recepción (ISO). */
  fechaHoraIngreso: string;
  folios?: number;
  derivadoA?: string;
  expedienteId?: string;
}

export const ControlDocumentarioApi = {
  entradas: (q: string) => apiClient<DocumentoControl[]>(`/control-documentario/entradas?q=${encodeURIComponent(q)}`),
  salidas: (q: string) => apiClient<DocumentoControl[]>(`/control-documentario/salidas?q=${encodeURIComponent(q)}`),
  expediente: (numeroExpediente: string) => apiClient<ExpedienteFoliado>(`/control-documentario/expediente/${encodeURIComponent(numeroExpediente.trim())}`),
  registrarEntradaExterna: (p: NuevaEntradaExternaPayload) =>
    apiClient<{ id: string }>('/control-documentario/entradas-externas', { method: 'POST', body: JSON.stringify(p) }),
  /** Anota el N° de SGD con el que se subió un documento emitido. `fechaSubida` en YYYY-MM-DD. */
  anotarSgd: (origen: string, documentoId: string, numeroSgd: string, fechaSubida: string) =>
    apiClient<null>(`/control-documentario/salidas/${encodeURIComponent(origen)}/${encodeURIComponent(documentoId)}/sgd`, {
      method: 'PUT',
      body: JSON.stringify({ numeroSgd, fechaSubida }),
    }),
};

// ---------------------------------------------------------------------------
// Documentos generados y guardados (cada Word/Excel que arma el sistema, por versión)
// ---------------------------------------------------------------------------

/** Forma real de cada fila de GET /documentos-guardados. */
export interface DocumentoGuardado {
  id: string;
  tipo: string;
  referenciaId: string;
  expedienteId: string | null;
  numeroExpediente: string | null;
  nombreArchivo: string;
  tamanoBytes: number;
  version: number;
  generadoPor: string;
  fecha: string;
}

export const LABEL_TIPO_GUARDADO: Record<string, string> = {
  ACTA_FISCALIZACION: 'Acta de fiscalización',
  ACTA_EXHORTACION: 'Acta de exhortación',
  ACTA_MEDIDA_PROVISIONAL: 'Acta de medida provisional',
  NOTIFICACION_CARGO: 'Notificación de Cargo',
  IFI: 'Informe Final de Instrucción (IFI)',
  RESOLUCION: 'Resolución (RSGSA / RSG)',
  RSG_AMPLIACION: 'RSG de ampliación de plazo',
  RSG_RECONSIDERACION: 'RSG de reconsideración',
  INFORME_GOP: 'Informe a GOP (apelación)',
  CARTA_LEVANTAMIENTO: 'Carta de levantamiento',
  RSG_CADUCIDAD: 'RSG de caducidad',
  RSG_PRESCRIPCION: 'RSG de prescripción',
  MEDIDA_CAUTELAR: 'Medida cautelar',
};

export const DocumentosGuardadosApi = {
  listar: (q: string, tipo: string, expedienteId?: string) =>
    apiClient<DocumentoGuardado[]>(
      `/documentos-guardados?q=${encodeURIComponent(q)}${tipo ? `&tipo=${encodeURIComponent(tipo)}` : ''}${expedienteId ? `&expedienteId=${encodeURIComponent(expedienteId)}` : ''}`,
    ),
};

/** Descarga de nuevo una versión guardada, tal como se generó entonces. */
export async function descargarDocumentoGuardado(id: string, nombre: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/documentos-guardados/${id}/archivo`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) {
    let mensaje = `Error ${res.status}: ${res.statusText}`;
    try {
      mensaje = (await res.json()).message || mensaje;
    } catch {
      // sin body JSON
    }
    throw new Error(mensaje);
  }
  const url = URL.createObjectURL(await res.blob());
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreDeDescarga(res, nombre);
  enlace.click();
  URL.revokeObjectURL(url);
}
