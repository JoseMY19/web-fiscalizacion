import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { CheckIcon, ChevronRightIcon } from '../icons/Icons';

interface Props {
  etiqueta?: string;
  valor: string;
  onCambio: (valor: string) => void;
  /** Sugerencias de la lista; igual se puede escribir otro texto. */
  sugerencias: string[];
  marcador?: string;
}

const ANCHO_MIN_LISTA = 240;

/** Compara sin tildes ni mayúsculas: "demolicion" encuentra "DEMOLICIÓN". */
const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Reemplazo del <input list> + <datalist>: texto libre con una lista de
 * sugerencias de diseño propio que se filtra mientras se escribe. La lista se
 * dibuja en <body> (portal) para que el modal no la recorte. Teclado: flechas,
 * Enter para elegir la resaltada y Escape para cerrar.
 */
export const CampoSugerencias: React.FC<Props> = ({ etiqueta, valor, onCambio, sugerencias, marcador }) => {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const [resaltada, setResaltada] = useState(-1);
  const caja = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const id = useId();

  // Si el texto ya es una sugerencia (o está vacío) se muestran todas; si no, las que lo contienen.
  const exacta = sugerencias.some((s) => plano(s) === plano(valor));
  const visibles = !valor.trim() || exacta ? sugerencias : sugerencias.filter((s) => plano(s).includes(plano(valor)));

  useEffect(() => {
    if (!pos) return;
    const cerrarAlScroll = (e: Event) => {
      if (e.target instanceof Node && document.getElementById(id)?.contains(e.target)) return;
      setPos(null);
    };
    const alClicFuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!caja.current?.contains(t) && !document.getElementById(id)?.contains(t)) setPos(null);
    };
    window.addEventListener('scroll', cerrarAlScroll, true);
    window.addEventListener('resize', cerrarAlScroll);
    document.addEventListener('mousedown', alClicFuera);
    return () => {
      window.removeEventListener('scroll', cerrarAlScroll, true);
      window.removeEventListener('resize', cerrarAlScroll);
      document.removeEventListener('mousedown', alClicFuera);
    };
  }, [pos, id]);

  const abrir = () => {
    const r = caja.current?.getBoundingClientRect();
    if (!r) return;
    const arriba = window.innerHeight - r.bottom < 260 && r.top > 260;
    const width = Math.max(r.width, ANCHO_MIN_LISTA);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos(arriba ? { bottom: window.innerHeight - r.top + 6, left, width } : { top: r.bottom + 6, left, width });
    setResaltada(-1);
  };

  const elegir = (s: string) => {
    onCambio(s);
    setPos(null);
    campo.current?.focus();
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    if (!pos) {
      if (e.key === 'ArrowDown') {
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
      setResaltada((i) => Math.min(visibles.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltada((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && visibles[resaltada]) {
      e.preventDefault();
      elegir(visibles[resaltada]);
    } else if (e.key === 'Tab') {
      setPos(null);
    }
  };

  return (
    <div className="mb-[14px] w-full">
      {etiqueta && <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">{etiqueta}</label>}
      <div
        ref={caja}
        className={cn(
          'flex items-center h-[42px] rounded-sm border bg-white [transition:border-color_150ms,box-shadow_150ms]',
          pos ? 'border-blue-700 ring-4 ring-blue-100' : 'border-border hover:border-border-dark focus-within:border-blue-700 focus-within:ring-4 focus-within:ring-blue-100',
        )}
      >
        <input
          ref={campo}
          role="combobox"
          aria-label={etiqueta}
          aria-autocomplete="list"
          aria-expanded={pos !== null}
          aria-controls={id}
          value={valor}
          placeholder={marcador}
          autoComplete="off"
          onChange={(e) => {
            onCambio(e.target.value);
            if (!pos) abrir();
            setResaltada(-1);
          }}
          onClick={() => !pos && abrir()}
          onKeyDown={alTeclear}
          className="flex-1 min-w-0 h-full pl-[14px] pr-[4px] border-0 bg-transparent text-[14px] text-text-main outline-none placeholder:text-text-light"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Ver sugerencias"
          onClick={() => {
            if (pos) setPos(null);
            else abrir();
            campo.current?.focus();
          }}
          className="h-full px-[10px] flex items-center border-0 bg-transparent text-text-muted cursor-pointer"
        >
          <span className={cn('flex [transition:transform_200ms]', pos ? '-rotate-90' : 'rotate-90')}>
            <ChevronRightIcon size={15} />
          </span>
        </button>
      </div>

      {pos &&
        createPortal(
          // top/bottom/left/width se calculan al abrir según dónde está el campo: valor dinámico.
          <ul
            id={id}
            role="listbox"
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
            className="fixed z-[10000] m-0 p-[6px] list-none max-h-[248px] overflow-y-auto bg-white rounded-md border border-border shadow-xl animate-aparecer [animation-duration:180ms]"
          >
            {visibles.length === 0 ? (
              <li className="py-[9px] px-[10px] text-[12.5px] text-text-muted leading-[1.45]">
                Sin sugerencias: se usará <span className="font-semibold text-text-main">«{valor.trim()}»</span> tal como lo escribiste.
              </li>
            ) : (
              <>
                {!exacta && valor.trim() && <li className="pt-[4px] pb-[6px] px-[10px] text-[11px] font-bold uppercase tracking-[0.5px] text-text-light">Sugerencias</li>}
                {visibles.map((s, i) => {
                  const activa = plano(s) === plano(valor);
                  return (
                    <li
                      key={s}
                      role="option"
                      aria-selected={activa}
                      onMouseEnter={() => setResaltada(i)}
                      // mousedown para elegir antes de que el campo pierda el foco.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        elegir(s);
                      }}
                      className={cn(
                        'flex items-center gap-[10px] py-[8px] px-[10px] rounded-sm cursor-pointer [transition:background-color_120ms]',
                        i === resaltada ? 'bg-blue-50' : 'bg-transparent',
                      )}
                    >
                      <span className={cn('flex-1 min-w-0 text-[13px] leading-[1.35]', activa ? 'font-bold text-blue-800' : 'font-semibold text-text-main')}>{s}</span>
                      {activa && (
                        <span className="flex text-blue-800 shrink-0">
                          <CheckIcon size={16} />
                        </span>
                      )}
                    </li>
                  );
                })}
              </>
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
};
