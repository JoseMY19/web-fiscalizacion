import React, { useEffect, useState } from 'react';
import { LevantamientosApi, MedidaLevantamientoItem } from '../../api';
import { Alert } from '../../components/common/Common';
import { socket } from '../../lib/socket';
import { cuentaRegresiva, textoAvisoMedida, tipoMedidaTexto, useAhora } from './levantamientoUi';

/**
 * F1 — Aviso dentro del expediente principal (IFI y Resolución): si una
 * medida provisional se levantó (subsanó / venció el plazo) o tiene una
 * solicitud en evaluación. Principio de actos propios: SOLO informa; nunca
 * cambia la recomendación del IFI ni la decisión de la resolución.
 */
export const AvisoLevantamientoMedidas: React.FC<{ expedienteId: string }> = ({ expedienteId }) => {
  const [medidas, setMedidas] = useState<MedidaLevantamientoItem[]>([]);
  const ahora = useAhora(30_000);

  useEffect(() => {
    let vigente = true;
    const cargar = () =>
      LevantamientosApi.porExpediente(expedienteId)
        .then((data) => vigente && setMedidas(Array.isArray(data) ? data : []))
        .catch(() => vigente && setMedidas([]));
    cargar();
    socket.on('levantamiento:cambio', cargar);
    return () => {
      vigente = false;
      socket.off('levantamiento:cambio', cargar);
    };
  }, [expedienteId]);

  const avisos = medidas
    .map((m) => {
      const levantada = textoAvisoMedida(m);
      if (levantada) return { clave: m.medida.actaMedidaProvisionalId, tipo: 'info' as const, texto: levantada };
      const s = m.solicitudAbierta;
      if (!s) return null;
      const plazo = cuentaRegresiva(s.venceEn, s.esClausura, ahora);
      const tipo = tipoMedidaTexto(m.medida.tipoMedida).toUpperCase();
      return {
        clave: m.medida.actaMedidaProvisionalId,
        tipo: plazo.nivel === 'rojo' || plazo.nivel === 'vencido' ? ('error' as const) : ('warning' as const),
        texto:
          plazo.nivel === 'vencido'
            ? `Solicitud de levantamiento de la medida de ${tipo} (Acta N° ${m.medida.numeroActa}): venció el plazo sin pronunciamiento — la medida queda levantada por ley.`
            : `Solicitud de levantamiento de la medida de ${tipo} (Acta N° ${m.medida.numeroActa}) en evaluación — vence en ${plazo.texto.replace(/ \d+ s$/, '')} (${s.plazoTexto}).`,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  if (avisos.length === 0) return null;
  return (
    <div className="mb-[12px]">
      {avisos.map((a) => (
        <Alert key={a.clave} type={a.tipo} className="mb-[8px]!">
          <strong>Levantamiento de medida provisional:</strong> {a.texto}
        </Alert>
      ))}
    </div>
  );
};
