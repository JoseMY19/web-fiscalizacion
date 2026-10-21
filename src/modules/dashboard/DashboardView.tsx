import React, { useEffect, useState } from 'react';
import {
  ExpedientesApi,
  IfiApi,
  ResolucionesApi,
} from '../../api';
import { Button, Spinner } from '../../components/common/Common';
import { ArrowRightIcon, BellIcon, ExpedienteIcon, FileTextIcon, GavelIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { NavModule } from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { varianteDiasEnFirma } from '../resoluciones/resolucionUi';
import { AtencionRequerida } from '../alertas/AtencionRequerida';
import { useAlertas } from '../alertas/AlertasContext';
import { cn } from '../../lib/cn';
import { useConteoAnimado } from '../../lib/useConteoAnimado';
import { ACENTOS, AcentoBandeja, RECORRIDO, fechaLarga, saludoDelDia } from './dashboardUi';

interface DashboardViewProps {
  onNavigate: (module: NavModule) => void;
}

// ============================================================================
// TARJETA DE BANDEJA: cuántos expedientes esperan y a dónde ir
// ============================================================================
const TarjetaBandeja: React.FC<{
  titulo: string;
  detalle: string;
  cantidad: number;
  cargando: boolean;
  icono: React.ReactNode;
  acento: AcentoBandeja;
  extra?: React.ReactNode;
  retraso: number;
  onClick: () => void;
}> = ({ titulo, detalle, cantidad, cargando, icono, acento, extra, retraso, onClick }) => {
  const numero = useConteoAnimado(cargando ? 0 : cantidad);
  const estilo = ACENTOS[acento];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${retraso}ms` }}
      className={cn(
        'group relative overflow-hidden text-left flex flex-col p-[20px] rounded-lg bg-bg-card border border-border cursor-pointer shadow-xs',
        '[transition:transform_250ms_cubic-bezier(0.2,0.8,0.2,1),box-shadow_250ms,border-color_250ms]',
        'hover:-translate-y-[3px] hover:shadow-lg hover:border-border-dark',
        'animate-aparecer',
      )}
    >
      {/* Barra de color arriba y brillo que aparece al pasar el mouse */}
      <span aria-hidden className={cn('absolute top-0 left-0 right-0 h-[3px]', estilo.barra)} />
      <span
        aria-hidden
        className={cn('absolute -top-[60px] -right-[60px] w-[140px] h-[140px] rounded-full blur-[50px] opacity-0 [transition:opacity_300ms] group-hover:opacity-20', estilo.brillo)}
      />

      <span className="relative flex items-start justify-between">
        <span className={cn('w-[42px] h-[42px] rounded-md flex items-center justify-center', estilo.icono)}>{icono}</span>
        <span className="text-text-light [transition:transform_250ms,color_250ms] group-hover:translate-x-[3px] group-hover:text-text-main">
          <ArrowRightIcon size={18} />
        </span>
      </span>

      <span className="relative mt-[18px] font-display text-[36px] font-bold leading-none tracking-[-1px] text-text-main tabular-nums">
        {cargando ? <Spinner size={26} /> : numero}
      </span>
      <span className="relative mt-[10px] text-[14px] font-bold text-text-main">{titulo}</span>
      <span className="relative mt-[2px] text-[12.5px] text-text-muted">{detalle}</span>
      {extra}
    </button>
  );
};

// ============================================================================
// RECORRIDO DEL EXPEDIENTE: línea de pasos, cada uno abre su módulo
// ============================================================================
const Recorrido: React.FC<{ onNavigate: (m: NavModule) => void }> = ({ onNavigate }) => (
  <section className="rounded-lg bg-bg-card border border-border shadow-xs p-[24px] animate-aparecer [animation-delay:420ms]">
    <h3 className="text-[16px] font-bold text-text-main m-0">Recorrido del expediente</h3>
    <p className="text-[12.5px] text-text-muted mt-[4px] mb-0">De la intervención en campo hasta la cobranza. Elige una etapa para abrir su bandeja.</p>

    <ol className="relative list-none m-0 mt-[28px] p-0 grid grid-cols-7 gap-[8px] max-xl:grid-cols-4 max-md:grid-cols-2">
      {/* Línea que une los pasos (solo cuando caben en una fila) */}
      <span aria-hidden className="absolute top-[17px] left-[7%] right-[7%] h-[2px] rounded-full bg-linear-to-r from-sjl-rojo via-sjl-naranja to-sjl-turquesa opacity-30 max-xl:hidden" />
      {RECORRIDO.map((p) => {
        const contenido = (
          <>
            <span
              className={cn(
                'relative z-[1] w-[36px] h-[36px] rounded-full flex items-center justify-center font-display text-[13px] font-bold',
                '[transition:all_250ms_cubic-bezier(0.2,0.8,0.2,1)]',
                p.modulo
                  ? 'bg-white border-2 border-border-dark text-text-secondary group-hover:bg-blue-800 group-hover:border-blue-800 group-hover:text-white group-hover:scale-110 group-hover:shadow-[0_0_0_6px_var(--color-blue-100)]'
                  : 'bg-bg-subtle border-2 border-dashed border-border-dark text-text-light',
              )}
            >
              {p.paso}
            </span>
            <span className={cn('block mt-[12px] text-[13.5px] font-bold [transition:color_200ms]', p.modulo ? 'text-text-main group-hover:text-blue-800' : 'text-text-muted')}>
              {p.titulo}
            </span>
            <span className="block text-[12px] text-text-muted mt-[4px] leading-[1.4]">{p.detalle}</span>
          </>
        );
        return (
          <li key={p.paso} className="flex">
            {p.modulo ? (
              <button
                type="button"
                onClick={() => onNavigate(p.modulo as NavModule)}
                className="group w-full flex flex-col items-center text-center px-[6px] py-[4px] bg-transparent border-0 rounded-md cursor-pointer"
              >
                {contenido}
              </button>
            ) : (
              <div className="w-full flex flex-col items-center text-center px-[6px] py-[4px]" title="Se realiza en la aplicación de campo">
                {contenido}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  </section>
);

// ============================================================================
// PANEL PRINCIPAL
// ============================================================================
export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  // Alertas vencidas o críticas (centro de alertas, mismo origen que la campana).
  const { resumen } = useAlertas();
  const alertasCriticas = resumen?.criticas ?? 0;
  const [stats, setStats] = useState({
    pendientesValidacion: 0,
    pendientesIfi: 0,
    pendientesResolucion: 0,
    // O5: resoluciones entregadas al Subgerente y la más antigua en firma.
    porFirmar: 0,
    maxDiasEnFirma: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [exp, ifi, res] = await Promise.allSettled([
        ExpedientesApi.getPendientes(),
        IfiApi.getPendientes(),
        ResolucionesApi.getBandeja(),
      ]);
      const porFirmar = res.status === 'fulfilled' ? (res.value?.porFirmar ?? []) : [];

      setStats({
        pendientesValidacion: exp.status === 'fulfilled' && Array.isArray(exp.value) ? exp.value.length : 0,
        pendientesIfi:
          ifi.status === 'fulfilled' && ifi.value?.pendientes ? ifi.value.pendientes.length : 0,
        pendientesResolucion:
          res.status === 'fulfilled' && res.value ? (res.value.enRedaccion?.length ?? 0) + (res.value.porFirmar?.length ?? 0) : 0,
        porFirmar: porFirmar.length,
        maxDiasEnFirma: porFirmar.reduce((m, f) => Math.max(m, f.plazos?.diasEnFirma ?? 0), 0),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const colorFirma = varianteDiasEnFirma(stats.maxDiasEnFirma) === 'danger' ? 'text-danger' : varianteDiasEnFirma(stats.maxDiasEnFirma) === 'warning' ? 'text-warning' : 'text-text-muted';
  const primerNombre = (user?.nombres ?? '').replace(/\s*\(admin\s*dev\)/gi, '').trim().split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-[24px]">
      {/* Saludo y fecha */}
      <header className="flex items-end justify-between gap-[16px] flex-wrap animate-aparecer">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[1.6px] text-blue-800 m-0">{fechaLarga()}</p>
          <h1 className="text-[30px] font-bold text-text-main tracking-[-0.8px] leading-[1.15] mt-[6px] mb-0">
            {saludoDelDia()}
            {primerNombre && <>, <span className="bg-linear-to-r from-blue-500 to-blue-800 bg-clip-text text-transparent">{primerNombre}</span></>}
          </h1>
          <p className="text-[14px] text-text-muted mt-[6px] mb-0">Lo que requiere tu atención hoy y cuántos expedientes esperan en cada bandeja.</p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={loading} onClick={loadData}>
          Actualizar
        </Button>
      </header>

      {/* Bandejas: una tarjeta por cola de trabajo */}
      <div className="grid grid-cols-4 gap-[16px] max-xl:grid-cols-2 max-sm:grid-cols-1">
        <TarjetaBandeja
          titulo="Validación de expedientes"
          detalle="Pendientes de revisar"
          cantidad={stats.pendientesValidacion}
          cargando={loading}
          icono={<ExpedienteIcon size={20} />}
          acento="turquesa"
          retraso={60}
          onClick={() => onNavigate('expedientes')}
        />
        <TarjetaBandeja
          titulo="Instrucción e IFI"
          detalle="Para descargos e informe final"
          cantidad={stats.pendientesIfi}
          cargando={loading}
          icono={<FileTextIcon size={20} />}
          acento="naranja"
          retraso={120}
          onClick={() => onNavigate('ifi')}
        />
        <TarjetaBandeja
          titulo="Resolución sancionadora"
          detalle="Para redactar o firmar"
          cantidad={stats.pendientesResolucion}
          cargando={loading}
          icono={<GavelIcon size={20} />}
          acento="azul"
          retraso={180}
          extra={
            !loading && stats.porFirmar > 0 ? (
              <span className={cn('relative block text-[12px] font-semibold mt-[6px]', colorFirma)}>
                {stats.porFirmar} por firmar (la más antigua hace {stats.maxDiasEnFirma} día{stats.maxDiasEnFirma === 1 ? '' : 's'})
              </span>
            ) : undefined
          }
          onClick={() => onNavigate('resoluciones')}
        />
        <TarjetaBandeja
          titulo="Alertas críticas"
          detalle="Vencidas o por vencer pronto"
          cantidad={alertasCriticas}
          cargando={loading}
          icono={<BellIcon size={20} />}
          acento={alertasCriticas > 0 ? 'peligro' : 'verde'}
          retraso={240}
          onClick={() => onNavigate('alertas')}
        />
      </div>

      {/* Centro de alertas: lo más urgente de todos los expedientes. */}
      <div className="animate-aparecer [animation-delay:300ms]">
        <AtencionRequerida onNavigate={onNavigate} />
      </div>

      <Recorrido onNavigate={onNavigate} />
    </div>
  );
};
