/**
 * Motor de plazos — fórmulas puras, compartidas entre backend y cualquier
 * frontend que necesite mostrar una fecha límite. Los feriados se pasan
 * como parámetro (vienen de la tabla Feriado en el backend) — esta
 * función no conoce Prisma ni fechas "mágicas".
 */

function mismaFecha(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function esFinDeSemana(fecha: Date): boolean {
  const dia = fecha.getUTCDay();
  return dia === 0 || dia === 6;
}

function esFeriado(fecha: Date, feriados: Date[]): boolean {
  return feriados.some((f) => mismaFecha(f, fecha));
}

/**
 * Suma `dias` días HÁBILES a `fecha` (sábados, domingos y feriados no
 * cuentan). Usado para: plazo de descargo del IFI (5 días), plazo de
 * recursos de reconsideración/apelación (15 días).
 */
export function sumarDiasHabiles(fecha: Date, dias: number, feriados: Date[]): Date {
  const resultado = new Date(fecha);
  let restantes = dias;
  while (restantes > 0) {
    resultado.setUTCDate(resultado.getUTCDate() + 1);
    if (!esFinDeSemana(resultado) && !esFeriado(resultado, feriados)) {
      restantes -= 1;
    }
  }
  return resultado;
}

/**
 * Suma `meses` meses CALENDARIO a `fecha` (no días hábiles). Usado para
 * la caducidad administrativa: 9 meses desde la notificación de la NC
 * (art. 259 TUO Ley 27444, ver docs/bpmn/especificacion.md ES3),
 * ampliable hasta 3 meses adicionales con resolución sustentada.
 */
export function sumarMesesCalendario(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha);
  resultado.setUTCMonth(resultado.getUTCMonth() + meses);
  return resultado;
}

export function diasHabilesRestantes(fechaLimite: Date, hoy: Date, feriados: Date[]): number {
  let cursor = new Date(hoy);
  let dias = 0;
  const signo = fechaLimite.getTime() >= hoy.getTime() ? 1 : -1;
  while (!mismaFecha(cursor, fechaLimite)) {
    cursor.setUTCDate(cursor.getUTCDate() + signo);
    if (!esFinDeSemana(cursor) && !esFeriado(cursor, feriados)) {
      dias += signo;
    }
  }
  return dias;
}
