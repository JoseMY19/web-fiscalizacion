import React, { useState } from 'react';
import { puedeVerModulo as puedeVerModuloPermisos, puedeEditarModulo, PermisosUsuario } from '../../lib/permisos';
import { AvisoSoloLectura } from '../common/AvisoSoloLectura';
import { CampanaAlertas } from '../../modules/alertas/CampanaAlertas';
import { FranjaMarca } from '../common/FranjaMarca';
import { cn } from '../../lib/cn';
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
  UnlockIcon,
  ClockIcon,
  XCircleIcon,
  BuildingIcon,
  ChevronRightIcon,
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
  { id: 'coactiva-pagos', label: 'Acto Firme', icon: <CreditCardIcon size={18} /> },
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

/**
 * Grupos del menú, en el orden del recorrido del expediente. Cada módulo
 * pertenece a un solo grupo; un grupo sin módulos visibles para el usuario
 * no se muestra. El primero ("Inicio") va sin título.
 */
const GRUPOS_NAV: { id: string; titulo: string | null; modulos: NavModule[] }[] = [
  { id: 'inicio', titulo: null, modulos: ['dashboard', 'alertas'] },
  { id: 'procedimiento', titulo: 'Procedimiento sancionador', modulos: ['expedientes', 'notificaciones', 'ifi', 'resoluciones', 'recursos'] },
  { id: 'cobranza', titulo: 'Cobranza', modulos: ['coactiva-pagos', 'coactiva', 'pagos'] },
  { id: 'incidentes', titulo: 'Incidentes y plazos', modulos: ['levantamientos', 'cautelares', 'caducidad', 'prescripcion'] },
  { id: 'consulta', titulo: 'Consulta', modulos: ['consulta-campo', 'documentos', 'mapa'] },
  { id: 'administracion', titulo: 'Administración', modulos: ['configuracion', 'usuarios'] },
];

const CLAVE_GRUPOS_CERRADOS = 'pas.menu.gruposCerrados';

