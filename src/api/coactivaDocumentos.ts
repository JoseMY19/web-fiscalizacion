import { apiClient, BASE_URL, getToken, nombreDeDescarga } from './client';

// ============================================================================
// Word de las resoluciones coactivas (REC): datos que los completan y descarga
// ============================================================================

export type PlantillaCoactiva = 'REQUERIMIENTO' | 'EMBARGO_RETENCION' | 'VARIAR_DEPOSITO' | 'SUSPENSION_PAGO';

export const LABEL_PLANTILLA: Record<PlantillaCoactiva, string> = {
  REQUERIMIENTO: 'REC 1: requerimiento de pago',
  EMBARGO_RETENCION: 'Embargo en forma de retención bancaria',
  VARIAR_DEPOSITO: 'Variar la retención por depósito sin extracción',
  SUSPENSION_PAGO: 'Suspensión definitiva por pago',
};

export interface DatosExpedienteDocumento {
  ejecutorNombre: string | null;
  ejecutorEncargado: boolean;
  auxiliarNombre: string | null;
  codigoContribuyente: string | null;
  numeroConstancia: string | null;
  descripcionInfraccion: string | null;
}

export interface DatosResolucionDocumento {
  id: string;
  numeroRec: number;
  ejecutorNombre: string | null;
  ejecutorEncargado: boolean | null;
  auxiliarNombre: string | null;
  montoEmbargo: number | null;
  domicilioMedida: string | null;
  resultadoOficios: string | null;
  ordenanzaBeneficio: string | null;
  referenciaPago: string | null;
  /** Modelo de Word que le toca, o null si todavía no hay (y entonces dice por qué). */
  plantilla: PlantillaCoactiva | null;
  motivoSinPlantilla: string | null;
}

export interface DatosDocumentoCoactivo {
  expediente: DatosExpedienteDocumento;
  /** Códigos CUIS de la intervención. */
  infracciones: string[];
  resoluciones: DatosResolucionDocumento[];
}

export type CambiosExpediente = Partial<DatosExpedienteDocumento>;
export type CambiosResolucion = Partial<Omit<DatosResolucionDocumento, 'id' | 'numeroRec' | 'plantilla' | 'motivoSinPlantilla'>>;

const PATCH = (cuerpo: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(cuerpo) });

export const CoactivaDocumentosApi = {
  datos: (expedienteCoactivoId: string) => apiClient<DatosDocumentoCoactivo>(`/coactiva/${expedienteCoactivoId}/datos-documento`),
  guardarExpediente: (expedienteCoactivoId: string, cambios: CambiosExpediente) =>
    apiClient<{ ok: true }>(`/coactiva/${expedienteCoactivoId}/datos-documento`, PATCH(cambios)),
  guardarResolucion: (expedienteCoactivoId: string, resolucionId: string, cambios: CambiosResolucion) =>
    apiClient<{ ok: true }>(`/coactiva/${expedienteCoactivoId}/resoluciones/${resolucionId}/datos-documento`, PATCH(cambios)),
};

/** Descarga el Word de una resolución (el servidor arma el nombre del archivo). */
export async function descargarDocumentoCoactivo(expedienteCoactivoId: string, resolucionId: string, respaldo: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/coactiva/${expedienteCoactivoId}/resoluciones/${resolucionId}/documento`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const cuerpo = await res.json();
      mensaje = Array.isArray(cuerpo.message) ? cuerpo.message.join(', ') : cuerpo.message || mensaje;
    } catch {
      // sin cuerpo JSON
    }
    throw new Error(mensaje);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreDeDescarga(res, respaldo);
  a.click();
  URL.revokeObjectURL(url);
}
