import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/common/Common';
import { ArrowRightIcon } from '../../components/icons/Icons';
import type { Alerta, ExpedienteConAlertas, FaseExpediente } from '../../api/alertas';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { CHIP_BASE, ETIQUETA_MODULO, FASES, GRUPO_META, NIVEL_META, PASOS_FASE, haceDias } from './alertasUi';

const ETIQUETA_COLUMNA = 'block text-[10.5px] font-bold uppercase tracking-[1px] text-text-light mb-[6px]';

/** Avance del expediente en 7 tramos: lo recorrido, la fase actual (late) y lo que falta. */
const BarraFases: React.FC<{ fase: FaseExpediente }> = ({ fase }) => {
  const concluido = fase === 'CONCLUIDO';
  const actual = PASOS_FASE.findIndex((p) => p.id === fase);
  return (
    <div className="flex items-center gap-[3px] mt-[8px]" aria-hidden="true">
      {PASOS_FASE.map((p, i) => {
        const estado = concluido || i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente';
        return (
          <span
            key={p.id}
            title={p.etiqueta}
            className={cn(
              'h-[6px] flex-1 max-w-[26px] rounded-full',
              estado === 'hecho' && 'bg-success',
              estado === 'actual' && 'bg-blue-800 animate-pulse motion-reduce:animate-none',
              estado === 'pendiente' && 'bg-border',
            )}
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
        {a.restanteTexto && <span className={cn('font-semibold', meta.texto)}> · {a.restanteTexto}</span>}
      </span>
    </li>
  );
};

/**
 * Un expediente con sus alertas: número y grupo de riesgo, fase con su avance,
 * qué toca hacer, los plazos que corren y el acceso directo al módulo.
 */
export const TarjetaExpediente: React.FC<{ expediente: ExpedienteConAlertas; indice: number }> = ({ expediente: e, indice }) => {
  const navigate = useNavigate();
  const meta = GRUPO_META[e.grupo];
  const p = e.principal;
  const conPlazo = e.alertas.filter((a) => a.plazoLimite || a.restanteTexto);

  return (
    <article
      style={{ animationDelay: `${Math.min(indice, 8) * 50}ms` }}
      className={cn(
        'relative overflow-hidden rounded-lg bg-bg-card border border-border shadow-xs pl-[24px] pr-[20px] py-[18px]',
        'grid gap-[20px] grid-cols-1 md:grid-cols-2 xl:grid-cols-[170px_200px_minmax(0,1fr)_minmax(0,1.15fr)_230px] xl:items-start',
        '[transition:transform_250ms_cubic-bezier(0.2,0.8,0.2,1),box-shadow_250ms,border-color_250ms] hover:-translate-y-[2px] hover:shadow-md hover:border-border-dark',
        'animate-aparecer',
      )}
    >
      {/* Barra lateral con el color del riesgo */}
      <span aria-hidden className={cn('absolute left-0 top-0 bottom-0 w-[4px]', meta.barra)} />

      {/* Expediente */}
      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Expediente</span>
        <div className="font-display text-[16px] font-bold text-text-main tabular-nums">{e.numeroExpediente}</div>
        <div className="mt-[8px] flex items-center gap-[6px] flex-wrap">
          <span className={cn(CHIP_BASE, 'py-[2px] px-[9px] text-[11.5px]', meta.chip)}>{meta.etiqueta}</span>
          {e.pagado && <Badge variant="success">Pagado</Badge>}
        </div>
      </div>

      {/* Fase */}
      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Fase</span>
        <div className="text-[13.5px] font-bold text-text-secondary">{FASES.find((f) => f.id === e.fase)?.etiqueta ?? e.fase}</div>
        <BarraFases fase={e.fase} />
        <div className="text-[12px] text-text-muted mt-[8px] leading-[1.4]">{e.faseDetalle}</div>
      </div>

      {/* Qué toca */}
      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>{p.categoria === 'ESPERA' ? 'En espera' : 'Qué toca'}</span>
        <div className="text-[13.5px] font-bold text-text-main">{p.accion}</div>
        {p.desdeDias !== null ? (
          <div className={cn('text-[12px] font-semibold mt-[4px]', meta.texto)}>Esperando acción desde {haceDias(p.desdeDias)}</div>
        ) : (
          <div className="text-[12px] text-text-muted mt-[4px] leading-[1.4]">{p.detalle}</div>
        )}
      </div>

      {/* Plazos */}
      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Plazos</span>
        {conPlazo.length > 0 ? (
          <ul className="list-none m-0 p-0 flex flex-col gap-[8px]">
            {conPlazo.map((a) => (
              <LineaPlazo key={a.clave} a={a} />
            ))}
          </ul>
        ) : (
          <span className="text-[12px] text-text-muted">Sin plazo corriendo</span>
        )}
      </div>

      {/* Acción */}
      <div className="flex md:col-span-2 xl:col-span-1 xl:justify-end xl:self-center">
        <button
          type="button"
          onClick={() => navigate(`/${p.modulo}`)}
          className="group inline-flex items-center gap-[8px] h-[38px] px-[16px] rounded-pill border border-blue-100 bg-blue-50 text-blue-800 text-[12.5px] font-bold cursor-pointer whitespace-nowrap [transition:background-color_200ms,color_200ms,border-color_200ms] hover:bg-blue-800 hover:border-blue-800 hover:text-white"
        >
          Ir a {ETIQUETA_MODULO[p.modulo] ?? 'el módulo'}
          <span className="[transition:transform_200ms] group-hover:translate-x-[3px]">
            <ArrowRightIcon size={14} />
          </span>
        </button>
      </div>
    </article>
  );
};
