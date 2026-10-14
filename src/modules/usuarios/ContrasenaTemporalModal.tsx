import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal } from '../../components/common/Common';
import { CheckIcon } from '../../components/icons/Icons';

interface Props {
  datos: { nombres: string; contrasena: string } | null;
  onCerrar: () => void;
}

export const ContrasenaTemporalModal: React.FC<Props> = ({ datos, onCerrar }) => {
  const [copiada, setCopiada] = useState(false);

  useEffect(() => setCopiada(false), [datos]);

  const copiar = async () => {
    if (!datos) return;
    try {
      await navigator.clipboard.writeText(datos.contrasena);
      setCopiada(true);
    } catch {
      setCopiada(false);
    }
  };

  return (
    <Modal
      isOpen={!!datos}
      onClose={onCerrar}
      title="Contraseña temporal"
      maxWidth="460px"
      footer={<Button onClick={onCerrar}>Listo, ya la guardé</Button>}
    >
      {datos && (
        <>
          <p className="text-[13px] text-text-secondary mt-0 mb-[14px]">
            Entrégale esta contraseña a <strong className="text-text-main">{datos.nombres}</strong>.
          </p>
          <div className="flex items-center gap-[10px] p-[14px] rounded-md border border-border bg-bg-subtle mb-[16px]">
            <code className="flex-1 text-[22px] font-bold tracking-[2px] text-midnight-900 select-all break-all">{datos.contrasena}</code>
            <Button size="sm" variant={copiada ? 'success' : 'secondary'} icon={copiada ? <CheckIcon size={14} /> : undefined} onClick={copiar}>
              {copiada ? 'Copiada' : 'Copiar'}
            </Button>
          </div>
          <Alert type="warning" className="mb-0!">
            Se muestra <strong>una sola vez</strong>: al cerrar esta ventana no se puede volver a ver. El usuario deberá cambiarla en su primer ingreso.
          </Alert>
        </>
      )}
    </Modal>
  );
};