function leerGruposCerrados(): string[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_GRUPOS_CERRADOS) ?? '[]');
    return Array.isArray(guardado) ? guardado.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

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
  const grupoActual = GRUPOS_NAV.find((g) => g.modulos.includes(currentModule));
  // Grupos plegados por el usuario (se recuerdan en el navegador). El grupo del módulo abierto siempre se ve.
  const [gruposCerrados, setGruposCerrados] = useState<string[]>(leerGruposCerrados);
  const alternarGrupo = (id: string) => {
    const nuevos = gruposCerrados.includes(id) ? gruposCerrados.filter((g) => g !== id) : [...gruposCerrados, id];
    setGruposCerrados(nuevos);
    try {
      localStorage.setItem(CLAVE_GRUPOS_CERRADOS, JSON.stringify(nuevos));
    } catch {
      // sin almacenamiento disponible: el menú funciona igual, solo no recuerda la preferencia
    }
  };

  const cleanName = (user?.nombres || 'Carla Vega').replace(/\s*\(admin\s*dev\)/gi, '').trim();
  const cleanRole = user?.rolNombre ?? 'Oficina';

  return (
    <div className="flex min-h-screen bg-bg-app">
      {/* ================================================================ */}
      {/* MENÚ LATERAL - DEGRADADO VINO (#3A0F26 → #1C0912), ACENTO ROSA     */}
      {/* ================================================================ */}
      <aside className="w-[272px] sticky top-0 h-screen overflow-hidden bg-linear-to-b from-marino-900 to-marino-950 text-white flex flex-col shrink-0 border-r border-white/5 z-[100]">
        {/* Brillo rosa suave detrás del logo */}
        <div aria-hidden className="absolute -top-[140px] -left-[60px] w-[380px] h-[320px] rounded-full bg-blue-500 opacity-25 blur-[90px] pointer-events-none" />
        <FranjaMarca className="relative shrink-0" />

        {/* Logo y nombre del sistema */}
        <div className="relative shrink-0 pt-[18px] px-[16px] pb-[14px] flex flex-col items-center text-center gap-[10px]">
          <img src="/logo-sjl-white.png" alt="Municipalidad de San Juan de Lurigancho" className="h-[60px] w-auto max-w-[210px] object-contain scale-[1.15]" />
          <div className="font-display text-[10.5px] font-semibold uppercase tracking-[2.4px] text-blue-300">Sistema Sancionador PAS</div>
        </div>

        {/* Navegación por grupos */}
        <div className="relative py-[8px] px-[12px] flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
          <nav className="flex flex-col gap-[16px]">
            {GRUPOS_NAV.map((grupo) => {
              const items = grupo.modulos
                .map((id) => navItems.find((n) => n.id === id))
                .filter((item): item is NavItemConDef => !!item && puedeVerModulo(item.id, user?.permisos));
              if (items.length === 0) return null;

              const contieneActivo = grupo.modulos.includes(currentModule);
              const abierto = !grupo.titulo || contieneActivo || !gruposCerrados.includes(grupo.id);
              // Plegado, el grupo avisa igual si adentro hay algo pendiente.
              const pendiente = items.some((i) => (badgeCounts[i.id] ?? 0) > 0 || (badgeAlertas[i.id]?.count ?? 0) > 0);

              return (
                <div key={grupo.id}>
                  {grupo.titulo && (
                    <button
                      type="button"
                      onClick={() => alternarGrupo(grupo.id)}
                      aria-expanded={abierto}
                      className="w-full flex items-center gap-[6px] py-[4px] px-[12px] mb-[4px] bg-transparent border-0 cursor-pointer rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-white/30 text-left text-[10.5px] font-bold uppercase tracking-[1.4px] text-white/45 [transition:color_150ms_ease] hover:text-white/80"
                    >
                      <span className={cn('inline-flex [transition:transform_200ms_ease]', abierto && 'rotate-90')}>
                        <ChevronRightIcon size={12} />
                      </span>
                      <span className="flex-1">{grupo.titulo}</span>
                      {!abierto && pendiente && <span className="w-[7px] h-[7px] rounded-full bg-danger" title="Hay pendientes en este grupo" />}
                    </button>
                  )}
                  {abierto && (
                    <div className="flex flex-col gap-[2px] animate-aparecer [animation-duration:300ms]">
                      {items.map((item) => {
                        const active = currentModule === item.id;
                        const count = badgeCounts[item.id];
                        const alerta = badgeAlertas[item.id];
                        const alertaRoja = !!alerta && /vencid|cr[ií]tic|por vencer/i.test(alerta.title);
                        return (
                          <button
                            key={item.id}
                            onClick={() => onSelectModule(item.id)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'group relative flex items-center justify-between py-[9px] px-[12px] rounded-md border-0 cursor-pointer text-[13px] text-left w-full',
                              // Sin contorno al hacer clic; anillo rosa solo al navegar con teclado.
                              'outline-none focus-visible:ring-1 focus-visible:ring-white/30',
                              '[transition:background-color_150ms_ease,color_150ms_ease]',
                              active ? 'bg-white/[0.10] text-white font-bold' : 'bg-transparent text-white/75 font-medium hover:bg-white/[0.05] hover:text-white',
                            )}
                          >
                            {/* Indicador del módulo activo */}
                            <span
                              aria-hidden
                              className={cn(
                                'absolute left-0 top-[20%] h-[60%] w-[3px] rounded-full bg-blue-400',
                                '[transition:transform_250ms_cubic-bezier(0.2,0.8,0.2,1)]',
                                active ? 'scale-y-100' : 'scale-y-0',
                              )}
                            />
                            <span className="flex items-center gap-[10px] [transition:transform_200ms_ease] group-hover:translate-x-[2px]">
                              <span className={cn('flex items-center [transition:color_150ms_ease]', active ? 'text-blue-300' : 'text-white/50 group-hover:text-white/85')}>
                                {item.icon}
                              </span>
                              <span>{item.label}</span>
                            </span>
                            {/* Cola de trabajo: número en burbuja rosa.
                                Urgencia: solo un punto de color; el detalle de qué vence está en Alertas y Plazos. */}
                            <span className="inline-flex items-center gap-[8px]">
                              {typeof count === 'number' && count > 0 && (
                                <span className="min-w-[20px] h-[20px] px-[6px] rounded-pill bg-blue-800 text-white text-[11px] font-bold tabular-nums flex items-center justify-center" title={`${count} pendiente${count === 1 ? '' : 's'}`}>
                                  {count > 99 ? '99+' : count}
                                </span>
                              )}
                              {alerta && alerta.count > 0 && (
                                <span title={alerta.title} className="relative flex w-[8px] h-[8px] shrink-0">
                                  {alertaRoja && <span className="absolute inset-0 rounded-full bg-danger opacity-60 animate-ping motion-reduce:animate-none" />}
                                  <span className={cn('relative w-[8px] h-[8px] rounded-full ring-2 ring-marino-950', alertaRoja ? 'bg-danger' : 'bg-warning')} />
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Usuario, cambio de contraseña y cierre de sesión */}
        <div className="relative shrink-0 m-[12px] mt-[4px] py-[12px] px-[12px] rounded-lg bg-white/[0.05] border border-white/10">
          <div className="flex items-center justify-between gap-[8px]">
            <div className="flex items-center gap-[10px] min-w-0" title={`DNI ${user?.dni ?? ''}`}>
              <div className="w-[36px] h-[36px] rounded-full bg-linear-to-br from-blue-500 to-blue-800 text-white flex items-center justify-center font-display font-bold text-[13px] shrink-0 ring-2 ring-white/15">
                {cleanName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis" title={cleanName}>
                  {cleanName}
                </div>
                <div className="text-[11px] text-white/55 whitespace-nowrap overflow-hidden text-ellipsis" title={cleanRole}>{cleanRole}</div>
              </div>
            </div>
            <div className="flex items-center gap-[2px]">
              {onChangePassword && (
                <button
                  onClick={onChangePassword}
                  title="Cambiar contraseña"
                  className="bg-transparent border-0 text-white/55 cursor-pointer p-[7px] rounded-sm flex items-center justify-center [transition:color_150ms,background-color_150ms] hover:text-white hover:bg-white/10"
                >
                  <UnlockIcon size={17} />
                </button>
              )}
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="bg-transparent border-0 text-white/55 cursor-pointer p-[7px] rounded-sm flex items-center justify-center [transition:color_150ms,background-color_150ms] hover:text-red-400 hover:bg-white/10"
              >
                <LogOutIcon size={17} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ================================================================ */}
      {/* ÁREA DE CONTENIDO                                                 */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Barra superior: fija, translúcida y discreta. El título de la página lo pone cada módulo. */}
        <header className="sticky top-0 h-[60px] bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-[32px] z-[20] max-md:px-[16px]">
          <div className="flex items-center gap-[14px] min-w-0">
            {/* Miga de pan: sistema / grupo / pantalla actual (resaltada), en letra pequeña para no competir con el título de la página */}
            <nav aria-label="Ubicación" className="flex items-center gap-[10px] text-[11px] font-bold uppercase tracking-[1px] text-text-light min-w-0 whitespace-nowrap">
              <span>MDSJL</span>
              <span className="text-border-dark">/</span>
              <span>PAS</span>
              {grupoActual?.titulo && (
                <>
                  <span className="text-border-dark">/</span>
                  <span>{grupoActual.titulo}</span>
                </>
              )}
              <span className="text-border-dark">/</span>
              <span key={currentModule} className="bg-blue-50 text-blue-800 py-[4px] px-[10px] rounded-pill border border-blue-100 overflow-hidden text-ellipsis animate-aparecer [animation-duration:350ms]">
                {currentNav?.label}
              </span>
            </nav>
          </div>

          {/* Campana: alertas vencidas, críticas y por vencer, con la fase y el plazo de cada expediente */}
          <CampanaAlertas onIr={onSelectModule} />
        </header>

        {/* Contenido de la página (entra con una animación suave al cambiar de módulo) */}
        <main key={currentModule} className="flex-1 w-full max-w-[1600px] mx-auto pt-[28px] px-[32px] pb-[48px] max-md:p-[16px] animate-aparecer [animation-duration:450ms]">
          {currentModule !== 'dashboard' && currentModule !== 'alertas' && currentModule !== 'usuarios' && !puedeEditarModulo(currentModule, user?.permisos) && (
            <AvisoSoloLectura rolNombre={user?.rolNombre} />
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
