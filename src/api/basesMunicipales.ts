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

/** null = base vacía. `nombreArchivo`/`fecha` = última importación (null si solo hay registros agregados a mano). */
export type EstadoBaseMunicipal = { tipo: 'LICENCIAS' | 'ITSE'; filas: number; nombreArchivo: string | null; fecha: string | null; importadoPor: string | null } | null;

// ─── Mantenimiento (CRUD en Configuración) ───

export type OrigenRegistroBase = 'IMPORTADO' | 'MANUAL';
type Registro = { id: string; origen: OrigenRegistroBase; modificadoEn: string | null; modificadoPor: string | null };
export type RegistroLicencia = Omit<LicenciaItem, 'vigente'> & Registro;
export type RegistroItse = Omit<ItseItem, 'vigente' | 'sugerenciaCuis'> & Registro & {
  fechaIngreso: string | null;
  representante: string | null;
  area: string | null;
  numeroInforme: string | null;
  numeroResolucion: string | null;
  fechaRenovacion: string | null;
  fechaInspeccion: string | null;
};
/** Lo que se envía al guardar: los campos editables (fechas como aaaa-mm-dd). */
export type DatosLicencia = Omit<RegistroLicencia, keyof Registro>;
export type DatosItse = Omit<RegistroItse, keyof Registro>;
export interface PaginaRegistros<T> {
  items: T[];
  total: number;
}
export interface FiltroRegistros {
  q?: string;
  origen?: OrigenRegistroBase | '';
  pagina?: number;
  tamano?: number;
}

const query = (f: FiltroRegistros) => {
  const p = new URLSearchParams();
  if (f.q?.trim()) p.set('q', f.q.trim());
  if (f.origen) p.set('origen', f.origen);
  p.set('pagina', String(f.pagina ?? 1));
  p.set('tamano', String(f.tamano ?? 20));
  return p.toString();
};

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

  listarLicencias: (f: FiltroRegistros) => apiClient<PaginaRegistros<RegistroLicencia>>(`/bases-municipales/licencias?${query(f)}`),
  crearLicencia: (d: DatosLicencia) => apiClient<RegistroLicencia>('/bases-municipales/licencias', { method: 'POST', body: JSON.stringify(d) }),
  actualizarLicencia: (id: string, d: DatosLicencia) =>
    apiClient<RegistroLicencia>(`/bases-municipales/licencias/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  eliminarLicencia: (id: string) => apiClient<{ ok: true }>(`/bases-municipales/licencias/${id}`, { method: 'DELETE' }),

  listarItse: (f: FiltroRegistros) => apiClient<PaginaRegistros<RegistroItse>>(`/bases-municipales/itse?${query(f)}`),
  crearItse: (d: DatosItse) => apiClient<RegistroItse>('/bases-municipales/itse', { method: 'POST', body: JSON.stringify(d) }),
  actualizarItse: (id: string, d: DatosItse) => apiClient<RegistroItse>(`/bases-municipales/itse/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  eliminarItse: (id: string) => apiClient<{ ok: true }>(`/bases-municipales/itse/${id}`, { method: 'DELETE' }),
};
