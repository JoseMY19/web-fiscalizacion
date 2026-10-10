import { apiClient } from './client';

/** Medida cautelar (resolución de urgencia de la Subgerencia), con su intervención y expediente. */
export interface MedidaCautelarItem {
  id: string;
  estado: 'EMITIDA' | 'EJECUTADA' | 'ANEXADA';
  intervencionId: string;
  fechaIntervencion: string;
  tipoActuacion: string | null;
  direccionIntervencion: string | null;
  administrado: { nombre: string | null; documento: string | null; domicilio: string | null } | null;
  numeroExpediente: string | null;
  situacionGravedad: string;
  resolucionCautelarTexto: string;
  vistoAntecedentes: string | null;
  inicialesFirma: string | null;
  relatoHechos: string | null;
  tipoMedidaCautelar: string | null;
  modalidadEjecucion: string | null;
  direccionNotificacion: string | null;
  incluyeAdvertenciaUsurpacion: boolean;
  incluyeResguardoSerenazgo: boolean;
  fechaEjecucion: string | null;
  fechaAnexion: string | null;
  emitidoPor: string;
  createdAt: string;
}

export interface ContenidoMedidaCautelar {
  situacionGravedad: string;
  relatoHechos?: string;
  vistoAntecedentes?: string;
  tipoMedidaCautelar?: string;
  modalidadEjecucion?: string;
  direccionNotificacion?: string;
  inicialesFirma?: string;
  incluyeAdvertenciaUsurpacion?: boolean;
  incluyeResguardoSerenazgo?: boolean;
}

export const MedidasCautelaresApi = {
  listar: () => apiClient<MedidaCautelarItem[]>('/medidas-cautelares'),
  emitir: (intervencionId: string, d: ContenidoMedidaCautelar) =>
    apiClient<{ id: string }>(`/medidas-cautelares/intervencion/${intervencionId}`, { method: 'POST', body: JSON.stringify(d) }),
  actualizar: (id: string, d: ContenidoMedidaCautelar) =>
    apiClient<{ ok: true }>(`/medidas-cautelares/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  registrarEjecucion: (id: string, fechaEjecucion: string) =>
    apiClient<{ ok: true }>(`/medidas-cautelares/${id}/ejecucion`, { method: 'PATCH', body: JSON.stringify({ fechaEjecucion }) }),
  anexar: (id: string) => apiClient<{ ok: true }>(`/medidas-cautelares/${id}/anexar`, { method: 'PATCH' }),
};
