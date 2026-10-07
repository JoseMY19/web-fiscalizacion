import { apiClient } from './client';

// Bases municipales (Excel semanal del área): licencias de funcionamiento y certificados ITSE.

export interface LicenciaItem {
  codigoContribuyente: string | null;
  nombre: string;
  numeroExpediente: string | null;
  estado: string | null;
  tipo: string | null;
  numeroLicencia: string | null;
  fechaExpediente: string | null;
  giro: string | null;
  sector: string | null;
  direccion: string | null;
  ruc: string | null;
  nombreComercial: string | null;
  representante: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  fechaCese: string | null;
  vigente: boolean;
}

export interface ItseItem {
  anio: number | null;
  expediente: string | null;
  ruc: string | null;
  razonSocial: string;
  giro: string | null;
  direccion: string | null;
  riesgo: string | null;
  clasificacion: string | null;
  numeroCertificado: string | null;
  fechaEmision: string | null;
  fechaCaducidad: string | null;
  vigente: boolean;
  sugerenciaCuis: string | null;
}

export interface ConsultaBasesMunicipales {
  licencias: LicenciaItem[];
  itse: ItseItem[];
  resumen: { tieneLicenciaVigente: boolean; tieneItseVigente: boolean; riesgo: string | null; sugerenciaCuis: string | null };
}

export type EstadoBaseMunicipal = { tipo: 'LICENCIAS' | 'ITSE'; filas: number; nombreArchivo: string; fecha: string; importadoPor: string | null } | null;

export const BasesMunicipalesApi = {
  estado: () => apiClient<EstadoBaseMunicipal[]>('/bases-municipales/estado'),
  consulta: (q: string) => apiClient<ConsultaBasesMunicipales>(`/bases-municipales/consulta?q=${encodeURIComponent(q)}`),
  porExpediente: (expedienteId: string) =>
    apiClient<{ documento: string | null; consulta: ConsultaBasesMunicipales | null }>(`/bases-municipales/expediente/${expedienteId}`),
  importar: (tipo: 'licencias' | 'itse', archivo: File) => {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return apiClient<{ filas: number }>(`/bases-municipales/importar/${tipo}`, { method: 'POST', body: fd });
  },
};
