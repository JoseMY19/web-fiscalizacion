import React, { useState } from 'react';
import { Modal, Button, Alert } from '../../components/common/Common';
import { CheckCircleIcon } from '../../components/icons/Icons';

interface ContrasenaTemporalModalProps {
  isOpen: boolean;
  onClose: () => void;
  contrasena: string;
  usuario: string;
}

export const ContrasenaTemporalModal: React.FC<ContrasenaTemporalModalProps> = ({
  isOpen,
  onClose,
  contrasena,
  usuario,
}) => {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(contrasena);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback para navegadores sin soporte
      const textarea = document.createElement('textarea');
      textarea.value = contrasena;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contraseña Temporal" maxWidth="480px">
      <div className="space-y-[16px]">
        <div className="flex items-start gap-[12px] p-[12px] bg-[#ecfdf5] border border-[#a7f3d0] rounded-[6px]">
          <CheckCircleIcon size={20} className="text-[#047857] mt-[2px] flex-shrink-0" />
          <p className="text-[13px] text-[#065f46]">
            Usuario <span className="font-semibold">{usuario}</span> creado exitosamente. Se ha generado una contraseña temporal.
          </p>
        </div>

        <div>
          <p className="text-[12px] font-semibold text-text-secondary mb-[8px]">Contraseña temporal:</p>
          <div className="bg-[#f8fafc] border border-border rounded-[6px] p-[16px] flex items-center justify-between">
            <code className="font-mono text-[16px] font-semibold text-midnight-900 tracking-[0.05em]">{contrasena}</code>
            <Button variant="secondary" size="sm" onClick={copiar}>
              {copiado ? '✓ Copiado' : 'Copiar'}
            </Button>
          </div>
        </div>

        <Alert type="warning">
          Se muestra una sola vez. El usuario deberá cambiarla al ingresar.
        </Alert>
      </div>

      <div className="mt-[24px] flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Entendido
        </Button>
      </div>
    </Modal>
  );
};
