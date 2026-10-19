import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { hoyLocal } from '../../lib/fechas';
import { CalendarIcon, ChevronRightIcon } from '../icons/Icons';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// La semana empieza el lunes, como en el calendario peruano.
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const ALTO_CALENDARIO = 360;

/** 'AAAA-MM-DD' ↔ partes, sin pasar por zonas horarias (evita el corrimiento de un día). */
const aTexto = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
function partes(valor: string): { a: number; m: number; d: number } | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  return r ? { a: +r[1], m: +r[2] - 1, d: +r[3] } : null;
}
const diasDelMes = (a: number, m: number) => new Date(a, m + 1, 0).getDate();

/** Suma días a una fecha 'AAAA-MM-DD' (para moverse con las flechas). */
function sumarDias(valor: string, n: number): string {
  const p = partes(valor)!;
  const f = new Date(p.a, p.m, p.d + n);
  return aTexto(f.getFullYear(), f.getMonth(), f.getDate());
}

interface Props {
  /** 'AAAA-MM-DD' o '' si no hay fecha. */
  valor: string;
  onCambio: (valor: string) => void;
  etiqueta?: string;
  marcador?: string;
}

/**
 * Reemplazo del <input type="date"> con un calendario de diseño propio. Se
 * dibuja en <body> (portal) para que ningún modal o tarjeta lo recorte.
 * Teclado: flechas mueven el día, RePág/AvPág el mes, Enter elige, Escape cierra.
 */
