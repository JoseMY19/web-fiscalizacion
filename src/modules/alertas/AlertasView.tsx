import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, Spinner } from '../../components/common/Common';
import { Buscador, PageHeader, PanelTabla, SegmentedTabs, TABLA, type TonoContador } from '../../components/common/PageKit';
import { ArrowRightIcon, CheckCircleIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { Alerta, AlertasApi, ExpedienteConAlertas, FaseExpediente, GrupoAlerta, ResultadoExpedientes } from '../../api/alertas';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { ETIQUETA_MODULO, FASES, GRUPOS, GRUPO_META, NIVEL_META, PASOS_FASE, haceDias } from './alertasUi';

const POR_PAGINA = 10;
const SELECT = 'h-[38px] px-[12px] text-[13px] rounded-sm border border-border bg-white text-text-main outline-none focus:border-primary-500';

type Vista = GrupoAlerta | 'ATENCION';

const VARIANTE_GRUPO: Record<GrupoAlerta, 'danger' | 'warning' | 'info' | 'neutral'> = {
  URGENTE: 'danger',
  POR_VENCER: 'warning',
  ACTUAR: 'info',
  SEGUIMIENTO: 'neutral',
};

const TONO_GRUPO: Record<GrupoAlerta, TonoContador> = {
  URGENTE: 'danger',
  POR_VENCER: 'warning',
  ACTUAR: 'info',
  SEGUIMIENTO: 'neutral',
};

/**
 * Alertas y plazos, con la misma estructura que los demás módulos: cabecera,
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

  const pestanas = [
    { clave: 'ATENCION' as Vista, etiqueta: 'Requieren atención', contador: atencion },
    ...GRUPOS.map((g) => ({
      clave: g as Vista,
      etiqueta: GRUPO_META[g].etiqueta,
      contador: grupos?.[g],
      tono: grupos && grupos[g] > 0 ? TONO_GRUPO[g] : undefined,
    })),
  ];

  return (
    <div>
      <PageHeader
        titulo="Alertas y Plazos"
        descripcion="En qué fase está cada expediente, qué toca hacer y qué plazos corren. Solo ves lo de los módulos a los que tienes acceso."
        acciones={
          <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={cargando} onClick={cargar}>
            Actualizar
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <PanelTabla
        barra={
          <>
            <SegmentedTabs<Vista> items={pestanas} activa={vista} onChange={elegirVista} />
            <div className="flex items-center gap-[10px] flex-wrap">
              <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar N° de expediente" />
              <select
                value={fase}
                onChange={(e) => {
                  setFase(e.target.value as FaseExpediente | '');
                  setPagina(1);
                }}
                className={SELECT}
              >
                <option value="">Todas las fases</option>
                {FASES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </>
        }
      >
        <p className="text-[13px] text-text-muted py-[14px] px-[24px] m-0 border-b border-border">{ayuda}</p>

        {cargando && !datos ? (
          <div className="py-[56px] text-center">
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
          <div className="py-[14px] px-[24px] border-t border-border flex items-center justify-between text-[12px] text-text-muted">
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
      </PanelTabla>
    </div>
  );
};

/** Avance del expediente en 7 tramos: lo recorrido, la fase actual y lo que falta. */
const BarraFases: React.FC<{ fase: FaseExpediente }> = ({ fase }) => {
  const concluido = fase === 'CONCLUIDO';
  const actual = PASOS_FASE.findIndex((p) => p.id === fase);
  return (
    <div className="flex items-center gap-[3px] mt-[6px]" aria-hidden="true">
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
      <table className={TABLA.tabla}>
        <thead>
          <tr className={TABLA.encabezado}>
            <th className={TABLA.th}>Expediente</th>
            <th className={TABLA.th}>Fase</th>
            <th className={TABLA.th}>Qué toca</th>
            <th className={TABLA.th}>Plazos</th>
            <th className={`${TABLA.th} text-right`}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => {
            const meta = GRUPO_META[e.grupo];
            const p = e.principal;
            const conPlazo = e.alertas.filter((a) => a.plazoLimite || a.restanteTexto);
            return (
              <tr key={e.clave} className={TABLA.fila}>
                <td className={cn(TABLA.td, 'whitespace-nowrap align-top!')}>
                  <div className="text-[14px] font-bold text-midnight-900 tabular-nums">{e.numeroExpediente}</div>
                  <div className="mt-[6px] flex items-center gap-[6px]">
                    <Badge variant={VARIANTE_GRUPO[e.grupo]}>{meta.etiqueta}</Badge>
                    {e.pagado && <Badge variant="success">Pagado</Badge>}
                  </div>
                </td>
                <td className={cn(TABLA.td, 'min-w-[180px] align-top!')}>
                  <div className="font-semibold text-text-secondary">{FASES.find((f) => f.id === e.fase)?.etiqueta ?? e.fase}</div>
                  <BarraFases fase={e.fase} />
                  <div className="text-[12px] text-text-muted mt-[6px]">{e.faseDetalle}</div>
                </td>
                <td className={cn(TABLA.td, 'min-w-[220px] align-top!')}>
                  {p.categoria === 'ESPERA' && <div className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-text-light">En espera</div>}
                  <div className="font-bold text-midnight-900">{p.accion}</div>
                  {p.desdeDias !== null ? (
                    <div className={cn('text-[12px] font-medium mt-[3px]', meta.texto)}>Esperando acción desde {haceDias(p.desdeDias)}</div>
                  ) : (
                    <div className="text-[12px] text-text-muted mt-[3px] leading-[1.4]">{p.detalle}</div>
                  )}
                </td>
                <td className={cn(TABLA.td, 'min-w-[240px] align-top!')}>
                  {conPlazo.length > 0 ? (
                    <ul className="list-none m-0 p-0 flex flex-col gap-[8px]">
                      {conPlazo.map((a) => (
                        <LineaPlazo key={a.clave} a={a} />
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[12px] text-text-muted">Sin plazo corriendo</span>
                  )}
                </td>
                <td className={cn(TABLA.td, 'text-right whitespace-nowrap align-top!')}>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/${p.modulo}`)}>
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
