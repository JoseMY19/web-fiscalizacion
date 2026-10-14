import { useEffect, useState } from 'react';
import { LevantamientosApi, SolicitudLevantamientoItem } from '../../api';
import { socket } from '../../lib/socket';

export interface ResumenLevantamientos {
  /** Solicitudes en evaluación (no resueltas). */
  abiertas: number;
  /** De ellas, con < 24 h (clausura) o < 5 días (otras). */
  urgentes: number;
  /** Levantadas por vencimiento cuya carta aún no se firma. */
  vencidasSinCarta: number;
  /** La que vence primero. */
  proxima: SolicitudLevantamientoItem | null;
}

const VACIO: ResumenLevantamientos = { abiertas: 0, urgentes: 0, vencidasSinCarta: 0, proxima: null };

/**
 * Resumen para el contador del menú y la alerta del Panel Principal. Se
 * refresca con el aviso en vivo, al cambiar de módulo (`refrescarCon`) y
 * cada minuto: el umbral de urgencia cambia solo con el paso del tiempo.
 */
export function useResumenLevantamientos(activo: boolean, refrescarCon?: unknown): ResumenLevantamientos {
  const [resumen, setResumen] = useState<ResumenLevantamientos>(VACIO);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    const cargar = async () => {
      try {
        const b = await LevantamientosApi.getBandeja();
        if (!vigente) return;
        const abiertas = b?.enEvaluacion ?? [];
        setResumen({
          abiertas: abiertas.length,
          urgentes: abiertas.filter((s) => s.urgente).length,
          vencidasSinCarta: (b?.levantadasPorVencimiento ?? []).filter((s) => !s.fechaHoraFirma).length,
          proxima: abiertas.reduce<SolicitudLevantamientoItem | null>((m, s) => (!m || s.venceEn < m.venceEn ? s : m), null),
        });
      } catch {
        // Silencioso: el contador no debe romper el menú.
      }
    };
    cargar();
    const t = setInterval(cargar, 60_000);
    socket.on('levantamiento:cambio', cargar);
    return () => {
      vigente = false;
      clearInterval(t);
      socket.off('levantamiento:cambio', cargar);
    };
  }, [activo, refrescarCon]);

  return resumen;
}
