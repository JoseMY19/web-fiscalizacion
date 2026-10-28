import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CoactivaPagosApi, ConsultasApi, ExpedientesApi, IfiApi, NotificacionesApi, RecursosApi, ResolucionesApi } from '../../api';
import { CoactivaApi } from '../../api/coactiva';
import { PagosApi } from '../../api/pagos';
import { Button } from '../../components/common/Common';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  CreditCardIcon,
  ExpedienteIcon,
  MapPinIcon,
  RefreshCwIcon,
  XCircleIcon,
} from '../../components/icons/Icons';
import { NavModule } from '../../components/layout/AppLayout';
import { cn } from '../../lib/cn';
import { socket } from '../../lib/socket';
import { useConteoAnimado } from '../../lib/useConteoAnimado';
import { useAlertas } from '../alertas/AlertasContext';
import { fechaLarga } from '../dashboard/dashboardUi';
import {
  BarraDato,
  BarraPartes,
  BarrasHorizontales,
  ColumnaDato,
  ColumnasApiladas,
  ColumnasMes,
  Dona,
  Leyenda,
  MiniTendencia,
  PuntoDato,
  SegmentoDato,
  SerieDato,
} from './graficos';

/**
 * Dashboard de métricas: cuántos expedientes hay en cada etapa del PAS, cómo
 * están los plazos, cuánto se recauda y cuántas intervenciones se hacen. Junta
 * las bandejas de cada módulo; si el rol no puede ver alguna, esa parte se omite
 * y se avisa (nunca se inventan datos).
 */

// Colores (validados: separación para daltonismo y contraste sobre blanco).
const AZUL = '#1d4f91'; // blue-800 de la app: una sola serie
const CATEGORICOS = ['#1d4f91', '#eb6834', '#1baf7a'];
// Estados: reservados para plazos, siempre con ícono y nombre.
const ESTADO = { critico: '#d03b3b', serio: '#ec835a', aviso: '#fab219', bien: '#0ca30c' };

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Los últimos `n` meses (el actual al final) como 'AAAA-MM'. */
function ultimosMeses(n: number): { clave: string; etiqueta: string; etiquetaLarga: string }[] {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1);
    const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    return { clave, etiqueta: MESES[f.getMonth()], etiquetaLarga: `${MESES_LARGOS[f.getMonth()]} ${f.getFullYear()}` };
  });
}

const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
const entero = (n: number) => n.toLocaleString('es-PE');

/** Variación de este mes frente al anterior; null si no hay con qué comparar. */
function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** Resultado de una consulta: el dato, o null si el rol no tiene acceso o falló. */
type Res<T> = T | null;
const intentar = <T,>(p: Promise<T>): Promise<Res<T>> => p.then((x) => x).catch(() => null);

interface Datos {
  etapas: (BarraDato & { modulo: NavModule; disponible: boolean })[];
  pagos: Res<{ montoPagado: number; fechaPago: string }[]>;
  intervenciones: Res<{ fechaHoraInicio: string; tipoActuacion: string }[]>;
}

const largo = (x: unknown[] | null | undefined) => x?.length ?? 0;

