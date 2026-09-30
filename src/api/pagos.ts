import { apiClient } from './client';

// ============================================================================
// F5 — PAGOS POR NC (registro manual de Caja/plataforma, sin integración)
// ============================================================================

export type SistemaOrigenPago = 'SIFAT' | 'SISTEMA_INTERNET' | 'OTRO';

export const LABEL_SISTEMA_ORIGEN: Record<SistemaOrigenPago, string> = {
  SIFAT: 'SIFAT',
  SISTEMA_INTERNET: 'Sistema de internet',
  OTRO: 'Otro',
};

/** Forma real de GET /pagos/notificaciones-pendientes (NotificacionCargoPago en el backend). */
export interface NotificacionCargoPagoItem {
  notificacionCargoId: string;
  numeroNc: string;
  fechaDeteccion: string;
  fechaNotificacion: string | null;
  montoPasibleMulta: number | null;
  medidaComplementaria: string | null;
  expedienteId: string | null;
  numeroExpediente: string | null;
  administrado: string | null;
  /** Resolución de primera instancia, si ya existe. */
  resolucion: {
    id: string;
    tipo: 'RSGSA' | 'RSG';
    estado: 'EN_ELABORACION' | 'EMITIDA' | 'NOTIFICADA';
    numeroResolucion: string | null;
    montoSinDescuento: number | null;
    montoConDescuento: number | null;
  } | null;
}

/** Forma real de GET /pagos. */
export interface PagoRegistradoItem {
  id: string;
  notificacion: NotificacionCargoPagoItem;
  resolucionId: string | null;
  montoPagado: number;
  fechaPago: string;
  numeroRecibo: string | null;
  /** null solo en pagos registrados antes de este campo. */
  sistemaOrigen: SistemaOrigenPago | null;
  observacion: string | null;
  registradoPor: string;
  createdAt: string;
}

export interface NuevoPagoPayload {
  notificacionCargoId: string;
  montoPagado: number;
  fechaPago: string;
  numeroRecibo?: string;
  sistemaOrigen: SistemaOrigenPago;
  observacion?: string;
}

export const PagosApi = {
  /** NC sin pago por N° de NC o N° de expediente; `q` vacío lista todas. */
  buscarNotificacionesSinPago: (q: string) =>
    apiClient<NotificacionCargoPagoItem[]>(`/pagos/notificaciones-pendientes?q=${encodeURIComponent(q)}`),
  listar: (q: string) => apiClient<PagoRegistradoItem[]>(`/pagos?q=${encodeURIComponent(q)}`),
  registrar: (p: NuevoPagoPayload) => apiClient<{ id: string }>('/pagos', { method: 'POST', body: JSON.stringify(p) }),
};
