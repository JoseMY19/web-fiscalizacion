import React from 'react';
import {
  DashboardIcon,
  ExpedienteIcon,
  MailIcon,
  FileTextIcon,
  GavelIcon,
  ScaleIcon,
  CreditCardIcon,
  ShieldAlertIcon,
  CalendarIcon,
  LogOutIcon,
  EyeIcon,
  BellIcon,
} from '../icons/Icons';

export type NavModule =
  | 'dashboard'
  | 'documentos'
  | 'expedientes'
  | 'consulta-campo'
  | 'notificaciones'
  | 'ifi'
  | 'resoluciones'
  | 'recursos'
  | 'coactiva-pagos'
  | 'cautelares'
  | 'configuracion';

interface AppLayoutProps {
  currentModule: NavModule;
  onSelectModule: (mod: NavModule) => void;
  user: { nombres: string; dni: string; rol: string } | null;
  onLogout: () => void;
  children: React.ReactNode;
  badgeCounts?: Partial<Record<NavModule, number>>;
}

interface NavItem {
  id: NavModule;
  label: string;
  icon: React.ReactNode;
}

interface NavItemConDef extends NavItem {
  /** Vacío = visible para cualquier rol logueado. `RolUsuario` hoy solo tiene FISCALIZADOR/NOTIFICADOR/ADMIN — ver nota abajo. */
  roles?: string[];
}

const navItems: NavItemConDef[] = [
  { id: 'dashboard', label: 'Panel Principal', icon: <DashboardIcon size={18} /> },
  { id: 'documentos', label: 'Control Documentario', icon: <FileTextIcon size={18} /> },
  { id: 'expedientes', label: 'Validación de Expedientes', icon: <ExpedienteIcon size={18} /> },
  { id: 'consulta-campo', label: 'Exhortación y Consulta', icon: <EyeIcon size={18} /> },
  { id: 'notificaciones', label: 'Notificación de Cédulas', icon: <MailIcon size={18} /> },
  { id: 'ifi', label: 'Instrucción e IFI', icon: <FileTextIcon size={18} /> },
  { id: 'resoluciones', label: 'Resolución Sancionadora', icon: <GavelIcon size={18} /> },
  { id: 'recursos', label: 'Recursos Impugnativos', icon: <ScaleIcon size={18} /> },
  { id: 'coactiva-pagos', label: 'Acto Firme y Cobranza', icon: <CreditCardIcon size={18} /> },
  { id: 'cautelares', label: 'Medidas Cautelares', icon: <ShieldAlertIcon size={18} /> },
  { id: 'configuracion', label: 'Configuración y Parámetros', icon: <CalendarIcon size={18} /> },
];

/**
 * `RolUsuario` (backend) hoy solo tiene FISCALIZADOR/NOTIFICADOR/ADMIN —
 * no existe todavía un rol "validador"/"instructor"/"resolutor" propio de
 * oficina. Decisión tomada acá (cosmética, sin impacto legal ni de
 * dinero): mientras no exista ese rol, el único filtro real es
 * NOTIFICADOR → solo ve lo suyo (SP3). El resto de roles ve todo el menú,
 * igual que hoy no hay ningún RolesGuard en el backend que lo impida. Si
 * agregan roles de oficina reales, este mapa se actualiza junto con los
 * guards del backend, no antes.
 */
