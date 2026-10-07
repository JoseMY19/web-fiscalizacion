import React, { useEffect, useState } from 'react';
import { ChecklistValidacion as Checklist, ChecklistValidacionApi } from '../../api';
import { cn } from '../../lib/cn';

/**
 * Checklist de completitud (reunión: "validar es solo revisar que esté
 * completo"). Rojo = falta algo necesario; ámbar = advertencia. La
 * revisión legal de la imputación es del IFI.
 */
export const ChecklistValidacion: React.FC<{ expedienteId: string }> = ({ expedienteId }) => {
  const [c, setC] = useState<Checklist | null>(null);

  useEffect(() => {
    ChecklistValidacionApi.obtener(expedienteId)
      .then(setC)
      .catch(() => setC(null));
  }, [expedienteId]);

  if (!c) return null;
  const faltan = c.items.filter((x) => !x.ok);

  return (
    <div
      className={cn(
        'rounded-[8px] border py-[10px] px-[14px] mb-[16px] text-[13px]',
        c.faltanObligatorios > 0 ? 'bg-[#fff1f2] border-[#fda4af]' : faltan.length > 0 ? 'bg-[#fffbeb] border-[#fcd34d]' : 'bg-[#f0fdf4] border-[#86efac]',
      )}
    >
      <div className="font-bold mb-[6px]">
        {c.faltanObligatorios > 0
          ? `Expediente incompleto: faltan ${c.faltanObligatorios} dato${c.faltanObligatorios === 1 ? '' : 's'} necesario${c.faltanObligatorios === 1 ? '' : 's'}`
          : faltan.length > 0
            ? 'Expediente completo, con advertencias'
            : 'Expediente completo'}
      </div>
      <ul className="flex flex-col gap-[3px]">
        {c.items.map((x) => (
          <li key={x.clave} className="flex items-start gap-[8px]">
            <span className={cn('font-bold w-[16px] shrink-0', x.ok ? 'text-[#16a34a]' : x.obligatorio ? 'text-[#dc2626]' : 'text-[#d97706]')}>
              {x.ok ? '✓' : x.obligatorio ? '✗' : '!'}
            </span>
            <span className={x.ok ? 'text-text-secondary' : 'text-text-main'}>
              {x.etiqueta}
              {x.detalle && <span className="text-text-muted"> — {x.detalle}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
