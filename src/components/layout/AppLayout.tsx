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
  BuildingIcon,
  UserIcon,
  EyeIcon,
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
  stage: string;
  icon: React.ReactNode;
}

interface NavItemConDef extends NavItem {
  /** Vacío = visible para cualquier rol logueado. `RolUsuario` hoy solo tiene FISCALIZADOR/NOTIFICADOR/ADMIN — ver nota abajo. */
  roles?: string[];
}

const navItems: NavItemConDef[] = [
  { id: 'dashboard', label: 'Panel Principal', stage: 'INICIO', icon: <DashboardIcon size={18} /> },
  { id: 'documentos', label: 'Control Documentario', stage: 'ARCHIVO', icon: <FileTextIcon size={18} /> },
  { id: 'expedientes', label: 'Validación Expedientes', stage: 'SP2', icon: <ExpedienteIcon size={18} /> },
  { id: 'consulta-campo', label: 'Exhortación / Constatación', stage: 'CONSULTA', icon: <EyeIcon size={18} /> },
  { id: 'notificaciones', label: 'Notificación Cédulas', stage: 'SP3', icon: <MailIcon size={18} /> },
  { id: 'ifi', label: 'Instrucción e IFI', stage: 'SP4', icon: <FileTextIcon size={18} /> },
  { id: 'resoluciones', label: 'Resolución Sancionadora', stage: 'SP5', icon: <GavelIcon size={18} /> },
  { id: 'recursos', label: 'Recursos Impugnativos', stage: 'SP6/7', icon: <ScaleIcon size={18} /> },
  { id: 'coactiva-pagos', label: 'Acto Firme & Pagos', stage: 'SP8', icon: <CreditCardIcon size={18} /> },
  { id: 'cautelares', label: 'Medidas Cautelares', stage: 'ES2', icon: <ShieldAlertIcon size={18} /> },
  { id: 'configuracion', label: 'Plazos, CUIS y UIT', stage: 'MOTOR', icon: <CalendarIcon size={18} /> },
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

  return (
    <div className="app-container">
      {/* ================================================================ */}
      {/* SIDEBAR INSTITUCIONAL - AZUL NOCHE PROFUNDO                       */}
      {/* ================================================================ */}
      <aside
        style={{
          width: '280px',
          backgroundColor: '#0b132b',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: '1px solid #1c2e59',
          boxShadow: '4px 0 16px rgba(5, 10, 24, 0.25)',
          zIndex: 100,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid #1c2e59',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            }}
          >
            <BuildingIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.3px', color: '#ffffff' }}>
              MDSJL <span style={{ color: '#38bdf8' }}>PAS</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
              Fiscalización & Sanciones
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#64748b',
              padding: '8px 12px 6px',
            }}
          >
            Módulos del Procedimiento
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: active ? '#1c2e59' : 'transparent',
                    color: active ? '#ffffff' : '#cbd5e1',
                    border: active ? '1px solid #2a4175' : '1px solid transparent',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    transition: 'all 150ms ease',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
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
                    <span style={{ color: active ? '#38bdf8' : '#94a3b8' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: active ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                        color: active ? '#38bdf8' : '#64748b',
                      }}
                    >
                      {item.stage}
                    </span>
                    {typeof count === 'number' && count > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout in Azul Noche */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #1c2e59',
            backgroundColor: '#070d1e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: '1px solid #334155',
                  flexShrink: 0,
                }}
              >
                <UserIcon size={18} />
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
                  title={user?.nombres ?? 'Usuario'}
                >
                  {user?.nombres ?? 'Oficina PAS'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {user?.rol ?? 'OPERADOR'} • DNI: {user?.dni ?? '---'}
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
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
        <header
          style={{
            height: '68px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 36px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-primary-600)', letterSpacing: '0.5px' }}>
              Subgerencia de Fiscalización • {currentNav?.stage}
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-midnight-900)' }}>
              {currentNav?.label}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                backgroundColor: 'var(--color-bg-subtle)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-border)',
              }}
            >
              📅 {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-success)',
                backgroundColor: 'var(--color-success-bg)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-success-border)',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
              En línea
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
};