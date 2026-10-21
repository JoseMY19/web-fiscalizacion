/** Bandejas de la notificación domiciliaria. */
export type BandejaCedulas = 'pendientes' | 'asignadas';

/** Estados conocidos de la cédula con su texto y color; los demás se muestran legibles con tono neutro. */
const ESTADOS: Record<string, { etiqueta: string; chip: string }> = {
  PENDIENTE_ASIGNACION: { etiqueta: 'Pendiente de asignación', chip: 'bg-warning-bg border-warning-border text-warning' },
  ASIGNADA: { etiqueta: 'Asignada', chip: 'bg-blue-50 border-blue-100 text-blue-800' },
  REPROGRAMADA: { etiqueta: 'Reprogramada', chip: 'bg-warning-bg border-warning-border text-warning' },
  ENTREGADA: { etiqueta: 'Entregada', chip: 'bg-success-bg border-success-border text-success' },
};

const CHIP_NEUTRO = 'bg-bg-subtle border-border text-text-secondary';

/** "EN_VISITA_2" → "En visita 2" cuando el estado no está en la lista. */
function legible(estado: string): string {
  const texto = estado.replace(/_/g, ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function estadoCedula(estado: string): { etiqueta: string; chip: string } {
  return ESTADOS[estado] ?? { etiqueta: legible(estado), chip: CHIP_NEUTRO };
}
