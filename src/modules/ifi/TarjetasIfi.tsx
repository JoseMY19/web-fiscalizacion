import React from 'react';
import type { ExpedienteIfiItem } from '../../api';
import { PagadoBadge } from '../../components/common/PagadoBadge';
import {
  BARRA_LATERAL,
  BOTON_PILDORA,
  CHIP_ESTADO,
  CLASE_TARJETA_BANDEJA,
  ETIQUETA_COLUMNA,
  retrasoEntrada,
} from '../../components/common/estilosBandeja';
import { AlertTriangleIcon, ClockIcon, EyeIcon } from '../../components/icons/Icons';
import { cn } from '../../lib/cn';
import { AvisoRetroaccion } from '../retroaccion/AvisoRetroaccion';
import { textoCaducidad } from '../resoluciones/resolucionUi';
import { calcularPaso, chipEstadoIfi, esUrgenteIfi, labelEstadoIfi } from './ifiUi';

/** Avance en tramos: los hechos en rosa, el actual latiendo y los que faltan en gris. */
const BarraPasos: React.FC<{ pasoNumero: number; totalPasos: number; vicio: boolean }> = ({ pasoNumero, totalPasos, vicio }) => (
  <div className="flex items-center gap-[3px] mt-[8px]" aria-hidden="true">
    {Array.from({ length: totalPasos }, (_, i) => (
      <span
        key={i}
        className={cn(
          'h-[6px] flex-1 max-w-[26px] rounded-full',
          i < pasoNumero - 1 && (vicio ? 'bg-red-800' : 'bg-blue-800'),
          i === pasoNumero - 1 && cn(vicio ? 'bg-red-800' : 'bg-blue-800', 'animate-pulse motion-reduce:animate-none'),
          i > pasoNumero - 1 && 'bg-border',
        )}
      />
    ))}
  </div>
);

// ============================================================================
// EN INSTRUCCIÓN
// ============================================================================
export const TarjetaIfi: React.FC<{
  expediente: ExpedienteIfiItem;
  indice: number;
  onVer: () => void;
}> = ({ expediente: e, indice, onVer }) => {
  const { pasoActualLabel, totalPasos, pasoNumero } = calcularPaso(e);
  const esCaminoVicio = e.imputacionCorrecta === false;
  const caducidad = textoCaducidad(e.diasParaCaducidad);
  const urgente = esUrgenteIfi(e);

  return (
    <article
      style={retrasoEntrada(indice)}
      className={cn(CLASE_TARJETA_BANDEJA, 'md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_340px]', e.alertaAmpliacion && 'bg-danger-bg/40')}
    >
      {/* Rojo si el plazo apremia; rosa en el curso normal */}
      <span aria-hidden className={cn(BARRA_LATERAL, urgente ? 'bg-danger' : 'bg-blue-800')} />

      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Expediente</span>
        <button
          type="button"
          onClick={onVer}
          className="bg-transparent border-0 p-0 font-display text-[16px] font-bold text-blue-800 cursor-pointer tabular-nums hover:underline underline-offset-4"
        >
          {e.numeroExpediente}
        </button>
        {e.tienePago && (
          <div className="mt-[6px]">
            <PagadoBadge tienePago montoPagado={e.montoPagado} fechaPago={e.fechaPago} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Estado IFI</span>
        <span className={cn(CHIP_ESTADO, chipEstadoIfi(e))}>{labelEstadoIfi(e)}</span>
      </div>

      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Avance</span>
        <div className={cn('text-[12.5px] font-semibold', esCaminoVicio ? 'text-red-800' : 'text-text-secondary')}>
          Paso {pasoNumero} de {totalPasos}: <span className="text-text-main">{pasoActualLabel}</span>
        </div>
        <BarraPasos pasoNumero={pasoNumero} totalPasos={totalPasos} vicio={esCaminoVicio} />
        {esCaminoVicio && <div className="text-[11px] text-red-800 mt-[4px]">Camino de archivo por vicio trascendente</div>}
      </div>

      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Plazo</span>
        {caducidad ? (
          <span className={cn('inline-flex items-center gap-[5px] text-[12.5px] font-semibold', caducidad.urgente ? 'text-danger' : 'text-text-secondary')}>
            <ClockIcon size={13} /> {caducidad.texto}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
        {(e.ampliacionEstado === 'EMITIDA' || e.ampliacionEstado === 'NOTIFICADA') && (
          <div className="text-[11px] text-text-muted mt-[3px]">Plazo ampliado (+3 meses)</div>
        )}
        {e.alertaAmpliacion && <div className="text-[11px] text-danger font-semibold mt-[3px]">Emitir RSG de ampliación</div>}
      </div>

      <div className="flex items-center gap-[8px] flex-wrap md:col-span-2 xl:col-span-1 xl:justify-end">
        {e.alertaAmpliacion && (
          <button
            type="button"
            onClick={onVer}
            className="inline-flex items-center gap-[6px] h-[34px] px-[14px] rounded-pill border border-danger-border bg-danger-bg text-danger text-[12.5px] font-bold cursor-pointer whitespace-nowrap [transition:background-color_200ms,color_200ms] hover:bg-danger hover:text-white"
          >
            <AlertTriangleIcon size={14} />
            {e.ampliacionEstado ? 'Ver RSG de ampliación' : 'Emitir RSG de ampliación'}
          </button>
        )}
        <button type="button" onClick={onVer} className={BOTON_PILDORA}>
          <EyeIcon size={14} /> Ver expediente
        </button>
      </div>
    </article>
  );
};

// ============================================================================
// ESPERANDO NOTIFICACIÓN DE LA NC
// ============================================================================
export const TarjetaEsperandoNc: React.FC<{
  expediente: ExpedienteIfiItem;
  indice: number;
  onCambio: () => void;
}> = ({ expediente: e, indice, onCambio }) => (
  <article style={retrasoEntrada(indice)} className={cn(CLASE_TARJETA_BANDEJA, 'md:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)]')}>
    <span aria-hidden className={cn(BARRA_LATERAL, 'bg-border-dark')} />

    <div className="min-w-0">
      <span className={ETIQUETA_COLUMNA}>Expediente</span>
      <div className="font-display text-[16px] font-bold text-text-main tabular-nums">{e.numeroExpediente}</div>
      {e.tienePago && (
        <div className="mt-[6px]">
          <PagadoBadge tienePago montoPagado={e.montoPagado} fechaPago={e.fechaPago} />
        </div>
      )}
    </div>

    <div className="min-w-0">
      <span className={ETIQUETA_COLUMNA}>Condición legal</span>
      <p className="m-0 text-[12.5px] text-text-muted leading-[1.5]">
        Bloqueado por regla de negocio hasta que la Notificación de Cargo sea efectivamente diligenciada.
      </p>
      <div className="mt-[8px] text-text-main text-[13px]">
        <AvisoRetroaccion expedienteId={e.expedienteId} onCambio={onCambio} />
      </div>
    </div>
  </article>
);
