import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button, Modal } from '../components/common/Common';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleClose = (result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        isOpen={!!options}
        onClose={() => handleClose(false)}
        title={options?.title || 'Confirmación'}
        maxWidth="440px"
        footer={
          <>
            <Button variant="secondary" onClick={() => handleClose(false)}>
              {options?.cancelLabel || 'Cancelar'}
            </Button>
            <Button variant={options?.variant === 'danger' ? 'danger' : 'primary'} onClick={() => handleClose(true)}>
              {options?.confirmLabel || 'Confirmar'}
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-text-main leading-[1.5]">{options?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm debe usarse dentro de un ConfirmProvider');
  }
  return context;
};
