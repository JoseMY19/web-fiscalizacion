import React from 'react';
import { cn } from '../../lib/cn';
import { CheckIcon } from '../icons/Icons';

export const claseBloqueTramite = 'bg-[#f8fafc] py-[12px] px-[14px] rounded-[8px] border border-border text-[13px]';
export const claseTituloTramite = 'text-[13px] font-extrabold text-midnight-900 mb-[8px] uppercase tracking-[0.4px] flex items-center gap-[8px]';
export const claseFilaTramite = 'flex gap-[12px] items-end flex-wrap mt-[8px]';
export const claseSelectTramite = 'w-full py-[10px] px-[14px] text-[14px] rounded-sm border border-border bg-[#ffffff] text-text-main outline-none';
export const claseInputArchivo =
  'text-[12px] text-text-secondary file:mr-[8px] file:py-[4px] file:px-[10px] file:rounded-sm file:border file:border-border file:bg-[#ffffff] file:text-[12px] file:cursor-pointer';

/** Paso numerado de un trámite con firma física (mismo aspecto que el panel de Levantamientos). */
export const PasoTramite: React.FC<{ n: number; titulo: string; hecho: boolean; children: React.ReactNode }> = ({ n, titulo, hecho, children }) => (
  <section className="mb-[16px]">
    <div className={claseTituloTramite}>
      <span
        className={cn(
          'w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
          hecho ? 'bg-[#16a34a] text-[#ffffff]' : 'bg-[#e2e8f0] text-[#475569]',
        )}
      >
        {hecho ? <CheckIcon size={12} /> : n}
      </span>
      {titulo}
    </div>
    <div className={claseBloqueTramite}>{children}</div>
  </section>
);
