import { apiClient } from './client';

// ============================================================================
// CORRECCIÓN DESDE OFICINA (trazable: antes → después, autor, motivo)
// Datos del administrado e infracción imputada (código CUIS y escala).
// ============================================================================

export type CampoAdministrado = 'NOMBRES_RAZON_SOCIAL' | 'NUMERO_DOCUMENTO' | 'DOMICILIO' | 'DISTRITO' | 'GIRO_USO' | 'DOMICILIO_DNI';
export type CampoCorreccionMaterial = CampoAdministrado | 'CUIS_INFRACCION';

export const LABEL_CAMPO_CORRECCION: Record<CampoCorreccionMaterial, string> = {
  NOMBRES_RAZON_SOCIAL: 'Nombres / razón social',
  NUMERO_DOCUMENTO: 'N° de documento',
  DOMICILIO: 'Domicilio',
  DISTRITO: 'Distrito',
  GIRO_USO: 'Giro / uso',
  DOMICILIO_DNI: 'Domicilio según DNI (PIDE)',
  CUIS_INFRACCION: 'Infracción (código CUIS y escala)',
};

export const CAMPOS_ADMINISTRADO = Object.keys(LABEL_CAMPO_CORRECCION).filter((c) => c !== 'CUIS_INFRACCION') as CampoAdministrado[];

export interface CorreccionMaterialItem {
  id: string;
  campo: CampoCorreccionMaterial;
  valorAnterior: string | null;
  valorNuevo: string;
  motivo: string;
  autor: string;
  createdAt: string;
}

export interface InfraccionCorregible {
  intervencionCuisId: string;
  cuisCodigoId: string;
  codigo: string;
  cuisEscalaMontoId: string | null;
  escalaTexto: string | null;
}

export interface EstadoCorrecciones {
  administrado: { identificado: boolean; valores: Record<CampoAdministrado, string | null> } | null;
  infracciones: InfraccionCorregible[];
  puedeCorregir: boolean;
  motivoNoCorregible: string | null;
  historial: CorreccionMaterialItem[];
}

const base = (expedienteId: string) => `/correcciones-materiales/expediente/${expedienteId}`;

export const CorreccionesApi = {
  obtener: (expedienteId: string) => apiClient<EstadoCorrecciones>(base(expedienteId)),
  /** Valores del administrado tal como quedan; solo se trazan los que cambiaron. */
  corregir: (expedienteId: string, datos: { valores: Partial<Record<CampoAdministrado, string>>; motivo: string }) =>
    apiClient<{ cambios: number }>(base(expedienteId), { method: 'POST', body: JSON.stringify(datos) }),
  corregirInfraccion: (
    expedienteId: string,
    datos: { intervencionCuisId: string; cuisCodigoId: string; cuisEscalaMontoId: string | null; motivo: string },
  ) => apiClient<{ ok: true }>(`${base(expedienteId)}/infraccion`, { method: 'POST', body: JSON.stringify(datos) }),
};
