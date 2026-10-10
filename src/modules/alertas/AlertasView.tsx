import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, Spinner } from '../../components/common/Common';
import { ArrowRightIcon, CheckCircleIcon, CheckIcon, RefreshCwIcon, SearchIcon } from '../../components/icons/Icons';
import { Alerta, AlertasApi, ExpedienteConAlertas, FaseExpediente, GrupoAlerta, ResultadoExpedientes } from '../../api/alertas';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { CHIP_BASE, ETIQUETA_MODULO, FASES, GRUPOS, GRUPO_META, NIVEL_META, PASOS_FASE, haceDias } from './alertasUi';

const POR_PAGINA = 10;
const CONTROL = 'h-[38px] px-[12px] text-[13px] rounded-sm border border-border bg-white text-text-main outline-none focus:border-primary-500';

type Vista = GrupoAlerta | 'ATENCION';

/**
 * Alertas y plazos, una tarjeta por expediente: en qué fase está (línea de
 * fases), qué toca hacer ahora, desde cuándo espera y qué plazos corren.
 * Por defecto muestra lo que pide atención; "En seguimiento" guarda los plazos
 * largos sin riesgo para que no hagan ruido.
 */
export const AlertasView: React.FC = () => {
  const [vista, setVista] = useState<Vista>('ATENCION');
  const [fase, setFase] = useState<FaseExpediente | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<ResultadoExpedientes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // La búsqueda por número espera un instante para no consultar con cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setBusquedaAplicada(busqueda);
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    AlertasApi.listarPorExpediente({ grupo: vista, fase: fase || undefined, busqueda: busquedaAplicada, pagina, porPagina: POR_PAGINA })
      .then(setDatos)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudieron cargar las alertas.'))
      .finally(() => setCargando(false));
  }, [vista, fase, busquedaAplicada, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Pulsar un grupo lo filtra; pulsarlo otra vez vuelve a "requieren atención".
  const elegirGrupo = (g: GrupoAlerta) => {
    setVista(vista === g ? 'ATENCION' : g);
    setPagina(1);
  };

  const grupos = datos?.grupos;
  const atencion = grupos ? grupos.URGENTE + grupos.POR_VENCER + grupos.ACTUAR : undefined;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.porPagina)) : 1;
  const titulo = vista === 'ATENCION' ? 'Expedientes que requieren atención' : GRUPO_META[vista].etiqueta;

  return (
    <div>
      <div className="flex items-start justify-between gap-[16px] flex-wrap mb-[20px]">
        <div>
          <h2 className="text-[22px] font-extrabold text-text-main tracking-[-0.3px] m-0">Alertas y Plazos</h2>
          <p className="text-[13px] text-text-muted mt-[4px] m-0">
            En qué fase está cada expediente, qué toca hacer y qué plazos corren. Solo ves lo de los módulos a los que tienes acceso.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={cargando} onClick={cargar}>
          Actualizar
        </Button>
      </div>

      {/* Cuatro grupos de expedientes: cada tarjeta es también un filtro. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[12px] mb-[18px]">
        {GRUPOS.map((g) => {
          const meta = GRUPO_META[g];
          const activo = vista === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => elegirGrupo(g)}
              className={cn(
                'relative overflow-hidden text-left rounded-[12px] border bg-white py-[12px] pl-[18px] pr-[14px] cursor-pointer shadow-xs hover:bg-bg-subtle',
                activo ? 'border-primary-600 shadow-[0_0_0_2px_rgba(37,99,235,0.15)]' : 'border-border',
              )}
            >
              <span className={cn('absolute left-0 top-0 bottom-0 w-[5px]', meta.barra)} />
              <span className="flex items-baseline justify-between gap-[8px]">
                <span className={cn('text-[13px] font-bold', meta.texto)}>{meta.etiqueta}</span>
                <span className="text-[26px] font-extrabold text-text-main tabular-nums leading-none">{grupos ? grupos[g] : '–'}</span>
              </span>
              <span className="block text-[12px] text-text-muted mt-[4px]">{meta.descripcion}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-[10px] flex-wrap mb-[12px]">
        <h3 className="text-[15px] font-bold text-text-main m-0">
          {titulo}
          {datos && <span className="ml-[8px] text-[13px] font-medium text-text-muted">({datos.total})</span>}
        </h3>
        {vista !== 'ATENCION' && (
          <button
            type="button"
            onClick={() => elegirGrupo(vista)}
            className="bg-transparent border-0 p-0 text-[12px] font-semibold text-primary-600 cursor-pointer hover:underline"
          >
            Ver los que requieren atención{atencion !== undefined ? ` (${atencion})` : ''}
          </button>
        )}
        <span className="flex-1" />
        <div className="relative min-w-[200px] max-w-[260px] flex-1">
          <span className="absolute left-[10px] top-1/2 -translate-y-1/2 text-text-light flex">
            <SearchIcon size={15} />
          </span>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar N° de expediente" className={cn(CONTROL, 'w-full pl-[32px]')} />
        </div>
        <select
          value={fase}
          onChange={(e) => {
            setFase(e.target.value as FaseExpediente | '');
            setPagina(1);
          }}
          className={CONTROL}
        >
          <option value="">Todas las fases</option>
          {FASES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.etiqueta}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {cargando && !datos ? (
        <div className="py-[48px] flex justify-center">
          <Spinner size={28} />
        </div>
      ) : datos && datos.items.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-border shadow-xs">
          <EmptyState
            icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
            title={vista === 'ATENCION' ? 'Nada requiere atención ahora' : 'No hay expedientes en este grupo'}
            description={
              vista === 'ATENCION'
                ? 'No hay plazos con riesgo ni expedientes listos para actuar. Los plazos sin riesgo están en "En seguimiento".'
                : 'Prueba con otro grupo, otra fase o limpia la búsqueda.'
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {datos?.items.map((e) => (
            <TarjetaExpediente key={e.clave} e={e} />
          ))}
        </div>
      )}

      {datos && datos.total > POR_PAGINA && (
        <div className="mt-[14px] flex items-center justify-between text-[12px] text-text-muted">
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <span className="flex gap-[8px]">
            <Button variant="secondary" size="sm" disabled={pagina <= 1 || cargando} onClick={() => setPagina(pagina - 1)}>
              Anterior
            </Button>
            <Button variant="secondary" size="sm" disabled={pagina >= totalPaginas || cargando} onClick={() => setPagina(pagina + 1)}>
              Siguiente
            </Button>
          </span>
        </div>
      )}
    </div>
  );
};

/** Línea de fases: lo ya recorrido, la fase actual y lo que falta. */
const LineaFases: React.FC<{ fase: FaseExpediente }> = ({ fase }) => {
  const concluido = fase === 'CONCLUIDO';
  const actual = PASOS_FASE.findIndex((p) => p.id === fase);
  return (
    <ol className="flex items-center gap-[4px] flex-wrap list-none m-0 p-0" aria-label="Fases del expediente">
      {PASOS_FASE.map((p, i) => {
        const estado = concluido || i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente';
        return (
          <li key={p.id} className="flex items-center gap-[4px]">
            <span
              className={cn(
                'inline-flex items-center gap-[4px] rounded-[999px] py-[2px] px-[9px] text-[11px]',
                estado === 'actual' && 'bg-primary-600 text-white font-bold',
                estado === 'hecho' && 'bg-success-bg text-success font-medium',
                estado === 'pendiente' && 'bg-bg-hover text-text-light',
              )}
            >
              {estado === 'hecho' && <CheckIcon size={10} />}
              {p.etiqueta}
            </span>
            {i < PASOS_FASE.length - 1 && <span className="w-[10px] h-px bg-border-dark" />}
          </li>
        );
      })}
      {concluido && <li className="ml-[6px] text-[11px] font-bold text-success">Concluido</li>}
    </ol>
  );
};

/** Una línea de plazo: qué es, la fecha límite y cuánto falta (con el color del riesgo). */
const LineaPlazo: React.FC<{ a: Alerta }> = ({ a }) => {
  const meta = NIVEL_META[a.nivel];
  return (
    <li className="flex items-start gap-[8px] text-[12.5px]">
      <span className={cn('mt-[5px] w-[8px] h-[8px] rounded-full shrink-0', meta.barra)} />
      <span className="min-w-0">
        <span className="font-semibold text-text-main">{a.titulo}</span>
        {a.plazoLimite && <span className="text-text-secondary"> · {formatearFecha(a.plazoLimite)}</span>}
        {a.restanteTexto && <span className={cn('font-medium', meta.texto)}> · {a.restanteTexto}</span>}
      </span>
    </li>
  );
};

const TarjetaExpediente: React.FC<{ e: ExpedienteConAlertas }> = ({ e }) => {
  const navigate = useNavigate();
  const meta = GRUPO_META[e.grupo];
  const p = e.principal;
  const conPlazo = e.alertas.filter((a) => a.plazoLimite || a.restanteTexto);

  return (
    <article className="relative bg-white rounded-[12px] border border-border shadow-xs overflow-hidden">
      <span className={cn('absolute left-0 top-0 bottom-0 w-[5px]', meta.barra)} />
      <div className="py-[16px] pl-[24px] pr-[18px] flex flex-col gap-[12px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <h3 className="text-[15px] font-extrabold text-text-main tabular-nums m-0">{e.numeroExpediente}</h3>
          <span className={cn(CHIP_BASE, 'py-[1px] px-[8px] text-[11px]', meta.chip)}>{meta.etiqueta}</span>
          {e.pagado && <Badge variant="success">Pagado</Badge>}
          <span className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => navigate(`/${p.modulo}`)}>
            Ir a {ETIQUETA_MODULO[p.modulo] ?? 'el módulo'} <ArrowRightIcon size={14} />
          </Button>
        </div>

        <div>
          <LineaFases fase={e.fase} />
          <p className="text-[12px] text-text-muted mt-[6px] mb-0">{e.faseDetalle}</p>
        </div>

        <div className="grid grid-cols-[1.1fr_1fr] gap-[20px] max-md:grid-cols-1 pt-[12px] border-t border-border-subtle">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-text-light mb-[4px]">{p.categoria === 'ESPERA' ? 'Qué sigue' : 'Qué toca'}</div>
            <div className="text-[15px] font-bold text-text-main leading-[1.3]">{p.accion}</div>
            {p.desdeDias !== null ? (
              <div className={cn('text-[12.5px] font-medium mt-[3px]', meta.texto)}>Esperando acción desde {haceDias(p.desdeDias)}</div>
            ) : (
              <div className="text-[12.5px] text-text-muted mt-[3px] leading-[1.35]">{p.detalle}</div>
            )}
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-text-light mb-[4px]">Plazos</div>
            {conPlazo.length > 0 ? (
              <ul className="list-none m-0 p-0 flex flex-col gap-[6px]">
                {conPlazo.map((a) => (
                  <LineaPlazo key={a.clave} a={a} />
                ))}
              </ul>
            ) : (
              <div className="text-[12.5px] text-text-muted">Sin plazo corriendo: está pendiente de tu acción.</div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
