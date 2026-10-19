import React from 'react';
import type { NotificacionItem } from '../../api';
import { MenuAcciones, type AccionMenu } from '../../components/common/PageKit';
import { BARRA_LATERAL, BOTON_PILDORA, CHIP_ESTADO, CLASE_TARJETA_BANDEJA, ETIQUETA_COLUMNA, retrasoEntrada } from '../../components/common/estilosBandeja';
import { CalendarIcon, MailIcon, UserIcon } from '../../components/icons/Icons';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { estadoCedula } from './notificacionesUi';

/**
 * Una cédula de notificación domiciliaria: su identificador, la NC a la que
 * pertenece, el notificador (o "Sin asignar"), el estado y la acción que toca:
 * asignar notificador o registrar la entrega.
 */
export const TarjetaCedula: React.FC<{
  cedula: NotificacionItem;
  indice: number;
  /** Acción principal: "Asignar" en pendientes, "Registrar entrega" en asignadas. */
  accion: { etiqueta: string; icono: React.ReactNode; onClick: () => void };
  /** Menú ⋮ (solo en asignadas). */
  acciones?: AccionMenu[];
}> = ({ cedula, indice, accion, acciones }) => {
  const asignada = !!cedula.notificadorId;
  const estado = estadoCedula(cedula.estado);

  return (
    <article
      style={retrasoEntrada(indice)}
      className={cn(CLASE_TARJETA_BANDEJA, 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto]')}
    >
      {/* Ámbar mientras no tiene notificador; rosa cuando ya está en manos de uno */}
      <span aria-hidden className={cn(BARRA_LATERAL, asignada ? 'bg-blue-800' : 'bg-warning')} />

      <div className="min-w-0 flex items-center gap-[12px]">
        <span className="w-[38px] h-[38px] rounded-md bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
          <MailIcon size={18} />
        </span>
        <div className="min-w-0">
          <span className={ETIQUETA_COLUMNA}>Cédula</span>
          <div className="font-mono text-[13.5px] font-bold text-text-main" title={cedula.id}>
            {cedula.id.slice(0, 8)}…
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>NC asociada</span>
        <div className="text-[13.5px] font-semibold text-text-secondary truncate" title={cedula.notificacionCargoId || undefined}>
          {cedula.notificacionCargoId || '—'}
        </div>
      </div>

      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Notificador</span>
        {asignada ? (
          <div className="flex items-center gap-[10px]">
            <span className="w-[30px] h-[30px] rounded-full bg-linear-to-br from-blue-500 to-blue-800 text-white flex items-center justify-center shrink-0">
              <UserIcon size={14} />
            </span>
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-text-main truncate">{cedula.notificadorNombre || cedula.notificadorId}</div>
              {cedula.fechaProgramada && (
                <div className="flex items-center gap-[4px] text-[11.5px] text-text-muted mt-[2px]">
                  <CalendarIcon size={11} /> Visita: {formatearFecha(cedula.fechaProgramada)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-[13px] font-semibold text-warning">Sin asignar</span>
        )}
      </div>

      <div className="min-w-0">
        <span className={ETIQUETA_COLUMNA}>Estado</span>
        <span className={cn(CHIP_ESTADO, estado.chip)}>{estado.etiqueta}</span>
      </div>

      <div className="flex items-center gap-[8px] md:justify-end">
        <button type="button" onClick={accion.onClick} className={BOTON_PILDORA}>
          {accion.icono}
          {accion.etiqueta}
        </button>
        {acciones && acciones.length > 0 && <MenuAcciones acciones={acciones} />}
      </div>
    </article>
  );
};
