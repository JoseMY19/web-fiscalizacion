import React from 'react';
import { CameraIcon, EyeIcon, FileTextIcon } from '../icons/Icons';
import { Button } from './Common';

/**
 * Botones de una fila de la lista "Documentos del expediente", siempre con los mismos nombres y el mismo orden:
 *  - Vista previa: mira el documento que genera el sistema, al lado, sin descargarlo.
 *  - Descargar: baja el archivo editable (Word o Excel).
 *  - Ver foto (aparte, en `children`): la foto del acta física que subió el fiscalizador.
 */
export const BotonesDocumento: React.FC<{ onVistaPrevia?: () => void; onDescargar?: () => void; children?: React.ReactNode }> = ({
  onVistaPrevia,
  onDescargar,
  children,
}) => (
  <div className="flex items-center justify-end gap-[6px] flex-wrap">
    {onVistaPrevia && (
      <Button size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={onVistaPrevia}>
        Vista previa
      </Button>
    )}
    {onDescargar && (
      <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={onDescargar}>
        Descargar
      </Button>
    )}
    {children}
  </div>
);

/** Foto del acta física (la que sube el fiscalizador desde el celular). */
export const BotonVerFoto: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button size="sm" variant="outline" icon={<CameraIcon size={14} />} onClick={onClick}>
    Ver foto
  </Button>
);
