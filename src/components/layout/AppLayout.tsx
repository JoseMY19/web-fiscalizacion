import React from 'react';
import { puedeVerModulo as puedeVerModuloPermisos, puedeEditarModulo, PermisosUsuario } from '../../lib/permisos';
import { AvisoSoloLectura } from '../common/AvisoSoloLectura';
import { CampanaAlertas } from '../../modules/alertas/CampanaAlertas';
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
  PenToolIcon,
  UnlockIcon,
  ClockIcon,
  XCircleIcon,
  BuildingIcon,
} from '../icons/Icons';

export type NavModule =
  | 'dashboard'
  | 'alertas'
  | 'documentos'
  | 'expedientes'
  | 'consulta-campo'
  | 'notificaciones'
  | 'ifi'
  | 'resoluciones'
  | 'caducidad'
  | 'recursos'
  | 'coactiva-pagos'
  | 'coactiva'
  | 'prescripcion'
  | 'pagos'
  | 'cautelares'
  | 'levantamientos'
  | 'mapa'
  | 'configuracion'
  | 'usuarios';

interface AppLayoutProps {
  currentModule: NavModule;
  onSelectModule: (mod: NavModule) => void;
  user: { nombres: string; dni: string; rol: string; rolNombre?: string; permisos?: PermisosUsuario } | null;
  onLogout: () => void;
  onChangePassword?: () => void;
  children: React.ReactNode;
  badgeCounts?: Partial<Record<NavModule, number>>;
  /** Contador secundario ámbar por módulo (ej. O5: resoluciones esperando la firma del Subgerente). */
  badgeAlertas?: Partial<Record<NavModule, { count: number; title: string; icon?: React.ReactNode }>>;
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
  // Centro de alertas: qué vence, en qué fase está cada expediente y el riesgo. Visible para todos (se filtra por permisos).
  { id: 'alertas', label: 'Alertas y Plazos', icon: <BellIcon size={18} /> },
  { id: 'expedientes', label: 'Validación de Expedientes', icon: <ExpedienteIcon size={18} /> },
  { id: 'notificaciones', label: 'Notificación de Cédulas', icon: <MailIcon size={18} /> },
  { id: 'ifi', label: 'Instrucción e IFI', icon: <FileTextIcon size={18} /> },
  { id: 'resoluciones', label: 'Resolución Sancionadora', icon: <GavelIcon size={18} /> },
  // F2: caducidad del PAS (9 / 12 meses sin resolución final notificada).
  { id: 'caducidad', label: 'Caducidad del PAS', icon: <ClockIcon size={18} /> },
  { id: 'recursos', label: 'Recursos Impugnativos', icon: <ScaleIcon size={18} /> },
  { id: 'coactiva-pagos', label: 'Acto Firme y Cobranza', icon: <CreditCardIcon size={18} /> },
  // F4: expediente coactivo (REC, medidas cautelares, suspensiones, devolución a PAS).
  { id: 'coactiva', label: 'Ejecución Coactiva', icon: <BuildingIcon size={18} /> },
  // F3: prescripción de la exigibilidad de multas (solo a pedido de parte).
  { id: 'prescripcion', label: 'Prescripción de Multas', icon: <XCircleIcon size={18} /> },
  { id: 'pagos', label: 'Registro de Pagos', icon: <CreditCardIcon size={18} /> },
  { id: 'cautelares', label: 'Medidas Cautelares', icon: <ShieldAlertIcon size={18} /> },
  { id: 'levantamientos', label: 'Levantamiento de Medidas', icon: <UnlockIcon size={18} /> },
  { id: 'consulta-campo', label: 'Exhortación y Consulta', icon: <EyeIcon size={18} /> },
  { id: 'documentos', label: 'Control Documentario', icon: <FileTextIcon size={18} /> },
  { id: 'mapa', label: 'Mapa de Cobertura', icon: <MapPinIcon size={18} /> },
  { id: 'configuracion', label: 'Configuración y Parámetros', icon: <CalendarIcon size={18} /> },
  { id: 'usuarios', label: 'Usuarios y Roles', icon: <ShieldAlertIcon size={18} /> },
];

