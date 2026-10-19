import { useEffect, useRef, useState } from 'react';
import { prefiereMenosMovimiento } from './movimiento';

const DURACION_CONTEO_MS = 800;

/** Número que sube animado hasta el valor (desde el valor anterior). */
export function useConteoAnimado(valor: number): number {
  const [mostrado, setMostrado] = useState(valor);
  const desde = useRef(valor);

  useEffect(() => {
    const inicio = desde.current;
    if (inicio === valor || prefiereMenosMovimiento()) {
      desde.current = valor;
      setMostrado(valor);
      return;
    }
    const t0 = performance.now();
    let frame = 0;
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / DURACION_CONTEO_MS);
      const suavizado = 1 - Math.pow(1 - p, 3);
      const actual = Math.round(inicio + (valor - inicio) * suavizado);
      desde.current = actual;
      setMostrado(actual);
      if (p < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [valor]);

  return mostrado;
}