function esVisibleParaRol(item: NavItemConDef, rol: string | undefined): boolean {
  if (rol !== 'NOTIFICADOR') return true;
  return item.id === 'dashboard' || item.id === 'notificaciones';
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentModule,
  onSelectModule,
  user,
  onLogout,
  children,
  badgeCounts = {},
}) => {
  const currentNav = navItems.find((n) => n.id === currentModule);
  const totalPendientes = Object.values(badgeCounts).reduce<number>(
    (acc, val) => (typeof val === 'number' ? acc + val : acc),
    0
  );

  const cleanName = (user?.nombres || 'Carla Vega').replace(/\s*\(admin\s*dev\)/gi, '').trim();
  const cleanRole = user?.rol === 'ADMIN' ? 'Administrador' : user?.rol === 'FISCALIZADOR' ? 'Inspector de Campo' : user?.rol ?? 'Oficina';

  return (
    <div className="app-container">
      {/* ================================================================ */}
      {/* SIDEBAR INSTITUCIONAL - AZUL NAVY INSTITUCIONAL                   */}
      {/* ================================================================ */}
      <aside
        style={{
          width: '280px',
          background: 'linear-gradient(180deg, #163666 0%, #10264a 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '4px 0 20px rgba(16, 38, 74, 0.25)',
          zIndex: 100,
        }}
      >
        {/* Brand Header con Logo Oficial SJL */}
        <div
          style={{
            padding: '24px 20px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '14px',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <img
              src="/logo-sjl-white.png"
              alt="Municipalidad de San Juan de Lurigancho"
              style={{
                height: '66px',
                width: 'auto',
                maxWidth: '220px',
                objectFit: 'contain',
              }}
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.2px' }}>
              Fiscalización Administrativa
            </div>
            <div style={{ fontSize: '11px', color: '#bfdbfe', marginTop: '3px' }}>
              MDSJL • Sistema Sancionador PAS
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: '#93c5fd',
              padding: '4px 12px 8px',
              opacity: 0.75,
            }}
          >
            Módulos del Sistema
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.filter((item) => esVisibleParaRol(item, user?.rol)).map((item) => {
              const active = currentModule === item.id;
              const count = badgeCounts[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectModule(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    backgroundColor: active ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: active ? '#ffffff' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 400,
                    transition: 'background-color 150ms ease, color 150ms ease',
                    textAlign: 'left',
                    width: '100%',
                    boxShadow: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#cbd5e1';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: active ? '#38bdf8' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {typeof count === 'number' && count > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        minWidth: '19px',
                        height: '19px',
                        padding: '0 6px',
                        borderRadius: '10px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout in Azul Navy */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: '#0c1f3c',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                {cleanName.charAt(0)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={cleanName}
                >
                  {cleanName}
                </div>
                <div style={{ fontSize: '11px', color: '#93c5fd' }}>
                  {cleanRole} • DNI: {user?.dni ?? '---'}
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#bfdbfe',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#bfdbfe')}
            >
              <LogOutIcon size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ================================================================ */}
      {/* MAIN CONTENT AREA                                                */}
      {/* ================================================================ */}
      <div className="main-content">
        {/* Topbar Header */}
        <header className="app-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
              <span style={{ fontWeight: 500 }}>Fiscalización</span>
              <span style={{ color: '#cbd5e1' }}>/</span>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>{currentNav?.label}</span>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#0369a1',
                backgroundColor: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              MDSJL
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Estado de conexión */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#059669',
              }}
              title="Conexión en vivo con el servidor"
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                }}
              />
              <span>Sistema en línea</span>
            </div>

            {/* Fecha oficial */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '13px',
                color: '#64748b',
                borderLeft: '1px solid #e2e8f0',
                paddingLeft: '16px',
              }}
            >
              <CalendarIcon size={15} color="#94a3b8" />
              <span style={{ textTransform: 'capitalize' }}>
                {new Date().toLocaleDateString('es-PE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Botón de Notificaciones con contador */}
            <div
              style={{
                borderLeft: '1px solid #e2e8f0',
                paddingLeft: '16px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <button
                onClick={() => onSelectModule('expedientes')}
                title={
                  totalPendientes > 0
                    ? `${totalPendientes} expedientes pendientes de validación`
                    : 'Sin notificaciones pendientes'
                }
                style={{
                  position: 'relative',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <BellIcon size={17} />
                {totalPendientes > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 4px',
                      borderRadius: '9px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #ffffff',
                    }}
                  >
                    {totalPendientes}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
};