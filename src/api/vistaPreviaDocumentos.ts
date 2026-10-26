import { BASE_URL, getToken } from './client';
import type { TipoActaDocumento } from './index';

/** El servidor no puede armar la vista previa fiel (por ejemplo, no tiene LibreOffice instalado). */
export class VistaNoDisponibleError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'VistaNoDisponibleError';
  }
}

/**
 * Trae un documento para MIRARLO en pantalla (vista previa). Es el mismo documento que se descargaría, pero con
 * `vista` el servidor no lo guarda como una versión emitida en el historial.
 */
async function traerBlob(ruta: string, falla: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}${ruta}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) {
    let mensaje = falla;
    try {
      const cuerpo = await res.json();
      mensaje = Array.isArray(cuerpo.message) ? cuerpo.message.join(', ') : cuerpo.message || falla;
    } catch {
      // sin cuerpo JSON
    }
    throw res.status === 503 ? new VistaNoDisponibleError(mensaje) : new Error(mensaje);
  }
  return res.blob();
}

const rutaActa = (intervencionId: string, tipoActa: TipoActaDocumento, vista: 'pdf' | '1', medida?: string) =>
  `/intervenciones/${intervencionId}/documento/${tipoActa}?vista=${vista}${medida ? `&medida=${encodeURIComponent(medida)}` : ''}`;

/** Acta (Word) o notificación de cargo (Excel) convertida a PDF: se ve tal como se imprimiría. */
export function verActaPdf(intervencionId: string, tipoActa: TipoActaDocumento, medidaNumeroCorrelativo?: string): Promise<Blob> {
  return traerBlob(rutaActa(intervencionId, tipoActa, 'pdf', medidaNumeroCorrelativo), 'No se pudo generar la vista previa.');
}

/** El Word tal cual (para dibujarlo en el navegador cuando no hay PDF disponible). */
export function verActaWord(intervencionId: string, tipoActa: TipoActaDocumento, medidaNumeroCorrelativo?: string): Promise<Blob> {
  return traerBlob(rutaActa(intervencionId, tipoActa, '1', medidaNumeroCorrelativo), 'No se pudo generar el documento.');
}

/**
 * Vista previa de cualquier Word que el servidor arma en `GET {ruta}` (IFI, resolución, RSG, cartas…):
 * el PDF para mirarlo idéntico a como se imprime y, como respaldo, el .docx tal cual.
 */
export function vistaDeRuta(ruta: string): { cargarPdf: () => Promise<Blob>; cargarWord: () => Promise<Blob> } {
  return {
    cargarPdf: () => traerBlob(`${ruta}?vista=pdf`, 'No se pudo generar la vista previa.'),
    cargarWord: () => traerBlob(`${ruta}?vista=1`, 'No se pudo generar el documento.'),
  };
}
