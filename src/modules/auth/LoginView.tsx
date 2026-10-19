import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Alert, Spinner } from '../../components/common/Common';
import { cn } from '../../lib/cn';
import { FranjaMarca } from '../../components/common/FranjaMarca';
import { AlertTriangleIcon, ArrowRightIcon, CheckIcon, EyeIcon, EyeOffIcon, LockIcon, UserIcon } from '../../components/icons/Icons';
import { LoginFondo } from './LoginFondo';
import { LoginCampo } from './LoginCampo';
import { usePuntero } from './loginUi';

const LOGO_ALT = 'Municipalidad de San Juan de Lurigancho - es momento de crecer';

// ============================================================================
// PANEL INSTITUCIONAL (ilustración de expedientes, sin texto de relleno)
// ============================================================================
/** Líneas de texto simuladas dentro de un documento. */
const Renglones: React.FC<{ anchos: string[] }> = ({ anchos }) => (
  <div className="flex flex-col gap-[9px]">
    {anchos.map((w, i) => (
      <span key={i} className={cn('h-[7px] rounded-full bg-white/15', w)} />
    ))}
  </div>
);

/**
 * Expedientes apilados de vidrio que flotan suavemente, con un sello en los
 * colores del logo que gira despacio. Solo decoración (aria-hidden).
 */
const IlustracionExpedientes: React.FC = () => (
  <div aria-hidden className="relative h-[250px] mt-[36px] animate-aparecer [animation-delay:220ms]">
    <div className="absolute inset-0 animate-levitar motion-reduce:animate-none">
      {/* Hojas de atrás */}
      <div className="absolute left-[18%] top-[18px] w-[58%] h-[200px] rounded-[18px] border border-white/10 bg-white/[0.04] rotate-[-9deg]" />
      <div className="absolute left-[24%] top-[8px] w-[58%] h-[205px] rounded-[18px] border border-white/10 bg-white/[0.06] rotate-[5deg]" />

      {/* Hoja del frente */}
      <div className="absolute left-[14%] top-[22px] w-[62%] h-[210px] rounded-[18px] border border-white/20 bg-linear-to-br from-white/[0.16] to-white/[0.05] backdrop-blur-md shadow-[0_24px_48px_-16px_rgba(5,15,35,0.6)] p-[22px]">
        <div className="flex items-center gap-[10px] mb-[18px]">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-white/15 border border-white/15" />
          <span className="flex-1 flex flex-col gap-[6px]">
            <span className="h-[7px] w-[55%] rounded-full bg-white/30" />
            <span className="h-[6px] w-[35%] rounded-full bg-white/15" />
          </span>
        </div>
        <Renglones anchos={['w-full', 'w-[88%]', 'w-[94%]', 'w-[70%]']} />
        <span className="absolute left-[22px] bottom-[22px] h-[22px] w-[34%] rounded-pill bg-blue-400/25 border border-blue-300/30" />
      </div>

      {/* Sello: anillo con los colores del logo que gira y un check al centro */}
      <div className="absolute left-[62%] top-[150px] w-[88px] h-[88px]">
        <span className="absolute inset-0 rounded-full bg-[conic-gradient(var(--color-sjl-rojo),var(--color-sjl-magenta),var(--color-sjl-naranja),var(--color-sjl-verde),var(--color-sjl-turquesa),var(--color-sjl-rojo))] animate-[spin_14s_linear_infinite] motion-reduce:animate-none shadow-[0_12px_30px_-8px_rgba(5,15,35,0.7)]" />
        <span className="absolute inset-[5px] rounded-full bg-marino-900 flex items-center justify-center">
          <span className="w-[54px] h-[54px] rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white">
            <CheckIcon size={26} />
          </span>
        </span>
      </div>
    </div>
  </div>
);

