import React from 'react';
import type { NavModule } from '../../components/layout/AppLayout';
import { Card, Spinner } from '../../components/common/Common';
import { ArrowRightIcon, CheckCircleIcon } from '../../components/icons/Icons';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { useAlertas } from './AlertasContext';
import { CHIP_BASE, NIVELES, NIVEL_META } from './alertasUi';

const MAX_ALERTAS = 5;

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
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[10px] mb-[14px]">
            {NIVELES.map((n) => {
              const meta = NIVEL_META[n];
              return (
                <div key={n} className="rounded-[10px] border border-border p-[10px] flex items-center justify-between gap-[8px]">
                  <span className={cn(CHIP_BASE, 'py-[2px] px-[8px] text-[11.5px]', meta.chip)}>{meta.etiqueta}</span>
                  <span className="text-[20px] font-extrabold text-text-main tabular-nums">{resumen.porNivel[n]}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col">
            {destacadas.slice(0, MAX_ALERTAS).map((a) => {
              const meta = NIVEL_META[a.nivel];
              return (
                <button
                  key={a.clave}
                  type="button"
                  onClick={() => onNavigate(a.modulo as NavModule)}
                  className="text-left flex gap-[10px] py-[10px] px-[4px] border-0 border-t border-t-border-subtle bg-transparent cursor-pointer hover:bg-bg-subtle"
                >
                  <span className={cn('w-[4px] rounded-[2px] shrink-0', meta.barra)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-[6px] flex-wrap">
                      <span className="text-[13px] font-bold text-text-main">N° {a.numeroExpediente}</span>
                      <span className={cn(CHIP_BASE, 'py-[1px] px-[6px] text-[10.5px]', meta.chip)}>{meta.etiqueta}</span>
                      <span className="text-[12px] text-text-muted">{a.faseEtiqueta}</span>
                    </span>
                    <span className="block text-[13px] text-text-main mt-[2px]">{a.titulo}</span>
                    {(a.restanteTexto || a.plazoLimite) && (
                      <span className="block text-[12px] text-text-muted">
                        {a.restanteTexto}
                        {a.restanteTexto && a.plazoLimite ? ' · ' : ''}
                        {a.plazoLimite ? `Límite ${formatearFecha(a.plazoLimite)}` : ''}
                      </span>
                    )}
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
