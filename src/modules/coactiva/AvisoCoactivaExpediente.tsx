import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CasoCoactivoItem, CoactivaApi } from '../../api';
import { socket } from '../../lib/socket';
import { formatearFecha } from '../../lib/fechas';
import { Alert, Button } from '../../components/common/Common';

/**
 * F4 — Aviso dentro del expediente PAS (Resolución) cuando coactivo lo
 * devolvió (p. ej. mala notificación de la resolución final): hay que
 * renotificar y retornarlo, o archivarlo si prescribió. Solo informa;
 * el trámite se registra en Ejecución Coactiva.
 */
export const AvisoCoactivaExpediente: React.FC<{ expedienteId: string }> = ({ expedienteId }) => {
  const navigate = useNavigate();
  const [c, setC] = useState<CasoCoactivoItem | null>(null);

  const cargar = useCallback(() => {
    CoactivaApi.getPorExpedientePas(expedienteId)
      .then(setC)
      .catch(() => setC(null));
  }, [expedienteId]);

  useEffect(() => {
    cargar();
    socket.on('coactiva:cambio', cargar);
    return () => {
      socket.off('coactiva:cambio', cargar);
    };
  }, [cargar]);

  const devolucion = c?.expedienteCoactivo?.devoluciones.find((d) => !d.fechaRetornoCoactiva && !d.fechaArchivo);
  if (!c || !devolucion) return null;
  return (
    <Alert type="warning" className="mb-[12px]!">
      <div className="flex items-center justify-between gap-[10px] flex-wrap">
        <span>
          <strong>Devuelto por coactiva</strong> el {formatearFecha(devolucion.fechaDevolucion)} ({devolucion.motivo}).{' '}
          {devolucion.fechaRenotificacion
            ? `Renotificado el ${formatearFecha(devolucion.fechaRenotificacion)}: falta retornarlo a coactiva.`
            : 'Hay que renotificar la resolución final, o archivar si ya prescribió.'}
        </span>
        <Button size="sm" variant="secondary" onClick={() => navigate(`/coactiva?actoFirme=${c.actoFirmeId}`)}>
          Ver en coactiva
        </Button>
      </div>
    </Alert>
  );
};