async function cargarDatos(): Promise<Datos> {
  const [validacion, notifPend, notifAsig, ifi, resoluciones, recursos, actoCand, actoDeriv, coactiva, pagos, intervenciones] = await Promise.all([
    intentar(ExpedientesApi.getPendientes()),
    intentar(NotificacionesApi.getPendientesAsignacion()),
    intentar(NotificacionesApi.getAsignadas()),
    intentar(IfiApi.getPendientes()),
    intentar(ResolucionesApi.getBandeja()),
    intentar(RecursosApi.getBandeja()),
    intentar(CoactivaPagosApi.listarCandidatosActoFirme()),
    intentar(CoactivaPagosApi.listarPendientesDerivacion()),
    intentar(CoactivaApi.getBandeja()),
    intentar(PagosApi.listar('')),
    intentar(ConsultasApi.getIntervencionesSelector()),
  ]);

  const etapas: Datos['etapas'] = [
    {
      clave: 'validacion',
      modulo: 'expedientes',
      etiqueta: 'Validación',
      detalle: 'Expedientes por validar',
      valor: largo(validacion),
      disponible: validacion !== null,
    },
    {
      clave: 'notificacion',
      modulo: 'notificaciones',
      etiqueta: 'Notificación',
      detalle: 'Cédulas por asignar o en diligencia',
      valor: largo(notifPend) + largo(notifAsig),
      disponible: notifPend !== null || notifAsig !== null,
    },
    {
      clave: 'instruccion',
      modulo: 'ifi',
      etiqueta: 'Instrucción (IFI)',
      detalle: 'En instrucción o esperando la NC',
      valor: largo(ifi?.pendientes) + largo(ifi?.esperandoNotificacion),
      disponible: ifi !== null,
    },
    {
      clave: 'resolucion',
      modulo: 'resoluciones',
      etiqueta: 'Resolución',
      detalle: 'En redacción o por firmar',
      valor: largo(resoluciones?.enRedaccion) + largo(resoluciones?.porFirmar),
      disponible: resoluciones !== null,
    },
    {
      clave: 'recursos',
      modulo: 'recursos',
      etiqueta: 'Recursos',
      detalle: 'Plazo abierto, reconsideraciones y apelaciones',
      valor: largo(recursos?.plazoAbierto) + largo(recursos?.reconsideraciones) + largo(recursos?.apelaciones),
      disponible: recursos !== null,
    },
    {
      clave: 'acto-firme',
      modulo: 'coactiva-pagos',
      etiqueta: 'Acto firme',
      detalle: 'Por declarar firme o por derivar',
      valor: largo(actoCand) + largo(actoDeriv),
      disponible: actoCand !== null || actoDeriv !== null,
    },
    {
      clave: 'coactiva',
      modulo: 'coactiva',
      etiqueta: 'Coactiva',
      detalle: 'En espera, por iniciar, en curso o suspendidos',
      valor: largo(coactiva?.enEspera) + largo(coactiva?.porIniciar) + largo(coactiva?.enCurso) + largo(coactiva?.suspendidos),
      disponible: coactiva !== null,
    },
  ];

  return { etapas, pagos, intervenciones };
}

const TIPOS: SerieDato[] = [
  { clave: 'EXHORTACION', etiqueta: 'Exhortación', color: CATEGORICOS[0] },
  { clave: 'CONSTATACION', etiqueta: 'Constatación', color: CATEGORICOS[1] },
  { clave: 'INICIA_PAS', etiqueta: 'Inicia PAS', color: CATEGORICOS[2] },
];

/** Avisos del servidor (socket) que cambian lo que muestra el tablero. */
const EVENTOS_EN_VIVO = ['expediente:nuevo', 'ifi:pendiente', 'resolucion:pendiente', 'caducidad:cambio', 'coactiva:cambio', 'pago:registrado'];
const ESPERA_EVENTOS_MS = 1500;

