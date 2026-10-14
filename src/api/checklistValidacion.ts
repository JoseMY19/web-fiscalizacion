import { apiClient } from './client';

/** Validación = revisar que el expediente esté completo (fotos, datos, firmas). */
export type AccionChecklist = { tipo: 'EDITAR' } | { tipo: 'FOTO'; actaTipo: string };

export interface ItemChecklist {
  clave: string;
  etiqueta: string;
  ok: boolean;
  /** true = falta algo que impide un expediente completo; false = solo advertencia. */
  obligatorio: boolean;
  detalle: string | null;
  /** Cómo se resuelve desde oficina (null = solo informativo). */
  accion: AccionChecklist | null;
}

export interface ChecklistValidacion {
  intervencionId: string;
  items: ItemChecklist[];
  completo: boolean;
  faltanObligatorios: number;
}

export const ChecklistValidacionApi = {
  obtener: (expedienteId: string) => apiClient<ChecklistValidacion>(`/expedientes/${expedienteId}/checklist`),
  /** Sube desde oficina la foto que falta de un acta (misma ruta que usa la app de campo). */
  subirFoto: (intervencionId: string, actaTipo: string, archivo: File) => {
    const fd = new FormData();
    fd.append('foto', archivo);
    fd.append('actaTipo', actaTipo);
    return apiClient<{ id: string }>(`/intervenciones/${intervencionId}/fotos`, { method: 'POST', body: fd });
  },
};
