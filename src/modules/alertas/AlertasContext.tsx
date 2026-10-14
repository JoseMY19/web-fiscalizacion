import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alerta, AlertasApi, ResumenAlertas } from '../../api/alertas';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../lib/socket';

/** Cuántas alertas (las más urgentes) se guardan para la campana y el panel principal. */
const CANTIDAD_DESTACADAS = 40;
/** Las alertas dependen del reloj: además de los eventos en vivo, se refrescan solas. */
const REFRESCO_MS = 2 * 60_000;
/** Los eventos suelen llegar en ráfaga: se agrupan en un solo refresco. */
const ESPERA_EVENTOS_MS = 2_000;
const EVENTOS_EN_VIVO = ['expediente:nuevo', 'ifi:pendiente', 'resolucion:pendiente', 'caducidad:cambio', 'coactiva:cambio'];

interface AlertasContexto {
  resumen: ResumenAlertas | null;
  /** Las más urgentes, ya ordenadas (la lista completa vive en la página "Alertas y plazos"). */
  destacadas: Alerta[];
  cargando: boolean;
  error: boolean;
  recargar: () => void;
}

const Contexto = createContext<AlertasContexto | null>(null);

/**
 * Una sola consulta de alertas para toda la app: la usan la campana, el panel
 * principal y los contadores del menú, en vez de cada uno pidiendo lo suyo.
 */
export const AlertasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [resumen, setResumen] = useState<ResumenAlertas | null>(null);
  const [destacadas, setDestacadas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const temporizadorEventos = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recargar = useCallback(() => {
    setCargando(true);
    // La campana y el panel muestran solo lo que pide atención; los plazos sin riesgo viven en la página de alertas.
    AlertasApi.listar({ vista: 'ATENCION', porPagina: CANTIDAD_DESTACADAS })
      .then((r) => {
        setResumen(r.resumen);
        setDestacadas(r.items);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setResumen(null);
      setDestacadas([]);
      return;
    }
    recargar();
    const intervalo = setInterval(recargar, REFRESCO_MS);
    const alVolver = () => {
      if (document.visibilityState === 'visible') recargar();
    };
    document.addEventListener('visibilitychange', alVolver);

    const alEvento = () => {
      if (temporizadorEventos.current) clearTimeout(temporizadorEventos.current);
      temporizadorEventos.current = setTimeout(recargar, ESPERA_EVENTOS_MS);
    };
    EVENTOS_EN_VIVO.forEach((e) => socket.on(e, alEvento));

    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
      EVENTOS_EN_VIVO.forEach((e) => socket.off(e, alEvento));
      if (temporizadorEventos.current) clearTimeout(temporizadorEventos.current);
    };
  }, [isAuthenticated, recargar]);

  return <Contexto.Provider value={{ resumen, destacadas, cargando, error, recargar }}>{children}</Contexto.Provider>;
};

export function useAlertas(): AlertasContexto {
  const c = useContext(Contexto);
  if (!c) throw new Error('useAlertas debe usarse dentro de un AlertasProvider');
  return c;
}
