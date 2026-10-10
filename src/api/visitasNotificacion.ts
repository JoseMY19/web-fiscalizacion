import { apiClient, BASE_URL, getToken } from './client';

// Visitas del notificador: 1ª sin éxito (acta de aviso) → 2ª bajo puerta con fotos.

export type ResultadoVisita = 'NADIE_EN_DOMICILIO' | 'SE_NEGO_A_RECIBIR' | 'BAJO_PUERTA';

export const LABEL_RESULTADO_VISITA: Record<ResultadoVisita, string> = {
  NADIE_EN_DOMICILIO: 'No había nadie en el domicilio',
  SE_NEGO_A_RECIBIR: 'Se negaron a recibir',
  BAJO_PUERTA: 'Se dejó bajo puerta (con fotos)',
};

export interface VisitaNotificacionItem {
  id: string;
  numeroVisita: number;
  fechaHora: string;
  resultado: ResultadoVisita;
  proximaVisitaFecha: string | null;
  observacion: string | null;
  fotos: Array<{ id: string; nombreOriginal: string; tamanoBytes: number | null; subidoEn: string }>;
}

export const VisitasNotificacionApi = {
  listar: (id: string) => apiClient<VisitaNotificacionItem[]>(`/notificacion-domiciliaria/${id}/visitas`),
  registrar: (id: string, p: { fechaHora: string; resultado: ResultadoVisita; proximaVisitaFecha?: string; observacion?: string; fotos: File[] }) => {
    const fd = new FormData();
    fd.append('fechaHora', p.fechaHora);
    fd.append('resultado', p.resultado);
    if (p.proximaVisitaFecha) fd.append('proximaVisitaFecha', p.proximaVisitaFecha);
    if (p.observacion) fd.append('observacion', p.observacion);
    p.fotos.forEach((f) => fd.append('fotos', f));
    return apiClient<{ id: string; notificada: boolean }>(`/notificacion-domiciliaria/${id}/visitas`, { method: 'POST', body: fd });
  },
};

export async function abrirFotoVisita(fotoId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/notificacion-domiciliaria/visitas/fotos/${fotoId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(`No se pudo abrir la foto (HTTP ${res.status}).`);
  window.open(URL.createObjectURL(await res.blob()), '_blank');
}
