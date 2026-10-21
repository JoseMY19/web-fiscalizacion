import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button } from '../../components/common/Common';
import { Buscador, SegmentedTabs, type PestanaItem } from '../../components/common/PageKit';
import { RefreshCwIcon } from '../../components/icons/Icons';
import { AlertasApi, FaseExpediente, ResultadoExpedientes } from '../../api/alertas';
import { cn } from '../../lib/cn';
import { FASES, GRUPOS, GRUPO_META, VISTA_META, type VistaAlertas } from './alertasUi';
import { TarjetaExpediente } from './TarjetaExpediente';
import { TodoAlDia } from '../../components/common/TodoAlDia';
import { EsqueletoTarjetas } from '../../components/common/EsqueletoTarjetas';
import { SelectorOpciones } from '../../components/common/SelectorOpciones';

const POR_PAGINA = 10;

// ============================================================================
// PÁGINA DE ALERTAS Y PLAZOS
// ============================================================================
/**
 * Alertas y plazos: pestañas de filtro con contadores (por defecto, lo que pide
 * atención; "En seguimiento" guarda los plazos largos sin riesgo para que no
 * hagan ruido) y una tarjeta por expediente: en qué fase está, qué toca hacer,
 * desde cuándo espera y qué plazos corren.
 */
export const AlertasView: React.FC = () => {
  const [vista, setVista] = useState<VistaAlertas>('ATENCION');
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

  const elegirVista = (v: VistaAlertas) => {
    setVista(v);
    setPagina(1);
  };

  const grupos = datos?.grupos;
  const atencion = grupos ? grupos.URGENTE + grupos.POR_VENCER + grupos.ACTUAR : undefined;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.porPagina)) : 1;
  const ayuda = vista === 'ATENCION' ? 'Expedientes con un plazo en riesgo o listos para dar el siguiente paso.' : `${GRUPO_META[vista].descripcion}.`;
  // Los grupos de riesgo con expedientes pintan su contador en rojo o ámbar.
  const pestanas: PestanaItem<VistaAlertas>[] = [
    { clave: 'ATENCION', etiqueta: VISTA_META.ATENCION.etiqueta, contador: atencion },
    ...GRUPOS.map((g) => ({
      clave: g as VistaAlertas,
      etiqueta: VISTA_META[g].etiqueta,
      contador: grupos?.[g],
      tono: (grupos?.[g] ?? 0) > 0 ? VISTA_META[g].tono : undefined,
    })),
  ];

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Cabecera */}
      <header className="flex items-end justify-between gap-[16px] flex-wrap animate-aparecer">
        <div className="min-w-0 max-w-[720px]">
          <p className="text-[12px] font-bold uppercase tracking-[1.6px] text-blue-800 m-0">Centro de alertas</p>
          <h1 className="text-[30px] font-bold text-text-main tracking-[-0.8px] leading-[1.15] mt-[6px] mb-0">Alertas y Plazos</h1>
          <p className="text-[14px] text-text-muted mt-[6px] mb-0 leading-[1.5]">
            En qué fase está cada expediente, qué toca hacer y qué plazos corren. Solo ves lo de los módulos a los que tienes acceso.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={cargando} onClick={cargar}>
          Actualizar
        </Button>
      </header>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filtros por grupo */}
      <div className="animate-aparecer [animation-delay:120ms]">
        <SegmentedTabs<VistaAlertas> items={pestanas} activa={vista} onChange={elegirVista} />
      </div>

      {/* Búsqueda y fase */}
      <div className="flex items-center justify-between gap-[12px] flex-wrap py-[12px] px-[16px] rounded-lg bg-bg-card border border-border shadow-xs animate-aparecer [animation-delay:250ms]">
        <p key={vista} className="text-[13px] text-text-muted m-0 animate-aparecer [animation-duration:300ms]">
          <span className="font-bold text-text-main">{VISTA_META[vista].etiqueta}:</span> {ayuda}
        </p>
        <div className="flex items-center gap-[10px] flex-wrap">
          <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar N° de expediente" />
          <SelectorOpciones
            etiqueta="Fase del expediente"
            className="w-[230px]! max-w-full rounded-pill! pl-[10px]!"
            valor={fase}
            onCambio={(v) => {
              setFase(v as FaseExpediente | '');
              setPagina(1);
            }}
            // Las fases van numeradas en el orden en que avanza el trámite.
            opciones={[{ valor: '', etiqueta: 'Todas las fases', insignia: '∗' }, ...FASES.map((f, i) => ({ valor: f.id, etiqueta: f.etiqueta, insignia: String(i + 1) }))]}
          />
        </div>
      </div>

      {/* Lista de expedientes */}
      {cargando && !datos ? (
        <EsqueletoTarjetas alto={108} />
      ) : datos && datos.items.length === 0 ? (
        <div className="rounded-lg bg-bg-card border border-dashed border-border-dark py-[24px]">
          <TodoAlDia
            titulo={vista === 'ATENCION' ? 'Nada requiere atención ahora' : 'No hay expedientes en esta pestaña'}
            descripcion={
              vista === 'ATENCION'
                ? 'No hay plazos con riesgo ni expedientes listos para actuar. Los plazos sin riesgo están en "En seguimiento".'
                : 'Prueba con otra pestaña, otra fase o limpia la búsqueda.'
            }
          />
        </div>
      ) : (
        <div className={cn('flex flex-col gap-[12px] [transition:opacity_200ms]', cargando && 'opacity-60')}>
          {(datos?.items ?? []).map((e, i) => (
            <TarjetaExpediente key={e.clave} expediente={e} indice={i} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {datos && datos.total > POR_PAGINA && (
        <div className="flex items-center justify-between gap-[12px] flex-wrap text-[12.5px] text-text-muted">
          <span>
            Página <span className="font-bold text-text-main">{pagina}</span> de {totalPaginas} · {datos.total} expedientes
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
