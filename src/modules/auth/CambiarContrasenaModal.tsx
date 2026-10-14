import React, { useState } from 'react';
import { Modal, Input, Button, Alert } from '../../components/common/Common';
import { AuthApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface CambiarContrasenaModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isObligatorio?: boolean;
}

export const CambiarContrasenaModal: React.FC<CambiarContrasenaModalProps> = ({
  isOpen,
  onClose,
  isObligatorio = false,
}) => {
  const { refrescarSesion } = useAuth();
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [contrasenaNuevaConfirm, setContrasenaNuevaConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validar = (): boolean => {
    if (!contrasenaActual.trim()) {
      setError('Ingresa tu contraseña actual');
      return false;
    }
    if (!contrasenaNueva.trim()) {
      setError('Ingresa una contraseña nueva');
      return false;
    }
    if (contrasenaNueva.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (!/\p{L}/u.test(contrasenaNueva) || !/\d/.test(contrasenaNueva)) {
      setError('La contraseña debe contener letra y número');
      return false;
    }
    if (contrasenaNueva !== contrasenaNuevaConfirm) {
      setError('Las contraseñas nuevas no coinciden');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validar()) return;

    setLoading(true);
    try {
      await AuthApi.cambiarContrasena(contrasenaActual, contrasenaNueva);
      await refrescarSesion();
      setContrasenaActual('');
      setContrasenaNueva('');
      setContrasenaNuevaConfirm('');
      if (onClose) onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isObligatorio || !onClose ? () => undefined : onClose}
      title="Cambiar contraseña"
      maxWidth="480px"
      footer={
        <div className="flex gap-[12px] w-full">
          {!isObligatorio && (
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            className="flex-1"
          >
            Cambiar contraseña
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-[16px]">
        {isObligatorio && (
          <Alert type="info">
            Debe cambiar su contraseña antes de continuar
          </Alert>
        )}

        {error && <Alert type="error">{error}</Alert>}

        <Input
          label="Contraseña actual"
          type="password"
          value={contrasenaActual}
          onChange={(e) => setContrasenaActual(e.target.value)}
          placeholder="Ingresa tu contraseña actual"
          disabled={loading}
        />

        <Input
          label="Contraseña nueva"
          type="password"
          value={contrasenaNueva}
          onChange={(e) => setContrasenaNueva(e.target.value)}
          placeholder="Mín. 8 caracteres: letra + número"
          helperText="Mínimo 8 caracteres. Debe incluir letra y número"
          disabled={loading}
        />

        <Input
          label="Confirmar contraseña nueva"
          type="password"
          value={contrasenaNuevaConfirm}
          onChange={(e) => setContrasenaNuevaConfirm(e.target.value)}
          placeholder="Repite tu contraseña nueva"
          disabled={loading}
        />
      </form>
    </Modal>
  );
};
