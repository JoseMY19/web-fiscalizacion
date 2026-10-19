import React, { useState } from 'react';
import type { NavModule } from '../../components/layout/AppLayout';
import type { Alerta } from '../../api/alertas';
import { Card, Spinner } from '../../components/common/Common';
import { SegmentedTabs } from '../../components/common/PageKit';
import { AlertTriangleIcon, ArrowRightIcon, ChevronRightIcon, ClockIcon, FileTextIcon } from '../../components/icons/Icons';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { useAlertas } from './AlertasContext';
import { CHIP_BASE, NIVEL_META, chipDe } from './alertasUi';
import { TodoAlDia } from '../../components/common/TodoAlDia';

const MAX_ALERTAS = 5;

type Filtro = 'todos' | 'urgentes' | 'porVencer' | 'actuar';

const FILTROS: Record<Filtro, (a: Alerta) => boolean> = {
  todos: () => true,
  urgentes: (a) => a.nivel === 'VENCIDO' || a.nivel === 'CRITICO',
  porVencer: (a) => a.nivel === 'POR_VENCER',
  actuar: (a) => a.nivel === 'EN_PLAZO' && a.categoria === 'ACCION',
};

const VACIO: Record<Filtro, string> = {
  todos: 'Nada requiere atención ahora.',
  urgentes: 'No hay expedientes vencidos ni críticos.',
  porVencer: 'No hay plazos por vencer.',
  actuar: 'No hay expedientes listos para actuar.',
};

/** Ícono de la fila: riesgo, plazo corriendo o tarea lista para hacer. */
function IconoAlerta({ alerta }: { alerta: Alerta }) {
  if (alerta.nivel === 'VENCIDO' || alerta.nivel === 'CRITICO') return <AlertTriangleIcon size={20} />;
  if (alerta.categoria === 'ACCION') return <FileTextIcon size={20} />;
  return <ClockIcon size={20} />;
}

/**
 * Panel principal: reemplaza los avisos sueltos (firma, levantamientos,
 * coactiva) por un solo cuadro con las alertas más urgentes, alimentado por el
 * mismo centro de alertas que la campana. Las pestañas (las mismas de los demás
 * módulos) filtran la lista; el color solo aparece donde hay algo con riesgo.
 */
export const AtencionRequerida: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => {
  const { resumen, destacadas, cargando } = useAlertas();
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const urgentes = (resumen?.porNivel.VENCIDO ?? 0) + (resumen?.porNivel.CRITICO ?? 0);
  const porVencer = resumen?.porNivel.POR_VENCER ?? 0;
  const paraActuar = Math.max(0, (resumen?.atencion ?? 0) - urgentes - porVencer);
  const filas = destacadas.filter(FILTROS[filtro]).slice(0, MAX_ALERTAS);

  return (
    <Card
      className="rounded-lg shadow-xs"
      title="Atención requerida"
      subtitle="Lo más urgente de todos los expedientes, ordenado por riesgo"
      action={
        <button
          type="button"
          onClick={() => onNavigate('alertas')}
          className="group bg-transparent border-0 p-0 text-[12.5px] font-bold text-blue-800 cursor-pointer inline-flex items-center gap-[6px]"
        >
          Ver alertas y plazos
          <span className="[transition:transform_200ms] group-hover:translate-x-[3px]">
            <ArrowRightIcon size={14} />
          </span>
        </button>
      }
    >
      {!resumen && cargando ? (
        <div className="py-[24px] flex justify-center">
          <Spinner size={24} />
        </div>
      ) : !resumen || resumen.atencion === 0 ? (
        <TodoAlDia
          titulo="Nada requiere atención ahora"
          descripcion={resumen && resumen.seguimiento > 0 ? `Hay ${resumen.seguimiento} plazo${resumen.seguimiento === 1 ? '' : 's'} en seguimiento, sin riesgo.` : 'Todo al día.'}
        />
      ) : (
        <>
          <div className="mb-[8px]">
            <SegmentedTabs<Filtro>
              items={[
                { clave: 'todos', etiqueta: 'Todos', contador: resumen.atencion },
                { clave: 'urgentes', etiqueta: 'Vencidos o críticos', contador: urgentes, tono: urgentes > 0 ? 'danger' : undefined },
                { clave: 'porVencer', etiqueta: 'Por vencer', contador: porVencer, tono: porVencer > 0 ? 'warning' : undefined },
                { clave: 'actuar', etiqueta: 'Para actuar', contador: paraActuar },
              ]}
              activa={filtro}
              onChange={setFiltro}
            />
          </div>

          {filas.length === 0 ? (
            <p className="py-[32px] text-center text-[13px] text-text-muted m-0">{VACIO[filtro]}</p>
          ) : (
            <div className="divide-y divide-border">
              {filas.map((a) => {
                const chip = chipDe(a);
                const urgente = a.nivel === 'VENCIDO' || a.nivel === 'CRITICO';
                return (
                  <button
                    key={a.clave}
                    type="button"
                    onClick={() => onNavigate(a.modulo as NavModule)}
                    className="group w-full text-left grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-[14px] py-[16px] px-[4px] border-0 bg-transparent cursor-pointer [transition:background-color_120ms_ease] hover:bg-bg-subtle"
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
          )}
        </>
      )}
    </Card>
  );
};
