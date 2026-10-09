import React from 'react';
import { UnlockIcon } from '../icons/Icons';

interface AvisoSoloLecturaProps {
  rolNombre?: string;
}

/**
 * Banner discreto para indicar que el usuario puede ver el módulo,
 * pero no puede modificarlo debido a sus permisos.
 */
export const AvisoSoloLectura: React.FC<AvisoSoloLecturaProps> = ({ rolNombre }) => {
  if (!rolNombre) {
    return null;
  }

  return (
    <div className="mb-[16px] bg-[#fef3c7] border border-[#fcd34d] rounded-[6px] px-[12px] py-[10px] flex items-start gap-[10px]">
      <UnlockIcon size={16} className="text-[#92400e] mt-[2px] flex-shrink-0" />
      <span className="text-[12px] text-[#78350f] leading-[1.4]">
        Tu rol (<strong>{rolNombre}</strong>) puede ver este módulo, pero no modificarlo.
      </span>
    </div>
  );
};
