import React, { useEffect, useState } from 'react';
import { Modal, Spinner, Alert } from '../../components/common/Common';
import { UsuariosApi, AuditoriaItem } from '../../api/usuarios';
import { formatearFechaHora } from '../../lib/fechas';

interface AuditoriaUsuarioPanelProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioId: string;
  usuarioNombre: string;
}

const ACCIONES_LABELS: Record<string, string> = {
  USUARIO_CREADO: 'Usuario creado',
  USUARIO_ACTUALIZADO: 'Usuario actualizado',
  USUARIO_ACTIVADO: 'Usuario activado',
  USUARIO_DESACTIVADO: 'Usuario desactivado',
  CONTRASENA_RESTABLECIDA: 'Contraseña restablecida',
  SESIONES_REVOCADAS: 'Sesiones revocadas',
  DISPOSITIVO_LIBERADO: 'Dispositivo liberado',
};

function obtenerLabelAccion(accion: string): string {
  return ACCIONES_LABELS[accion] || accion;
}

export const AuditoriaUsuarioPanel: React.FC<AuditoriaUsuarioPanelProps> = ({
  isOpen,
  onClose,
  usuarioId,
  usuarioNombre,
}) => {
  const [auditoria, setAuditoria] = useState<AuditoriaItem[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await UsuariosApi.obtenerAuditoria(usuarioId);
        setAuditoria(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'No se pudo cargar el historial de auditoría.');
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [isOpen, usuarioId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de ${usuarioNombre}`}
      maxWidth="640px"
    >
      {cargando && (
        <div className="flex items-center justify-center gap-[12px] py-[48px]">
          <Spinner size={20} />
          <span className="text-[13px] text-text-muted">Cargando historial...</span>
        </div>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {!cargando && auditoria && auditoria.length === 0 && (
        <div className="py-[32px] text-center">
          <p className="text-[13px] text-text-muted">Sin registros de auditoría.</p>
        </div>
      )}

      {!cargando && auditoria && auditoria.length > 0 && (
        <div className="space-y-[12px]">
          {auditoria.map((item) => (
            <div
              key={item.id}
              className="border border-border rounded-[6px] p-[12px]"
            >
              <div className="flex items-start justify-between mb-[8px]">
                <div>
                  <p className="text-[13px] font-semibold text-midnight-900">
                    {obtenerLabelAccion(item.accion)}
                  </p>
                  <p className="text-[12px] text-text-muted mt-[2px]">
                    Por: {item.actorNombres}
                  </p>
                </div>
                <p className="text-[11px] text-text-muted text-right">
                  {formatearFechaHora(item.createdAt)}
                </p>
              </div>

              {(item.antes || item.despues) && (
                <div className="mt-[8px] space-y-[4px] text-[12px]">
                  {item.antes && Object.keys(item.antes).length > 0 && (
                    <div className="bg-[#fff1f2] p-[8px] rounded-[4px] border border-[#fecdd3]">
                      <p className="font-semibold text-[#be123c] mb-[4px]">Antes:</p>
                      {Object.entries(item.antes).map(([clave, valor]) => (
                        <div key={clave} className="text-[#991b1b]">
                          <span className="font-semibold">{clave}:</span> {String(valor || '—')}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.despues && Object.keys(item.despues).length > 0 && (
                    <div className="bg-[#ecfdf5] p-[8px] rounded-[4px] border border-[#a7f3d0]">
                      <p className="font-semibold text-[#047857] mb-[4px]">Después:</p>
                      {Object.entries(item.despues).map(([clave, valor]) => (
                        <div key={clave} className="text-[#065f46]">
                          <span className="font-semibold">{clave}:</span> {String(valor || '—')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