/** Si el usuario puede entrar a ese módulo (menú y rutas usan la misma regla). */
export function puedeVerModulo(modulo: NavModule, permisos: PermisosUsuario | undefined): boolean {
  return modulo === 'dashboard' || modulo === 'alertas' || puedeVerModuloPermisos(modulo, permisos);
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentModule,
  onSelectModule,
  user,
  onLogout,
  onChangePassword,
  children,
  badgeCounts = {},
  badgeAlertas = {},
}) => {
  const currentNav = navItems.find((n) => n.id === currentModule);

  const cleanName = (user?.nombres || 'Carla Vega').replace(/\s*\(admin\s*dev\)/gi, '').trim();
  const cleanRole = user?.rolNombre ?? 'Oficina';

  return (
    <div className="flex min-h-screen bg-bg-app">
      {/* ================================================================ */}
      {/* SIDEBAR INSTITUCIONAL - AZUL NAVY INSTITUCIONAL                   */}
      {/* ================================================================ */}
      <aside
        className="w-[280px] sticky top-0 h-screen overflow-hidden bg-[linear-gradient(180deg,#163666_0%,#10264a_100%)] text-[#ffffff] flex flex-col shrink-0 border-r border-r-[rgba(255,255,255,0.1)] shadow-[4px_0_20px_rgba(16,38,74,0.25)] z-[100]"
      >
        {/* Brand Header con Logo Oficial SJL */}
        <div
          className="shrink-0 pt-[20px] px-[20px] pb-[10px] border-b border-b-[rgba(255,255,255,0.1)] flex flex-col items-center justify-center text-center gap-[4px] bg-[rgba(255,255,255,0.02)]"
        >
          <div className="flex items-center justify-center w-full">
            <img
              src="/logo-sjl-white.png"
              alt="Municipalidad de San Juan de Lurigancho"
              className="h-[60px] w-auto max-w-[200px] object-contain scale-[1.25]"
            />
          </div>
          <div className="text-[13.5px] font-semibold uppercase tracking-[1.4px] text-[#93c5fd]">Sistema Sancionador PAS</div>
        </div>

        {/* Navigation Section */}
        <div className="py-[12px] px-[12px] flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#93c5fd] pt-[4px] px-[12px] pb-[8px] opacity-[0.75]"
          >
            Módulos del Sistema
          </div>

          <nav className="flex flex-col gap-[2px]">
            {navItems.filter((item) => puedeVerModulo(item.id, user?.permisos)).map((item) => {
              const active = currentModule === item.id;
              const count = badgeCounts[item.id];
              const alerta = badgeAlertas[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectModule(item.id)}
                  className={`flex items-center justify-between py-[8px] px-[12px] rounded-[6px] border-0 cursor-pointer text-[13px] [transition:background-color_150ms_ease,color_150ms_ease] text-left w-full shadow-none ${active ? 'bg-[rgba(255,255,255,0.12)]' : 'bg-transparent'} ${active ? 'text-[#ffffff]' : 'text-[#cbd5e1] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ffffff]'} ${active ? 'font-semibold' : 'font-normal'}`}
                >
                  <div className="flex items-center gap-[10px]">
                    <span className={`flex items-center ${active ? 'text-[#38bdf8]' : 'text-[#94a3b8]'}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  <span className="inline-flex items-center gap-[4px]">
                    {alerta && alerta.count > 0 && (
                      <span
                        title={alerta.title}
                        className="text-[11px] font-bold h-[19px] py-0 px-[6px] rounded-[10px] bg-[#f59e0b] text-[#ffffff] inline-flex items-center justify-center gap-[3px]"
                      >
                        {alerta.icon ?? <PenToolIcon size={10} />}
                        {alerta.count}
                      </span>
                    )}
                    {typeof count === 'number' && count > 0 && (
                      <span
                        className="text-[11px] font-bold min-w-[19px] h-[19px] py-0 px-[6px] rounded-[10px] bg-[#ef4444] text-[#ffffff] inline-flex items-center justify-center"
                      >
                        {count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout in Azul Navy */}
        <div
          className="shrink-0 py-[14px] px-[16px] border-t border-t-[rgba(255,255,255,0.1)] bg-[#0c1f3c]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[10px] min-w-0" title={`DNI ${user?.dni ?? ''}`}>
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
                <div className="text-[11px] text-[#93c5fd] whitespace-nowrap overflow-hidden text-ellipsis">{cleanRole}</div>
              </div>
            </div>
            <div className="flex items-center gap-[6px]">
              {onChangePassword && (
                <button
                  onClick={onChangePassword}
                  title="Cambiar contraseña"
                  className="bg-transparent border-0 text-[#bfdbfe] cursor-pointer p-[6px] rounded-[6px] flex items-center justify-center [transition:color_150ms] hover:text-[#38bdf8]"
                >
                  <UnlockIcon size={18} />
                </button>
              )}
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="bg-transparent border-0 text-[#bfdbfe] cursor-pointer p-[6px] rounded-[6px] flex items-center justify-center [transition:color_150ms] hover:text-[#f87171]"
              >
                <LogOutIcon size={18} />
              </button>
            </div>
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

            {/* Campana: alertas vencidas, críticas y por vencer, con la fase y el plazo de cada expediente */}
            <CampanaAlertas onIr={onSelectModule} />
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto pt-[24px] px-[32px] pb-[48px] max-md:p-[16px]">
          {currentModule !== 'dashboard' && currentModule !== 'alertas' && currentModule !== 'usuarios' && !puedeEditarModulo(currentModule, user?.permisos) && (
            <AvisoSoloLectura rolNombre={user?.rolNombre} />
          )}
          {children}
        </main>
      </div>
    </div>
  );
};