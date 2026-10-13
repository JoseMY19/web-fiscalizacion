import React, { useEffect, useState } from 'react';
import {
  ExpedientesApi,
  IfiApi,
  ResolucionesApi,
} from '../../api';
import { Card, Button, Spinner } from '../../components/common/Common';
import { PageHeader } from '../../components/common/PageKit';
import { ChevronRightIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { NavModule } from '../../components/layout/AppLayout';
import { varianteDiasEnFirma } from '../resoluciones/resolucionUi';
import { AtencionRequerida } from '../alertas/AtencionRequerida';
import { useAlertas } from '../alertas/AlertasContext';
import { cn } from '../../lib/cn';

interface DashboardViewProps {
  onNavigate: (module: NavModule) => void;
}

/** Recorrido del expediente; cada paso lleva a su módulo (Campo es la app móvil, sin pantalla aquí). */
const RECORRIDO: { paso: string; titulo: string; detalle: string; modulo?: NavModule }[] = [
  { paso: '1', titulo: 'Campo', detalle: 'Actas y notificación de cargo' },
  { paso: '2', titulo: 'Validación', detalle: 'Revisión de que esté completo', modulo: 'expedientes' },
  { paso: '3', titulo: 'Notificación', detalle: 'Cédulas domiciliarias', modulo: 'notificaciones' },
  { paso: '4', titulo: 'Instrucción', detalle: 'Descargos e informe final', modulo: 'ifi' },
  { paso: '5', titulo: 'Resolución', detalle: 'RSG / RSGSA', modulo: 'resoluciones' },
  { paso: '6', titulo: 'Recursos', detalle: 'Reconsideración y apelación', modulo: 'recursos' },
  { paso: '7', titulo: 'Cobranza', detalle: 'Acto firme y coactiva', modulo: 'coactiva-pagos' },
];

/** Una fila de la lista de bandejas: nombre, qué espera y cuántos hay. */
const FilaBandeja: React.FC<{
  titulo: string;
  detalle: string;
  cantidad: number;
  cargando: boolean;
  destacada?: boolean;
  extra?: React.ReactNode;
  onClick: () => void;
}> = ({ titulo, detalle, cantidad, cargando, destacada, extra, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full flex items-center gap-[12px] py-[14px] px-[4px] bg-transparent border-0 border-b border-b-border-subtle last:border-b-0 text-left cursor-pointer [transition:background-color_120ms_ease] hover:bg-bg-subtle"
  >
    <span className="min-w-0 flex-1">
      <span className="block text-[13.5px] font-semibold text-text-main">{titulo}</span>
      <span className="block text-[12px] text-text-muted mt-[2px]">{detalle}</span>
      {extra}
    </span>
    <span className={cn('text-[24px] font-extrabold tabular-nums leading-none', destacada ? 'text-danger' : 'text-midnight-900')}>
      {cargando ? <Spinner size={20} /> : cantidad}
    </span>
    <span className="text-text-light [transition:transform_120ms_ease] group-hover:translate-x-[2px] group-hover:text-text-muted">
      <ChevronRightIcon size={18} />
    </span>
  </button>
);

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
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

  return (
    <div>
      <PageHeader
        titulo="Panel Principal"
        descripcion="Procedimiento Administrativo Sancionador: lo que requiere tu atención hoy y cuántos expedientes esperan en cada bandeja."
        acciones={
          <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={loading} onClick={loadData}>
            Actualizar
          </Button>
        }
      />

      {/* Lo urgente, ancho; al lado, el conteo de cada bandeja. */}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-[24px] items-start mb-[32px] max-lg:grid-cols-1">
        {/* Centro de alertas: lo más urgente de todos los expedientes. */}
        <AtencionRequerida onNavigate={onNavigate} />

        <Card title="Bandejas" subtitle="Expedientes esperando una acción">
          <div className="-my-[6px]">
            <FilaBandeja
              titulo="Validación de expedientes"
              detalle="Pendientes de revisar"
              cantidad={stats.pendientesValidacion}
              cargando={loading}
              onClick={() => onNavigate('expedientes')}
            />
            <FilaBandeja
              titulo="Instrucción e IFI"
              detalle="Para descargos e informe final"
              cantidad={stats.pendientesIfi}
              cargando={loading}
              onClick={() => onNavigate('ifi')}
            />
            <FilaBandeja
              titulo="Resolución sancionadora"
              detalle="Para redactar o firmar"
              cantidad={stats.pendientesResolucion}
              cargando={loading}
              extra={
                !loading && stats.porFirmar > 0 ? (
                  <span className={cn('block text-[12px] font-medium mt-[2px]', colorFirma)}>
                    {stats.porFirmar} por firmar (la más antigua hace {stats.maxDiasEnFirma} día{stats.maxDiasEnFirma === 1 ? '' : 's'})
                  </span>
                ) : undefined
              }
              onClick={() => onNavigate('resoluciones')}
            />
            <FilaBandeja
              titulo="Alertas críticas"
              detalle="Vencidas o por vencer pronto"
              cantidad={alertasCriticas}
              cargando={loading}
              destacada={alertasCriticas > 0}
              onClick={() => onNavigate('alertas')}
            />
          </div>
        </Card>
      </div>

      {/* Recorrido del expediente (referencia rápida; cada paso abre su módulo) */}
      <Card title="Recorrido del expediente" subtitle="De la intervención en campo hasta la cobranza">
        <ol className="list-none m-0 p-0 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[8px]">
          {RECORRIDO.map((p) => {
            const contenido = (
              <>
                <span className="flex items-center gap-[8px]">
                  <span className="w-[22px] h-[22px] rounded-full bg-bg-hover text-text-muted text-[11px] font-bold flex items-center justify-center shrink-0">{p.paso}</span>
                  <span className="text-[13.5px] font-bold text-text-main">{p.titulo}</span>
                </span>
                <span className="block text-[12px] text-text-muted mt-[6px] leading-[1.35]">{p.detalle}</span>
              </>
            );
            return (
              <li key={p.paso}>
                {p.modulo ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(p.modulo as NavModule)}
                    className="w-full h-full text-left rounded-sm border border-border bg-white p-[14px] cursor-pointer [transition:background-color_120ms_ease,border-color_120ms_ease] hover:bg-bg-subtle hover:border-border-dark"
                  >
                    {contenido}
                  </button>
                ) : (
                  <div className="h-full rounded-sm border border-dashed border-border p-[14px]">{contenido}</div>
                )}
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
};
