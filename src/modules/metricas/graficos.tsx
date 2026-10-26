import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { prefiereMenosMovimiento } from '../../lib/movimiento';

/**
 * Gráficos del dashboard de métricas: SVG propio, sin librerías. Reglas que
 * siguen todos: marcas finas, extremos redondeados de 4 px pegados a la base,
 * líneas de 2 px, separación de 2 px entre rellenos, grilla y ejes discretos,
 * texto siempre en los colores de texto (nunca en el color de la serie) y un
 * tooltip al pasar el mouse.
 */

// ─── Utilidades ───

/** Ancho real del contenedor, para dibujar en px (el texto no se deforma). */
export function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const medir = () => setAncho(ref.current?.clientWidth ?? 0);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, ancho };
}

/** false en el primer cuadro y true en el siguiente: dispara las transiciones de entrada. */
function useEntrada(dependencia: unknown = null) {
  const [listo, setListo] = useState(prefiereMenosMovimiento());
  useEffect(() => {
    if (prefiereMenosMovimiento()) return;
    setListo(false);
    const f = requestAnimationFrame(() => requestAnimationFrame(() => setListo(true)));
    return () => cancelAnimationFrame(f);
  }, [dependencia]);
  return listo;
}

/** Máximo "redondo" para el eje (1, 2, 2.5, 5 × 10^n) y sus marcas. */
function escalaBonita(max: number, marcas = 4): { tope: number; pasos: number[] } {
  if (max <= 0) return { tope: 1, pasos: [0, 1] };
  const bruto = max / marcas;
  const pot = Math.pow(10, Math.floor(Math.log10(bruto)));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? bruto;
  const tope = Math.ceil(max / paso) * paso;
  const pasos: number[] = [];
  for (let v = 0; v <= tope + paso / 2; v += paso) pasos.push(v);
  return { tope, pasos };
}

const fmtEntero = (n: number) => n.toLocaleString('es-PE');

/** Tooltip que sigue al mouse dentro del gráfico. */
const Tooltip: React.FC<{
  x: number;
  y: number;
  ancho: number;
  children: React.ReactNode;
}> = ({ x, y, ancho, children }) => {
  // Se voltea a la izquierda si no cabe a la derecha.
  const izquierda = x > ancho - 190;
  return (
    <div
      role="tooltip"
      // Posición del mouse: valor dinámico.
      style={{ left: x, top: y }}
      className={cn(
        'pointer-events-none absolute z-10 min-w-[150px] py-[8px] px-[11px] rounded-md bg-white border border-border shadow-lg text-[12px] text-text-secondary animate-aparecer [animation-duration:150ms]',
        izquierda ? '-translate-x-[calc(100%+12px)]' : 'translate-x-[12px]',
        '-translate-y-1/2',
      )}
    >
      {children}
    </div>
  );
};

/** Fila del tooltip: muestra de color + etiqueta + valor. */
export const FilaTooltip: React.FC<{
  color?: string;
  etiqueta: string;
  valor: string;
  fuerte?: boolean;
}> = ({ color, etiqueta, valor, fuerte }) => (
  <div className="flex items-center gap-[8px] py-[1px]">
    {color && <span className="w-[9px] h-[9px] rounded-[2px] shrink-0" style={{ background: color }} />}
    <span className="flex-1">{etiqueta}</span>
    <span className={cn('tabular-nums', fuerte ? 'font-bold text-text-main' : 'font-semibold text-text-main')}>{valor}</span>
  </div>
);

// ─── Barras horizontales (una serie: cantidad por etapa) ───

export interface BarraDato {
  clave: string;
  etiqueta: string;
  valor: number;
  detalle?: string;
}

