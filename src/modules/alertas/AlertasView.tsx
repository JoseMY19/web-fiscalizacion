import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, Spinner } from '../../components/common/Common';
import { CheckCircleIcon, RefreshCwIcon, SearchIcon } from '../../components/icons/Icons';
import { Alerta, AlertasApi, CategoriaAlerta, FaseExpediente, NivelAlerta, ResultadoAlertas } from '../../api/alertas';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { CATEGORIA_META, CHIP_BASE, FASES, NIVELES, NIVEL_META } from './alertasUi';

const POR_PAGINA = 15;
const CONTROL = 'h-[38px] px-[12px] text-[13px] rounded-sm border border-border bg-white text-text-main outline-none focus:border-primary-500';

/**
 * Alertas y plazos: todo lo que corre contra el reloj en un solo lugar, con la
 * fase exacta de cada expediente, el plazo límite y el riesgo como leyenda.
 */
export const AlertasView: React.FC = () => {
  const navigate = useNavigate();
  const [nivel, setNivel] = useState<NivelAlerta | ''>('');
  const [categoria, setCategoria] = useState<CategoriaAlerta | ''>('');
  const [fase, setFase] = useState<FaseExpediente | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<ResultadoAlertas | null>(null);
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
    AlertasApi.listar({
      niveles: nivel ? [nivel] : undefined,
      categoria: categoria || undefined,
      fase: fase || undefined,
      busqueda: busquedaAplicada,
      pagina,
      porPagina: POR_PAGINA,
    })
      .then(setDatos)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudieron cargar las alertas.'))
      .finally(() => setCargando(false));
  }, [nivel, categoria, fase, busquedaAplicada, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarFiltro = <T,>(set: (v: T) => void) => (valor: T) => {
    set(valor);
    setPagina(1);
  };

  const resumen = datos?.resumen;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.porPagina)) : 1;

  return (
    <div>
      <div className="flex items-start justify-between gap-[16px] flex-wrap mb-[20px]">
        <div>
          <h2 className="text-[22px] font-extrabold text-text-main tracking-[-0.3px] m-0">Alertas y Plazos</h2>
          <p className="text-[13px] text-text-muted mt-[4px] m-0">
            Qué vence, en qué fase está cada expediente y qué riesgo tiene. Solo ves lo de los módulos a los que tienes acceso.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={cargando} onClick={cargar}>
          Actualizar
        </Button>
      </div>

      {/* Leyenda de riesgo: cada nivel es también un filtro. */}
      <div className="bg-white rounded-[12px] border border-border shadow-xs p-[16px] mb-[16px]">
        <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-text-muted mb-[10px]">Leyenda de riesgo</div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[10px]">
          {NIVELES.map((n) => {
            const meta = NIVEL_META[n];
            const activo = nivel === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => cambiarFiltro(setNivel)(activo ? '' : n)}
                className={cn(
                  'text-left rounded-[10px] border p-[10px] cursor-pointer bg-white hover:bg-bg-subtle',
                  activo ? 'border-primary-600 shadow-[0_0_0_2px_rgba(37,99,235,0.15)]' : 'border-border',
                )}
              >
                <span className="flex items-center justify-between gap-[8px]">
                  <span className={cn(CHIP_BASE, 'py-[2px] px-[8px] text-[11.5px]', meta.chip)}>{meta.etiqueta}</span>
                  <span className="text-[18px] font-extrabold text-text-main tabular-nums">{resumen?.porNivel[n] ?? '–'}</span>
                </span>
                <span className="block text-[12px] text-text-muted mt-[6px]">{meta.descripcion}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-[12px] flex gap-[16px] flex-wrap text-[12px] text-text-muted">
          {(Object.keys(CATEGORIA_META) as CategoriaAlerta[]).map((c) => (
            <span key={c}>
              <strong className="text-text-secondary">{CATEGORIA_META[c].etiqueta}:</strong> {CATEGORIA_META[c].ayuda}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-border shadow-xs overflow-hidden">
        <div className="py-[14px] px-[20px] border-b border-border bg-[#fafbfc] flex items-center gap-[10px] flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-[320px]">
            <span className="absolute left-[10px] top-1/2 -translate-y-1/2 text-text-light flex">
              <SearchIcon size={15} />
            </span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por N° de expediente"
              className={cn(CONTROL, 'w-full pl-[32px]')}
            />
          </div>
          <select value={fase} onChange={(e) => cambiarFiltro(setFase)(e.target.value as FaseExpediente | '')} className={CONTROL}>
            <option value="">Todas las fases</option>
            {FASES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.etiqueta}
              </option>
            ))}
          </select>
          <select value={categoria} onChange={(e) => cambiarFiltro(setCategoria)(e.target.value as CategoriaAlerta | '')} className={CONTROL}>
            <option value="">Todo tipo de plazo</option>
            {(Object.keys(CATEGORIA_META) as CategoriaAlerta[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_META[c].etiqueta}
              </option>
            ))}
          </select>
          <span className="ml-auto text-[12px] text-text-muted">{datos ? `${datos.total} alerta${datos.total === 1 ? '' : 's'}` : ''}</span>
        </div>

        {error && (
          <div className="p-[16px]">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {cargando && !datos ? (
          <div className="py-[48px] flex justify-center">
            <Spinner size={28} />
          </div>
        ) : datos && datos.items.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
            title="Sin alertas con estos filtros"
            description="No hay plazos corriendo que coincidan con lo que buscas."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] text-left">
              <thead>
                <tr className="bg-bg-subtle border-b border-border text-[11px] uppercase tracking-[0.5px] text-text-muted">
                  <th className="py-[10px] px-[16px] font-bold">N° Expediente</th>
                  <th className="py-[10px] px-[16px] font-bold">Fase actual</th>
                  <th className="py-[10px] px-[16px] font-bold">Qué vence</th>
                  <th className="py-[10px] px-[16px] font-bold">Plazo límite</th>
                  <th className="py-[10px] px-[16px] font-bold">Riesgo</th>
                  <th className="py-[10px] px-[16px]" />
                </tr>
              </thead>
              <tbody>
                {datos?.items.map((a) => (
                  <FilaAlerta key={a.clave} a={a} onAbrir={() => navigate(`/${a.modulo}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {datos && datos.total > POR_PAGINA && (
          <div className="py-[12px] px-[20px] border-t border-border flex items-center justify-between text-[12px] text-text-muted">
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
    </div>
  );
};

const FilaAlerta: React.FC<{ a: Alerta; onAbrir: () => void }> = ({ a, onAbrir }) => {
  const meta = NIVEL_META[a.nivel];
  return (
    <tr className="border-b border-border-subtle align-top hover:bg-bg-subtle">
      <td className="py-[12px] px-[16px] font-bold text-text-main whitespace-nowrap">
        {a.numeroExpediente}
        {a.pagado && (
          <span className="block mt-[4px]">
            <Badge variant="success">Pagado</Badge>
          </span>
        )}
      </td>
      <td className="py-[12px] px-[16px] min-w-[220px]">
        <span className="block font-semibold text-text-main">{a.faseEtiqueta}</span>
        <span className="block text-[12px] text-text-muted leading-[1.35]">{a.faseDetalle}</span>
      </td>
      <td className="py-[12px] px-[16px] min-w-[220px]">
        <span className="block font-semibold text-text-main">{a.titulo}</span>
        <span className="block text-[12px] text-text-muted leading-[1.35]">{a.detalle}</span>
        <span className="block text-[11px] text-text-light mt-[2px]">{CATEGORIA_META[a.categoria].etiqueta}</span>
      </td>
      <td className="py-[12px] px-[16px] whitespace-nowrap">
        {a.plazoLimite ? <span className="block font-semibold text-text-main">{formatearFecha(a.plazoLimite)}</span> : <span className="text-text-light">—</span>}
        {a.restanteTexto && <span className="block text-[12px] text-text-muted">{a.restanteTexto}</span>}
      </td>
      <td className="py-[12px] px-[16px]">
        <span className={cn(CHIP_BASE, 'py-[2px] px-[8px] text-[11.5px]', meta.chip)}>{meta.etiqueta}</span>
      </td>
      <td className="py-[12px] px-[16px] text-right">
        <Button variant="outline" size="sm" onClick={onAbrir}>
          Abrir módulo
        </Button>
      </td>
    </tr>
  );
};
