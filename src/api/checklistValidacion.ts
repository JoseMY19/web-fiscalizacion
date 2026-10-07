import { apiClient } from './client';

/** Validación = revisar que el expediente esté completo (fotos, datos, firmas). */
export interface ItemChecklist {
  clave: string;
  etiqueta: string;
  ok: boolean;
  /** true = falta algo que impide un expediente completo; false = solo advertencia. */
  obligatorio: boolean;
  detalle: string | null;
}

export interface ChecklistValidacion {
  items: ItemChecklist[];
  completo: boolean;
  faltanObligatorios: number;
}

export const ChecklistValidacionApi = {
  obtener: (expedienteId: string) => apiClient<ChecklistValidacion>(`/expedientes/${expedienteId}/checklist`),
};
