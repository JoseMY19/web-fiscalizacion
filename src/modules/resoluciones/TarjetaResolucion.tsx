import React from 'react';
import type { ExpedienteResolucionItem } from '../../api';
import { PagadoBadge } from '../../components/common/PagadoBadge';
import {
  BARRA_LATERAL,
  BARRA_POR_VARIANTE,
  BOTON_PILDORA,
  CHIP_BLOQUE,
  CHIP_ESTADO,
  CHIP_POR_VARIANTE,
  CLASE_TARJETA_BANDEJA,
  ETIQUETA_COLUMNA,
  retrasoEntrada,
} from '../../components/common/estilosBandeja';
import { AlertTriangleIcon, CheckCircleIcon, ClockIcon, EyeIcon, GavelIcon } from '../../components/icons/Icons';
import { cn } from '../../lib/cn';
import { CHIP_TIPO, NOMBRE_TIPO, claseDiasEnFirma, diasDesde, labelEtapa, textoCaducidad, varianteEtapa } from './resolucionUi';

/**
 * Un expediente en la bandeja de resoluciones: número y N° de resolución, el
 * tipo (RSGSA / RSG) con sus avisos, la etapa, el plazo de caducidad y el
 * acceso al panel de la resolución (o a la RSG de ampliación si apremia).
 */
export const TarjetaResolucion: React.FC<{
  resolucion: ExpedienteResolucionItem;
  indice: number;
  onVer: () => void;
}> = ({ resolucion: f, indice, onVer }) => {
  const tipo = f.tipo ?? f.tipoCorrespondiente;
  const caducidad = textoCaducidad(f.plazos.diasParaCaducidad);
  const variante = varianteEtapa(f);
  const diasAmpliacionEnFirma = diasDesde(f.ampliacionFechaEnvioFirma);

  return (
    <article
      style={retrasoEntrada(indice)}
      className={cn(
        CLASE_TARJETA_BANDEJA,
        'md:grid-cols-2 xl:grid-cols-[minmax(220px,1.2fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_340px]',
        f.plazos.alertaAmpliacion && 'bg-danger-bg/40',
      )}
    >
      <span aria-hidden className={cn(BARRA_LATERAL, f.plazos.alertaAmpliacion ? 'bg-danger' : BARRA_POR_VARIANTE[variante])} />

      {/* Expediente */}
      <div className="min-w-0 flex items-start gap-[12px]">
        <span className="w-[38px] h-[38px] rounded-md bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
          <GavelIcon size={18} />
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
          {f.numeroResolucion && <div className="text-[11.5px] text-text-muted mt-[3px] font-medium">Resolución N° {f.numeroResolucion}</div>}
          {f.tienePago && (
            <div className="mt-[6px] flex items-center gap-[6px] flex-wrap">
              <PagadoBadge tienePago montoPagado={f.montoPagado} fechaPago={f.fechaPago} />
              {f.concluidaPorPago && (
                <span className={cn(CHIP_ESTADO, 'bg-success-bg border-success-border text-success')}>
                  <CheckCircleIcon size={12} /> Concluido por pago
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tipo */}
      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Tipo</span>
        {tipo ? <span className={cn(CHIP_BLOQUE, CHIP_TIPO[tipo])}>{NOMBRE_TIPO[tipo]}</span> : <span className="text-text-muted">—</span>}
        {f.archivoPorVicio && <div className="text-[11px] text-red-800 mt-[4px]">Archivo por error de fondo</div>}
        {f.tipoNoCoincideConIfi && (
          <div className="mt-[6px]">
            <span className={cn(CHIP_ESTADO, 'bg-warning-bg border-warning-border text-warning')}>
              <AlertTriangleIcon size={12} /> Decisión distinta al IFI
            </span>
          </div>
        )}
        {f.enParte && <div className="text-[11px] text-text-muted mt-[4px]">Sancionar en parte</div>}
      </div>

      {/* Etapa */}
      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Etapa</span>
        <span className={cn(CHIP_BLOQUE, CHIP_POR_VARIANTE[variante])}>{labelEtapa(f)}</span>
      </div>

      {/* Plazo */}
      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Plazo</span>
        {caducidad ? (
          <span className={cn('inline-flex items-center gap-[5px] text-[12.5px] font-semibold', caducidad.urgente ? 'text-danger' : 'text-text-secondary')}>
            <ClockIcon size={13} /> {caducidad.texto}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
        {f.plazos.ampliacionFirmada && <div className="text-[11px] text-text-muted mt-[3px]">Plazo ampliado (+3 meses)</div>}
        {f.ampliacionEstado === 'EN_ELABORACION' && f.ampliacionFechaEnvioFirma && (
          <div className={cn('text-[11px] mt-[3px]', claseDiasEnFirma(diasAmpliacionEnFirma))}>
            RSG de ampliación en firma hace {diasAmpliacionEnFirma} día{diasAmpliacionEnFirma === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-[8px] flex-wrap md:col-span-2 xl:col-span-1 xl:justify-end">
        {f.plazos.alertaAmpliacion && (
          <button
            type="button"
            onClick={onVer}
            className="inline-flex items-center gap-[6px] h-[34px] px-[14px] rounded-pill border border-danger-border bg-danger-bg text-danger text-[12.5px] font-bold cursor-pointer whitespace-nowrap [transition:background-color_200ms,color_200ms] hover:bg-danger hover:text-white"
          >
            <AlertTriangleIcon size={14} />
            {f.ampliacionEstado ? 'Ver RSG de ampliación' : 'Emitir RSG de ampliación'}
          </button>
        )}
        <button type="button" onClick={onVer} className={BOTON_PILDORA}>
          <EyeIcon size={14} /> Ver expediente
        </button>
      </div>
    </article>
  );
};
