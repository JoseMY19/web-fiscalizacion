import React, { useEffect, useState } from 'react';
import {
  ExpedientesApi,
  IfiApi,
  ResolucionesApi,
  ConfiguracionApi,
} from '../../api';
import { Card, Button, Spinner } from '../../components/common/Common';
import {
  ExpedienteIcon,
  FileTextIcon,
  GavelIcon,
  ClockIcon,
  ArrowRightIcon,
  RefreshCwIcon,
} from '../../components/icons/Icons';
import { NavModule } from '../../components/layout/AppLayout';

interface DashboardViewProps {
  onNavigate: (module: NavModule) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendientesValidacion: 0,
    pendientesIfi: 0,
    pendientesResolucion: 0,
    enRiesgo: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [exp, ifi, res, riesgo] = await Promise.allSettled([
        ExpedientesApi.getPendientes(),
        IfiApi.getPendientes(),
        ResolucionesApi.getPendientes(),
        ConfiguracionApi.getExpedientesEnRiesgo(),
      ]);

      setStats({
        pendientesValidacion: exp.status === 'fulfilled' && Array.isArray(exp.value) ? exp.value.length : 0,
        pendientesIfi:
          ifi.status === 'fulfilled' && ifi.value?.pendientes ? ifi.value.pendientes.length : 0,
        pendientesResolucion: res.status === 'fulfilled' && Array.isArray(res.value) ? res.value.length : 0,
        enRiesgo: riesgo.status === 'fulfilled' && Array.isArray(riesgo.value) ? riesgo.value.length : 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      {/* Welcome Banner in Midnight Blue */}
      <div
        className="bg-[linear-gradient(135deg,#163666_0%,#0f264c_100%)] rounded-lg p-[32px] text-[#ffffff] mb-[28px] flex items-center justify-between shadow-[0_10px_25px_-5px_rgba(22,54,102,0.25)] border border-[rgba(255,255,255,0.08)]"
      >
        <div className="max-w-[650px]">
          <div className="flex items-center gap-[12px] mb-[12px]">
            <img
              src="/logo-sjl-white.png"
              alt="MDSJL"
              className="h-[34px] w-auto object-contain"
            />
            <span
              className="text-[11px] font-bold uppercase tracking-[1px] text-[#38bdf8] bg-[rgba(56,189,248,0.12)] py-[2px] px-[8px] rounded-[4px]"
            >
              Control Operativo PAS
            </span>
          </div>
          <h2 className="text-[24px] font-extrabold mb-[8px] text-[#ffffff]">
            Procedimiento Administrativo Sancionador
          </h2>
          <p className="text-[13px] text-[#cbd5e1] leading-[1.5]">
            Monitoreo en tiempo real del ciclo sancionador municipal: validación formal de actas,
            cédulas de notificación, fase instructora, emisión de resoluciones, impugnaciones y cobranza coactiva.
          </p>
        </div>
        <div>
          <Button
            variant="secondary"
            icon={<RefreshCwIcon size={16} />}
            loading={loading}
            onClick={loadData}
            className="bg-[rgba(255,255,255,0.1)]! text-[#ffffff]! border! border-[rgba(255,255,255,0.2)]!"
          >
            Actualizar Datos
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[20px] mb-[32px]"
      >
        {/* KPI 1 */}
        <Card className="relative! overflow-hidden!">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold text-text-muted">
                Validación de Expedientes
              </p>
              <h3 className="text-[32px] font-extrabold text-midnight-900 mt-[4px]">
                {loading ? <Spinner size={24} /> : stats.pendientesValidacion}
              </h3>
              <p className="text-[12px] text-warning font-semibold mt-[4px]">
                Pendientes de mesa de control
              </p>
            </div>
            <div
              className="w-[46px] h-[46px] rounded-[12px] bg-primary-50 text-primary-600 flex items-center justify-center"
            >
              <ExpedienteIcon size={24} />
            </div>
          </div>
          <div className="mt-[16px] pt-[12px] border-t border-t-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('expedientes')}
              className="p-0! text-primary-600! text-[12px]!"
            >
              Ver expedientes pendientes <ArrowRightIcon size={14} />
            </Button>
          </div>
        </Card>

        {/* KPI 2 */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold text-text-muted">
                En Fase de Instrucción
              </p>
              <h3 className="text-[32px] font-extrabold text-midnight-900 mt-[4px]">
                {loading ? <Spinner size={24} /> : stats.pendientesIfi}
              </h3>
              <p className="text-[12px] text-info font-semibold mt-[4px]">
                Para IFI / Descargos
              </p>
            </div>
            <div
              className="w-[46px] h-[46px] rounded-[12px] bg-info-bg text-info flex items-center justify-center"
            >
              <FileTextIcon size={24} />
            </div>
          </div>
          <div className="mt-[16px] pt-[12px] border-t border-t-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('ifi')}
              className="p-0! text-info! text-[12px]!"
            >
              Ir a bandeja IFI <ArrowRightIcon size={14} />
            </Button>
          </div>
        </Card>

        {/* KPI 3 */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold text-text-muted">
                Pendientes de Resolución
              </p>
              <h3 className="text-[32px] font-extrabold text-midnight-900 mt-[4px]">
                {loading ? <Spinner size={24} /> : stats.pendientesResolucion}
              </h3>
              <p className="text-[12px] text-purple font-semibold mt-[4px]">
                Emisión de RSG / RSGSA
              </p>
            </div>
            <div
              className="w-[46px] h-[46px] rounded-[12px] bg-purple-bg text-purple flex items-center justify-center"
            >
              <GavelIcon size={24} />
            </div>
          </div>
          <div className="mt-[16px] pt-[12px] border-t border-t-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('resoluciones')}
              className="p-0! text-purple! text-[12px]!"
            >
              Ir a Resoluciones <ArrowRightIcon size={14} />
            </Button>
          </div>
        </Card>

        {/* KPI 4 */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold text-text-muted">
                Expedientes en Riesgo
              </p>
              <h3 className={`text-[32px] font-extrabold mt-[4px] ${stats.enRiesgo > 0 ? 'text-danger' : 'text-success'}`}>
                {loading ? <Spinner size={24} /> : stats.enRiesgo}
              </h3>
              <p className="text-[12px] text-text-muted font-semibold mt-[4px]">
                Alerta de plazos / caducidad
              </p>
            </div>
            <div
              className={`w-[46px] h-[46px] rounded-[12px] flex items-center justify-center ${stats.enRiesgo > 0 ? 'bg-danger-bg' : 'bg-success-bg'} ${stats.enRiesgo > 0 ? 'text-danger' : 'text-success'}`}
            >
              <ClockIcon size={24} />
            </div>
          </div>
          <div className="mt-[16px] pt-[12px] border-t border-t-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('configuracion')}
              className="p-0! text-danger! text-[12px]!"
            >
              Ver monitor de plazos <ArrowRightIcon size={14} />
            </Button>
          </div>
        </Card>
      </div>

      {/* BPMN Pipeline Process Diagram */}
      <Card
        title="Flujo Operativo del Procedimiento Sancionador (BPMN 2.0)"
        subtitle="Ruta crítica de los expedientes administrativos según la normativa vigente de San Juan de Lurigancho"
      >
        <div className="flex gap-[12px] overflow-x-auto pt-[8px] px-0 pb-[16px]">
          {[
            { step: 'SP1', title: 'Campo', desc: 'Actas y Notificación de Cargo', active: false },
            { step: 'SP2', title: 'Validación', desc: 'Revisión formal y aprobación', active: true, mod: 'expedientes' as NavModule },
            { step: 'SP3', title: 'Notificación', desc: 'Cédulas domiciliarias', active: false, mod: 'notificaciones' as NavModule },
            { step: 'SP4', title: 'Instrucción', desc: 'Descargos y Planchazo IFI', active: true, mod: 'ifi' as NavModule },
            { step: 'SP5', title: 'Resolución', desc: 'Emisión de RSG / RSGSA', active: true, mod: 'resoluciones' as NavModule },
            { step: 'SP6/7', title: 'Recursos', desc: 'Reconsideración / Apelación GOP', active: false, mod: 'recursos' as NavModule },
            { step: 'SP8', title: 'Coactiva', desc: 'Acto firme y cobranza de multas', active: false, mod: 'coactiva-pagos' as NavModule },
          ].map((item, idx, arr) => (
            <div
              key={item.step}
              onClick={() => item.mod && onNavigate(item.mod)}
              className={`flex-[1_0_160px] p-[16px] rounded-md [transition:all_var(--transition-fast)] ${item.active ? 'bg-primary-50' : 'bg-[#f8fafc]'} ${item.active ? 'border border-primary-100' : 'border border-border'} ${item.mod ? 'cursor-pointer hover:-translate-y-[2px]' : 'cursor-default'}`}
            >
              <div className="flex items-center justify-between mb-[8px]">
                <span
                  className={`text-[11px] font-bold py-[2px] px-[8px] rounded-[4px] text-[#ffffff] ${item.active ? 'bg-primary-600' : 'bg-[#cbd5e1]'}`}
                >
                  {item.step}
                </span>
                {idx < arr.length - 1 && <span className="text-[#cbd5e1] text-[14px]">→</span>}
              </div>
              <h4 className="text-[14px] font-bold text-text-main mb-[4px]">
                {item.title}
              </h4>
              <p className="text-[11px] text-text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};