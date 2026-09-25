import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { AppLayout, NavModule } from './components/layout/AppLayout';
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
import { CautelaresView } from './modules/cautelares/CautelaresView';
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

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchCounts = async () => {
      try {
        const [exp, ifi, res, riesgo] = await Promise.allSettled([
          ExpedientesApi.getPendientes(),
          IfiApi.getPendientes(),
          ResolucionesApi.getPendientes(),
          ConfiguracionApi.getExpedientesEnRiesgo(),
        ]);

        setBadgeCounts({
          expedientes: exp.status === 'fulfilled' && Array.isArray(exp.value) ? exp.value.length : 0,
          ifi: ifi.status === 'fulfilled' && ifi.value?.pendientes ? ifi.value.pendientes.length : 0,
          resoluciones: res.status === 'fulfilled' && Array.isArray(res.value) ? res.value.length : 0,
          configuracion: riesgo.status === 'fulfilled' && Array.isArray(riesgo.value) ? riesgo.value.length : 0,
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
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#10264a',
          color: '#ffffff',
          gap: '16px',
        }}
      >
        <Spinner size={36} color="#38bdf8" />
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>Iniciando Sistema PAS Oficina MDSJL...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <AppLayout currentModule={currentModule} onSelectModule={irA} user={user} onLogout={logout} badgeCounts={badgeCounts}>
      <Routes>
        <Route path="/" element={<DashboardView onNavigate={irA} />} />
        <Route path="/documentos" element={<DocumentosView />} />
        <Route path="/expedientes" element={<ExpedientesView />} />
        <Route path="/consulta-campo" element={<ConsultaCampoView />} />
        <Route path="/notificaciones" element={<NotificacionesView />} />
        <Route path="/ifi" element={<IfiView />} />
        <Route path="/resoluciones" element={<ResolucionesView />} />
        <Route path="/recursos" element={<RecursosView />} />
        <Route path="/coactiva-pagos" element={<CoactivaPagosView />} />
        <Route path="/cautelares" element={<CautelaresView />} />
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
