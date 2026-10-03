import React from 'react';
import { Alert } from '../../components/common/Common';
import { ClockIcon } from '../../components/icons/Icons';
import { cuentaRegresiva, tipoMedidaTexto, useAhora } from './levantamientoUi';
import { useResumenLevantamientos } from './useResumenLevantamientos';

/** F1 — "Cronómetro" visible al entrar al sistema: solicitudes de levantamiento en evaluación. */
export const AlertaLevantamientosDashboard: React.FC<{ onIr: () => void }> = ({ onIr }) => {
  const r = useResumenLevantamientos(true);
  const ahora = useAhora(1000);
  if (r.abiertas === 0 && r.vencidasSinCarta === 0) return null;

  const p = r.proxima;
  const plazo = p ? cuentaRegresiva(p.venceEn, p.esClausura, ahora) : null;
  const tipo = r.urgentes > 0 || plazo?.nivel === 'vencido' ? 'error' : 'warning';

  return (
    <div onClick={onIr} className="cursor-pointer" title="Ir a Levantamiento de Medidas">
      <Alert type={tipo}>
        <span className="inline-flex items-center gap-[8px]">
          <ClockIcon size={16} />
          <span>
            {r.abiertas > 0 && (
              <>
                <strong>
                  {r.abiertas} solicitud{r.abiertas === 1 ? '' : 'es'} de levantamiento de medida provisional en evaluación
                </strong>
                {r.urgentes > 0 && ` (${r.urgentes} por vencer)`}
                {p && plazo && (
                  <>
                    . La más próxima: {tipoMedidaTexto(p.medida.tipoMedida)}, Acta N° {p.medida.numeroActa} — vence en{' '}
                    <strong className="tabular-nums">{plazo.texto}</strong>
                  </>
                )}
                .{' '}
              </>
            )}
            {r.vencidasSinCarta > 0 && (
              <>
                {r.vencidasSinCarta} levantada{r.vencidasSinCarta === 1 ? '' : 's'} por vencimiento del plazo sin carta firmada.{' '}
              </>
            )}
            Ver en Levantamiento de Medidas.
          </span>
        </span>
      </Alert>
    </div>
  );
};
