import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, EmptyState, Spinner } from '../../components/common/Common';
import { ArrowRightIcon, CheckCircleIcon, RefreshCwIcon, SearchIcon } from '../../components/icons/Icons';
import { Alerta, AlertasApi, ExpedienteConAlertas, FaseExpediente, GrupoAlerta, ResultadoExpedientes } from '../../api/alertas';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { ETIQUETA_MODULO, FASES, GRUPOS, GRUPO_META, NIVEL_META, PASOS_FASE, haceDias } from './alertasUi';

const POR_PAGINA = 10;
const CONTROL = 'h-[38px] px-[12px] text-[13px] rounded-sm border border-border bg-white text-text-main outline-none focus:border-primary-500';

type Vista = GrupoAlerta | 'ATENCION';

const VARIANTE_GRUPO: Record<GrupoAlerta, 'danger' | 'warning' | 'info' | 'neutral'> = {
  URGENTE: 'danger',
  POR_VENCER: 'warning',
  ACTUAR: 'info',
  SEGUIMIENTO: 'neutral',
};

/**
 * Alertas y plazos, con la misma estructura que los demás módulos: título,
 * pestañas con contadores y una tabla con una fila por expediente (en qué fase
 * está, qué toca hacer, desde cuándo espera y qué plazos corren). Por defecto
 * muestra lo que pide atención; "En seguimiento" guarda los plazos largos sin
 * riesgo para que no hagan ruido.
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

  const elegirVista = (v: Vista) => {
    setVista(v);
    setPagina(1);
  };

  const grupos = datos?.grupos;
  const atencion = grupos ? grupos.URGENTE + grupos.POR_VENCER + grupos.ACTUAR : undefined;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.porPagina)) : 1;
  const ayuda = vista === 'ATENCION' ? 'Expedientes con un plazo en riesgo o listos para dar el siguiente paso.' : `${GRUPO_META[vista].descripcion}.`;

  const pestanas: { clave: Vista; titulo: string; cantidad: number | undefined }[] = [
    { clave: 'ATENCION', titulo: 'Requieren atención', cantidad: atencion },
    ...GRUPOS.map((g) => ({ clave: g as Vista, titulo: GRUPO_META[g].etiqueta, cantidad: grupos?.[g] })),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-[20px] gap-[12px] flex-wrap">
        <div>
          <h2 className="text-[18px] font-extrabold text-midnight-900">Alertas y Plazos</h2>
          <p className="text-[13px] text-text-muted mt-[2px] max-w-[760px]">
            En qué fase está cada expediente, qué toca hacer y qué plazos corren. Solo ves lo de los módulos a los que tienes acceso.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={cargando} onClick={cargar}>
          Actualizar
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="flex gap-[4px] border-b border-b-border mb-0 overflow-x-auto">
        {pestanas.map((p) => {
          const activa = p.clave === vista;
          const cantidad = p.cantidad ?? 0;
          return (
            <button
              key={p.clave}
              onClick={() => elegirVista(p.clave)}
              className={cn(
                'py-[10px] px-[16px] text-[13px] font-bold border-0 bg-transparent cursor-pointer flex items-center gap-[8px] border-b-2 whitespace-nowrap',
                activa ? 'border-b-primary-600 text-primary-600' : 'border-b-transparent text-text-muted',
              )}
            >
              {p.titulo}
              <Badge variant={p.clave !== 'ATENCION' && cantidad > 0 ? VARIANTE_GRUPO[p.clave] : activa ? 'info' : 'neutral'}>{p.cantidad ?? '–'}</Badge>
            </button>
          );
        })}
      </div>

      <Card className="rounded-tl-none! rounded-tr-none! border-t-0!">
        <div className="flex items-center gap-[10px] flex-wrap mb-[12px]">
          <p className="text-[12px] text-text-muted m-0 flex-1 min-w-[240px]">{ayuda}</p>
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

        {cargando && !datos ? (
          <div className="p-[40px] text-center">
            <Spinner size={32} />
          </div>
        ) : datos && datos.items.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
            title={vista === 'ATENCION' ? 'Nada requiere atención ahora' : 'No hay expedientes en esta pestaña'}
            description={
              vista === 'ATENCION'
                ? 'No hay plazos con riesgo ni expedientes listos para actuar. Los plazos sin riesgo están en "En seguimiento".'
                : 'Prueba con otra pestaña, otra fase o limpia la búsqueda.'
            }
          />
        ) : (
          <TablaExpedientes items={datos?.items ?? []} />
        )}

        {datos && datos.total > POR_PAGINA && (
          <div className="mt-[14px] flex items-center justify-between text-[12px] text-text-muted">
            <span>
              Página {pagina} de {totalPaginas} · {datos.total} expedientes
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
      </Card>
    </div>
  );
};

/** Avance del expediente en 7 tramos: lo recorrido, la fase actual y lo que falta. */
const BarraFases: React.FC<{ fase: FaseExpediente }> = ({ fase }) => {
  const concluido = fase === 'CONCLUIDO';
  const actual = PASOS_FASE.findIndex((p) => p.id === fase);
  return (
    <div className="flex items-center gap-[3px] mt-[5px]" aria-hidden="true">
      {PASOS_FASE.map((p, i) => {
        const estado = concluido || i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente';
        return (
          <span
            key={p.id}
            title={p.etiqueta}
            className={cn('h-[4px] w-[18px] rounded-full', estado === 'hecho' && 'bg-success', estado === 'actual' && 'bg-primary-600', estado === 'pendiente' && 'bg-border')}
          />
        );
      })}
    </div>
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

const TablaExpedientes: React.FC<{ items: ExpedienteConAlertas[] }> = ({ items }) => {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px] text-left">
        <thead>
          <tr className="bg-[#f8fafc] border-b border-b-border">
            <th className="py-[10px] px-[14px] font-bold">Expediente</th>
            <th className="py-[10px] px-[14px] font-bold">Fase</th>
            <th className="py-[10px] px-[14px] font-bold">Qué toca</th>
            <th className="py-[10px] px-[14px] font-bold">Plazos</th>
            <th className="py-[10px] px-[14px] font-bold">Estado</th>
            <th className="py-[10px] px-[14px]"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => {
            const meta = GRUPO_META[e.grupo];
            const p = e.principal;
            const conPlazo = e.alertas.filter((a) => a.plazoLimite || a.restanteTexto);
            return (
              <tr key={e.clave} className="border-b border-b-border align-top hover:bg-bg-subtle">
                <td className="py-[12px] px-[14px] whitespace-nowrap">
                  <div className="font-bold text-midnight-900 tabular-nums">{e.numeroExpediente}</div>
                  {e.pagado && (
                    <div className="mt-[4px]">
                      <Badge variant="success">Pagado</Badge>
                    </div>
                  )}
                </td>
                <td className="py-[12px] px-[14px] min-w-[170px]">
                  <div className="font-semibold text-text-secondary">{FASES.find((f) => f.id === e.fase)?.etiqueta ?? e.fase}</div>
                  <BarraFases fase={e.fase} />
                  <div className="text-[11px] text-text-muted mt-[4px]">{e.faseDetalle}</div>
                </td>
                <td className="py-[12px] px-[14px] min-w-[200px]">
                  {p.categoria === 'ESPERA' && <div className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-text-light">En espera</div>}
                  <div className="font-bold text-midnight-900">{p.accion}</div>
                  {p.desdeDias !== null ? (
                    <div className={cn('text-[11.5px] font-medium mt-[2px]', meta.texto)}>Esperando acción desde {haceDias(p.desdeDias)}</div>
                  ) : (
                    <div className="text-[11.5px] text-text-muted mt-[2px] leading-[1.35]">{p.detalle}</div>
                  )}
                </td>
                <td className="py-[12px] px-[14px] min-w-[240px]">
                  {conPlazo.length > 0 ? (
                    <ul className="list-none m-0 p-0 flex flex-col gap-[6px]">
                      {conPlazo.map((a) => (
                        <LineaPlazo key={a.clave} a={a} />
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[12px] text-text-muted">Sin plazo corriendo</span>
                  )}
                </td>
                <td className="py-[12px] px-[14px] whitespace-nowrap">
                  <Badge variant={VARIANTE_GRUPO[e.grupo]}>{meta.etiqueta}</Badge>
                </td>
                <td className="py-[12px] px-[14px] text-right whitespace-nowrap">
                  <Button size="sm" onClick={() => navigate(`/${p.modulo}`)}>
                    Ir a {ETIQUETA_MODULO[p.modulo] ?? 'el módulo'} <ArrowRightIcon size={14} />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
