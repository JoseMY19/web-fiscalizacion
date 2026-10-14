import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaducidadApi, CaducidadExpedienteItem } from '../../api';
import { Alert, Button } from '../../components/common/Common';
import { socket } from '../../lib/socket';
import { formatearFecha } from '../../lib/fechas';

/**
 * F2 — Aviso de caducidad dentro de IFI y Resolución: expediente caducado
 * (cerrado), plazo vencido sin declarar (botón "Declarar caducidad" → panel
 * del módulo) o trámite de caducidad en curso.
 */
export const AvisoCaducidadExpediente: React.FC<{ expedienteId: string }> = ({ expedienteId }) => {
  const navigate = useNavigate();
  const [e, setE] = useState<CaducidadExpedienteItem | null>(null);

  useEffect(() => {
    let vigente = true;
    const cargar = () =>
      CaducidadApi.getExpediente(expedienteId)
        .then((d) => vigente && setE(d))
        .catch(() => vigente && setE(null));
    cargar();
    socket.on('caducidad:cambio', cargar);
    return () => {
      vigente = false;
      socket.off('caducidad:cambio', cargar);
    };
  }, [expedienteId]);

  if (!e) return null;
  const irAlPanel = () => navigate(`/caducidad?expediente=${expedienteId}`);
  const c = e.caducidad;

  if (e.caducado) {
    return (
      <Alert type="error" className="mb-[12px]!">
        <strong>Expediente caducado:</strong> la caducidad del PAS se declaró con la RSG N° {c?.numeroResolucion ?? '—'} (notificada el{' '}
        {formatearFecha(c?.fechaNotificacion)}). El expediente está cerrado y no admite más actuaciones.
      </Alert>
    );
  }
  if (c && !c.fechaNotificacion) {
    return (
      <Alert type="warning" className="mb-[12px]!">
        <div className="flex items-center justify-between gap-[10px] flex-wrap">
          <span>
            <strong>Caducidad en trámite</strong> ({c.origen === 'DE_OFICIO' ? 'de oficio' : 'a pedido de parte'}).
          </span>
          <Button size="sm" variant="secondary" onClick={irAlPanel}>
            Ver trámite
          </Button>
        </div>
      </Alert>
    );
  }
  if (e.puedeDeclararDeOficio) {
    return (
      <Alert type="error" className="mb-[12px]!">
        <div className="flex items-center justify-between gap-[10px] flex-wrap">
          <span>
            <strong>Plazo de caducidad vencido</strong> el {formatearFecha(e.plazo.fechaLimite)} sin resolución final notificada.
          </span>
          <Button size="sm" variant="danger" onClick={irAlPanel}>
            Declarar caducidad
          </Button>
        </div>
      </Alert>
    );
  }
  return null;
};