export const SelectorFecha: React.FC<Props> = ({ valor, onCambio, etiqueta, marcador = 'Elegir fecha' }) => {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  // Día con el foco del teclado; también decide qué mes se muestra.
  const [enfocado, setEnfocado] = useState(valor || hoyLocal());
  const campo = useRef<HTMLButtonElement>(null);
  const id = useId();
  const hoy = hoyLocal();
  const elegida = partes(valor);
  const vista = partes(enfocado)!;

  useEffect(() => {
    if (!pos) return;
    const cerrar = (e: Event) => {
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
    const arriba = window.innerHeight - r.bottom < ALTO_CALENDARIO && r.top > ALTO_CALENDARIO;
    setPos(arriba ? { bottom: window.innerHeight - r.top + 6, left: r.left } : { top: r.bottom + 6, left: r.left });
    setEnfocado(valor || hoy);
  };

  const cerrar = () => {
    setPos(null);
    campo.current?.focus();
  };

  const elegir = (v: string) => {
    onCambio(v);
    cerrar();
  };

  const cambiarMes = (n: number) => {
    const m = vista.m + n;
    const a = vista.a + Math.floor(m / 12);
    const mes = ((m % 12) + 12) % 12;
    setEnfocado(aTexto(a, mes, Math.min(vista.d, diasDelMes(a, mes))));
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    if (!pos) {
      if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    const mover: Record<string, () => void> = {
      ArrowLeft: () => setEnfocado(sumarDias(enfocado, -1)),
      ArrowRight: () => setEnfocado(sumarDias(enfocado, 1)),
      ArrowUp: () => setEnfocado(sumarDias(enfocado, -7)),
      ArrowDown: () => setEnfocado(sumarDias(enfocado, 7)),
      PageUp: () => cambiarMes(-1),
      PageDown: () => cambiarMes(1),
      Enter: () => elegir(enfocado),
      ' ': () => elegir(enfocado),
      Escape: () => cerrar(),
    };
    if (mover[e.key]) {
      e.preventDefault();
      e.stopPropagation();
      mover[e.key]();
    } else if (e.key === 'Tab') {
      setPos(null);
    }
  };

  // Celdas: huecos hasta el día de la semana del 1 (lunes = 0) y luego los días del mes.
  const huecos = (new Date(vista.a, vista.m, 1).getDay() + 6) % 7;
  const celdas: (number | null)[] = [...Array(huecos).fill(null), ...Array.from({ length: diasDelMes(vista.a, vista.m) }, (_, i) => i + 1)];

  return (
    <div className="mb-[14px] w-full">
      {etiqueta && <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">{etiqueta}</label>}
      <button
        ref={campo}
        type="button"
        aria-label={etiqueta}
        aria-haspopup="dialog"
        aria-expanded={pos !== null}
        onClick={() => (pos ? setPos(null) : abrir())}
        onKeyDown={alTeclear}
        className={cn(
          'w-full h-[42px] flex items-center gap-[10px] px-[14px] text-left text-[14px] rounded-sm border bg-white cursor-pointer outline-none [transition:border-color_150ms,box-shadow_150ms]',
          pos ? 'border-blue-700 ring-4 ring-blue-100' : 'border-border hover:border-border-dark focus-visible:border-blue-700 focus-visible:ring-4 focus-visible:ring-blue-100',
        )}
      >
        <span className={cn('flex [transition:color_150ms]', pos || elegida ? 'text-blue-800' : 'text-text-light')}>
          <CalendarIcon size={17} />
        </span>
        <span className={cn('flex-1 min-w-0 truncate', elegida ? 'text-text-main font-semibold' : 'text-text-light')}>
          {elegida ? `${elegida.d} de ${MESES[elegida.m]} de ${elegida.a}` : marcador}
        </span>
      </button>

      {pos &&
        createPortal(
          <div className="fixed inset-0 z-[10000]" onClick={() => setPos(null)}>
            {/* top/bottom/left se calculan al abrir según dónde está el campo: valor dinámico. */}
            <div
              id={id}
              role="dialog"
              aria-label="Calendario"
              style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
              className="fixed w-[300px] bg-white rounded-lg border border-border shadow-xl overflow-hidden animate-aparecer [animation-duration:180ms]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mes y año */}
              <div className="flex items-center justify-between py-[12px] px-[14px] bg-linear-to-br from-marino-900 to-marino-950 text-white">
                <BotonMes etiqueta="Mes anterior" girar onClick={() => cambiarMes(-1)} />
                <p key={`${vista.a}-${vista.m}`} className="m-0 font-display text-[14.5px] font-semibold capitalize animate-aparecer [animation-duration:220ms]">
                  {MESES[vista.m]} <span className="text-blue-300 font-medium">{vista.a}</span>
                </p>
                <BotonMes etiqueta="Mes siguiente" onClick={() => cambiarMes(1)} />
              </div>

              <div className="p-[12px] pb-[8px]">
                <div className="grid grid-cols-7 mb-[4px]">
                  {DIAS.map((d, i) => (
                    <span key={d} className={cn('h-[28px] flex items-center justify-center text-[11px] font-bold uppercase tracking-[0.5px]', i >= 5 ? 'text-blue-400' : 'text-text-light')}>
                      {d}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-[2px]">
                  {celdas.map((d, i) => {
                    if (d === null) return <span key={`h${i}`} />;
                    const v = aTexto(vista.a, vista.m, d);
                    const esElegida = v === valor;
                    const esHoy = v === hoy;
                    const finDeSemana = i % 7 >= 5;
                    return (
                      <button
                        key={v}
                        type="button"
                        tabIndex={-1}
                        aria-pressed={esElegida}
                        aria-current={esHoy ? 'date' : undefined}
                        onClick={() => elegir(v)}
                        onMouseEnter={() => setEnfocado(v)}
                        className={cn(
                          'relative mx-auto w-[36px] h-[36px] rounded-full border-0 text-[13px] tabular-nums cursor-pointer [transition:background-color_120ms,color_120ms,transform_120ms] active:scale-90',
                          esElegida
                            ? 'bg-blue-800 text-white font-bold shadow-[0_4px_10px_-2px_rgba(29,79,145,0.5)]'
                            : v === enfocado
                              ? 'bg-blue-50 text-blue-800 font-semibold'
                              : cn('bg-transparent font-medium', finDeSemana ? 'text-text-muted' : 'text-text-main'),
                          esHoy && !esElegida && 'ring-[1.5px] ring-inset ring-blue-400 font-bold text-blue-800',
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mismas acciones que el calendario del navegador: borrar y hoy. */}
              <div className="flex items-center justify-between py-[10px] px-[14px] border-t border-border-subtle bg-bg-subtle">
                <button
                  type="button"
                  onClick={() => elegir('')}
                  className="bg-transparent border-0 p-0 text-[12.5px] font-semibold text-text-muted cursor-pointer hover:text-danger [transition:color_150ms]"
                >
                  Borrar
                </button>
                <button
                  type="button"
                  onClick={() => elegir(hoy)}
                  className="h-[28px] px-[12px] rounded-pill border border-blue-100 bg-blue-50 text-[12.5px] font-bold text-blue-800 cursor-pointer [transition:background-color_150ms,color_150ms] hover:bg-blue-800 hover:text-white"
                >
                  Hoy
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

const BotonMes: React.FC<{ etiqueta: string; girar?: boolean; onClick: () => void }> = ({ etiqueta, girar, onClick }) => (
  <button
    type="button"
    aria-label={etiqueta}
    title={etiqueta}
    onClick={onClick}
    className={cn(
      'w-[30px] h-[30px] rounded-full border-0 bg-white/10 text-white flex items-center justify-center cursor-pointer [transition:background-color_150ms] hover:bg-white/20',
      girar && 'rotate-180',
    )}
  >
    <ChevronRightIcon size={16} />
  </button>
);
