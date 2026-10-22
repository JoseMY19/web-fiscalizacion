import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { hoyLocal } from '../../lib/fechas';
import { CalendarIcon, ChevronRightIcon, ClockIcon } from '../icons/Icons';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// La semana empieza el lunes, como en el calendario peruano.
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const ALTO_CALENDARIO = 360;
const ALTO_CALENDARIO_CON_HORA = 440;

const dos = (n: number) => String(n).padStart(2, '0');

/** 'AAAA-MM-DD' ↔ partes, sin pasar por zonas horarias (evita el corrimiento de un día). */
const aTexto = (a: number, m: number, d: number) => `${a}-${dos(m + 1)}-${dos(d)}`;
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

/** Fecha y hora a medio llenar: la hora se escribe a mano y puede faltar. */
type Borrador = { fecha: string; hh: string; mm: string };
const desdeValor = (v: string): Borrador => ({ fecha: v.slice(0, 10), hh: v.slice(11, 13), mm: v.slice(14, 16) });

/** '7' → '07'; '' o fuera de rango → '' (hora incompleta). */
function normalizar(texto: string, tope: number): string {
  if (!/^\d{1,2}$/.test(texto) || +texto > tope) return '';
  return dos(+texto);
}

function ahoraLocal(): string {
  const f = new Date();
  return `${hoyLocal()}T${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

interface Props {
  /** 'AAAA-MM-DD' (o 'AAAA-MM-DDTHH:mm' con `conHora`); '' si no hay fecha. */
  valor: string;
  onCambio: (valor: string) => void;
  etiqueta?: string;
  marcador?: string;
  /** Pide también la hora; el valor pasa a 'AAAA-MM-DDTHH:mm', como un datetime-local. */
  conHora?: boolean;
  /** Primer día permitido ('AAAA-MM-DD'): los días anteriores se deshabilitan. */
  min?: string;
  /** Último valor permitido (mismo formato que `valor`): los días posteriores se deshabilitan. */
  max?: string;
  /** Texto de ayuda bajo el campo. */
  ayuda?: string;
}

/**
 * Reemplazo del <input type="date"> (y del datetime-local con `conHora`) con un
 * calendario de diseño propio. Se dibuja en <body> (portal) para que ningún
 * modal o tarjeta lo recorte. Teclado: flechas mueven el día, RePág/AvPág el
 * mes, Enter elige, Escape cierra; en la hora, flechas suben o bajan el valor.
 * Con `conHora` la hora nunca se rellena sola: mientras falte, el valor es ''.
 */
export const SelectorFecha: React.FC<Props> = ({ valor, onCambio, etiqueta, marcador = 'Elegir fecha', conHora, min, max, ayuda }) => {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  // Día con el foco del teclado; también decide qué mes se muestra.
  const [enfocado, setEnfocado] = useState(valor.slice(0, 10) || hoyLocal());
  const [borrador, setBorrador] = useState<Borrador>(() => desdeValor(valor));
  const campo = useRef<HTMLButtonElement>(null);
  const minutos = useRef<HTMLInputElement>(null);
  const id = useId();
  const hoy = hoyLocal();
  const fechaMin = min?.slice(0, 10);
  const fechaMax = max?.slice(0, 10);
  const fueraDeRango = (v: string) => (!!fechaMin && v < fechaMin) || (!!fechaMax && v > fechaMax);
  // Con hora se muestra el borrador (puede faltar la hora); sin hora, el valor tal cual.
  const actual = conHora ? (valor ? desdeValor(valor) : borrador) : desdeValor(valor);
  const elegida = partes(actual.fecha);
  const horaCompleta = !!normalizar(actual.hh, 23) && !!normalizar(actual.mm, 59);
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
    const alto = conHora ? ALTO_CALENDARIO_CON_HORA : ALTO_CALENDARIO;
    const arriba = window.innerHeight - r.bottom < alto && r.top > alto;
    setPos(arriba ? { bottom: window.innerHeight - r.top + 6, left: r.left } : { top: r.bottom + 6, left: r.left });
    if (valor) setBorrador(desdeValor(valor));
    setEnfocado(actual.fecha || hoy);
  };

  const cerrar = () => {
    setPos(null);
    campo.current?.focus();
  };

  /** Guarda el borrador y avisa: el valor completo, o '' si aún falta algo. */
  const aplicar = (b: Borrador) => {
    setBorrador(b);
    const hh = normalizar(b.hh, 23);
    const mm = normalizar(b.mm, 59);
    onCambio(b.fecha && hh && mm ? `${b.fecha}T${hh}:${mm}` : '');
  };

  const elegirDia = (v: string) => {
    if (fueraDeRango(v)) return;
    if (!conHora) {
      onCambio(v);
      cerrar();
      return;
    }
    // Con hora el calendario sigue abierto para completar la hora.
    setEnfocado(v);
    aplicar({ ...actual, fecha: v });
  };

  const borrar = () => {
    if (conHora) aplicar({ fecha: '', hh: '', mm: '' });
    else onCambio('');
    cerrar();
  };

  const ahora = () => {
    const local = ahoraLocal();
    const v = max && local > max ? max : local;
    setEnfocado(v.slice(0, 10));
    aplicar(desdeValor(v));
  };

  const escribirHora = (parte: 'hh' | 'mm', texto: string) => {
    const t = texto.replace(/\D/g, '').slice(0, 2);
    aplicar({ ...actual, [parte]: t });
    // Al completar la hora, el cursor pasa a los minutos.
    if (parte === 'hh' && t.length === 2) minutos.current?.select();
  };

  const pasoHora = (parte: 'hh' | 'mm', delta: number) => {
    const tope = parte === 'hh' ? 23 : 59;
    const f = new Date();
    const base = actual[parte] === '' ? (parte === 'hh' ? f.getHours() : f.getMinutes()) - delta : +actual[parte];
    aplicar({ ...actual, [parte]: dos((((base + delta) % (tope + 1)) + tope + 1) % (tope + 1)) });
  };

  // Al salir de la caja de la hora, '7' se muestra como '07'.
  const completarHora = (parte: 'hh' | 'mm') => {
    const n = normalizar(actual[parte], parte === 'hh' ? 23 : 59);
    if (n && n !== actual[parte]) setBorrador({ ...actual, [parte]: n });
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
      Enter: () => elegirDia(enfocado),
      ' ': () => elegirDia(enfocado),
      Escape: () => cerrar(),
    };
    if (mover[e.key]) {
      e.preventDefault();
      e.stopPropagation();
      mover[e.key]();
    } else if (e.key === 'Tab' && !conHora) {
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
          {conHora && elegida && (
            <span className={cn('font-medium', horaCompleta ? 'text-text-secondary' : 'text-[#b45309]')}>
              {' · '}
              {horaCompleta ? `${normalizar(actual.hh, 23)}:${normalizar(actual.mm, 59)} h` : 'falta la hora'}
            </span>
          )}
        </span>
      </button>
      {ayuda && <p className="text-[12px] mt-[4px] text-text-muted">{ayuda}</p>}

      {pos &&
        createPortal(
          <div className="fixed inset-0 z-[10000]" onClick={() => setPos(null)}>
            {/* top/bottom/left se calculan al abrir según dónde está el campo: valor dinámico. */}
            <div
              id={id}
              role="dialog"
              aria-label={conHora ? 'Calendario y hora' : 'Calendario'}
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
                    const esElegida = v === actual.fecha;
                    const esHoy = v === hoy;
                    const finDeSemana = i % 7 >= 5;
                    const fuera = fueraDeRango(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        tabIndex={-1}
                        disabled={fuera}
                        aria-pressed={esElegida}
                        aria-current={esHoy ? 'date' : undefined}
                        onClick={() => elegirDia(v)}
                        onMouseEnter={() => !fuera && setEnfocado(v)}
                        className={cn(
                          'relative mx-auto w-[36px] h-[36px] rounded-full border-0 text-[13px] tabular-nums cursor-pointer [transition:background-color_120ms,color_120ms,transform_120ms] active:scale-90',
                          'disabled:cursor-not-allowed disabled:text-border-dark disabled:active:scale-100',
                          esElegida
                            ? 'bg-blue-800 text-white font-bold shadow-[0_4px_10px_-2px_rgba(29,79,145,0.5)]'
                            : v === enfocado && !fuera
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

              {conHora && (
                <div className="flex items-center justify-between gap-[10px] mx-[12px] mb-[12px] py-[8px] pl-[12px] pr-[8px] rounded-md border border-border-subtle bg-bg-subtle">
                  <span className={cn('flex items-center gap-[8px] text-[12.5px] font-semibold', horaCompleta ? 'text-text-secondary' : 'text-[#b45309]')}>
                    <span className="flex text-blue-800">
                      <ClockIcon size={16} />
                    </span>
                    Hora
                  </span>
                  <div className="flex items-center gap-[6px]">
                    <CampoHora
                      etiqueta="Hora"
                      valor={actual.hh}
                      onTexto={(t) => escribirHora('hh', t)}
                      onPaso={(d) => pasoHora('hh', d)}
                      onSalir={() => completarHora('hh')}
                      onListo={cerrar}
                    />
                    <span className="font-display font-bold text-[16px] text-text-muted">:</span>
                    <CampoHora
                      ref={minutos}
                      etiqueta="Minutos"
                      valor={actual.mm}
                      onTexto={(t) => escribirHora('mm', t)}
                      onPaso={(d) => pasoHora('mm', d)}
                      onSalir={() => completarHora('mm')}
                      onListo={cerrar}
                    />
                  </div>
                </div>
              )}

              {/* Mismas acciones que el calendario del navegador: borrar y hoy (o ahora). */}
              <div className="flex items-center justify-between py-[10px] px-[14px] border-t border-border-subtle bg-bg-subtle">
                <button
                  type="button"
                  onClick={borrar}
                  className="bg-transparent border-0 p-0 text-[12.5px] font-semibold text-text-muted cursor-pointer hover:text-danger [transition:color_150ms]"
                >
                  Borrar
                </button>
                <div className="flex items-center gap-[8px]">
                  <button
                    type="button"
                    disabled={!conHora && fueraDeRango(hoy)}
                    onClick={() => (conHora ? ahora() : elegirDia(hoy))}
                    className="h-[28px] px-[12px] rounded-pill border border-blue-100 bg-blue-50 text-[12.5px] font-bold text-blue-800 cursor-pointer [transition:background-color_150ms,color_150ms] hover:bg-blue-800 hover:text-white disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {conHora ? 'Ahora' : 'Hoy'}
                  </button>
                  {conHora && (
                    <button
                      type="button"
                      onClick={cerrar}
                      className="h-[28px] px-[14px] rounded-pill border-0 bg-blue-800 text-[12.5px] font-bold text-white cursor-pointer [transition:background-color_150ms] hover:bg-blue-900"
                    >
                      Listo
                    </button>
                  )}
                </div>
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

interface CampoHoraProps {
  etiqueta: string;
  valor: string;
  onTexto: (texto: string) => void;
  onPaso: (delta: number) => void;
  onSalir: () => void;
  onListo: () => void;
}

/** Caja de dos dígitos (hora o minutos) con flechas para subir y bajar. */
const CampoHora = React.forwardRef<HTMLInputElement, CampoHoraProps>(({ etiqueta, valor, onTexto, onPaso, onSalir, onListo }, ref) => (
  <div className="flex items-stretch h-[38px] rounded-sm border border-border bg-white overflow-hidden [transition:border-color_150ms,box-shadow_150ms] focus-within:border-blue-700 focus-within:ring-4 focus-within:ring-blue-100">
    <input
      ref={ref}
      value={valor}
      inputMode="numeric"
      maxLength={2}
      placeholder="--"
      aria-label={etiqueta}
      onChange={(e) => onTexto(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={onSalir}
      onKeyDown={(e) => {
        const acciones: Record<string, () => void> = { ArrowUp: () => onPaso(1), ArrowDown: () => onPaso(-1), Enter: onListo, Escape: onListo };
        if (acciones[e.key]) {
          e.preventDefault();
          e.stopPropagation();
          acciones[e.key]();
        }
      }}
      className="w-[36px] border-0 bg-transparent text-center font-display text-[15px] font-bold tabular-nums text-text-main outline-none placeholder:text-text-light"
    />
    <div className="flex flex-col border-l border-border-subtle">
      {[1, -1].map((d) => (
        <button
          key={d}
          type="button"
          tabIndex={-1}
          aria-label={`${d > 0 ? 'Subir' : 'Bajar'} ${etiqueta.toLowerCase()}`}
          onClick={() => onPaso(d)}
          className="flex-1 w-[20px] flex items-center justify-center border-0 bg-transparent text-text-muted cursor-pointer [transition:background-color_120ms,color_120ms] hover:bg-blue-50 hover:text-blue-800"
        >
          <span className={cn('flex', d > 0 ? '-rotate-90' : 'rotate-90')}>
            <ChevronRightIcon size={11} />
          </span>
        </button>
      ))}
    </div>
  </div>
));
CampoHora.displayName = 'CampoHora';
