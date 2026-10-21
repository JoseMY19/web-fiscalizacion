import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { ChevronRightIcon, MoreVerticalIcon, SearchIcon } from '../icons/Icons';

/**
 * Piezas comunes de las pantallas de oficina: una misma cabecera, las mismas
 * pestañas, el mismo contenedor de tabla y el mismo panel de detalle, para que
 * todos los módulos se vean y se sientan igual. Pensadas con aire: poca
 * información a la vez, color solo donde hay algo que atender y el detalle
 * bajo demanda (panel lateral con secciones plegables).
 */

// ============================================================================
// CABECERA DE PÁGINA
// ============================================================================
/** Descripción de una línea; si no cabe, aparece "Ver más" para leerla completa (los textos legales largos no se pierden). */
const Descripcion: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const parrafo = useRef<HTMLParagraphElement>(null);
  const [abierta, setAbierta] = useState(false);
  const [desborda, setDesborda] = useState(false);

  useLayoutEffect(() => {
    const medir = () => {
      const el = parrafo.current;
      if (el && !abierta) setDesborda(el.scrollHeight > el.clientHeight + 1);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [children, abierta]);

  return (
    <div className="mt-[4px] flex items-baseline gap-[10px]">
      <p ref={parrafo} className={cn('text-[13.5px] text-text-muted leading-[1.5] m-0 min-w-0', !abierta && 'line-clamp-1')}>
        {children}
      </p>
      {(desborda || abierta) && (
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          className="shrink-0 bg-transparent border-0 p-0 text-[12.5px] font-bold text-blue-800 cursor-pointer hover:underline"
        >
          {abierta ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  );
};

export const PageHeader: React.FC<{
  titulo: string;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  /** Texto pequeño en azul sobre el título (ej. la sección del menú o la etapa del procedimiento). */
  etiqueta?: string;
}> = ({ titulo, descripcion, acciones, etiqueta }) => (
  <div className="flex items-end justify-between gap-[16px] flex-wrap mb-[24px] animate-aparecer">
    <div className="min-w-0 flex-1">
      {etiqueta && <p className="text-[12px] font-bold uppercase tracking-[1.6px] text-blue-800 m-0 mb-[6px]">{etiqueta}</p>}
      <h2 className="text-[28px] font-bold text-text-main tracking-[-0.7px] leading-[1.2] m-0">{titulo}</h2>
      {descripcion && <Descripcion>{descripcion}</Descripcion>}
    </div>
    {acciones && <div className="flex items-center gap-[10px] flex-wrap">{acciones}</div>}
  </div>
);

// ============================================================================
// PESTAÑAS SEGMENTADAS
// ============================================================================
export type TonoContador = 'neutral' | 'info' | 'warning' | 'danger';

export interface PestanaItem<T extends string> {
  clave: T;
  etiqueta: string;
  /** Sin contador = no se muestra (por ejemplo, una bandeja que está vacía). */
  contador?: number;
  tono?: TonoContador;
}

const TONO_CONTADOR: Record<TonoContador, string> = {
  neutral: 'bg-border text-text-muted',
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
};

/** Contador de la pestaña activa: relleno, para que se lea de un vistazo. */
const TONO_CONTADOR_ACTIVO: Record<TonoContador, string> = {
  neutral: 'bg-blue-800 text-white',
  info: 'bg-info text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
};

/**
 * Pestañas segmentadas: una "píldora" blanca se desliza bajo la pestaña
 * activa (se mide su posición con refs) y el contador activo se rellena.
 */
export function SegmentedTabs<T extends string>({ items, activa, onChange }: { items: PestanaItem<T>[]; activa: T | null; onChange: (clave: T) => void }) {
  const botones = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [indicador, setIndicador] = useState<{ left: number; width: number } | null>(null);

  // Clave estable: `items` llega como arreglo nuevo en cada render.
  const firma = items.map((p) => `${p.clave}:${p.etiqueta}:${p.contador ?? ''}`).join('|');

  useLayoutEffect(() => {
    const medir = () => {
      const b = activa !== null ? botones.current.get(activa) : undefined;
      const nuevo = b ? { left: b.offsetLeft, width: b.offsetWidth } : null;
      setIndicador((previo) => (previo?.left === nuevo?.left && previo?.width === nuevo?.width ? previo : nuevo));
    };
    medir();
    // El ancho cambia con los contadores o al cargar la fuente.
    const observador = new ResizeObserver(medir);
    botones.current.forEach((b) => observador.observe(b));
    return () => observador.disconnect();
  }, [activa, firma]);

  return (
    <div
      role="tablist"
      className="relative inline-flex p-[5px] gap-[2px] max-w-full overflow-x-auto rounded-md border border-border-dark bg-linear-to-b from-bg-hover to-[#e9eef5] shadow-[inset_0_1px_3px_rgba(15,23,42,0.08),0_1px_0_rgba(255,255,255,0.9)]"
    >
      {/* left/width salen de medir la pestaña activa: valor dinámico. */}
      {indicador && (
        <span
          aria-hidden
          style={{ left: indicador.left, width: indicador.width }}
          className="absolute top-[5px] bottom-[5px] rounded-[8px] bg-white ring-1 ring-border-dark/70 shadow-[0_2px_6px_-1px_rgba(15,23,42,0.12),0_1px_2px_rgba(15,23,42,0.06)] [transition:left_300ms_cubic-bezier(0.2,0.8,0.2,1),width_300ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
        >
          {/* Línea de acento azul bajo el texto activo. */}
          <span className="absolute left-1/2 -translate-x-1/2 bottom-[3px] h-[2px] w-[28px] rounded-full bg-blue-800" />
        </span>
      )}
      {items.map((p) => {
        const esActiva = p.clave === activa;
        return (
          <button
            key={p.clave}
            ref={(el) => {
              if (el) botones.current.set(p.clave, el);
              else botones.current.delete(p.clave);
            }}
            type="button"
            role="tab"
            aria-selected={esActiva}
            onClick={() => onChange(p.clave)}
            className={cn(
              'relative z-[1] py-[8px] px-[16px] rounded-[8px] border-0 bg-transparent text-[13px] cursor-pointer inline-flex items-center gap-[8px] whitespace-nowrap outline-none',
              '[transition:color_200ms_ease,background-color_200ms_ease,transform_150ms_ease] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-blue-400',
              esActiva ? 'text-blue-900 font-bold' : 'text-text-muted font-medium hover:text-text-main hover:bg-white/50',
            )}
          >
            {p.etiqueta}
            {p.contador !== undefined && (
              <span
                className={cn(
                  'min-w-[20px] text-center text-[11px] font-bold py-[1px] px-[7px] rounded-pill tabular-nums [transition:background-color_200ms_ease,color_200ms_ease]',
                  esActiva ? TONO_CONTADOR_ACTIVO[p.tono ?? 'neutral'] : TONO_CONTADOR[p.tono ?? 'neutral'],
                )}
              >
                {p.contador}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// PANEL DE TABLA (contenedor + barra de herramientas)
// ============================================================================
export const PanelTabla: React.FC<{ barra?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ barra, children, className }) => (
  // Aparece (solo opacidad) un instante después de la cabecera; la barra lleva
  // un degradado muy suave para separarse de las filas sin otra línea fuerte.
  <div className={cn('bg-bg-card rounded-lg border border-border shadow-sm overflow-hidden animate-desvanecer [animation-delay:100ms]', className)}>
    {barra && (
      <div className="py-[16px] px-[24px] border-b border-border bg-linear-to-b from-bg-subtle to-bg-card flex items-center justify-between flex-wrap gap-[14px]">{barra}</div>
    )}
    {children}
  </div>
);

/** Clases de la tabla estándar: encabezado discreto, filas altas y separadores casi invisibles. */
export const TABLA = {
  tabla: 'w-full border-collapse text-[13px] text-left',
  encabezado: 'bg-bg-subtle border-b border-border',
  th: 'py-[12px] px-[24px] text-[11px] font-bold uppercase tracking-[0.9px] text-text-light whitespace-nowrap',
  fila: 'border-b border-border-subtle last:border-b-0 [transition:background-color_150ms_ease] hover:bg-blue-50/60',
  td: 'py-[18px] px-[24px] align-middle',
};

export const Buscador: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <div className="relative w-[320px] max-w-full">
    <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-text-light flex">
      <SearchIcon size={15} />
    </span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-[38px] pr-[12px] pl-[36px] text-[13px] rounded-sm border border-border bg-white text-text-main outline-none [transition:border-color_150ms_ease,box-shadow_150ms_ease] hover:border-border-dark focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
    />
  </div>
);

// ============================================================================
// ESTADO (punto + texto, sin etiqueta rellena)
// ============================================================================
export type TonoEstado = 'ok' | 'aviso' | 'peligro' | 'info' | 'neutro';

/** Punto con un halo suave del mismo color, para que el estado se lea de un vistazo. */
const PUNTO: Record<TonoEstado, string> = {
  ok: 'bg-success ring-success/15',
  aviso: 'bg-warning ring-warning/15',
  peligro: 'bg-danger ring-danger/15',
  info: 'bg-info ring-info/15',
  neutro: 'bg-border-dark ring-border-dark/25',
};

export const EstadoPunto: React.FC<{ tono: TonoEstado; children: React.ReactNode }> = ({ tono, children }) => (
  <span className="inline-flex items-center gap-[8px] text-[13px] text-text-secondary">
    <span className={cn('w-[7px] h-[7px] rounded-full shrink-0 ring-[3px]', PUNTO[tono])} />
    {children}
  </span>
);

// ============================================================================
// MENÚ DE ACCIONES (⋯)
// ============================================================================
export interface AccionMenu {
  etiqueta: string;
  onClick: () => void;
  tono?: 'normal' | 'peligro' | 'ok';
  deshabilitada?: boolean;
}

const TONO_ACCION: Record<NonNullable<AccionMenu['tono']>, string> = {
  normal: 'text-text-main',
  peligro: 'text-danger',
  ok: 'text-success',
};

/** El menú se dibuja fuera de la tabla (portal) para que el scroll horizontal de la tabla no lo recorte. */
export const MenuAcciones: React.FC<{ acciones: AccionMenu[]; etiqueta?: string }> = ({ acciones, etiqueta = 'Más acciones' }) => {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pos) return;
    const cerrar = () => setPos(null);
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPos(null);
    };
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    window.addEventListener('keydown', alTeclear);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
      window.removeEventListener('keydown', alTeclear);
    };
  }, [pos]);

  const abrir = () => {
    const r = boton.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
  };

  return (
    <>
      <button
        ref={boton}
        type="button"
        title={etiqueta}
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={pos !== null}
        onClick={abrir}
        className="w-[34px] h-[34px] rounded-sm border border-border bg-white text-text-muted cursor-pointer inline-flex items-center justify-center [transition:background-color_150ms_ease,color_150ms_ease] hover:bg-bg-subtle hover:text-text-main"
      >
        <MoreVerticalIcon size={16} />
      </button>
      {pos &&
        createPortal(
          <div className="fixed inset-0 z-[400]" onClick={() => setPos(null)}>
            {/* top/right se calculan al abrir según dónde está el botón: valor dinámico. */}
            <div
              role="menu"
              style={{ top: pos.top, right: pos.right }}
              className="fixed min-w-[190px] bg-white border border-border rounded-sm shadow-lg py-[4px]"
              onClick={(e) => e.stopPropagation()}
            >
              {acciones.map((a) => (
                <button
                  key={a.etiqueta}
                  type="button"
                  role="menuitem"
                  disabled={a.deshabilitada}
                  onClick={() => {
                    setPos(null);
                    a.onClick();
                  }}
                  className={cn(
                    'w-full text-left border-0 bg-transparent py-[9px] px-[14px] text-[13px] font-medium cursor-pointer [transition:background-color_120ms_ease] enabled:hover:bg-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed',
                    TONO_ACCION[a.tono ?? 'normal'],
                  )}
                >
                  {a.etiqueta}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

// ============================================================================
// PANEL LATERAL DE DETALLE
// ============================================================================
export const PanelDetalle: React.FC<{
  abierto: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: React.ReactNode;
  children: React.ReactNode;
  /** Acciones de decisión (aprobar, observar…), fijas abajo. */
  pie?: React.ReactNode;
}> = ({ abierto, onClose, titulo, subtitulo, children, pie }) => {
  // Entra deslizándose: se monta fuera de pantalla y un cuadro después pasa a su lugar.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!abierto) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', alTeclear);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', alTeclear);
    };
  }, [abierto, onClose]);

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300]">
      <div className={cn('absolute inset-0 bg-midnight-950/40 [transition:opacity_200ms_ease]', visible ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(
          'absolute right-0 top-0 h-full w-[720px] max-w-full bg-bg-card shadow-xl flex flex-col [transition:transform_260ms_cubic-bezier(0.22,1,0.36,1)]',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-start justify-between gap-[16px] py-[22px] px-[28px] border-b border-border shrink-0">
          <div className="min-w-0">
            <h3 className="text-[19px] font-bold text-text-main tracking-[-0.3px] m-0">{titulo}</h3>
            {subtitulo && <div className="text-[13px] text-text-muted mt-[4px]">{subtitulo}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="bg-transparent border-0 cursor-pointer text-text-muted p-[8px] rounded-sm flex items-center justify-center shrink-0 [transition:background-color_150ms_ease] hover:bg-bg-hover"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto py-[24px] px-[28px]">{children}</div>
        {pie && <footer className="shrink-0 py-[16px] px-[28px] border-t border-border bg-bg-subtle flex items-center justify-end gap-[10px]">{pie}</footer>}
      </aside>
    </div>,
    document.body,
  );
};

// ============================================================================
// SECCIÓN PLEGABLE Y DATOS
// ============================================================================
export const SeccionPlegable: React.FC<{
  titulo: string;
  /** Resumen a la derecha, visible aunque la sección esté cerrada (ej. "2 medidas · 1 testigo"). */
  resumen?: React.ReactNode;
  inicialAbierta?: boolean;
  children: React.ReactNode;
}> = ({ titulo, resumen, inicialAbierta = false, children }) => {
  const [abierta, setAbierta] = useState(inicialAbierta);
  return (
    <section className="border-b border-border-subtle last:border-b-0">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center gap-[10px] py-[16px] bg-transparent border-0 text-left cursor-pointer"
      >
        <span className={cn('inline-flex text-text-light [transition:transform_150ms_ease]', abierta && 'rotate-90')}>
          <ChevronRightIcon size={16} />
        </span>
        <span className="text-[14px] font-bold text-text-main">{titulo}</span>
        {resumen && <span className="ml-auto text-[12px] text-text-muted">{resumen}</span>}
      </button>
      {abierta && <div className="pb-[22px] pl-[26px]">{children}</div>}
    </section>
  );
};

/** Rejilla de datos: etiqueta pequeña arriba y valor debajo (más limpio que "Etiqueta: valor" en línea). */
export const Datos: React.FC<{ children: React.ReactNode; columnas?: 2 | 3 }> = ({ children, columnas = 2 }) => (
  <dl className={cn('grid gap-x-[28px] gap-y-[18px] m-0 max-sm:grid-cols-1', columnas === 3 ? 'grid-cols-3' : 'grid-cols-2')}>{children}</dl>
);

export const Dato: React.FC<{ etiqueta: string; children?: React.ReactNode; ancho?: boolean }> = ({ etiqueta, children, ancho }) => (
  <div className={cn('min-w-0', ancho && 'col-span-full')}>
    <dt className="text-[11.5px] font-medium text-text-muted mb-[3px]">{etiqueta}</dt>
    <dd className="text-[13.5px] text-text-main leading-[1.45] m-0 break-words">{children ?? '—'}</dd>
  </div>
);
