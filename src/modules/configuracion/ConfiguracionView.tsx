import React, { useEffect, useState } from 'react';
import {
  ConfiguracionApi,
  FeriadoItem,
  ParametroUitItem,
} from '../../api';
import { Card, Button, Badge, Input, Alert, EmptyState } from '../../components/common/Common';
import { formatearFecha } from '../../lib/fechas';
import { useConfirm } from '../../context/ConfirmContext';
import {
  CalendarIcon,
  ClockIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  ShieldAlertIcon,
} from '../../components/icons/Icons';
import { BasesMunicipalesConfig } from '../bases-municipales/BasesMunicipalesConfig';
import { CatalogoCuisCrud } from '../catalogo-cuis/CatalogoCuisCrud';

export const ConfiguracionView: React.FC = () => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'plazos' | 'feriados' | 'cuis' | 'uit' | 'seguridad' | 'bases'>('plazos');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados Plazos & Riesgo
  const [expedientesEnRiesgo, setExpedientesEnRiesgo] = useState<any[]>([]);

  // Estados Feriados
  const [feriados, setFeriados] = useState<FeriadoItem[]>([]);
  const [fechaFeriado, setFechaFeriado] = useState('');
  const [descripcionFeriado, setDescripcionFeriado] = useState('');

  // Estados CUIS

  // Estados UIT
  const [parametrosUit, setParametrosUit] = useState<ParametroUitItem[]>([]);

  const cargarDatos = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [riesgo, fer, uit] = await Promise.allSettled([
        ConfiguracionApi.getExpedientesEnRiesgo(),
        ConfiguracionApi.getFeriados(),
        ConfiguracionApi.getParametrosUit(),
      ]);

      if (riesgo.status === 'fulfilled') setExpedientesEnRiesgo(riesgo.value || []);
      if (fer.status === 'fulfilled') setFeriados(fer.value || []);
      if (uit.status === 'fulfilled') setParametrosUit(uit.value || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cargar configuración.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleAgregarFeriado = async () => {
    if (!fechaFeriado || !descripcionFeriado.trim()) {
      setMessage({ type: 'error', text: 'Debe completar la fecha y el motivo del feriado o día no hábil.' });
      return;
    }
    setLoading(true);
    try {
      await ConfiguracionApi.agregarFeriado(fechaFeriado, descripcionFeriado.trim());
      setMessage({ type: 'success', text: `Feriado del ${formatearFecha(fechaFeriado)} registrado exitosamente.` });
      setFechaFeriado('');
      setDescripcionFeriado('');
      cargarDatos();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al agregar feriado.' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-[20px]">
        <div>
          <h2 className="text-[18px] font-extrabold text-midnight-900">
            Motor de Plazos, Calendario, Catálogo CUIS, UIT & Seguridad
          </h2>
          <p className="text-[13px] text-text-muted mt-[2px]">
            Parámetros transversales para el cómputo de plazos hábiles, tipificación de infracciones y control de sesiones.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargarDatos}>
          Actualizar
        </Button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Tabs */}
      <div className="flex gap-[8px] mb-[16px] flex-wrap">
        <button
          onClick={() => setActiveTab('plazos')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'plazos' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'plazos' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'plazos' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <ClockIcon size={16} />
          Expedientes en Riesgo ({expedientesEnRiesgo.length})
        </button>

        <button
          onClick={() => setActiveTab('feriados')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'feriados' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'feriados' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'feriados' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <CalendarIcon size={16} />
          Calendario de Feriados ({feriados.length})
        </button>

        <button
          onClick={() => setActiveTab('cuis')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'cuis' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'cuis' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'cuis' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <SearchIcon size={16} />
          Catálogo CUIS (Ordenanza 464)
        </button>

        <button
          onClick={() => setActiveTab('bases')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'bases' ? 'border border-primary-600 bg-primary-50 text-primary-600' : 'border border-border bg-[#ffffff] text-text-secondary'}`}
        >
          <SearchIcon size={16} />
          Licencias e ITSE
        </button>

        <button
          onClick={() => setActiveTab('uit')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'uit' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'uit' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'uit' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          Valores Oficiales UIT ({parametrosUit.length})
        </button>

        <button
          onClick={() => setActiveTab('seguridad')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'seguridad' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'seguridad' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'seguridad' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <ShieldAlertIcon size={16} />
          Seguridad & Sesiones (Admin)
        </button>
      </div>

      {activeTab === 'bases' && <BasesMunicipalesConfig />}

      {/* Tab 1: Plazos en Riesgo */}
      {activeTab === 'plazos' && (
        <Card title="Expedientes con Alerta de Vencimiento o Riesgo de Caducidad">
          {expedientesEnRiesgo.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
              title="Sin expedientes en riesgo"
              description="Todos los expedientes administrativos del PAS se encuentran dentro de los plazos normativos vigentes."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px] text-left">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-b-border">
                    <th className="py-[12px] px-[16px]">N° Expediente</th>
                    <th className="py-[12px] px-[16px]">Fase Actual</th>
                    <th className="py-[12px] px-[16px]">Plazo Límite</th>
                    <th className="py-[12px] px-[16px]">Nivel de Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientesEnRiesgo.map((item, idx) => (
                    <tr key={idx} className="border-b border-b-border">
                      <td className="py-[12px] px-[16px] font-bold">{item.numeroExpediente || item.expedienteId || '---'}</td>
                      <td className="py-[12px] px-[16px]">{item.estado || 'En trámite'}</td>
                      <td className="py-[12px] px-[16px] text-danger">{formatearFecha(item.fechaLimite, 'Por vencer')}</td>
                      <td className="py-[12px] px-[16px]"><Badge variant="danger">ALERTA CRÍTICA</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Feriados */}
      {activeTab === 'feriados' && (
        <div className="grid grid-cols-[1fr_1fr] gap-[20px]">
          <Card title="Registrar Nuevo Día No Hábil / Feriado Municipal">
            <p className="text-[12px] text-text-muted mb-[14px]">
              Los feriados registrados se excluyen automáticamente en la función de cómputo de días hábiles del PAS.
            </p>
            <Input
              type="date"
              label="Fecha del Feriado"
              value={fechaFeriado}
              onChange={(e) => setFechaFeriado(e.target.value)}
            />
            <Input
              label="Motivo o Festividad"
              placeholder="Ej. Aniversario de San Juan de Lurigancho / Jueves Santo"
              value={descripcionFeriado}
              onChange={(e) => setDescripcionFeriado(e.target.value)}
            />
            <Button variant="primary" loading={loading} onClick={handleAgregarFeriado}>
              Agregar al Calendario
            </Button>
          </Card>

          <Card title="Feriados Registrados">
            {feriados.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon size={36} color="var(--color-text-muted)" />}
                title="Sin feriados cargados"
                description="Agregue los días inhábiles oficiales para calibrar el cómputo de plazos."
              />
            ) : (
              <div className="flex flex-col gap-[8px]">
                {feriados.map((f, i) => (
                  <div
                    key={f.id || i}
                    className="flex items-center justify-between py-[10px] px-[14px] bg-bg-subtle rounded-sm border border-border text-[13px]"
                  >
                    <div>
                      <strong>{formatearFecha(f.fecha)}</strong> — {f.descripcion}
                    </div>
                    <Badge variant="neutral">No Hábil</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Catálogo CUIS — mantenimiento (como licencias e ITSE) */}
      {activeTab === 'cuis' && (
        <Card title="Catálogo CUIS (Ordenanza 464-MDSJL)">
          <CatalogoCuisCrud />
        </Card>
      )}

      {/* Tab 4: Parámetros UIT */}
      {activeTab === 'uit' && (
        <Card title="Unidad Impositiva Tributaria (UIT) por Ejercicio Fiscal">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] text-left">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-b-border">
                  <th className="py-[12px] px-[16px]">Año Fiscal</th>
                  <th className="py-[12px] px-[16px]">Valor en Soles (S/)</th>
                  <th className="py-[12px] px-[16px]">Vigente Desde</th>
                  <th className="py-[12px] px-[16px]">Estado</th>
                </tr>
              </thead>
              <tbody>
                {parametrosUit.map((p) => (
                  <tr key={p.id || p.anio} className="border-b border-b-border">
                    <td className="py-[14px] px-[16px] font-bold">{p.anio}</td>
                    <td className="py-[14px] px-[16px] font-bold text-primary-600">
                      S/ {Number(p.valorSoles).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-[14px] px-[16px] text-text-secondary">
                      {p.vigenteDesde ? p.vigenteDesde.slice(0, 10) : '---'}
                    </td>
                    <td className="py-[14px] px-[16px]">
                      {!p.vigenteHasta ? <Badge variant="success">Vigente</Badge> : <Badge variant="neutral">Cerrado</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 5: Seguridad & Sesiones (Admin) */}
      {activeTab === 'seguridad' && (
        <Card title="Gestión de Usuarios y Sesiones">
          <div className="py-[32px] text-center">
            <p className="text-[14px] text-text-main mb-[8px]">
              Los usuarios y roles se gestionan en el módulo <strong>Usuarios y Roles</strong>.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};