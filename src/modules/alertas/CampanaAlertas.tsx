import React, { useEffect, useRef, useState } from 'react';
import type { NavModule } from '../../components/layout/AppLayout';
import { BellIcon, CheckCircleIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { Alerta } from '../../api/alertas';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { useAlertas } from './AlertasContext';
import { CHIP_BASE, NIVEL_META } from './alertasUi';

type Filtro = 'URGENTES' | 'POR_VENCER' | 'ACCION' | 'TODAS';

const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: 'URGENTES', etiqueta: 'Urgentes' },
  { id: 'POR_VENCER', etiqueta: 'Por vencer' },
  { id: 'ACCION', etiqueta: 'Para actuar' },
  { id: 'TODAS', etiqueta: 'Todas' },
];

const MAX_VISIBLES = 12;

function cumpleFiltro(a: Alerta, f: Filtro): boolean {
  if (f === 'URGENTES') return a.nivel === 'VENCIDO' || a.nivel === 'CRITICO';
  if (f === 'POR_VENCER') return a.nivel === 'POR_VENCER';
  if (f === 'ACCION') return a.categoria === 'ACCION';
  return true;
}

/**
 * Campana de la esquina superior derecha: al pulsarla despliega las alertas
 * más urgentes (fase exacta, plazo límite y riesgo) y lleva al módulo donde
 * se resuelven. La insignia cuenta solo lo vencido o crítico (rojo); si solo
 * hay avisos por vencer sale ámbar; sin nada, no sale insignia.
 */
