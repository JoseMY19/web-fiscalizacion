import React from 'react';
import { cn } from '../../lib/cn';

interface LoginCampoProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  id: string;
  label: string;
  icono: React.ReactNode;
  /** Botón al final del campo (ej. mostrar contraseña). */
  sufijo?: React.ReactNode;
}

/**
 * Campo con etiqueta flotante: la etiqueta ocupa el lugar del texto mientras
 * el campo está vacío y sube al enfocarlo o al escribir. Se apoya en
 * `:placeholder-shown`, por eso el placeholder es un espacio fijo.
 */
export const LoginCampo: React.FC<LoginCampoProps> = ({ id, label, icono, sufijo, className, ...props }) => (
  <div
    className={cn(
      'group relative flex items-center h-[58px] rounded-md border border-border-dark bg-bg-subtle',
      '[transition:border-color_200ms,box-shadow_200ms,background-color_200ms]',
      'hover:border-text-light',
      'focus-within:bg-white focus-within:border-blue-700 focus-within:ring-4 focus-within:ring-blue-100',
    )}
  >
    <span className="pl-[16px] pr-[12px] flex items-center text-text-light [transition:color_200ms] group-focus-within:text-blue-700">
      {icono}
    </span>
    <div className="relative flex-1 min-w-0 h-full">
      <input
        id={id}
        placeholder=" "
        className={cn(
          'peer w-full h-full pt-[18px] pb-[2px] bg-transparent border-0 outline-none text-[15px] font-medium text-text-main',
          // Autocompletado del navegador: sin el fondo amarillo.
          '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_var(--color-bg-subtle)]',
          !sufijo && 'pr-[16px]',
          className,
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className={cn(
          'absolute left-0 top-[9px] text-[11px] font-semibold tracking-[0.2px] text-text-muted pointer-events-none',
          '[transition:all_180ms_cubic-bezier(0.2,0.8,0.2,1)]',
          'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[14.5px] peer-placeholder-shown:font-medium',
          'peer-focus:top-[9px] peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-blue-700',
        )}
      >
        {label}
      </label>
    </div>
    {sufijo}
  </div>
);
