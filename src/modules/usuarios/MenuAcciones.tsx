import React, { useEffect, useRef, useState } from 'react';
import { MoreVerticalIcon } from '../../components/icons/Icons';
import { cn } from '../../lib/cn';

export interface OpcionMenu {
  etiqueta: string;
  onClick: () => void;
  peligro?: boolean;
  separadorAntes?: boolean;
}

/** Menú "⋮" de una fila. Posición fija para que la tarjeta (overflow-hidden) no lo recorte. */
export const MenuAcciones: React.FC<{ opciones: OpcionMenu[]; etiqueta?: string }> = ({ opciones, etiqueta = 'Más acciones' }) => {
  const boton = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const cerrar = () => setPos(null);
    window.addEventListener('click', cerrar);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      window.removeEventListener('click', cerrar);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [pos]);

  if (opciones.length === 0) return null;

  const abrir = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pos) return setPos(null);
    const r = boton.current!.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
  };

  return (
    <>
      <button
        ref={boton}
        type="button"
        title={etiqueta}
        aria-label={etiqueta}
        onClick={abrir}
        className={cn(
          'w-[32px] h-[32px] inline-flex items-center justify-center rounded-sm border border-transparent text-text-muted cursor-pointer [transition:all_150ms]',
          'hover:bg-bg-hover hover:text-text-main hover:border-border',
          pos && 'bg-bg-hover text-text-main border-border',
        )}
      >
        <MoreVerticalIcon size={16} />
      </button>
      {pos && (
        <div
          className="fixed z-[9000] min-w-[210px] bg-white border border-border rounded-md shadow-lg py-[6px]"
          style={{ top: pos.top, right: pos.right }}
          onClick={(e) => e.stopPropagation()}
        >
          {opciones.map((o) => (
            <React.Fragment key={o.etiqueta}>
              {o.separadorAntes && <div className="my-[6px] border-t border-border-subtle" />}
              <button
                type="button"
                onClick={() => {
                  setPos(null);
                  o.onClick();
                }}
                className={cn(
                  'w-full text-left py-[8px] px-[14px] text-[13px] font-medium bg-transparent border-0 cursor-pointer',
                  o.peligro ? 'text-danger hover:bg-danger-bg' : 'text-text-secondary hover:bg-bg-hover',
                )}
              >
                {o.etiqueta}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );
};
