import { apiClient, BASE_URL, getToken } from './client';

// ============================================================================
// O3 — DESCARGOS MÚLTIPLES (con PDF del SGD), compartidos por IFI y Resolución
// ============================================================================

export type EtapaDescargo = 'ANTES_IFI' | 'DESPUES_IFI';

export const LABEL_ETAPA_DESCARGO: Record<EtapaDescargo, string> = {
  ANTES_IFI: 'Antes del IFI',
  DESPUES_IFI: 'Después del IFI',
};

export interface DescargoItem {
  id: string;
  /** null solo en descargos migrados que no tenían fecha. */
  fechaPresentacion: string | null;
  resumen: string | null;
  numeroDocumentoSgd: string | null;
  registradoPor: string | null;
  createdAt: string;
  etapa: EtapaDescargo;
  documentos: Array<{ id: string; nombreOriginal: string; tamanoBytes: number | null; subidoEn: string }>;
}

export interface ListaDescargos {
  descargos: DescargoItem[];
  puedeRegistrar: boolean;
  motivoNoRegistrable: string | null;
}

export interface NuevoDescargoPayload {
  fechaPresentacion: string;
  resumen: string;
  numeroDocumentoSgd?: string;
  archivos: File[];
}

export const DescargosApi = {
  listar: (expedienteId: string) => apiClient<ListaDescargos>(`/descargos/expediente/${expedienteId}`),
  registrar: (expedienteId: string, p: NuevoDescargoPayload) => {
    const fd = new FormData();
    fd.append('fechaPresentacion', p.fechaPresentacion);
    fd.append('resumen', p.resumen);
    if (p.numeroDocumentoSgd) fd.append('numeroDocumentoSgd', p.numeroDocumentoSgd);
    p.archivos.forEach((a) => fd.append('archivos', a));
    return apiClient<{ id: string }>(`/descargos/expediente/${expedienteId}`, { method: 'POST', body: fd });
  },
  adjuntarDocumentos: (descargoId: string, archivos: File[]) => {
    const fd = new FormData();
    archivos.forEach((a) => fd.append('archivos', a));
    return apiClient<{ ok: true }>(`/descargos/${descargoId}/documentos`, { method: 'POST', body: fd });
  },
};

/** Abre el PDF de un descargo en una pestaña nueva. */
export async function abrirDocumentoDescargo(documentoId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/descargos/documentos/${documentoId}/archivo`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('No se pudo abrir el documento.');
  window.open(URL.createObjectURL(await res.blob()), '_blank');
}
