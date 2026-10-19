import { useEffect, useRef } from 'react';
import { prefiereMenosMovimiento } from '../../lib/movimiento';

/**
 * Sigue el puntero sobre un elemento y escribe su posición como variables CSS
 * (`--px`, `--py` en px; `--rx`, `--ry` en grados para la inclinación 3D).
 * Escribe directo en el estilo del elemento (sin re-render) y una vez por frame.
 */
export function usePuntero<T extends HTMLElement>(opciones: { inclinacionMax?: number; global?: boolean } = {}) {
  const ref = useRef<T>(null);
  const { inclinacionMax = 0, global = false } = opciones;

  useEffect(() => {
    const el = ref.current;
    if (!el || prefiereMenosMovimiento()) return;
    const objetivo: HTMLElement | Window = global ? window : el;
    let frame = 0;

    const mover = (e: Event) => {
      const { clientX, clientY } = e as PointerEvent;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = clientX - r.left;
        const y = clientY - r.top;
        el.style.setProperty('--px', `${x}px`);
        el.style.setProperty('--py', `${y}px`);
        if (inclinacionMax) {
          el.style.setProperty('--ry', `${((x / r.width) - 0.5) * 2 * inclinacionMax}deg`);
          el.style.setProperty('--rx', `${-((y / r.height) - 0.5) * 2 * inclinacionMax}deg`);
        }
      });
    };
    const salir = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };

    objetivo.addEventListener('pointermove', mover);
    if (!global) el.addEventListener('pointerleave', salir);
    return () => {
      cancelAnimationFrame(frame);
      objetivo.removeEventListener('pointermove', mover);
      if (!global) el.removeEventListener('pointerleave', salir);
    };
  }, [inclinacionMax, global]);

  return ref;
}
