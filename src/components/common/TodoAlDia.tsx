import React from 'react';
import { CheckCircleIcon } from '../icons/Icons';

/** Estado vacío "todo al día": check con un halo que respira suavemente. Lo usan el Panel Principal, Alertas y las bandejas. */
export const TodoAlDia: React.FC<{ titulo: string; descripcion: React.ReactNode }> = ({ titulo, descripcion }) => (
  <div className="py-[28px] px-[16px] flex flex-col items-center text-center animate-aparecer">
    <span className="relative flex w-[56px] h-[56px]">
      <span className="absolute inset-0 rounded-full bg-success opacity-20 animate-ping [animation-duration:2.4s] motion-reduce:animate-none" />
      <span className="relative w-[56px] h-[56px] rounded-full bg-success-bg border border-success-border flex items-center justify-center">
        <CheckCircleIcon size={26} color="var(--color-success)" />
      </span>
    </span>
    <p className="font-display text-[15px] font-semibold text-text-main mt-[16px] mb-0">{titulo}</p>
    <p className="text-[13px] text-text-muted mt-[4px] mb-0 max-w-[420px] leading-[1.5]">{descripcion}</p>
  </div>
);
