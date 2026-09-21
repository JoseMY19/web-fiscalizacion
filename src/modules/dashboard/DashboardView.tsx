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
        style={{
          background: 'linear-gradient(135deg, #0b132b 0%, #1c2e59 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          color: '#ffffff',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px -5px rgba(11, 19, 43, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <img
              src="/logo-sjl-white.png"
              alt="MDSJL"
              style={{ height: '34px', width: 'auto', objectFit: 'contain' }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              Control Operativo PAS
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
            Procedimiento Administrativo Sancionador
          </h2>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
            Monitoreo en tiempo real del ciclo sancionador municipal: validación formal de actas (SP2),
            cédulas (SP3), instrucción IFI (SP4), resoluciones (SP5), impugnaciones (SP6/7) y cobranza coactiva (SP8).
          </p>
        </div>
        <div>
          <Button
            variant="secondary"
            icon={<RefreshCwIcon size={16} />}
            loading={loading}
            onClick={loadData}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            Actualizar Datos
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* KPI 1 */}
        <Card style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Validación de Expedientes
              </p>
              <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-midnight-900)', marginTop: '4px' }}>
                {loading ? <Spinner size={24} /> : stats.pendientesValidacion}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: 600, marginTop: '4px' }}>
                Pendientes de mesa de control
              </p>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ExpedienteIcon size={24} />
            </div>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('expedientes')}
              style={{ padding: 0, color: 'var(--color-primary-600)', fontSize: '12px' }}
            >
              Ir a bandeja SP2 <ArrowRightIcon size={14} />
            </Button>
          </div>
        </Card>

        {/* KPI 2 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                En Fase de Instrucción
              </p>
              <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-midnight-900)', marginTop: '4px' }}>
                {loading ? <Spinner size={24} /> : stats.pendientesIfi}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-info)', fontWeight: 600, marginTop: '4px' }}>
                Para IFI / Descargos
              </p>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-info-bg)',
                color: 'var(--color-info)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileTextIcon size={24} />
            </div>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('ifi')}
              style={{ padding: 0, color: 'var(--color-info)', fontSize: '12px' }}
            >
              Ir a bandeja IFI <ArrowRightIcon size={14} />
            </Button>
          </div>
        </Card>

        {/* KPI 3 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Pendientes de Resolución
              </p>
              <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-midnight-900)', marginTop: '4px' }}>
                {loading ? <Spinner size={24} /> : stats.pendientesResolucion}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-purple)', fontWeight: 600, marginTop: '4px' }}>
                Emisión de RSG / RSGSA
              </p>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-purple-bg)',
                color: 'var(--color-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GavelIcon size={24} />
            </div>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('resoluciones')}
              style={{ padding: 0, color: 'var(--color-purple)', fontSize: '12px' }}
            >
              Ir a Resoluciones <ArrowRightIcon size={14} />
            </Button>
          </div>
        </Card>

        {/* KPI 4 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Expedientes en Riesgo
              </p>
              <h3 style={{ fontSize: '32px', fontWeight: 800, color: stats.enRiesgo > 0 ? 'var(--color-danger)' : 'var(--color-success)', marginTop: '4px' }}>
                {loading ? <Spinner size={24} /> : stats.enRiesgo}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '4px' }}>
                Alerta de plazos / caducidad
              </p>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: stats.enRiesgo > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                color: stats.enRiesgo > 0 ? 'var(--color-danger)' : 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClockIcon size={24} />
            </div>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('configuracion')}
              style={{ padding: 0, color: 'var(--color-danger)', fontSize: '12px' }}
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
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '8px 0 16px' }}>
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
              style={{
                flex: '1 0 160px',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: item.active ? 'var(--color-primary-50)' : '#f8fafc',
                border: item.active ? '1px solid var(--color-primary-100)' : '1px solid var(--color-border)',
                cursor: item.mod ? 'pointer' : 'default',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (item.mod) e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                if (item.mod) e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: item.active ? 'var(--color-primary-600)' : '#cbd5e1',
                    color: '#ffffff',
                  }}
                >
                  {item.step}
                </span>
                {idx < arr.length - 1 && <span style={{ color: '#cbd5e1', fontSize: '14px' }}>→</span>}
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                {item.title}
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};