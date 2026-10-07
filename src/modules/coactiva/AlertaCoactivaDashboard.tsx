import React, { useCallback, useEffect, useState } from 'react';
import { BandejaCoactiva, CoactivaApi } from '../../api';
import { socket } from '../../lib/socket';
import { Alert } from '../../components/common/Common';
import { BuildingIcon } from '../../components/icons/Icons';

/**
 * Coactiva en el panel principal: lo que no puede esperar. Pagó y sigue en
 * coactiva (no embargar), requerimiento vencido sin medida cautelar, y
 * expedientes devueltos a PAS.
 */
export const AlertaCoactivaDashboard: React.FC<{ onIr: () => void }> = ({ onIr }) => {
  const [b, setB] = useState<BandejaCoactiva | null>(null);

  const cargar = useCallback(() => {
    CoactivaApi.getBandeja()
      .then(setB)
      .catch(() => setB(null));
  }, []);

  useEffect(() => {
    cargar();
    socket.on('coactiva:cambio', cargar);
    return () => {
      socket.off('coactiva:cambio', cargar);
    };
  }, [cargar]);

  if (!b) return null;
  const pagados = b.enCurso.filter((c) => c.situacion.pagado).length;
  const recVencidas = b.enCurso.filter((c) => c.situacion.estado === 'REQUERIDO' && c.situacion.requerimientoVencido).length;
  const devueltos = b.devueltos.length;
  const porIniciar = b.porIniciar.length;
  if (pagados + recVencidas + devueltos + porIniciar === 0) return null;

  const partes: string[] = [];
  if (pagados) partes.push(`${pagados} pagaron y siguen en coactiva (no embargar)`);
  if (recVencidas) partes.push(`${recVencidas} requerimiento${recVencidas === 1 ? '' : 's'} vencido${recVencidas === 1 ? '' : 's'} sin medida cautelar`);
  if (devueltos) partes.push(`${devueltos} devuelto${devueltos === 1 ? '' : 's'} a PAS`);
  if (porIniciar) partes.push(`${porIniciar} por iniciar (90 días cumplidos)`);

  return (
    <div onClick={onIr} className="cursor-pointer" title="Ir a Ejecución Coactiva">
      <Alert type={pagados || recVencidas ? 'warning' : 'info'}>
        <span className="inline-flex items-center gap-[8px]">
          <BuildingIcon size={16} />
          <span>
            <strong>Ejecución coactiva:</strong> {partes.join(' · ')}. Ver en Ejecución Coactiva.
          </span>
        </span>
      </Alert>
    </div>
  );
};
