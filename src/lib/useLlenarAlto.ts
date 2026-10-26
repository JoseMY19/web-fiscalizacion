import { useLayoutEffect, useRef, useState } from 'react';

/** Distancia del elemento al inicio de la página (con offsetTop: no la afectan las animaciones con transform). */
function distanciaArriba(el: HTMLElement): number {
  let top = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
  return top;
}

/**
 * Alto mínimo para que un elemento llegue hasta abajo de la ventana (ej. el
 * recuadro de "nada por aquí" en una bandeja vacía). Se mide solo, así que
 * sirve aunque arriba haya avisos o filtros de alto variable.
 *
 * @param debajo px que deben quedar bajo el elemento (sus márgenes, el borde del panel, el padding de la página).
 */
export function useLlenarAlto<T extends HTMLElement>(activo: boolean, debajo: number, minimo = 260) {
  const ref = useRef<T>(null);
  const [alto, setAlto] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!activo) return;
    const medir = () => {
      if (ref.current) setAlto(Math.max(minimo, Math.floor(window.innerHeight - distanciaArriba(ref.current) - debajo)));
    };
    medir();
    window.addEventListener('resize', medir);
    // Lo de arriba puede cambiar de alto después (un aviso que llega, otra pestaña).
    const observador = new ResizeObserver(medir);
    observador.observe(document.body);
    return () => {
      window.removeEventListener('resize', medir);
      observador.disconnect();
    };
  }, [activo, debajo, minimo]);

  return { ref, alto: activo ? alto : undefined };
}
