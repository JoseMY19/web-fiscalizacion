import React from 'react';
import type { ExpedienteRecursos } from '../../api';
import { PagadoBadge } from '../../components/common/PagadoBadge';
import {
  BARRA_LATERAL,
  BARRA_POR_VARIANTE,
  BOTON_PILDORA,
  CHIP_BLOQUE,
  CHIP_POR_VARIANTE,
  CLASE_TARJETA_BANDEJA,
  ETIQUETA_COLUMNA,
  retrasoEntrada,
} from '../../components/common/estilosBandeja';
import { ClockIcon, EyeIcon, ScaleIcon } from '../../components/icons/Icons';
import { cn } from '../../lib/cn';
import { LABEL_SITUACION, textoPlazoRecurso, textoUltimoActo, varianteSituacion } from './recursosUi';

/**
 * Un expediente en la bandeja de recursos: número y administrado, el último
 * acto recurrible, la situación del recurso, el plazo para recurrir (si corre)
 * y el acceso al panel de pasos.
 */
export const TarjetaRecurso: React.FC<{
  recurso: ExpedienteRecursos;
  indice: number;
  onVer: () => void;
}> = ({ recurso: f, indice, onVer }) => {
  const variante = varianteSituacion(f.situacion);
  const plazo = f.situacion === 'PLAZO_ABIERTO' || f.situacion === 'PLAZO_VENCIDO' ? textoPlazoRecurso(f) : null;

  return (
    <article
      style={retrasoEntrada(indice)}
      className={cn(CLASE_TARJETA_BANDEJA, 'md:grid-cols-2 xl:grid-cols-[minmax(230px,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]')}
    >
      <span aria-hidden className={cn(BARRA_LATERAL, plazo?.urgente ? 'bg-danger' : BARRA_POR_VARIANTE[variante])} />

      {/* Expediente */}
      <div className="min-w-0 flex items-start gap-[12px]">
        <span className="w-[38px] h-[38px] rounded-md bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
          <ScaleIcon size={18} />
        </span>
        <div className="min-w-0">
          <span className={ETIQUETA_COLUMNA}>Expediente</span>
          <button
            type="button"
            onClick={onVer}
            className="block text-left whitespace-nowrap bg-transparent border-0 p-0 font-display text-[16px] font-bold text-blue-800 cursor-pointer tabular-nums hover:underline underline-offset-4"
          >
            {f.numeroExpediente}
          </button>
          {f.administrado && <div className="text-[12px] text-text-muted mt-[3px] font-medium truncate">{f.administrado}</div>}
        </div>
      </div>

      {/* Último acto */}
      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Último acto</span>
        <p className="m-0 text-[12.5px] text-text-secondary leading-[1.45]">{textoUltimoActo(f)}</p>
      </div>

      {/* Situación */}
      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Situación</span>
        <div className="flex flex-col items-start gap-[6px]">
          <span className={cn(CHIP_BLOQUE, CHIP_POR_VARIANTE[variante])}>{LABEL_SITUACION[f.situacion]}</span>
          <PagadoBadge tienePago={f.tienePago} montoPagado={f.pago?.montoPagado} fechaPago={f.pago?.fechaPago} />
        </div>
      </div>

      {/* Plazo para recurrir */}
      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Plazo para recurrir</span>
        {plazo ? (
          <span className={cn('inline-flex items-start gap-[5px] text-[12.5px] font-semibold leading-[1.4]', plazo.urgente ? 'text-danger' : 'text-text-secondary')}>
            <span className="mt-[2px] flex">
              <ClockIcon size={13} />
            </span>
            {plazo.texto}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </div>

      {/* Acción */}
      <div className="flex items-center md:col-span-2 xl:col-span-1 xl:justify-end">
        <button type="button" onClick={onVer} className={BOTON_PILDORA}>
          <EyeIcon size={14} /> Ver expediente
        </button>
      </div>
    </article>
  );
};
