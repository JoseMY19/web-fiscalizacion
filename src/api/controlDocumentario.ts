import { apiClient } from './client';

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
