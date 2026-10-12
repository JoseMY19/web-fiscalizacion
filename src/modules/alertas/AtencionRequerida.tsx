import React from 'react';
import type { NavModule } from '../../components/layout/AppLayout';
import type { Alerta, NivelAlerta } from '../../api/alertas';
import { Card, Spinner } from '../../components/common/Common';
import { AlertTriangleIcon, ArrowRightIcon, CheckCircleIcon, ChevronRightIcon, ClockIcon, FileTextIcon } from '../../components/icons/Icons';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { useAlertas } from './AlertasContext';
import { CHIP_BASE, NIVELES, NIVEL_META, chipDe } from './alertasUi';

const MAX_ALERTAS = 5;

/** Contador de un nivel: se pinta con su color solo si hay algo; en cero queda apagado. */
const TARJETA_ACTIVA: Record<NivelAlerta, { fondo: string; numero: string }> = {
  VENCIDO: { fondo: 'bg-danger-bg border-danger-border', numero: 'text-[#991b1b]' },
  CRITICO: { fondo: 'bg-danger-bg border-danger-border', numero: 'text-danger' },
  POR_VENCER: { fondo: 'bg-warning-bg border-warning-border', numero: 'text-warning' },
  EN_PLAZO: { fondo: 'bg-info-bg border-info-border', numero: 'text-info' },
};

/** Ícono de la fila: riesgo, plazo corriendo o tarea lista para hacer. */
function IconoAlerta({ alerta }: { alerta: Alerta }) {
  if (alerta.nivel === 'VENCIDO' || alerta.nivel === 'CRITICO') return <AlertTriangleIcon size={20} />;
  if (alerta.categoria === 'ACCION') return <FileTextIcon size={20} />;
  return <ClockIcon size={20} />;
}

/**
 * Panel principal: reemplaza los avisos sueltos (firma, levantamientos,
 * coactiva) por un solo cuadro con los contadores por nivel de riesgo y las
 * alertas más urgentes, alimentado por el mismo centro de alertas que la campana.
 */
export const AtencionRequerida: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const { resumen, destacadas, cargando } = useAlertas();

  return (
    <Card
      title="Atención requerida"
      subtitle="Lo más urgente de todos los expedientes, ordenado por riesgo"
      action={
        <button
          type="button"
          onClick={() => onNavigate('alertas')}
          className="bg-transparent border-0 p-0 text-[12px] font-semibold text-primary-600 cursor-pointer inline-flex items-center gap-[4px] hover:underline"
        >
          Ver alertas y plazos <ArrowRightIcon size={14} />
        </button>
      }
      className="mb-[24px]"
    >
      {!resumen && cargando ? (
        <div className="py-[24px] flex justify-center">
          <Spinner size={24} />
        </div>
      ) : !resumen || resumen.total === 0 ? (
        <div className="py-[20px] flex items-center gap-[10px] text-[13px] text-text-muted">
          <CheckCircleIcon size={22} color="var(--color-success)" />
          No hay plazos corriendo ni nada pendiente de actuar. Todo al día.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-[12px] mb-[16px]">
            {NIVELES.map((n) => {
              const meta = NIVEL_META[n];
              const cantidad = resumen.porNivel[n];
              const activa = cantidad > 0;
              return (
                <div
                  key={n}
                  className={cn(
                    'rounded-[12px] border py-[12px] px-[14px] [transition:background-color_150ms_ease]',
                    activa ? TARJETA_ACTIVA[n].fondo : 'bg-white border-border',
                  )}
                >
                  <div className="flex items-center gap-[6px]">
                    <span className={cn('w-[8px] h-[8px] rounded-full shrink-0', activa ? meta.barra : 'bg-border-dark')} />
                    <span className="text-[12px] font-semibold text-text-secondary">{meta.etiqueta}</span>
                  </div>
                  <div className={cn('text-[28px] leading-none font-extrabold tabular-nums mt-[8px]', activa ? TARJETA_ACTIVA[n].numero : 'text-text-light')}>
                    {cantidad}
                  </div>
                  <p className="text-[11.5px] text-text-muted leading-[1.3] mt-[6px] mb-0">{meta.descripcion}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-[12px] border border-border overflow-hidden divide-y divide-border">
            {destacadas.slice(0, MAX_ALERTAS).map((a) => {
              const chip = chipDe(a);
              const urgente = a.nivel === 'VENCIDO' || a.nivel === 'CRITICO';
              return (
                <button
                  key={a.clave}
                  type="button"
                  onClick={() => onNavigate(a.modulo as NavModule)}
                  className="group w-full text-left grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-[14px] py-[12px] px-[14px] border-0 bg-white cursor-pointer [transition:background-color_120ms_ease] hover:bg-bg-subtle"
                >
                  <span className={cn('w-[40px] h-[40px] rounded-[10px] border flex items-center justify-center', chip.clase)}>
                    <IconoAlerta alerta={a} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-[8px] flex-wrap">
                      <span className="text-[13.5px] font-bold text-text-main">{a.numeroExpediente}</span>
                      <span className="text-[12px] text-text-muted">{a.faseEtiqueta}</span>
                    </span>
                    <span className="block text-[13px] text-text-secondary mt-[2px]">{a.titulo}</span>
                    {(a.restanteTexto || a.plazoLimite) && (
                      <span className={cn('block text-[12px] mt-[2px]', urgente ? cn('font-semibold', NIVEL_META[a.nivel].texto) : 'text-text-muted')}>
                        {a.restanteTexto}
                        {a.restanteTexto && a.plazoLimite ? ' · ' : ''}
                        {a.plazoLimite ? `Límite ${formatearFecha(a.plazoLimite)}` : ''}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-[10px]">
                    <span className={cn(CHIP_BASE, 'py-[2px] px-[9px] text-[11.5px]', chip.clase)}>{chip.etiqueta}</span>
                    <span className="text-text-light [transition:transform_120ms_ease] group-hover:translate-x-[2px] group-hover:text-text-muted">
                      <ChevronRightIcon size={18} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};
