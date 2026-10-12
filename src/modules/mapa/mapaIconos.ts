import { divIcon, DivIcon } from 'leaflet';

export type TipoActuacionMapa = 'EXHORTACION' | 'CONSTATACION' | 'INICIA_PAS';

export const META_TIPO: Record<TipoActuacionMapa, { etiqueta: string; descripcion: string; color: string; glifo: string }> = {
  EXHORTACION: {
    etiqueta: 'Exhortación',
    descripcion: 'Preventivo: acta de exhortación, sin notificación de cargo',
    color: '#0284c7',
    // Megáfono
    glifo: 'M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z',
  },
  CONSTATACION: {
    etiqueta: 'Constatación',
    descripcion: 'Informativo: constancia de hechos sin infracción sancionable',
    color: '#64748b',
    // Ojo
    glifo: 'M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  },
  INICIA_PAS: {
    etiqueta: 'Inicia PAS',
    descripcion: 'Sancionador: acta de fiscalización y notificación de cargo',
    color: '#dc2626',
    // Triángulo de alerta
    glifo: 'M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z',
  },
};

const FORMA_PIN = 'M18 1C8.9 1 1.5 8.2 1.5 17.1 1.5 29 18 46 18 46s16.5-17 16.5-28.9C34.5 8.2 27.1 1 18 1z';
const cache = new Map<string, DivIcon>();

/** Marcador en forma de gota, del color del tipo de actuación y con su pictograma al centro. */
export function iconoPin(tipo: string, activo = false): DivIcon {
  const clave = `${tipo}:${activo}`;
  const guardado = cache.get(clave);
  if (guardado) return guardado;

  const meta = META_TIPO[tipo as TipoActuacionMapa] ?? { color: '#334155', glifo: META_TIPO.CONSTATACION.glifo };
  const html = `
    <svg width="36" height="50" viewBox="0 0 36 50" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-[0_3px_4px_rgba(15,23,42,0.35)] overflow-visible">
      <ellipse cx="18" cy="47" rx="7" ry="2.4" fill="#0f172a" fill-opacity="0.22"/>
      <path d="${FORMA_PIN}" fill="${meta.color}" stroke="#ffffff" stroke-width="${activo ? 3 : 2}"/>
      <circle cx="18" cy="17" r="12" fill="#ffffff"/>
      <g transform="translate(6.5 5.5) scale(0.96)"><path d="${meta.glifo}" fill="${meta.color}"/></g>
    </svg>`;

  const icono = divIcon({ html, className: 'bg-transparent border-0', iconSize: [36, 50], iconAnchor: [18, 46], popupAnchor: [0, -42], tooltipAnchor: [0, -40] });
  cache.set(clave, icono);
  return icono;
}

/** Etiqueta con el nombre de una zona, centrada en el mapa y sin interacción. */
export function iconoEtiquetaZona(nombre: string, color: string, activa: boolean): DivIcon {
  const html = `<span class="inline-block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[999px] bg-white/85 px-[8px] py-[2px] text-[11px] font-bold shadow-sm ${activa ? 'ring-2 ring-primary-600' : ''}" style="color:${color}">${nombre}</span>`;
  return divIcon({ html, className: 'bg-transparent border-0 pointer-events-none', iconSize: [0, 0] });
}
