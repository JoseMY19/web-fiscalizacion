import { apiClient } from './client';

/** Expediente observado en la pestaña "Actas observadas" (estado OBSERVADO). */
export interface ExpedienteObservadoItem {
  id: string;
  intervencionId: string;
  numeroExpediente: string;
  motivo: string;
  fechaObservacion: string | null;
}

export const ExpedientesObservadosApi = {
  /** Lista todos los expedientes en estado OBSERVADO (para la pestaña observadas de oficina). */
  listar: () => apiClient<ExpedienteObservadoItem[]>('/expedientes/observados'),

  /** Pasa un expediente OBSERVADO a PENDIENTE_VALIDACION (reenviarlo tras correcciones). */
  reenviarValidacion: (id: string) =>
    apiClient<{ ok: true }>(`/expedientes/${id}/reenviar-validacion`, { method: 'PATCH' }),
};
