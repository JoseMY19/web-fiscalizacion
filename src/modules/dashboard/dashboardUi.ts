import type { NavModule } from '../../components/layout/AppLayout';

/** Recorrido del expediente; cada paso lleva a su módulo (Campo es la app móvil, sin pantalla aquí). */
export const RECORRIDO: { paso: string; titulo: string; detalle: string; modulo?: NavModule }[] = [
  { paso: '1', titulo: 'Campo', detalle: 'Actas y notificación de cargo' },
  { paso: '2', titulo: 'Validación', detalle: 'Revisión de que esté completo', modulo: 'expedientes' },
  { paso: '3', titulo: 'Notificación', detalle: 'Cédulas domiciliarias', modulo: 'notificaciones' },
  { paso: '4', titulo: 'Instrucción', detalle: 'Descargos e informe final', modulo: 'ifi' },
  { paso: '5', titulo: 'Resolución', detalle: 'RSG / RSGSA', modulo: 'resoluciones' },
  { paso: '6', titulo: 'Recursos', detalle: 'Reconsideración y apelación', modulo: 'recursos' },
  { paso: '7', titulo: 'Cobranza', detalle: 'Acto firme y coactiva', modulo: 'coactiva-pagos' },
];

/** Color de acento de cada tarjeta de bandeja (colores del logo). */
export type AcentoBandeja = 'turquesa' | 'naranja' | 'azul' | 'verde' | 'peligro';

export const ACENTOS: Record<AcentoBandeja, { barra: string; icono: string; brillo: string }> = {
  turquesa: { barra: 'bg-sjl-turquesa', icono: 'bg-sjl-turquesa/10 text-sjl-turquesa', brillo: 'bg-sjl-turquesa' },
  naranja: { barra: 'bg-sjl-naranja', icono: 'bg-sjl-naranja/10 text-sjl-naranja', brillo: 'bg-sjl-naranja' },
  azul: { barra: 'bg-blue-800', icono: 'bg-blue-800/10 text-blue-800', brillo: 'bg-blue-800' },
  verde: { barra: 'bg-sjl-verde', icono: 'bg-sjl-verde/10 text-sjl-verde', brillo: 'bg-sjl-verde' },
  peligro: { barra: 'bg-danger', icono: 'bg-danger-bg text-danger', brillo: 'bg-danger' },
};

/** "Buenos días" / "Buenas tardes" / "Buenas noches" según la hora local. */
export function saludoDelDia(fecha = new Date()): string {
  const h = fecha.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Fecha larga en español: "jueves, 16 de octubre". */
export function fechaLarga(fecha = new Date()): string {
  const texto = fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