export const CampanaAlertas: React.FC<{ onIr: (modulo: NavModule) => void }> = ({ onIr }) => {
  const { resumen, destacadas, cargando, error, recargar } = useAlertas();
  const [abierta, setAbierta] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('URGENTES');
  const contenedor = useRef<HTMLDivElement>(null);

  const criticas = resumen?.criticas ?? 0;
  const porVencer = resumen?.porNivel.POR_VENCER ?? 0;

  useEffect(() => {
    if (!abierta) return;
    const alClicFuera = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierta(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierta(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierta]);

  // Al abrir, si no hay nada urgente se muestra todo para no dejar el panel vacío.
  const abrir = () => {
    if (!abierta) setFiltro(criticas > 0 ? 'URGENTES' : porVencer > 0 ? 'POR_VENCER' : 'TODAS');
    setAbierta(!abierta);
  };

  const visibles = destacadas.filter((a) => cumpleFiltro(a, filtro)).slice(0, MAX_VISIBLES);
  const ir = (modulo: string) => {
    setAbierta(false);
    onIr(modulo as NavModule);
  };

  const titulo =
    criticas > 0
      ? `${criticas} alerta${criticas === 1 ? '' : 's'} vencida${criticas === 1 ? '' : 's'} o crítica${criticas === 1 ? '' : 's'}`
      : porVencer > 0
        ? `${porVencer} plazo${porVencer === 1 ? '' : 's'} por vencer`
        : 'Sin alertas urgentes';

  return (
    <div ref={contenedor} className="relative border-l border-l-[#e2e8f0] pl-[16px] flex items-center">
      <button
        type="button"
        onClick={abrir}
        title={titulo}
        aria-label={`Alertas: ${titulo}`}
        aria-expanded={abierta}
        className={cn(
          'relative border rounded-[8px] w-[36px] h-[36px] flex items-center justify-center cursor-pointer [transition:all_150ms_ease]',
          abierta ? 'bg-primary-50 border-primary-200 text-primary-600' : 'bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]',
        )}
      >
        <BellIcon size={17} />
        {(criticas > 0 || porVencer > 0) && (
          <span
            className={cn(
              'absolute -top-[4px] -right-[4px] min-w-[18px] h-[18px] px-[4px] rounded-[9px] text-[#ffffff] text-[10px] font-bold flex items-center justify-center border-2 border-[#ffffff]',
              criticas > 0 ? 'bg-[#ef4444]' : 'bg-warning',
            )}
          >
            {criticas > 0 ? criticas : porVencer}
          </span>
        )}
      </button>

      {abierta && (
        <div
          role="dialog"
          aria-label="Alertas"
          className="absolute right-0 top-[46px] w-[420px] max-w-[calc(100vw-24px)] bg-white border border-border rounded-[12px] shadow-[0_12px_32px_rgba(15,23,42,0.18)] z-[200] overflow-hidden"
        >
          <div className="py-[12px] px-[16px] border-b border-border flex items-start justify-between gap-[8px]">
            <div>
              <div className="text-[14px] font-extrabold text-text-main">Alertas</div>
              <div className="text-[12px] text-text-muted">{titulo}</div>
            </div>
            <button
              type="button"
              onClick={recargar}
              title="Actualizar"
              aria-label="Actualizar alertas"
              className="w-[28px] h-[28px] rounded-[6px] border-0 bg-transparent text-text-muted cursor-pointer flex items-center justify-center hover:bg-bg-hover"
            >
              <RefreshCwIcon size={14} />
            </button>
          </div>

          <div className="py-[8px] px-[12px] border-b border-border flex gap-[6px] flex-wrap">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={cn(
                  'py-[4px] px-[10px] rounded-[999px] border text-[12px] cursor-pointer',
                  filtro === f.id ? 'bg-primary-600 text-white border-primary-600 font-semibold' : 'bg-white text-text-secondary border-border hover:bg-bg-hover',
                )}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {error && !resumen ? (
              <div className="py-[28px] px-[16px] text-center text-[13px] text-text-muted">No se pudieron cargar las alertas. Intenta actualizar.</div>
            ) : cargando && destacadas.length === 0 ? (
              <div className="py-[28px] px-[16px] text-center text-[13px] text-text-muted">Cargando alertas…</div>
            ) : visibles.length === 0 ? (
              <div className="py-[28px] px-[16px] text-center text-[13px] text-text-muted flex flex-col items-center gap-[8px]">
                <CheckCircleIcon size={28} color="var(--color-success)" />
                Nada en esta categoría.
              </div>
            ) : (
              visibles.map((a) => {
                const meta = NIVEL_META[a.nivel];
                return (
                  <button
                    key={a.clave}
                    type="button"
                    onClick={() => ir(a.modulo)}
                    className="w-full text-left flex gap-[10px] py-[10px] px-[14px] border-0 border-b border-b-border-subtle bg-white cursor-pointer hover:bg-bg-subtle"
                  >
                    <span className={cn('w-[4px] rounded-[2px] shrink-0', meta.barra)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-[6px] flex-wrap mb-[2px]">
                        <span className="text-[12px] font-bold text-text-main">N° {a.numeroExpediente}</span>
                        <span className={cn(CHIP_BASE, 'py-[1px] px-[6px] text-[10.5px]', meta.chip)}>{meta.etiqueta}</span>
                        {a.pagado && <span className={cn(CHIP_BASE, 'py-[1px] px-[6px] text-[10.5px] bg-success-bg text-success border-success-border')}>Pagado</span>}
                      </span>
                      <span className="block text-[13px] font-semibold text-text-main leading-[1.3]">{a.titulo}</span>
                      <span className="block text-[11.5px] text-text-muted mt-[2px] leading-[1.35]">
                        {a.faseEtiqueta} · {a.faseDetalle}
                      </span>
                      {(a.restanteTexto || a.plazoLimite) && (
                        <span className="block text-[11.5px] mt-[2px] font-semibold text-text-secondary">
                          {a.restanteTexto}
                          {a.restanteTexto && a.plazoLimite ? ' · ' : ''}
                          {a.plazoLimite ? `Límite ${formatearFecha(a.plazoLimite)}` : ''}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="py-[10px] px-[14px] border-t border-border bg-bg-subtle">
            <button
              type="button"
              onClick={() => ir('alertas')}
              className="w-full py-[8px] rounded-[6px] border-0 bg-primary-600 text-white text-[13px] font-semibold cursor-pointer hover:bg-primary-700"
            >
              Ver todas las alertas y plazos{resumen ? ` (${resumen.total})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
