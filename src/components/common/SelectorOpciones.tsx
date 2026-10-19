import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { CheckIcon, ChevronRightIcon } from '../icons/Icons';

export interface OpcionSelector {
  valor: string;
  /** Texto principal de la opción (también es lo que se ve en el campo al elegirla). */
  etiqueta: string;
  /** Línea secundaria, más tenue, debajo de la etiqueta. */
  detalle?: string;
  /** Distintivo corto a la izquierda (ej. la letra de la escala). */
  insignia?: string;
}

interface Props {
  opciones: OpcionSelector[];
  valor: string | null;
  onCambio: (valor: string) => void;
  marcador?: string;
  deshabilitado?: boolean;
  etiqueta?: string;
  /** Clases extra del campo; las que pisan un estilo base llevan `!` (ej. `w-[230px]!`). */
  className?: string;
}

const ANCHO_MIN_LISTA = 240;

/**
 * Reemplazo del <select> nativo con una lista con diseño propio. La lista se
 * dibuja en <body> (portal) con posición fija bajo el campo, así no la recorta
 * el scroll de un modal ni una tarjeta con overflow-hidden. Teclado: flechas,
 * Enter para elegir y Escape para cerrar.
 */
export const SelectorOpciones: React.FC<Props> = ({ opciones, valor, onCambio, marcador = 'Elegir…', deshabilitado, etiqueta, className }) => {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const [resaltada, setResaltada] = useState(0);
  const campo = useRef<HTMLButtonElement>(null);
  const id = useId();
  const elegida = opciones.find((o) => o.valor === valor);

  useEffect(() => {
    if (!pos) return;
    const cerrar = (e: Event) => {
      // El scroll dentro de la propia lista no la cierra.
      if (e.target instanceof Node && document.getElementById(id)?.contains(e.target)) return;
      setPos(null);
    };
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [pos, id]);

  const abrir = () => {
    const r = campo.current?.getBoundingClientRect();
    if (!r) return;
    // Si no cabe abajo, se abre hacia arriba.
    const arriba = window.innerHeight - r.bottom < 260 && r.top > 260;
    // La lista nunca es más angosta que ANCHO_MIN_LISTA ni se sale por la derecha.
    const width = Math.max(r.width, ANCHO_MIN_LISTA);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos(arriba ? { bottom: window.innerHeight - r.top + 6, left, width } : { top: r.bottom + 6, left, width });
    setResaltada(Math.max(0, opciones.findIndex((o) => o.valor === valor)));
  };

  const elegir = (o: OpcionSelector) => {
    onCambio(o.valor);
    setPos(null);
    campo.current?.focus();
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    if (deshabilitado) return;
    if (!pos) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setPos(null);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setResaltada((i) => Math.min(opciones.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltada((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (opciones[resaltada]) elegir(opciones[resaltada]);
    } else if (e.key === 'Tab') {
      setPos(null);
    }
  };

  return (
    <>
      <button
        ref={campo}
        type="button"
        role="combobox"
        aria-label={etiqueta}
        aria-haspopup="listbox"
        aria-expanded={pos !== null}
        aria-controls={id}
        disabled={deshabilitado}
        onClick={() => (pos ? setPos(null) : abrir())}
        onKeyDown={alTeclear}
        className={cn(
          'group w-full min-h-[40px] flex items-center gap-[10px] py-[7px] pl-[12px] pr-[10px] text-left text-[13px] rounded-sm border bg-white cursor-pointer outline-none',
          '[transition:border-color_150ms,box-shadow_150ms] disabled:cursor-not-allowed disabled:bg-bg-subtle disabled:text-text-light',
          pos ? 'border-blue-700 ring-4 ring-blue-100' : 'border-border enabled:hover:border-border-dark focus-visible:border-blue-700 focus-visible:ring-4 focus-visible:ring-blue-100',
          className,
        )}
      >
        {elegida?.insignia && <Insignia texto={elegida.insignia} />}
        <span className={cn('flex-1 min-w-0 truncate', elegida ? 'text-text-main font-semibold' : 'text-text-light')}>{elegida?.etiqueta ?? marcador}</span>
        <span className={cn('flex text-text-muted [transition:transform_200ms]', pos ? '-rotate-90' : 'rotate-90')}>
          <ChevronRightIcon size={15} />
        </span>
      </button>

      {pos &&
        createPortal(
          // Por encima del modal (z-[9999]); un clic fuera de la lista la cierra.
          <div className="fixed inset-0 z-[10000]" onClick={() => setPos(null)}>
            {/* top/bottom/left/width se calculan al abrir según dónde está el campo: valor dinámico. */}
            <ul
              id={id}
              role="listbox"
              style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
              className="fixed m-0 p-[6px] list-none max-h-[248px] overflow-y-auto bg-white rounded-md border border-border shadow-xl animate-aparecer [animation-duration:180ms]"
              onClick={(e) => e.stopPropagation()}
            >
              {opciones.length === 0 && <li className="py-[10px] px-[12px] text-[13px] text-text-muted">No hay opciones.</li>}
              {opciones.map((o, i) => {
                const activa = o.valor === valor;
                return (
                  <li
                    key={o.valor}
                    role="option"
                    aria-selected={activa}
                    onMouseEnter={() => setResaltada(i)}
                    onClick={() => elegir(o)}
                    className={cn(
                      'flex items-center gap-[10px] py-[8px] px-[10px] rounded-sm cursor-pointer [transition:background-color_120ms]',
                      i === resaltada ? 'bg-blue-50' : 'bg-transparent',
                    )}
                  >
                    {o.insignia && <Insignia texto={o.insignia} activa={activa} />}
                    <span className="flex-1 min-w-0">
                      <span className={cn('block text-[13px] truncate', activa ? 'font-bold text-blue-800' : 'font-semibold text-text-main')}>{o.etiqueta}</span>
                      {o.detalle && <span className="block text-[11.5px] text-text-muted leading-[1.4] mt-[1px]">{o.detalle}</span>}
                    </span>
                    {activa && (
                      <span className="flex text-blue-800 shrink-0">
                        <CheckIcon size={16} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
};

const Insignia: React.FC<{ texto: string; activa?: boolean }> = ({ texto, activa }) => (
  <span
    className={cn(
      'min-w-[26px] h-[26px] px-[6px] rounded-[6px] font-display font-bold text-[12px] flex items-center justify-center shrink-0 [transition:background-color_120ms,color_120ms]',
      activa ? 'bg-blue-800 text-white' : 'bg-blue-50 text-blue-800 border border-blue-100',
    )}
  >
    {texto}
  </span>
);