export const MetricasView: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const { resumen } = useAlertas();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState<Date | null>(null);

  const temporizadorEventos = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `enSilencio`: la recarga por un aviso en vivo no vuelve a mostrar los esqueletos, solo cambia las cifras.
  const cargar = useCallback(async (enSilencio = false) => {
    if (!enSilencio) setCargando(true);
    const d = await cargarDatos();
    setDatos(d);
    setActualizado(new Date());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // En vivo: cualquier cambio relevante que avisa el servidor refresca el tablero (agrupado, para no consultar de más).
  useEffect(() => {
    const alEvento = () => {
      if (temporizadorEventos.current) clearTimeout(temporizadorEventos.current);
      temporizadorEventos.current = setTimeout(() => cargar(true), ESPERA_EVENTOS_MS);
    };
    EVENTOS_EN_VIVO.forEach((e) => socket.on(e, alEvento));
    return () => {
      EVENTOS_EN_VIVO.forEach((e) => socket.off(e, alEvento));
      if (temporizadorEventos.current) clearTimeout(temporizadorEventos.current);
    };
  }, [cargar]);

  // ─── Derivados ───
  const etapasVisibles = datos?.etapas.filter((e) => e.disponible) ?? [];
  const etapasOcultas = (datos?.etapas.length ?? 0) - etapasVisibles.length;
  const enTramite = etapasVisibles.reduce((s, e) => s + e.valor, 0);
  const etapaMayor = etapasVisibles.reduce<(typeof etapasVisibles)[number] | null>((m, e) => (e.valor > (m?.valor ?? 0) ? e : m), null);

  const meses12 = ultimosMeses(12);
  const pagosPorMes: PuntoDato[] = meses12.map((m) => ({
    ...m,
    valor: (datos?.pagos ?? []).filter((p) => p.fechaPago?.slice(0, 7) === m.clave).reduce((s, p) => s + Number(p.montoPagado || 0), 0),
  }));
  const recaudado12 = pagosPorMes.reduce((s, p) => s + p.valor, 0);
  const recaudadoTotal = (datos?.pagos ?? []).reduce((s, p) => s + Number(p.montoPagado || 0), 0);
  const recaudadoMes = pagosPorMes[11]?.valor ?? 0;
  const mejorMes = pagosPorMes.reduce((m, p) => (p.valor > m.valor ? p : m), pagosPorMes[0]);
  const mesesConPago = pagosPorMes.filter((p) => p.valor > 0).length;

  const meses6 = ultimosMeses(6);
  const intervPorMes: ColumnaDato[] = meses6.map((m) => {
    const delMes = (datos?.intervenciones ?? []).filter((i) => i.fechaHoraInicio?.slice(0, 7) === m.clave);
    return { ...m, valores: Object.fromEntries(TIPOS.map((t) => [t.clave, delMes.filter((i) => i.tipoActuacion === t.clave).length])) };
  });
  const totalMes = (c?: ColumnaDato) => Object.values(c?.valores ?? {}).reduce((s, v) => s + v, 0);
  const intervTotales6 = intervPorMes.map(totalMes);
  const totalIntervenciones = datos?.intervenciones?.length ?? 0;
  const intervencionesMes = intervTotales6[5] ?? 0;
  const interv6 = intervTotales6.reduce((s, v) => s + v, 0);
  const tipoMayor = TIPOS.map((t) => ({ ...t, total: intervPorMes.reduce((s, m) => s + (m.valores[t.clave] ?? 0), 0) })).sort((a, b) => b.total - a.total)[0];

  const niveles: SegmentoDato[] = [
    { clave: 'VENCIDO', etiqueta: 'Vencidas', valor: resumen?.porNivel.VENCIDO ?? 0, color: ESTADO.critico, icono: <XCircleIcon size={14} /> },
    { clave: 'CRITICO', etiqueta: 'Críticas', valor: resumen?.porNivel.CRITICO ?? 0, color: ESTADO.serio, icono: <AlertTriangleIcon size={14} /> },
    { clave: 'POR_VENCER', etiqueta: 'Por vencer', valor: resumen?.porNivel.POR_VENCER ?? 0, color: ESTADO.aviso, icono: <ClockIcon size={14} /> },
    { clave: 'EN_PLAZO', etiqueta: 'En plazo', valor: resumen?.porNivel.EN_PLAZO ?? 0, color: ESTADO.bien, icono: <CheckCircleIcon size={14} /> },
  ];
  const enPlazoPct = resumen?.total ? Math.round(((resumen.porNivel.EN_PLAZO ?? 0) / resumen.total) * 100) : null;

  const promedioMensual = mesesConPago ? recaudado12 / 12 : 0;

  return (
    <div className="flex flex-col gap-[20px]">
      {/* ─── Cabecera ─── */}
      <header className="flex items-end justify-between gap-[16px] flex-wrap animate-aparecer">
        <div className="min-w-0">
          <h1 className="m-0 font-display text-[26px] max-md:text-[22px] font-bold tracking-[-0.6px] leading-[1.2] text-text-main">
            Métricas del procedimiento
          </h1>
          <p className="m-0 mt-[4px] text-[13.5px] text-text-muted">
            Hoy, {fechaLarga().toLowerCase()} · cómo avanzan los expedientes, los plazos y la recaudación
          </p>
        </div>
        <div className="flex items-center gap-[10px]">
          {actualizado && (
            <span className="flex items-center gap-[7px] h-[38px] px-[14px] rounded-pill bg-bg-card border border-border text-[12.5px] text-text-secondary shadow-xs">
              <span className="relative flex w-[8px] h-[8px]">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60 motion-reduce:animate-none" />
                <span className="relative w-[8px] h-[8px] rounded-full bg-emerald-500" />
              </span>
              Actualizado {actualizado.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button icon={<RefreshCwIcon size={15} />} loading={cargando} onClick={() => cargar()} className="rounded-pill! h-[38px]">
            Actualizar
          </Button>
        </div>
      </header>

      {/* ─── Indicadores ─── */}
      <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] gap-[16px] max-xl:grid-cols-2 max-sm:grid-cols-1">
        <KpiPrincipal
          valor={enTramite}
          cargando={cargando}
          detalle={`Repartidos en ${etapasVisibles.length} etapas del PAS`}
          partes={etapasVisibles.map((e) => ({ clave: e.clave, valor: e.valor, etiqueta: e.etiqueta, color: 'var(--color-blue-300)' }))}
          onClick={() => onNavigate('expedientes')}
        />
        <Kpi
          i={1}
          icono={<AlertTriangleIcon size={15} />}
          tono="rojo"
          valor={resumen?.criticas ?? 0}
          cargando={!resumen}
          titulo="Alertas vencidas o críticas"
          pie={<BarraPartes partes={niveles.map((n) => ({ clave: n.clave, valor: n.valor, etiqueta: n.etiqueta, color: n.color }))} />}
          detalle={`De ${entero(resumen?.total ?? 0)} plazos vigilados`}
          onClick={() => onNavigate('alertas')}
        />
        <Kpi
          i={2}
          icono={<CreditCardIcon size={15} />}
          tono="verde"
          valor={recaudadoTotal}
          formato={soles}
          cargando={cargando}
          titulo="Recaudado por pagos"
          tendencia={datos?.pagos ? pagosPorMes.slice(-6).map((p) => p.valor) : undefined}
          variacion={variacion(recaudadoMes, pagosPorMes[10]?.valor ?? 0)}
          detalle={datos?.pagos === null ? 'Sin acceso a Registro de Pagos' : `${soles(recaudadoMes)} este mes`}
          onClick={() => onNavigate('pagos')}
        />
        <Kpi
          i={3}
          icono={<MapPinIcon size={15} />}
          tono="naranja"
          valor={totalIntervenciones}
          cargando={cargando}
          titulo="Intervenciones registradas"
          tendencia={datos?.intervenciones ? intervTotales6 : undefined}
          variacion={variacion(intervencionesMes, intervTotales6[4] ?? 0)}
          detalle={datos?.intervenciones === null ? 'Sin acceso a intervenciones' : `${entero(intervencionesMes)} este mes`}
          onClick={() => onNavigate('mapa')}
        />
      </div>

      {/* ─── De un vistazo ─── */}
      <section className="rounded-xl bg-bg-card border border-border shadow-xs p-[22px] max-md:p-[16px] animate-aparecer [animation-delay:400ms]">
        <h2 className="m-0 font-display text-[16px] font-bold text-text-main">De un vistazo</h2>
        <p className="m-0 mt-[2px] text-[12.5px] text-text-muted">Lo que conviene revisar hoy</p>
        <div className="mt-[16px] grid grid-cols-3 gap-[12px] max-lg:grid-cols-1">
          <Vistazo
            icono={<ExpedienteIcon size={17} />}
            tono="azul"
            etiqueta="En trámite ahora"
            valor={cargando ? null : entero(enTramite)}
            detalle={etapaMayor ? `Más en ${etapaMayor.etiqueta}` : 'Sin expedientes en curso'}
            onClick={() => onNavigate(etapaMayor?.modulo ?? 'expedientes')}
          />
          <Vistazo
            icono={<CheckCircleIcon size={17} />}
            tono="verde"
            etiqueta="Plazos en regla"
            valor={enPlazoPct === null ? (resumen ? '—' : null) : `${enPlazoPct}%`}
            detalle={resumen ? `${entero(resumen.criticas)} vencidos o críticos` : 'Cargando alertas…'}
            onClick={() => onNavigate('alertas')}
          />
          <Vistazo
            icono={<CreditCardIcon size={17} />}
            tono="naranja"
            etiqueta="Recaudado este mes"
            valor={cargando ? null : soles(recaudadoMes)}
            detalle={datos?.pagos === null ? 'Sin acceso a pagos' : `${soles(recaudado12)} en 12 meses`}
            onClick={() => onNavigate('pagos')}
          />
        </div>
      </section>

      {/* ─── Recaudación y plazos ─── */}
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-[20px] max-lg:grid-cols-1">
        <TarjetaGrafico
          i={0}
          icono={<CreditCardIcon size={17} />}
          titulo="Recaudación por mes"
          subtitulo="Pagos de multas registrados, últimos 12 meses · en amarillo, el mes en curso"
          cargando={cargando}
          vacio={datos?.pagos === null ? 'Tu rol no tiene acceso a Registro de Pagos.' : recaudadoTotal === 0 ? 'Todavía no hay pagos registrados.' : null}
          tabla={{ columnas: ['Mes', 'Recaudado'], filas: pagosPorMes.map((p) => [p.etiquetaLarga, soles(p.valor)]) }}
          resumen={[
            { etiqueta: 'Últimos 12 meses', valor: soles(recaudado12) },
            { etiqueta: 'Promedio mensual', valor: soles(promedioMensual) },
            { etiqueta: 'Mejor mes', valor: mejorMes?.valor ? mejorMes.etiquetaLarga : '—' },
          ]}
        >
          <ColumnasMes datos={pagosPorMes} formato={soles} nombreSerie="Recaudado" promedio={promedioMensual} />
        </TarjetaGrafico>

        <TarjetaGrafico
          i={1}
          icono={<ClockIcon size={17} />}
          titulo="Plazos por nivel de alerta"
          subtitulo="Pasa el mouse sobre la dona para ver cada nivel"
          cargando={!resumen}
          vacio={resumen && resumen.total === 0 ? 'No hay plazos en seguimiento.' : null}
          tabla={{ columnas: ['Nivel', 'Plazos'], filas: niveles.map((n) => [n.etiqueta, n.valor]) }}
          resumen={[
            { etiqueta: 'Requieren atención', valor: entero(resumen?.atencion ?? 0) },
            { etiqueta: 'En seguimiento', valor: entero(resumen?.seguimiento ?? 0) },
          ]}
          accion={{ texto: 'Ir a Alertas y Plazos', onClick: () => onNavigate('alertas') }}
        >
          <Dona datos={niveles} etiquetaTotal="plazos vigilados" />
        </TarjetaGrafico>
      </div>

      {/* ─── Procedimiento y campo ─── */}
      <div className="grid grid-cols-2 gap-[20px] max-lg:grid-cols-1">
        <TarjetaGrafico
          i={2}
          icono={<ExpedienteIcon size={17} />}
          titulo="Expedientes por etapa"
          subtitulo="Clic en una etapa para abrir su bandeja"
          cargando={cargando}
          vacio={!etapasVisibles.length ? 'No tienes acceso a ninguna bandeja del procedimiento.' : null}
          nota={etapasOcultas > 0 ? `${etapasOcultas} etapa${etapasOcultas === 1 ? '' : 's'} sin mostrar: tu rol no tiene acceso.` : undefined}
          tabla={{ columnas: ['Etapa', 'Expedientes'], filas: etapasVisibles.map((e) => [e.etiqueta, e.valor]) }}
          resumen={[
            { etiqueta: 'Total en trámite', valor: entero(enTramite) },
            { etiqueta: 'Etapa con más carga', valor: etapaMayor?.valor ? etapaMayor.etiqueta : '—' },
            { etiqueta: 'Etapas vacías', valor: entero(etapasVisibles.filter((e) => e.valor === 0).length) },
          ]}
        >
          <BarrasHorizontales datos={etapasVisibles} color={AZUL} onClick={(clave) => onNavigate(etapasVisibles.find((e) => e.clave === clave)!.modulo)} />
        </TarjetaGrafico>

        <TarjetaGrafico
          i={3}
          icono={<MapPinIcon size={17} />}
          titulo="Intervenciones por mes"
          subtitulo="Por tipo de actuación, últimos 6 meses"
          cargando={cargando}
          vacio={
            datos?.intervenciones === null
              ? 'Tu rol no tiene acceso a las intervenciones.'
              : totalIntervenciones === 0
                ? 'Todavía no hay intervenciones.'
                : null
          }
          cabecera={<Leyenda series={TIPOS.map((t) => ({ ...t, total: intervPorMes.reduce((s, m) => s + (m.valores[t.clave] ?? 0), 0) }))} />}
          tabla={{
            columnas: ['Mes', ...TIPOS.map((t) => t.etiqueta)],
            filas: intervPorMes.map((m) => [m.etiquetaLarga, ...TIPOS.map((t) => m.valores[t.clave] ?? 0)]),
          }}
          resumen={[
            { etiqueta: 'Últimos 6 meses', valor: entero(interv6) },
            { etiqueta: 'Promedio mensual', valor: (interv6 / 6).toLocaleString('es-PE', { maximumFractionDigits: 1 }) },
            { etiqueta: 'Tipo más frecuente', valor: tipoMayor?.total ? tipoMayor.etiqueta : '—' },
          ]}
        >
          <ColumnasApiladas datos={intervPorMes} series={TIPOS} />
        </TarjetaGrafico>
      </div>
    </div>
  );
};

// ─── Piezas ───

const TONOS = {
  azul: { chip: 'bg-blue-50 text-blue-800 ring-blue-100', halo: 'bg-blue-500', linea: AZUL },
  rojo: { chip: 'bg-danger-bg text-danger ring-danger-border', halo: 'bg-danger', linea: ESTADO.critico },
  verde: { chip: 'bg-success-bg text-success ring-success-border', halo: 'bg-success', linea: '#16a34a' },
  naranja: { chip: 'bg-warning-bg text-warning ring-warning-border', halo: 'bg-warning', linea: '#d97706' },
};

/** Número del indicador: barra de carga mientras llega, conteo animado después. */
const Cifra: React.FC<{ valor: number; formato?: (n: number) => string; cargando: boolean; oscuro?: boolean }> = ({ valor, formato, cargando, oscuro }) => {
  const numero = useConteoAnimado(cargando ? 0 : valor);
  if (cargando) {
    return <span className={cn('inline-block w-[100px] h-[30px] rounded-md animate-pulse align-middle', oscuro ? 'bg-white/10' : 'bg-bg-subtle')} />;
  }
  return <>{formato ? formato(numero) : entero(numero)}</>;
};

/** Indicador destacado: fondo marino con un halo cálido y la franja de colores del logo. */
const KpiPrincipal: React.FC<{
  valor: number;
  cargando: boolean;
  detalle: string;
  partes: { clave: string; valor: number; color: string; etiqueta: string }[];
  onClick: () => void;
}> = ({ valor, cargando, detalle, partes, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative overflow-hidden text-left p-[20px] pb-[22px] rounded-xl bg-linear-to-br from-marino-950 via-[#0f2547] to-[#0b1b36] text-white border-0 shadow-lg cursor-pointer animate-aparecer [animation-delay:80ms] [transition:transform_250ms_cubic-bezier(0.2,0.8,0.2,1),box-shadow_250ms] hover:-translate-y-[3px] hover:shadow-xl"
  >
    <span aria-hidden className="absolute -top-[90px] right-[10%] w-[220px] h-[220px] rounded-full bg-sjl-naranja/35 blur-[70px] opacity-80 [transition:opacity_300ms] group-hover:opacity-100" />
    <span aria-hidden className="absolute -bottom-[110px] -left-[40px] w-[200px] h-[200px] rounded-full bg-blue-500/25 blur-[70px]" />

    <span className="relative flex items-center justify-between gap-[10px]">
      <span className="flex items-center gap-[10px]">
        <span className="w-[30px] h-[30px] rounded-[9px] bg-white/10 ring-1 ring-white/15 flex items-center justify-center text-sjl-naranja">
          <ExpedienteIcon size={15} />
        </span>
        <span className="text-[13.5px] font-semibold text-blue-100">Expedientes en trámite</span>
      </span>
      <span className="text-blue-200/70 [transition:transform_250ms,color_250ms] group-hover:translate-x-[3px] group-hover:text-white">
        <ArrowRightIcon size={17} />
      </span>
    </span>

    <span className="relative block mt-[16px] font-display text-[40px] font-bold leading-none tracking-[-1px] tabular-nums">
      <Cifra valor={valor} cargando={cargando} oscuro />
    </span>
    {!cargando && (
      <span className="relative block mt-[14px]">
        <BarraPartes partes={partes} fondo="bg-white/10" />
      </span>
    )}
    <span className="relative block mt-[10px] text-[12.5px] text-blue-100/80">{detalle}</span>

    {/* Franja de marca */}
    <span aria-hidden className="absolute bottom-0 inset-x-0 h-[4px] bg-linear-to-r from-sjl-rojo via-sjl-naranja to-sjl-turquesa" />
  </button>
);

const Kpi: React.FC<{
  i: number;
  icono: React.ReactNode;
  tono: keyof typeof TONOS;
  valor: number;
  formato?: (n: number) => string;
  cargando: boolean;
  titulo: string;
  detalle: string;
  tendencia?: number[];
  variacion?: number | null;
  pie?: React.ReactNode;
  onClick: () => void;
}> = ({ i, icono, tono, valor, formato, cargando, titulo, detalle, tendencia, variacion: delta, pie, onClick }) => {
  const t = TONOS[tono];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden flex flex-col text-left p-[20px] rounded-xl bg-bg-card border border-border shadow-xs cursor-pointer animate-aparecer [transition:transform_250ms_cubic-bezier(0.2,0.8,0.2,1),box-shadow_250ms,border-color_250ms] hover:-translate-y-[3px] hover:shadow-lg hover:border-border-dark"
      style={{ animationDelay: `${80 + i * 80}ms` }}
    >
      {/* Halo de color que aparece al pasar el mouse */}
      <span
        aria-hidden
        className={cn('absolute -top-[50px] -right-[50px] w-[130px] h-[130px] rounded-full blur-[45px] opacity-0 [transition:opacity_300ms] group-hover:opacity-15', t.halo)}
      />

      <span className="relative flex items-center gap-[10px]">
        <span className={cn('w-[30px] h-[30px] rounded-[9px] ring-1 flex items-center justify-center shrink-0', t.chip)}>{icono}</span>
        <span className="text-[13.5px] font-semibold text-text-secondary truncate">{titulo}</span>
      </span>

      <span className="relative mt-[16px] flex items-end justify-between gap-[10px]">
        <span className="flex items-baseline gap-[8px] flex-wrap min-w-0">
          <span className="font-display text-[30px] font-bold leading-none tracking-[-0.8px] text-text-main tabular-nums">
            <Cifra valor={valor} formato={formato} cargando={cargando} />
          </span>
          {!cargando && delta !== undefined && delta !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-[3px] h-[20px] px-[6px] rounded-pill text-[11px] font-bold',
                delta >= 0 ? 'bg-success-bg text-[#15803d]' : 'bg-danger-bg text-[#b91c1c]',
              )}
              title="Frente al mes anterior"
            >
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
            </span>
          )}
        </span>
        {tendencia && !cargando && (
          <span className="shrink-0 -mb-[2px]">
            <MiniTendencia valores={tendencia} color={t.linea} etiqueta={`Tendencia: ${titulo}`} />
          </span>
        )}
      </span>
      {pie && !cargando && <span className="relative block mt-[14px]">{pie}</span>}
      <span className="relative block mt-auto pt-[10px] text-[12.5px] text-text-muted">{detalle}</span>
    </button>
  );
};

/** Ficha del panel "De un vistazo": ícono, dato y a dónde ir. */
const Vistazo: React.FC<{
  icono: React.ReactNode;
  tono: keyof typeof TONOS;
  etiqueta: string;
  valor: string | null;
  detalle: string;
  onClick: () => void;
}> = ({ icono, tono, etiqueta, valor, detalle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-start gap-[14px] p-[16px] rounded-lg bg-bg-subtle border border-border-subtle text-left cursor-pointer [transition:background-color_200ms,border-color_200ms,box-shadow_200ms] hover:bg-bg-card hover:border-border hover:shadow-md"
  >
    <span className={cn('w-[38px] h-[38px] rounded-[11px] ring-1 flex items-center justify-center shrink-0', TONOS[tono].chip)}>{icono}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-[13px] font-semibold text-text-secondary">{etiqueta}</span>
      <span className="block mt-[4px] font-display text-[22px] font-bold leading-none text-text-main tabular-nums">
        {valor ?? <span className="inline-block w-[80px] h-[22px] rounded-md bg-border-subtle animate-pulse" />}
      </span>
      <span className="block mt-[6px] text-[12px] text-text-muted truncate">{detalle}</span>
    </span>
    <span className="text-text-light [transition:transform_250ms,color_250ms] group-hover:translate-x-[3px] group-hover:text-text-main">
      <ChevronRightIcon size={17} />
    </span>
  </button>
);

// ─── Tarjeta de gráfico (con vista de tabla y resumen) ───

const TarjetaGrafico: React.FC<{
  i: number;
  icono: React.ReactNode;
  titulo: string;
  subtitulo: string;
  cargando: boolean;
  vacio: string | null;
  nota?: string;
  cabecera?: React.ReactNode;
  tabla: { columnas: string[]; filas: (string | number)[][] };
  resumen?: { etiqueta: string; valor: string }[];
  accion?: { texto: string; onClick: () => void };
  children: React.ReactNode;
}> = ({ i, icono, titulo, subtitulo, cargando, vacio, nota, cabecera, tabla, resumen, accion, children }) => {
  const [verTabla, setVerTabla] = useState(false);
  const conDatos = !cargando && !vacio;
  return (
    <section
      className="min-w-0 flex flex-col rounded-xl bg-bg-card border border-border shadow-xs p-[22px] max-md:p-[16px] animate-aparecer [transition:box-shadow_250ms] hover:shadow-md"
      style={{ animationDelay: `${480 + i * 90}ms` }}
    >
      <header className="flex items-start justify-between gap-[12px]">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-[16px] font-bold text-text-main leading-[1.3]">{titulo}</h3>
          <p className="m-0 mt-[2px] text-[12.5px] text-text-muted">{subtitulo}</p>
        </div>
        {conDatos && (
          // Interruptor gráfico / tabla
          <div className="shrink-0 flex gap-[6px]">
            {(['Gráfico', 'Tabla'] as const).map((op) => {
              const activo = (op === 'Tabla') === verTabla;
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => setVerTabla(op === 'Tabla')}
                  aria-pressed={activo}
                  className={cn(
                    'h-[30px] px-[13px] rounded-pill text-[12.5px] font-semibold cursor-pointer [transition:background-color_150ms,color_150ms,border-color_150ms]',
                    activo
                      ? 'bg-marino-950 border border-marino-950 text-white shadow-sm'
                      : 'bg-bg-card border border-border text-text-secondary hover:border-border-dark hover:text-text-main',
                  )}
                >
                  {op}
                </button>
              );
            })}
          </div>
        )}
      </header>
      {cabecera && conDatos && !verTabla && <div className="pt-[14px]">{cabecera}</div>}
      <div className="flex-1 pt-[18px] flex flex-col justify-center">
        {cargando ? (
          <div className="h-[220px] rounded-lg bg-linear-to-r from-bg-subtle via-border-subtle to-bg-subtle animate-pulse" />
        ) : vacio ? (
          <div className="h-[220px] rounded-lg border border-dashed border-border-dark bg-bg-subtle flex flex-col items-center justify-center gap-[10px] text-center px-[20px]">
            <span className="w-[44px] h-[44px] rounded-full bg-white border border-border text-text-light flex items-center justify-center">{icono}</span>
            <span className="text-[13px] text-text-muted max-w-[280px]">{vacio}</span>
          </div>
        ) : verTabla ? (
          <div className="overflow-x-auto animate-desvanecer">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {tabla.columnas.map((c, j) => (
                    <th
                      key={c}
                      className={cn(
                        'py-[8px] px-[10px] text-[11px] font-bold uppercase tracking-[0.6px] text-text-muted border-b border-border',
                        j ? 'text-right' : 'text-left',
                      )}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabla.filas.map((f, k) => (
                  <tr key={k} className="border-b border-border-subtle last:border-0 hover:bg-bg-subtle">
                    {f.map((v, j) => (
                      <td
                        key={j}
                        className={cn('py-[8px] px-[10px]', j ? 'text-right tabular-nums font-semibold text-text-main' : 'text-text-secondary capitalize')}
                      >
                        {typeof v === 'number' ? entero(v) : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="animate-desvanecer">{children}</div>
        )}
        {nota && !cargando && <p className="m-0 mt-[12px] text-[11.5px] text-text-muted">{nota}</p>}
      </div>

      {/* Resumen en cifras */}
      {conDatos && (resumen?.length || accion) && (
        <footer className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-[10px]">
          {resumen?.map((r) => (
            <div key={r.etiqueta} className="min-w-0 py-[11px] px-[14px] rounded-lg bg-bg-subtle border border-border-subtle">
              <p className="m-0 text-[12px] text-text-muted truncate">{r.etiqueta}</p>
              <p className="m-0 mt-[3px] font-display text-[16px] font-bold text-text-main tabular-nums truncate capitalize">{r.valor}</p>
            </div>
          ))}
          {accion && (
            <button
              type="button"
              onClick={accion.onClick}
              className="group flex items-center justify-between gap-[8px] py-[11px] px-[14px] rounded-lg border border-blue-100 bg-blue-50 text-left text-[13px] font-bold text-blue-800 cursor-pointer [transition:background-color_150ms,border-color_150ms] hover:bg-blue-100 hover:border-blue-200"
            >
              {accion.texto}
              <span className="[transition:transform_200ms] group-hover:translate-x-[3px]">
                <ArrowRightIcon size={15} />
              </span>
            </button>
          )}
        </footer>
      )}
    </section>
  );
};
