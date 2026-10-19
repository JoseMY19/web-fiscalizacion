import React from 'react';
import { usePuntero } from './loginUi';

/** Anillos concéntricos muy tenues, como ondas que se expanden desde una esquina. */
const Anillos: React.FC<{ className: string }> = ({ className }) => (
  <svg viewBox="0 0 600 600" fill="none" className={className}>
    {[80, 150, 220, 290].map((r, i) => (
      <circle key={r} cx="300" cy="300" r={r} stroke="white" strokeOpacity={0.09 - i * 0.018} strokeWidth="1.2" />
    ))}
  </svg>
);

/**
 * Fondo del login: degradado azul suave con luces difusas que se desplazan
 * lento, anillos tenues en dos esquinas, ondas en la parte de abajo y un halo
 * de luz que acompaña al puntero.
 */
export const LoginFondo: React.FC = () => {
  const ref = usePuntero<HTMLDivElement>({ global: true });

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed inset-0 overflow-hidden bg-linear-to-br from-[#2a5893] via-marino-900 to-marino-950 [--px:50vw] [--py:40vh]"
    >
      {/* Luces difusas */}
      <div className="absolute -top-[20vh] -left-[10vw] w-[55vw] h-[55vw] rounded-full bg-blue-400 opacity-[0.28] blur-[130px] animate-flotar-a motion-reduce:animate-none" />
      <div className="absolute -bottom-[25vh] -right-[12vw] w-[50vw] h-[50vw] rounded-full bg-sjl-turquesa opacity-[0.20] blur-[130px] animate-flotar-b motion-reduce:animate-none" />
      <div className="absolute top-[30vh] left-[40vw] w-[30vw] h-[30vw] rounded-full bg-blue-300 opacity-[0.12] blur-[120px] animate-flotar-b motion-reduce:animate-none [animation-delay:-9s]" />

      {/* Anillos en esquinas opuestas */}
      <Anillos className="absolute -top-[180px] -right-[160px] w-[620px] h-[620px] animate-[spin_120s_linear_infinite] motion-reduce:animate-none" />
      <Anillos className="absolute -bottom-[240px] -left-[200px] w-[560px] h-[560px] animate-[spin_160s_linear_infinite_reverse] motion-reduce:animate-none" />

      {/* Ondas en la parte de abajo */}
      <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-[34vh]">
        <path
          fill="white"
          fillOpacity="0.035"
          d="M0,224 C180,170 360,150 540,182 C720,214 900,288 1080,277 C1260,266 1350,213 1440,192 L1440,320 L0,320 Z"
        />
        <path
          fill="white"
          fillOpacity="0.05"
          d="M0,272 C240,240 420,224 660,250 C900,276 1080,304 1260,290 C1350,283 1400,270 1440,262 L1440,320 L0,320 Z"
        />
      </svg>

      {/* Viñeta suave para que la tarjeta resalte en el centro */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(8,20,45,0.45)_100%)]" />
      {/* Halo de luz que acompaña al puntero */}
      <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_var(--px)_var(--py),rgba(255,255,255,0.07),transparent_60%)]" />
    </div>
  );
};