const PanelInstitucional: React.FC = () => (
  <aside className="hidden lg:flex flex-col justify-between relative overflow-hidden text-white p-[48px] bg-white/[0.04] border-r border-white/10">
    {/* Reflejo de luz que sigue al puntero sobre la tarjeta */}
    <div aria-hidden className="absolute inset-0 pointer-events-none bg-[radial-gradient(420px_circle_at_var(--px,30%)_var(--py,20%),rgba(255,255,255,0.09),transparent_65%)]" />

    <img src="/logo-sjl-white.png" alt={LOGO_ALT} className="relative h-[72px] w-auto self-start -ml-[12px] object-contain animate-aparecer" />

    <div className="relative mt-[40px]">
      <p className="text-[11.5px] font-bold tracking-[2.2px] uppercase text-blue-300 m-0 animate-aparecer [animation-delay:80ms]">
        Subgerencia de Fiscalización
      </p>
      <h1 className="text-[30px] leading-[1.15] font-extrabold tracking-[-0.6px] mt-[12px] mb-0 animate-aparecer [animation-delay:140ms]">
        Procedimiento Administrativo Sancionador
      </h1>
      <IlustracionExpedientes />
    </div>

    <div className="relative mt-[40px]">
      <FranjaMarca className="w-[120px] rounded-full mb-[14px]" />
      <p className="text-[12px] text-white/50 m-0">Municipalidad Distrital de San Juan de Lurigancho</p>
    </div>
  </aside>
);

