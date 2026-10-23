import { apiClient } from './client';

/** Ficha de identidad de una persona a partir de su DNI (RENIEC vía PIDE). null = el servicio no trae ese dato. */
export interface FichaIdentidad {
  dni: string;
  primerApellido: string | null;
  segundoApellido: string | null;
  nombres: string | null;
  nombreCompleto: string | null;
  estadoCivil: string | null;
  direccion: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  direccionCompleta: string | null;
  restriccion: string | null;
  /** Foto en base64, si el servicio la entrega. */
  foto: string | null;
}

/** Ficha del vehículo y su propietario a partir de la placa (SUNARP vía PIDE). null = el servicio no trae ese dato. */
export interface FichaVehiculo {
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string | null;
  propietario: string | null;
  /** DNI o RUC del propietario. */
  documentoPropietario: string | null;
  direccion: string | null;
  restriccion: string | null;
}

export const BusquedaIdentidadApi = {
  placa: (placa: string) => apiClient<FichaVehiculo>(`/busqueda/placa/${encodeURIComponent(placa.replace(/-/g, ''))}`),
  dni: (dni: string) => apiClient<FichaIdentidad>(`/busqueda/dni/${encodeURIComponent(dni)}`),
};
