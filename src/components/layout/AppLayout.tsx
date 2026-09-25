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
  MapPinIcon,
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
  | 'mapa'
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

// Ordenado según el recorrido del expediente: validación → notificación →
// instrucción (IFI) → resolución → recursos → acto firme/cobranza. Después
// lo transversal (cautelares, consultas, documentos, mapa, configuración).
const navItems: NavItemConDef[] = [
  { id: 'dashboard', label: 'Panel Principal', icon: <DashboardIcon size={18} /> },
  { id: 'expedientes', label: 'Validación de Expedientes', icon: <ExpedienteIcon size={18} /> },
  { id: 'notificaciones', label: 'Notificación de Cédulas', icon: <MailIcon size={18} /> },
  { id: 'ifi', label: 'Instrucción e IFI', icon: <FileTextIcon size={18} /> },
  { id: 'resoluciones', label: 'Resolución Sancionadora', icon: <GavelIcon size={18} /> },
  { id: 'recursos', label: 'Recursos Impugnativos', icon: <ScaleIcon size={18} /> },
  { id: 'coactiva-pagos', label: 'Acto Firme y Cobranza', icon: <CreditCardIcon size={18} /> },
  { id: 'cautelares', label: 'Medidas Cautelares', icon: <ShieldAlertIcon size={18} /> },
  { id: 'consulta-campo', label: 'Exhortación y Consulta', icon: <EyeIcon size={18} /> },
  { id: 'documentos', label: 'Control Documentario', icon: <FileTextIcon size={18} /> },
  { id: 'mapa', label: 'Mapa de Cobertura', icon: <MapPinIcon size={18} /> },
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
    <div className="flex min-h-screen bg-bg-app">
      {/* ================================================================ */}
      {/* SIDEBAR INSTITUCIONAL - AZUL NAVY INSTITUCIONAL                   */}
      {/* ================================================================ */}
      <aside
        className="w-[280px] bg-[linear-gradient(180deg,#163666_0%,#10264a_100%)] text-[#ffffff] flex flex-col shrink-0 border-r border-r-[rgba(255,255,255,0.1)] shadow-[4px_0_20px_rgba(16,38,74,0.25)] z-[100]"
      >
        {/* Brand Header con Logo Oficial SJL */}
        <div
          className="pt-[24px] px-[20px] pb-[20px] border-b border-b-[rgba(255,255,255,0.1)] flex flex-col items-center justify-center text-center gap-[14px] bg-[rgba(255,255,255,0.02)]"
        >
          <div className="flex items-center justify-center w-full">
            <img
              src="/logo-sjl-white.png"
              alt="Municipalidad de San Juan de Lurigancho"
              className="h-[66px] w-auto max-w-[220px] object-contain"
            />
          </div>
          <div className="text-center">
            <div className="text-[13px] font-bold text-[#ffffff] tracking-[0.2px]">
              Fiscalización Administrativa
            </div>
            <div className="text-[11px] text-[#bfdbfe] mt-[3px]">
              MDSJL • Sistema Sancionador PAS
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="py-[16px] px-[12px] flex-1 overflow-y-auto">
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#93c5fd] pt-[4px] px-[12px] pb-[8px] opacity-[0.75]"
          >
            Módulos del Sistema
          </div>

          <nav className="flex flex-col gap-[2px]">
            {navItems.filter((item) => esVisibleParaRol(item, user?.rol)).map((item) => {
              const active = currentModule === item.id;
              const count = badgeCounts[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectModule(item.id)}
                  className={`flex items-center justify-between py-[9px] px-[12px] rounded-[6px] border-0 cursor-pointer text-[13px] [transition:background-color_150ms_ease,color_150ms_ease] text-left w-full shadow-none ${active ? 'bg-[rgba(255,255,255,0.12)]' : 'bg-transparent'} ${active ? 'text-[#ffffff]' : 'text-[#cbd5e1] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ffffff]'} ${active ? 'font-semibold' : 'font-normal'}`}
                >
                  <div className="flex items-center gap-[10px]">
                    <span className={`flex items-center ${active ? 'text-[#38bdf8]' : 'text-[#94a3b8]'}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {typeof count === 'number' && count > 0 && (
                    <span
                      className="text-[11px] font-bold min-w-[19px] h-[19px] py-0 px-[6px] rounded-[10px] bg-[#ef4444] text-[#ffffff] inline-flex items-center justify-center"
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
          className="p-[16px] border-t border-t-[rgba(255,255,255,0.1)] bg-[#0c1f3c]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[10px] min-w-0">
              <div
                className="w-[36px] h-[36px] rounded-full bg-[#1d4ed8] text-[#ffffff] flex items-center justify-center font-bold text-[13px] shrink-0 border border-[rgba(255,255,255,0.2)]"
              >
                {cleanName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div
                  className="text-[13px] font-semibold text-[#ffffff] whitespace-nowrap overflow-hidden text-ellipsis"
                  title={cleanName}
                >
                  {cleanName}
                </div>
                <div className="text-[11px] text-[#93c5fd]">
                  {cleanRole} • DNI: {user?.dni ?? '---'}
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="bg-transparent border-0 text-[#bfdbfe] cursor-pointer p-[6px] rounded-[6px] flex items-center justify-center [transition:color_150ms] hover:text-[#f87171]"
            >
              <LogOutIcon size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ================================================================ */}
      {/* MAIN CONTENT AREA                                                */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Topbar Header */}
        <header className="h-[64px] bg-[#ffffff] border-b border-b-[#e2e8f0] flex items-center justify-between px-[32px] relative z-[20] max-md:px-[16px]">
          <div className="flex items-center gap-[12px]">
            <div className="flex items-center gap-[8px] text-[13px] text-[#64748b]">
              <span className="font-medium">Fiscalización</span>
              <span className="text-[#cbd5e1]">/</span>
              <span className="text-[#0f172a] font-bold">{currentNav?.label}</span>
            </div>
            <span
              className="text-[11px] font-semibold text-[#0369a1] bg-[#e0f2fe] py-[2px] px-[8px] rounded-[6px]"
            >
              MDSJL
            </span>
          </div>

          <div className="flex items-center gap-[20px]">
            {/* Estado de conexión */}
            <div
              className="flex items-center gap-[7px] text-[12px] font-medium text-[#059669]"
              title="Conexión en vivo con el servidor"
            >
              <span
                className="w-[7px] h-[7px] rounded-full bg-[#10b981] shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"
              />
              <span>Sistema en línea</span>
            </div>

            {/* Fecha oficial */}
            <div
              className="flex items-center gap-[7px] text-[13px] text-[#64748b] border-l border-l-[#e2e8f0] pl-[16px]"
            >
              <CalendarIcon size={15} color="#94a3b8" />
              <span className="capitalize">
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
              className="border-l border-l-[#e2e8f0] pl-[16px] flex items-center"
            >
              <button
                onClick={() => onSelectModule('expedientes')}
                title={
                  totalPendientes > 0
                    ? `${totalPendientes} expedientes pendientes de validación`
                    : 'Sin notificaciones pendientes'
                }
                className="relative bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] w-[36px] h-[36px] flex items-center justify-center cursor-pointer text-[#64748b] [transition:all_150ms_ease] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              >
                <BellIcon size={17} />
                {totalPendientes > 0 && (
                  <span
                    className="absolute -top-[4px] -right-[4px] min-w-[18px] h-[18px] py-0 px-[4px] rounded-[9px] bg-[#ef4444] text-[#ffffff] text-[10px] font-bold flex items-center justify-center border-2 border-[#ffffff]"
                  >
                    {totalPendientes}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto pt-[24px] px-[32px] pb-[48px] max-md:p-[16px]">{children}</main>
      </div>
    </div>
  );
};