// ============================================================================
// VISTA DE INICIO DE SESIÓN
// ============================================================================
export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [dni, setDni] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [mayusculasActivas, setMayusculasActivas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sacudir, setSacudir] = useState(false);
  const tarjeta = usePuntero<HTMLDivElement>({ inclinacionMax: 2.5 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(dni, contrasena);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
      setSacudir(true);
    } finally {
      setLoading(false);
    }
  };

  const detectarMayusculas = (e: React.KeyboardEvent<HTMLInputElement>) => setMayusculasActivas(e.getModifierState('CapsLock'));

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-[16px] py-[40px] sm:px-[24px]">
      <LoginFondo />

      {/* Logo sobre la tarjeta en pantallas pequeñas (el panel institucional se oculta) */}
      <img src="/logo-sjl-white.png" alt={LOGO_ALT} className="lg:hidden relative h-[60px] w-auto object-contain mb-[24px] animate-aparecer" />

      {/* Tarjeta: se inclina levemente siguiendo al puntero */}
      <div
        ref={tarjeta}
        className={cn(
          'relative w-full max-w-[440px] lg:max-w-[1040px] grid lg:grid-cols-[1.05fr_1fr] rounded-[28px] overflow-hidden',
          'border border-white/15 bg-marino-950/35 backdrop-blur-2xl',
          'shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)_inset]',
          '[transform:perspective(1400px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] [transition:transform_350ms_cubic-bezier(0.2,0.8,0.2,1)]',
        )}
      >
        <PanelInstitucional />

        {/* ============================================================ */}
        {/* FORMULARIO DE ACCESO                                          */}
        {/* ============================================================ */}
        <main
          className={cn('relative bg-white flex flex-col', sacudir && 'animate-sacudir')}
          onAnimationEnd={(e) => e.target === e.currentTarget && setSacudir(false)}
        >
          <FranjaMarca />

          <div className="flex-1 flex flex-col justify-center px-[28px] py-[40px] sm:px-[48px] lg:py-[56px]">
            <div className="inline-flex items-center gap-[8px] self-start py-[5px] px-[12px] rounded-pill bg-blue-50 border border-blue-100 text-[11.5px] font-semibold text-blue-800 animate-aparecer [animation-delay:120ms]">
              <span className="relative flex w-[7px] h-[7px]">
                <span className="absolute inset-0 rounded-full bg-blue-500 opacity-70 animate-ping motion-reduce:animate-none" />
                <span className="relative w-[7px] h-[7px] rounded-full bg-blue-700" />
              </span>
              Módulo Web de Fiscalización
            </div>

            <h2 className="text-[30px] font-extrabold text-text-main tracking-[-0.6px] leading-[1.15] mt-[18px] mb-0 animate-aparecer [animation-delay:180ms]">
              Bienvenido
            </h2>
            <p className="text-[14px] text-text-muted leading-[1.55] mt-[8px] mb-0 animate-aparecer [animation-delay:220ms]">
              Ingresa con tu DNI y la contraseña asignada por la Subgerencia.
            </p>

            {error && (
              <Alert type="error" className="mt-[24px] mb-0! flex items-start gap-[10px] animate-aparecer">
                <span className="mt-[1px] shrink-0">
                  <AlertTriangleIcon size={16} />
                </span>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-[16px] mt-[28px]">
              <div className="animate-aparecer [animation-delay:280ms]">
                <LoginCampo
                  id="login-dni"
                  label="DNI"
                  icono={<UserIcon size={19} />}
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  required
                  maxLength={8}
                  inputMode="numeric"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="animate-aparecer [animation-delay:340ms]">
                <LoginCampo
                  id="login-contrasena"
                  label="Contraseña"
                  icono={<LockIcon size={19} />}
                  type={verContrasena ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  onKeyDown={detectarMayusculas}
                  onKeyUp={detectarMayusculas}
                  required
                  autoComplete="current-password"
                  sufijo={
                    <button
                      type="button"
                      onClick={() => setVerContrasena((v) => !v)}
                      aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      title={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="h-full px-[16px] bg-transparent border-0 text-text-muted cursor-pointer flex items-center [transition:color_200ms] hover:text-blue-700"
                    >
                      {verContrasena ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
                    </button>
                  }
                />
                {mayusculasActivas && (
                  <p className="flex items-center gap-[6px] text-[12px] font-medium text-warning mt-[8px] mb-0 animate-aparecer">
                    <AlertTriangleIcon size={14} /> Bloq Mayús está activado
                  </p>
                )}
              </div>

              {/* Botón con degradado y un destello que lo cruza al pasar el mouse */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'group relative mt-[8px] h-[54px] w-full overflow-hidden rounded-md border-0 cursor-pointer',
                  'inline-flex items-center justify-center gap-[10px] text-[15px] font-bold text-white',
                  'bg-linear-to-r from-blue-500 to-blue-800 shadow-[0_10px_24px_-8px_rgba(29,79,145,0.6)]',
                  '[transition:transform_200ms,box-shadow_200ms]',
                  'enabled:hover:-translate-y-[2px] enabled:hover:shadow-[0_16px_32px_-10px_rgba(29,79,145,0.7)] enabled:active:translate-y-0',
                  'disabled:cursor-wait disabled:opacity-80',
                  'animate-aparecer [animation-delay:400ms]',
                )}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 -left-[60%] w-[50%] skew-x-[-20deg] bg-linear-to-r from-transparent via-white/30 to-transparent [transition:left_700ms_ease] group-enabled:group-hover:left-[120%]"
                />
                {loading ? (
                  <>
                    <Spinner size={18} color="currentColor" /> Verificando…
                  </>
                ) : (
                  <>
                    Ingresar al sistema
                    <span className="[transition:transform_200ms] group-hover:translate-x-[4px]">
                      <ArrowRightIcon size={18} />
                    </span>
                  </>
                )}
              </button>
            </form>

            <p className="text-[12.5px] text-text-muted leading-[1.55] mt-[28px] pt-[20px] border-t border-border-subtle mb-0 animate-aparecer [animation-delay:460ms]">
              ¿Olvidaste tu contraseña? Solicita una contraseña temporal al administrador del sistema.
            </p>
          </div>
        </main>
      </div>

      <footer className="relative mt-[24px] text-center text-[11.5px] text-white/45">
        © {new Date().getFullYear()} Municipalidad Distrital de San Juan de Lurigancho · v2.0
      </footer>
    </div>
  );
};
