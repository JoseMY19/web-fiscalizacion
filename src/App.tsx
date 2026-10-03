import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { AppLayout, NavModule, puedeVerModulo } from './components/layout/AppLayout';
import { LoginView } from './modules/auth/LoginView';
import { DashboardView } from './modules/dashboard/DashboardView';
import { DocumentosView } from './modules/documentos/DocumentosView';
import { ExpedientesView } from './modules/expedientes/ExpedientesView';
import { ConsultaCampoView } from './modules/consulta-campo/ConsultaCampoView';
import { NotificacionesView } from './modules/notificaciones/NotificacionesView';
import { IfiView } from './modules/ifi/IfiView';
import { ResolucionesView } from './modules/resoluciones/ResolucionesView';
import { RecursosView } from './modules/recursos/RecursosView';
import { CoactivaPagosView } from './modules/coactiva-pagos/CoactivaPagosView';
import { PagosView } from './modules/pagos/PagosView';
import { CautelaresView } from './modules/cautelares/CautelaresView';
import { LevantamientosView } from './modules/levantamientos/LevantamientosView';
// F2 / F3: caducidad del PAS y prescripción de multas.
import { CaducidadView } from './modules/caducidad/CaducidadView';
import { PrescripcionView } from './modules/prescripcion/PrescripcionView';
// F4: ejecución coactiva.
import { CoactivaView } from './modules/coactiva/CoactivaView';
import { useResumenLevantamientos } from './modules/levantamientos/useResumenLevantamientos';
import { badgesLevantamientos } from './modules/levantamientos/badgesLevantamientos';
import { ConfiguracionView } from './modules/configuracion/ConfiguracionView';
import { MapaIntervencionesView } from './modules/mapa/MapaIntervencionesView';
import { ExpedientesApi, IfiApi, ResolucionesApi, ConfiguracionApi } from './api';
import { Spinner } from './components/common/Common';
import { socket } from './lib/socket';

function MainApp() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Cada módulo tiene su propia URL (ej. /ifi) — antes era estado en memoria
  // y F5 mandaba siempre al dashboard, sin poder compartir/recargar una
  // pantalla puntual.
  const currentModule = (location.pathname === '/' ? 'dashboard' : location.pathname.slice(1)) as NavModule;
  const irA = (mod: NavModule) => navigate(mod === 'dashboard' ? '/' : `/${mod}`);

  const [badgeCounts, setBadgeCounts] = useState<Partial<Record<NavModule, number>>>({});
  const [badgeAlertas, setBadgeAlertas] = useState<Partial<Record<NavModule, { count: number; title: string }>>>({});
  // F1: solicitudes de levantamiento en evaluación (rojo si alguna está por vencer).
  const badgesLev = badgesLevantamientos(useResumenLevantamientos(isAuthenticated, currentModule));

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchCounts = async () => {
      try {
        const [exp, ifi, res, riesgo] = await Promise.allSettled([
          ExpedientesApi.getPendientes(),
          IfiApi.getPendientes(),
          ResolucionesApi.getBandeja(),
          ConfiguracionApi.getExpedientesEnRiesgo(),
        ]);

        setBadgeCounts({
          expedientes: exp.status === 'fulfilled' && Array.isArray(exp.value) ? exp.value.length : 0,
          ifi: ifi.status === 'fulfilled' && ifi.value?.pendientes ? ifi.value.pendientes.length : 0,
          // Pendientes = en redacción + por firmar (misma cuenta que antes, ahora desde la bandeja).
          resoluciones: res.status === 'fulfilled' && res.value ? (res.value.enRedaccion?.length ?? 0) + (res.value.porFirmar?.length ?? 0) : 0,
          configuracion: riesgo.status === 'fulfilled' && Array.isArray(riesgo.value) ? riesgo.value.length : 0,
        });
        // O5: "falta firmar" — resoluciones entregadas al Subgerente, con la más antigua en el tooltip.
        const porFirmar = res.status === 'fulfilled' ? (res.value?.porFirmar ?? []) : [];
        const masAntigua = porFirmar.reduce((m, f) => Math.max(m, f.plazos?.diasEnFirma ?? 0), 0);
        setBadgeAlertas({
          resoluciones: {
            count: porFirmar.length,
            title: `${porFirmar.length} por firmar del Subgerente (la más antigua hace ${masAntigua} día${masAntigua === 1 ? '' : 's'})`,
          },
        });
      } catch {
        // Silencioso
      }
    };

    fetchCounts();

    // Aviso en vivo del backend (RealtimeGateway) — mismo refresco que ya
    // se hace al navegar, disparado ahora también cuando algo cambia sin
    // que el usuario haga nada. No reemplaza el fetch inicial de arriba.
    const eventos = ['expediente:nuevo', 'ifi:pendiente', 'resolucion:pendiente'];
    eventos.forEach((evento) => socket.on(evento, fetchCounts));
    return () => {
      eventos.forEach((evento) => socket.off(evento, fetchCounts));
    };
  }, [isAuthenticated, currentModule]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-[#10264a] text-[#ffffff] gap-[16px]"
      >
        <Spinner size={36} color="#38bdf8" />
        <p className="text-[14px] text-[#94a3b8]">Iniciando Sistema PAS Oficina MDSJL...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Rol temporal de pruebas: si entra por URL a un módulo no habilitado, vuelve al inicio.
  if (!puedeVerModulo(currentModule, user?.rol)) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout currentModule={currentModule} onSelectModule={irA} user={user} onLogout={logout} badgeCounts={{ ...badgeCounts, ...badgesLev.counts }} badgeAlertas={{ ...badgeAlertas, ...badgesLev.alertas }}>
      <Routes>
        <Route path="/" element={<DashboardView onNavigate={irA} />} />
        <Route path="/documentos" element={<DocumentosView />} />
        <Route path="/expedientes" element={<ExpedientesView />} />
        <Route path="/consulta-campo" element={<ConsultaCampoView />} />
        <Route path="/notificaciones" element={<NotificacionesView />} />
        <Route path="/ifi" element={<IfiView />} />
        <Route path="/resoluciones" element={<ResolucionesView />} />
        <Route path="/caducidad" element={<CaducidadView />} />
        <Route path="/recursos" element={<RecursosView />} />
        <Route path="/coactiva-pagos" element={<CoactivaPagosView />} />
        <Route path="/coactiva" element={<CoactivaView />} />
        <Route path="/prescripcion" element={<PrescripcionView />} />
        <Route path="/pagos" element={<PagosView />} />
        <Route path="/cautelares" element={<CautelaresView />} />
        <Route path="/levantamientos" element={<LevantamientosView />} />
        <Route path="/mapa" element={<MapaIntervencionesView />} />
        <Route path="/configuracion" element={<ConfiguracionView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <MainApp />
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
