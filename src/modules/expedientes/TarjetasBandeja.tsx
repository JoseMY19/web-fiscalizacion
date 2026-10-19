import React from 'react';
import type { ExpedienteItem } from '../../api';
import type { ExpedienteObservadoItem } from '../../api/expedientesObservados';
import { MenuAcciones, type AccionMenu } from '../../components/common/PageKit';
import {
  BARRA_LATERAL,
  BOTON_PILDORA,
  BOTON_PILDORA_SECUNDARIO,
  CHIP_ESTADO,
  CLASE_TARJETA_BANDEJA,
  ETIQUETA_COLUMNA,
  retrasoEntrada,
} from '../../components/common/estilosBandeja';
import { CheckCircleIcon, ClockIcon, EyeIcon } from '../../components/icons/Icons';
import { formatearFecha, formatearHora } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { BotonCorregirDato } from '../correcciones/CorreccionMaterial';

/** Nombre del fiscalizador sin la marca "(admin dev)" de las cuentas de prueba. */
const limpiarNombre = (nombre?: string | null) => (nombre || 'No asignado').replace(/\s*\(admin\s*dev\)/gi, '').trim();

// ============================================================================
// POR VALIDAR
// ============================================================================
export const TarjetaPorValidar: React.FC<{
  expediente: ExpedienteItem;
  indice: number;
  onRevisar: () => void;
  acciones: AccionMenu[];
}> = ({ expediente: exp, indice, onRevisar, acciones }) => {
  const fiscalizador = limpiarNombre(exp.fiscalizadorNombre);
  const recibido = !!exp.fechaIngresoFisico;

  return (
    <article style={retrasoEntrada(indice)} className={cn(CLASE_TARJETA_BANDEJA, 'md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]')}>
      {/* Verde si el acta física ya llegó; ámbar si falta */}
      <span aria-hidden className={cn(BARRA_LATERAL, recibido ? 'bg-success' : 'bg-warning')} />

      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Expediente</span>
        <button
          type="button"
          onClick={onRevisar}
          className="bg-transparent border-0 p-0 font-display text-[16px] font-bold text-blue-800 cursor-pointer tabular-nums hover:underline underline-offset-4"
        >
          {exp.numeroExpediente}
        </button>
        <div className="text-[12px] text-text-muted mt-[4px]">
          {exp.fechaHoraInicioIntervencion
            ? `${formatearFecha(exp.fechaHoraInicioIntervencion)} · ${formatearHora(exp.fechaHoraInicioIntervencion)} hrs`
            : 'Sin fecha'}
        </div>
      </div>

      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Fiscalizador</span>
        <div className="flex items-center gap-[10px]">
          <span className="w-[30px] h-[30px] rounded-full bg-linear-to-br from-blue-500 to-blue-800 text-white font-display font-bold text-[12px] flex items-center justify-center shrink-0">
            {fiscalizador.charAt(0)}
          </span>
          <span className="text-[13.5px] font-semibold text-text-main truncate">{fiscalizador}</span>
        </div>
      </div>

      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Acta física</span>
        {recibido ? (
          <span className={cn(CHIP_ESTADO, 'bg-success-bg border-success-border text-success')}>
            <CheckCircleIcon size={13} /> Recibida el {formatearFecha(exp.fechaIngresoFisico!)}
          </span>
        ) : (
          <span className={cn(CHIP_ESTADO, 'bg-warning-bg border-warning-border text-warning')}>
            <ClockIcon size={13} /> Pendiente de ingreso
          </span>
        )}
      </div>

      <div className="flex items-center gap-[8px] md:justify-end">
        <button type="button" onClick={onRevisar} className={BOTON_PILDORA}>
          <EyeIcon size={14} /> Revisar
        </button>
        <MenuAcciones acciones={acciones} />
      </div>
    </article>
  );
};

// ============================================================================
// OBSERVADAS
// ============================================================================
export const TarjetaObservada: React.FC<{
  observada: ExpedienteObservadoItem;
  indice: number;
  onRevisar: () => void;
  onCorregido: () => void;
  acciones: AccionMenu[];
}> = ({ observada: obs, indice, onRevisar, onCorregido, acciones }) => (
  <article style={retrasoEntrada(indice)} className={cn(CLASE_TARJETA_BANDEJA, 'md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]')}>
    <span aria-hidden className={cn(BARRA_LATERAL, 'bg-danger')} />

    <div className="min-w-0">
      <span className={ETIQUETA_COLUMNA}>Expediente</span>
      <div className="font-display text-[16px] font-bold text-text-main tabular-nums">{obs.numeroExpediente}</div>
      <div className="text-[12px] text-text-muted mt-[4px]">{obs.fechaObservacion ? `Observado el ${formatearFecha(obs.fechaObservacion)}` : 'Observado recientemente'}</div>
    </div>

    <div className="min-w-0">
      <span className={ETIQUETA_COLUMNA}>Motivo de la observación</span>
      <p className="m-0 py-[8px] px-[12px] rounded-md bg-danger-bg/60 border border-danger-border/60 text-[13px] text-text-secondary leading-[1.5]">{obs.motivo}</p>
    </div>

    <div className="flex items-center gap-[8px] md:justify-end">
      <button type="button" onClick={onRevisar} className={BOTON_PILDORA_SECUNDARIO}>
        <EyeIcon size={14} /> Revisar
      </button>
      <BotonCorregirDato expedienteId={obs.id} etiqueta="Corregir" variante="primary" onCorregido={onCorregido} />
      <MenuAcciones acciones={acciones} />
    </div>
  </article>
);
