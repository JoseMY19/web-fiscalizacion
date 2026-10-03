import { apiClient } from './client';

// ============================================================================
// O2 — CORRECCIÓN DE ERROR MATERIAL (trazable: antes → después, autor, motivo)
// ============================================================================

export type CampoCorreccionMaterial = 'NOMBRES_RAZON_SOCIAL' | 'NUMERO_DOCUMENTO' | 'DOMICILIO' | 'DISTRITO' | 'GIRO_USO' | 'DOMICILIO_DNI';

export const LABEL_CAMPO_CORRECCION: Record<CampoCorreccionMaterial, string> = {
  NOMBRES_RAZON_SOCIAL: 'Nombres / razón social',
  NUMERO_DOCUMENTO: 'N° de documento',
  DOMICILIO: 'Domicilio',
  DISTRITO: 'Distrito',
  GIRO_USO: 'Giro / uso',
  DOMICILIO_DNI: 'Domicilio según DNI (PIDE)',
};

export interface CorreccionMaterialItem {
  id: string;
  campo: CampoCorreccionMaterial;
  valorAnterior: string | null;
  valorNuevo: string;
  motivo: string;
  autor: string;
  createdAt: string;
}

export interface EstadoCorrecciones {
  administrado: { identificado: boolean; valores: Record<CampoCorreccionMaterial, string | null> } | null;
  puedeCorregir: boolean;
  motivoNoCorregible: string | null;
  historial: CorreccionMaterialItem[];
}

export const CorreccionesApi = {
  obtener: (expedienteId: string) => apiClient<EstadoCorrecciones>(`/correcciones-materiales/expediente/${expedienteId}`),
  corregir: (expedienteId: string, datos: { campo: CampoCorreccionMaterial; valorNuevo: string; motivo: string }) =>
    apiClient<{ id: string }>(`/correcciones-materiales/expediente/${expedienteId}`, { method: 'POST', body: JSON.stringify(datos) }),
};