export const BarrasHorizontales: React.FC<{
  datos: BarraDato[];
  color: string;
  onClick?: (clave: string) => void;
}> = ({ datos, color, onClick }) => {
  const listo = useEntrada(datos.map((d) => d.valor).join());
  const [activa, setActiva] = useState<string | null>(null);
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const total = datos.reduce((s, d) => s + d.valor, 0);

  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-[4px]">
      {datos.map((d, i) => {
        const pct = (d.valor / max) * 100;
        const parte = total ? Math.round((d.valor / total) * 100) : 0;
        const apagada = activa !== null && activa !== d.clave;
        return (
          <li key={d.clave}>
            <button
              type="button"
              onClick={() => onClick?.(d.clave)}
              onMouseEnter={() => setActiva(d.clave)}
              onMouseLeave={() => setActiva(null)}
              onFocus={() => setActiva(d.clave)}
              onBlur={() => setActiva(null)}
              title={d.detalle}
              className={cn(
                'group w-full grid grid-cols-[26px_128px_1fr_78px] items-center gap-[12px] py-[7px] px-[8px] -mx-[8px] rounded-md border-0 bg-transparent text-left [transition:background-color_150ms,opacity_200ms]',
                onClick ? 'cursor-pointer hover:bg-bg-subtle' : 'cursor-default',
                apagada && 'opacity-55',
              )}
            >
              {/* N° de paso del recorrido */}
              <span className="w-[26px] h-[26px] rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-[11.5px] font-bold flex items-center justify-center [transition:background-color_200ms,color_200ms] group-hover:bg-blue-800 group-hover:text-white">
                {i + 1}
              </span>
              <span className="text-[13px] font-semibold text-text-secondary truncate">{d.etiqueta}</span>
              <span className="relative h-[14px] rounded-[4px] bg-bg-subtle overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px] [transition:width_900ms_cubic-bezier(0.2,0.8,0.2,1)]"
                  // Largo de la barra según el valor: dinámico.
                  style={{
                    width: listo ? `${pct}%` : 0,
                    background: color,
                    transitionDelay: `${i * 70}ms`,
                    minWidth: d.valor > 0 && listo ? 4 : 0,
                  }}
                />
              </span>
              <span className="flex items-baseline justify-end gap-[6px] tabular-nums">
                <span className="text-[14px] font-bold text-text-main">{fmtEntero(d.valor)}</span>
                <span className="w-[32px] text-right text-[11px] text-text-muted">{parte}%</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

// ─── Dona (partes de un total: alertas por nivel) ───

export interface SegmentoDato {
  clave: string;
  etiqueta: string;
  valor: number;
  color: string;
  icono: React.ReactNode;
}

export const Dona: React.FC<{
  datos: SegmentoDato[];
  etiquetaTotal: string;
}> = ({ datos, etiquetaTotal }) => {
  const total = datos.reduce((s, d) => s + d.valor, 0);
  const listo = useEntrada(datos.map((d) => d.valor).join());
  const [activa, setActiva] = useState<string | null>(null);
  const r = 70;
  const grosor = 20;
  const circ = 2 * Math.PI * r;
  // 2 px de separación entre segmentos (en largo de arco).
  const hueco = datos.filter((d) => d.valor > 0).length > 1 ? 2 : 0;
  let acumulado = 0;
  const activoDato = datos.find((d) => d.clave === activa);

  return (
    <div className="flex items-center gap-[28px] flex-wrap justify-center">
      <div className="relative w-[180px] h-[180px] shrink-0">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90" role="img" aria-label={`${etiquetaTotal}: ${total}`}>
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--color-bg-subtle)" strokeWidth={grosor} />
          {total > 0 &&
            datos.map((d, i) => {
              if (d.valor <= 0) return null;
              const largo = (d.valor / total) * circ;
              const inicio = acumulado;
              acumulado += largo;
              const visible = Math.max(0, largo - hueco);
              return (
                <circle
                  key={d.clave}
                  cx="90"
                  cy="90"
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={activa === d.clave ? grosor + 6 : grosor}
                  strokeDasharray={`${listo ? visible : 0} ${circ}`}
                  strokeDashoffset={-inicio}
                  onMouseEnter={() => setActiva(d.clave)}
                  onMouseLeave={() => setActiva(null)}
                  className={cn(
                    'cursor-pointer [transition:stroke-dasharray_900ms_cubic-bezier(0.2,0.8,0.2,1),stroke-width_200ms,opacity_200ms]',
                    activa && activa !== d.clave && 'opacity-40',
                  )}
                  style={{
                    transitionDelay: listo ? `${i * 120}ms, 0ms, 0ms` : '0ms',
                  }}
                />
              );
            })}
        </svg>
        {/* Centro: total, o el segmento bajo el mouse */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="font-display text-[30px] font-bold text-text-main leading-none tabular-nums">
            {fmtEntero(activoDato ? activoDato.valor : total)}
          </span>
          <span className="mt-[4px] text-[11.5px] text-text-muted max-w-[110px] leading-[1.3]">{activoDato ? activoDato.etiqueta : etiquetaTotal}</span>
        </div>
      </div>

      {/* Leyenda: ícono + nombre + cantidad, el color nunca va solo */}
      <ul className="m-0 p-0 list-none flex flex-col gap-[4px] min-w-[190px]">
        {datos.map((d) => (
          <li
            key={d.clave}
            onMouseEnter={() => setActiva(d.clave)}
            onMouseLeave={() => setActiva(null)}
            className={cn(
              'flex items-center gap-[10px] py-[6px] px-[10px] rounded-md [transition:background-color_150ms,opacity_200ms]',
              activa === d.clave ? 'bg-bg-subtle' : '',
              activa && activa !== d.clave && 'opacity-55',
            )}
          >
            <span className="w-[10px] h-[10px] rounded-[3px] shrink-0" style={{ background: d.color }} />
            <span className="flex text-text-muted">{d.icono}</span>
            <span className="flex-1 text-[13px] text-text-secondary">{d.etiqueta}</span>
            <span className="text-[13px] font-bold text-text-main tabular-nums">{fmtEntero(d.valor)}</span>
            <span className="w-[38px] text-right text-[11.5px] text-text-muted tabular-nums">{total ? Math.round((d.valor / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── Columnas por mes (una serie: monto por mes, el mes en curso resaltado) ───

export interface PuntoDato {
  clave: string;
  etiqueta: string;
  /** Etiqueta larga para el tooltip (ej. "octubre 2026"). */
  etiquetaLarga: string;
  valor: number;
}

export const ColumnasMes: React.FC<{
  datos: PuntoDato[];
  formato: (n: number) => string;
  nombreSerie: string;
  /** Línea punteada de referencia (ej. promedio mensual). */
  promedio?: number;
}> = ({ datos, formato, nombreSerie, promedio }) => {
  const { ref, ancho } = useAncho<HTMLDivElement>();
  const listo = useEntrada(datos.map((d) => d.valor).join());
  const [hover, setHover] = useState<number | null>(null);
  const alto = 260;
  const m = { arriba: 16, abajo: 30, izq: 64, der: 8 };
  const { tope, pasos } = escalaBonita(Math.max(...datos.map((d) => d.valor), promedio ?? 0, 0));
  const w = Math.max(0, ancho - m.izq - m.der);
  const h = alto - m.arriba - m.abajo;
  const banda = datos.length ? w / datos.length : 0;
  const anchoCol = Math.min(44, banda * 0.58);
  const y = (v: number) => m.arriba + h - (v / tope) * h;
  const id = `col-${nombreSerie.replace(/\W/g, '')}`;
  const ultimo = datos.length - 1;

  return (
    <div ref={ref} className="relative w-full">
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label={nombreSerie}>
          <defs>
            {/* Meses cerrados: azul de la app que se aclara hacia la base */}
            <linearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-blue-800)" />
              <stop offset="100%" stopColor="var(--color-sjl-turquesa)" stopOpacity="0.75" />
            </linearGradient>
            {/* Mes en curso: tono cálido del logo */}
            <linearGradient id={`${id}-actual`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbcf4a" />
              <stop offset="100%" stopColor="#f0922e" />
            </linearGradient>
          </defs>
          {pasos.map((v) => (
            <g key={v}>
              <line x1={m.izq} x2={m.izq + w} y1={y(v)} y2={y(v)} stroke="var(--color-border)" />
              <text x={m.izq - 10} y={y(v)} dy="0.32em" textAnchor="end" className="fill-text-light text-[11px] tabular-nums">
                {formato(v)}
              </text>
            </g>
          ))}
          {datos.map((d, i) => {
            const cx = m.izq + banda * i + banda / 2;
            const altoCol = (d.valor / tope) * h;
            return (
              <g key={d.clave}>
                {/* Zona de lectura: toda la banda, más grande que la columna */}
                <rect
                  x={m.izq + banda * i}
                  y={m.arriba}
                  width={banda}
                  height={h}
                  fill={hover === i ? 'var(--color-bg-subtle)' : 'transparent'}
                  rx={8}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
                <path
                  d={columnaRedondeada(cx - anchoCol / 2, m.arriba + h - altoCol, anchoCol, altoCol, Math.min(6, altoCol))}
                  fill={`url(#${id}-${i === ultimo ? 'actual' : 'base'})`}
                  className={cn(
                    'pointer-events-none [transition:transform_800ms_cubic-bezier(0.2,0.8,0.2,1),opacity_200ms]',
                    hover !== null && hover !== i && 'opacity-60',
                  )}
                  style={{
                    transformOrigin: `${cx}px ${m.arriba + h}px`,
                    transform: listo ? 'scaleY(1)' : 'scaleY(0)',
                    transitionDelay: `${i * 50}ms, 0ms`,
                  }}
                />
                <text
                  x={cx}
                  y={alto - 8}
                  textAnchor="middle"
                  className={cn('text-[11.5px] capitalize', hover === i ? 'fill-text-main font-semibold' : 'fill-text-light')}
                >
                  {d.etiqueta}
                </text>
              </g>
            );
          })}
          {promedio !== undefined && promedio > 0 && (
            <g className="pointer-events-none [transition:opacity_500ms_ease_700ms]" opacity={listo ? 1 : 0}>
              <line x1={m.izq} x2={m.izq + w} y1={y(promedio)} y2={y(promedio)} stroke="var(--color-text-muted)" strokeDasharray="5 5" />
              <text x={m.izq + 10} y={y(promedio) - 8} className="fill-text-secondary text-[12px] font-semibold tabular-nums">
                Promedio {formato(promedio)}
              </text>
            </g>
          )}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={m.izq + banda * hover + banda / 2 + anchoCol / 2} y={Math.max(y(datos[hover].valor), m.arriba + 30)} ancho={ancho}>
          <p className="m-0 mb-[4px] font-bold text-text-main capitalize">
            {datos[hover].etiquetaLarga}
            {hover === ultimo && <span className="ml-[6px] text-[11px] font-semibold text-warning normal-case">(en curso)</span>}
          </p>
          <FilaTooltip color={hover === ultimo ? '#f5b03c' : 'var(--color-blue-800)'} etiqueta={nombreSerie} valor={formato(datos[hover].valor)} fuerte />
        </Tooltip>
      )}
    </div>
  );
};

// ─── Columnas apiladas (varias series por mes) ───

export interface SerieDato {
  clave: string;
  etiqueta: string;
  color: string;
}

export interface ColumnaDato {
  clave: string;
  etiqueta: string;
  etiquetaLarga: string;
  valores: Record<string, number>;
}

export const ColumnasApiladas: React.FC<{
  datos: ColumnaDato[];
  series: SerieDato[];
}> = ({ datos, series }) => {
  const { ref, ancho } = useAncho<HTMLDivElement>();
  const listo = useEntrada(datos.map((d) => Object.values(d.valores).join('.')).join());
  const [hover, setHover] = useState<number | null>(null);
  const alto = 230;
  const m = { arriba: 14, abajo: 28, izq: 36, der: 8 };
  const totales = datos.map((d) => series.reduce((s, se) => s + (d.valores[se.clave] ?? 0), 0));
  const { tope, pasos } = escalaBonita(Math.max(...totales, 0));
  const w = Math.max(0, ancho - m.izq - m.der);
  const h = alto - m.arriba - m.abajo;
  const banda = datos.length ? w / datos.length : 0;
  const anchoCol = Math.min(40, banda * 0.55);
  const y = (v: number) => m.arriba + h - (v / tope) * h;
  const GAP = 2;

  return (
    <div ref={ref} className="relative w-full">
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label="Columnas apiladas">
          {pasos.map((v) => (
            <g key={v}>
              <line x1={m.izq} x2={m.izq + w} y1={y(v)} y2={y(v)} stroke="var(--color-border)" strokeDasharray={v ? '3 4' : undefined} />
              <text x={m.izq - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-text-light text-[11px] tabular-nums">
                {fmtEntero(v)}
              </text>
            </g>
          ))}
          {datos.map((d, i) => {
            const cx = m.izq + banda * i + banda / 2;
            let base = m.arriba + h;
            const visibles = series.filter((s) => (d.valores[s.clave] ?? 0) > 0);
            return (
              <g key={d.clave}>
                {/* Zona de lectura: toda la banda, más grande que la columna */}
                <rect
                  x={m.izq + banda * i}
                  y={m.arriba}
                  width={banda}
                  height={h}
                  fill={hover === i ? 'var(--color-bg-subtle)' : 'transparent'}
                  rx={6}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
                <g
                  className="pointer-events-none [transition:transform_800ms_cubic-bezier(0.2,0.8,0.2,1)]"
                  style={{
                    transformOrigin: `${cx}px ${m.arriba + h}px`,
                    transform: listo ? 'scaleY(1)' : 'scaleY(0)',
                    transitionDelay: `${i * 60}ms`,
                  }}
                >
                  {visibles.map((s, j) => {
                    const v = d.valores[s.clave] ?? 0;
                    const altoSeg = (v / tope) * h;
                    const ultimo = j === visibles.length - 1;
                    // Separación de 2 px entre segmentos (sale del alto del de arriba).
                    const altoDibujo = Math.max(0, altoSeg - (j > 0 ? GAP : 0));
                    base -= altoSeg;
                    return ultimo ? (
                      // Solo el extremo superior va redondeado (4 px); la base queda recta.
                      <path key={s.clave} d={columnaRedondeada(cx - anchoCol / 2, base, anchoCol, altoDibujo, Math.min(4, altoDibujo))} fill={s.color} />
                    ) : (
                      <rect key={s.clave} x={cx - anchoCol / 2} y={base + (j > 0 ? GAP : 0)} width={anchoCol} height={altoDibujo} fill={s.color} />
                    );
                  })}
                </g>
                <text
                  x={cx}
                  y={alto - 8}
                  textAnchor="middle"
                  className={cn('text-[11px] capitalize', hover === i ? 'fill-text-main font-semibold' : 'fill-text-light')}
                >
                  {d.etiqueta}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={m.izq + banda * hover + banda / 2 + anchoCol / 2} y={m.arriba + h / 2} ancho={ancho}>
          <p className="m-0 mb-[4px] font-bold text-text-main capitalize">{datos[hover].etiquetaLarga}</p>
          {[...series].reverse().map((s) => (
            <FilaTooltip key={s.clave} color={s.color} etiqueta={s.etiqueta} valor={fmtEntero(datos[hover].valores[s.clave] ?? 0)} />
          ))}
          <div className="mt-[4px] pt-[4px] border-t border-border-subtle">
            <FilaTooltip etiqueta="Total" valor={fmtEntero(totales[hover])} fuerte />
          </div>
        </Tooltip>
      )}
    </div>
  );
};

/** Rectángulo con solo las esquinas de arriba redondeadas. */
function columnaRedondeada(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return '';
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

/** Leyenda horizontal para gráficos de varias series. */
export const Leyenda: React.FC<{
  series: (SerieDato & { total?: number })[];
}> = ({ series }) => (
  <ul className="m-0 p-0 list-none flex items-center gap-x-[16px] gap-y-[6px] flex-wrap">
    {series.map((s) => (
      <li key={s.clave} className="flex items-center gap-[7px] text-[12.5px] text-text-secondary">
        <span className="w-[10px] h-[10px] rounded-[3px]" style={{ background: s.color }} />
        {s.etiqueta}
        {s.total !== undefined && <span className="font-bold text-text-main tabular-nums">{fmtEntero(s.total)}</span>}
      </li>
    ))}
  </ul>
);

// ─── Mini tendencia (para los indicadores) ───

/** Línea pequeña con relleno suave: solo la forma de la tendencia, sin ejes. */
export const MiniTendencia: React.FC<{ valores: number[]; color: string; etiqueta: string }> = ({ valores, color, etiqueta }) => {
  const listo = useEntrada(valores.join());
  const w = 120;
  const h = 38;
  const max = Math.max(1, ...valores);
  const x = (i: number) => (valores.length > 1 ? (i / (valores.length - 1)) * (w - 4) + 2 : w / 2);
  const y = (v: number) => h - 3 - (v / max) * (h - 8);
  const linea = valores.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const id = `mini-${etiqueta.replace(/\W/g, '')}`;
  return (
    <svg width={w} height={h} role="img" aria-label={etiqueta} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${linea} L${x(valores.length - 1)},${h} L${x(0)},${h} Z`}
        fill={`url(#${id})`}
        opacity={listo ? 1 : 0}
        className="[transition:opacity_800ms_ease_400ms]"
      />
      <path
        d={linea}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={listo ? 0 : 1}
        className="[transition:stroke-dashoffset_1100ms_cubic-bezier(0.4,0,0.2,1)_200ms]"
      />
      <circle
        cx={x(valores.length - 1)}
        cy={y(valores[valores.length - 1] ?? 0)}
        r={3.5}
        fill={color}
        stroke="var(--color-bg-card)"
        strokeWidth={2}
        opacity={listo ? 1 : 0}
        className="[transition:opacity_300ms_ease_1200ms]"
      />
    </svg>
  );
};

/** Barra fina repartida en partes (ej. alertas por nivel), con 2 px entre partes. */
export const BarraPartes: React.FC<{
  partes: { clave: string; valor: number; color: string; etiqueta: string }[];
  /** Clase del riel (por defecto bg-bg-subtle; en fondos oscuros, uno translúcido). */
  fondo?: string;
}> = ({ partes, fondo }) => {
  const listo = useEntrada(partes.map((p) => p.valor).join());
  const total = partes.reduce((s, p) => s + p.valor, 0);
  return (
    <div
      className={cn('flex h-[8px] w-full gap-[2px] rounded-pill overflow-hidden', fondo ?? 'bg-bg-subtle')}
      role="img"
      aria-label={partes.map((p) => `${p.etiqueta}: ${p.valor}`).join(', ')}
    >
      {total > 0 &&
        partes
          .filter((p) => p.valor > 0)
          .map((p, i) => (
            <span
              key={p.clave}
              title={`${p.etiqueta}: ${p.valor}`}
              className="h-full [transition:flex-grow_900ms_cubic-bezier(0.2,0.8,0.2,1)]"
              style={{ background: p.color, flexGrow: listo ? p.valor : 0, flexBasis: 0, transitionDelay: `${i * 100}ms` }}
            />
          ))}
    </div>
  );
};
