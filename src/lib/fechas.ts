/**
 * Formato único de fechas para toda la app de oficina (dd/mm/aaaa, hora de Lima).
 *
 * Dos tipos de fecha llegan del backend y NO se formatean igual:
 *  - Fechas de calendario (notificación, detección, feriados, plazos…): se
 *    guardan a medianoche UTC ('2026-09-24T00:00:00.000Z'). Pasarlas por
 *    `new Date(...).toLocaleDateString()` en Lima (UTC-5) las muestra un día
 *    ANTES. Se formatean tomando solo la parte de fecha, sin zona horaria.
 *  - Momentos reales (inicio de intervención, firma, subida de archivo…):
 *    llevan hora. Se muestran convertidos a hora de Lima.
 * `formatearFecha` distingue ambos casos solo: si la hora es exactamente
 * medianoche UTC, lo trata como fecha de calendario.
 */

const ZONA = 'America/Lima';

type ValorFecha = string | Date | null | undefined;

function aIso(valor: ValorFecha): string | null {
  if (!valor) return null;
  const iso = valor instanceof Date ? valor.toISOString() : String(valor);
  return iso.trim() ? iso : null;
}

/** `true` si es una fecha sin hora: 'AAAA-MM-DD' o medianoche UTC exacta. */
function esFechaDeCalendario(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) || /T00:00:00(\.000)?Z$/.test(iso);
}

/** dd/mm/aaaa. Para cualquier fecha; las de calendario nunca se corren un día. */
export function formatearFecha(valor: ValorFecha, vacio = '—'): string {
  const iso = aIso(valor);
  if (!iso) return vacio;
  if (esFechaDeCalendario(iso)) {
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return vacio;
  return new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric' }).format(fecha);
}

/** dd/mm/aaaa hh:mm (hora de Lima). Si el valor es una fecha de calendario, muestra solo la fecha. */
export function formatearFechaHora(valor: ValorFecha, vacio = '—'): string {
  const iso = aIso(valor);
  if (!iso) return vacio;
  if (esFechaDeCalendario(iso)) return formatearFecha(iso, vacio);
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return vacio;
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: ZONA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(fecha);
}

/** Hora hh:mm (hora de Lima). */
export function formatearHora(valor: ValorFecha, vacio = '—'): string {
  const iso = aIso(valor);
  if (!iso) return vacio;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return vacio;
  return new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).format(fecha);
}

/**
 * Hoy en hora LOCAL como 'AAAA-MM-DD' (valor por defecto / `max` de los
 * `<input type="date">`). `new Date().toISOString()` da la fecha en UTC: en
 * Lima, desde las 19:00, devolvía el día siguiente.
 */
export function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
