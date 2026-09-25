import React, { useEffect, useState } from 'react';
import {
  ExpedientesApi,
  ExpedienteItem,
  IntervencionesApi,
  IntervencionObservadaItem,
  ActasApi,
} from '../../api';
import { Button, Badge, Modal, Input, Textarea, Alert, EmptyState, Spinner } from '../../components/common/Common';
import { formatearFecha, formatearHora, hoyLocal } from '../../lib/fechas';
import { useConfirm } from '../../context/ConfirmContext';
import { generarUuid } from '../../lib/uuid';
import {
  ExpedienteIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  SearchIcon,
  EyeIcon,
  AlertTriangleIcon,
  PlusIcon,
  FileTextIcon,
} from '../../components/icons/Icons';
import { ExpedienteDetalleModal } from './ExpedienteDetalleModal';
import { socket } from '../../lib/socket';

function formatEstado(estado: string): string {
  const map: Record<string, string> = {
    PENDIENTE_VALIDACION: 'Pendiente de validación',
    VALIDADO: 'Validado',
    OBSERVADO: 'Observado',
    EN_TRAMITE: 'En trámite',
    CONCLUIDO: 'Concluido',
    ARCHIVADO: 'Archivado',
  };
  return map[estado] || estado.replace(/_/g, ' ');
}

export const ExpedientesView: React.FC = () => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'validar' | 'observadas' | 'digitalizar'>('validar');
  const [expedientes, setExpedientes] = useState<ExpedienteItem[]>([]);
  const [observadas, setObservadas] = useState<IntervencionObservadaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Visor 360°
  const [detalleModal, setDetalleModal] = useState<{
    isOpen: boolean;
    intervencionId: string | null;
    numeroExpediente?: string;
  }>({
    isOpen: false,
    intervencionId: null,
  });

  // Modal de Observación (SP2)
  const [observarModal, setObservarModal] = useState<{ isOpen: boolean; id: string; numero: string }>({
    isOpen: false,
    id: '',
    numero: '',
  });
  const [observacionesTexto, setObservacionesTexto] = useState('');

  // Modal de Subsanación / Corrección (V-02)
  const [corregirModal, setCorregirModal] = useState<{
    isOpen: boolean;
    intervencionId: string;
    numeroExpediente: string;
    motivo: string;
  }>({
    isOpen: false,
    intervencionId: '',
    numeroExpediente: '',
    motivo: '',
  });

  const [correccionForm, setCorreccionForm] = useState({
    direccionAproximada: '',
    nombresRazonSocial: '',
    numeroDocumento: '',
    giroUso: '',
    hechosVerificados: '',
    comentarioCorreccion: '',
  });

  // Formulario de Digitalización Manual (POST /intervenciones)
  const [digitalizarForm, setDigitalizarForm] = useState({
    numeroActaFiscalizacion: '',
    numeroNotificacionCargo: '',
    tipoActuacion: 'INICIA_PAS',
    direccionAproximada: '',
    nombresRazonSocial: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    giroUso: '',
    cuisCodigo: '',
    hechosVerificados: '',
    montoPasibleMulta: '',
  });
  const [correlativoStatus, setCorrelativoStatus] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [pendientesData, observadasData] = await Promise.allSettled([
        ExpedientesApi.getPendientes(),
        IntervencionesApi.getObservadas(),
      ]);

      if (pendientesData.status === 'fulfilled') {
        setExpedientes(Array.isArray(pendientesData.value) ? pendientesData.value : []);
      }
      if (observadasData.status === 'fulfilled') {
        setObservadas(Array.isArray(observadasData.value) ? observadasData.value : []);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cargar expedientes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    socket.on('expediente:nuevo', cargar);
    return () => {
      socket.off('expediente:nuevo', cargar);
    };
  }, []);

  const handleAprobar = async (id: string, numero: string) => {
    const ok = await confirm({ message: `¿Confirmas la aprobación del expediente ${numero}? Pasará a la fase de Instrucción (SP4).` });
    if (!ok) return;
    setActionLoading(true);
    try {
      await ExpedientesApi.aprobar(id);
      setMessage({ type: 'success', text: `Expediente ${numero} aprobado exitosamente.` });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'No se pudo aprobar el expediente.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleObservarSubmit = async () => {
    if (!observacionesTexto.trim()) {
      setMessage({ type: 'error', text: 'Debes ingresar el motivo de la observación.' });
      return;
    }
    setActionLoading(true);
    try {
      await ExpedientesApi.observar(observarModal.id, observacionesTexto.trim());
      setMessage({ type: 'success', text: `Expediente ${observarModal.numero} marcado como observado. Derivado a subsanación.` });
      setObservarModal({ isOpen: false, id: '', numero: '' });
      setObservacionesTexto('');
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'No se pudo observar el expediente.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleIngresoFisico = async (id: string, numero: string) => {
    setActionLoading(true);
    try {
      await ExpedientesApi.registrarIngresoFisico(id);
      setMessage({ type: 'success', text: `Ingreso físico de actas registrado para el expediente ${numero}.` });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'No se pudo registrar el ingreso físico.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAbrirCorregir = async (obs: IntervencionObservadaItem) => {
    setCorregirModal({
      isOpen: true,
      intervencionId: obs.id,
      numeroExpediente: obs.numeroExpediente,
      motivo: obs.motivo,
    });
    setCorreccionForm({
      direccionAproximada: '',
      nombresRazonSocial: '',
      numeroDocumento: '',
      giroUso: '',
      hechosVerificados: '',
      comentarioCorreccion: '',
    });

    // Cargar datos previos si es posible
    try {
      const bundle = await IntervencionesApi.getDetalle(obs.id);
      if (bundle) {
        setCorreccionForm({
          direccionAproximada: bundle.direccionAproximada || '',
          nombresRazonSocial: bundle.administrado?.nombresRazonSocial || '',
          numeroDocumento: bundle.administrado?.numeroDocumento || '',
          giroUso: bundle.administrado?.giroUso || '',
          hechosVerificados: bundle.actaFiscalizacion?.hechosVerificados || '',
          comentarioCorreccion: '',
        });
      }
    } catch {
      // Usar formulario en blanco
    }
  };

  const handleEnviarCorreccion = async () => {
    if (!correccionForm.comentarioCorreccion.trim()) {
      setMessage({ type: 'error', text: 'El comentario de corrección es obligatorio (V-02). Debe detallar qué subsanó.' });
      return;
    }
    setActionLoading(true);
    try {
      await IntervencionesApi.corregir(corregirModal.intervencionId, {
        fechaHoraInicio: new Date().toISOString(),
        origenUbicacion: 'DIRECCION_MANUAL',
        origen: 'DOC_EXTERNO',
        tipoActuacion: 'INICIA_PAS',
        versionLocal: 2,
        direccionAproximada: correccionForm.direccionAproximada,
        administrado: {
          identificado: true,
          nombresRazonSocial: correccionForm.nombresRazonSocial,
          numeroDocumento: correccionForm.numeroDocumento,
          giroUso: correccionForm.giroUso,
        },
        cuis: [],
        actaFiscalizacion: {
          numeroCorrelativo: `CORR-${Date.now().toString().slice(-4)}`,
          hechosVerificados: correccionForm.hechosVerificados,
        },
        testigos: [],
        actasMedidaProvisional: [],
        actasValorizacionObra: [],
        actasAdicionales: [],
        comentarioCorreccion: correccionForm.comentarioCorreccion.trim(),
      });
      setMessage({
        type: 'success',
        text: `Intervención del expediente ${corregirModal.numeroExpediente} subsanada con éxito. Vuelve a Pendientes de Validación.`,
      });
      setCorregirModal({ isOpen: false, intervencionId: '', numeroExpediente: '', motivo: '' });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al enviar corrección de la intervención.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidarCorrelativo = async (tipo: string, numero: string) => {
    if (!numero.trim()) return;
    try {
      const res = await ActasApi.verificarCorrelativo(tipo, numero.trim());
      if (res.disponible) {
        setCorrelativoStatus(`Correlativo ${numero} disponible en registro.`);
      } else {
        setCorrelativoStatus(`Alerta: El correlativo ${numero} ya existe o está duplicado.`);
      }
    } catch {
      setCorrelativoStatus('Error al validar correlativo.');
    }
  };

  const handleCrearIntervencionManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!digitalizarForm.numeroNotificacionCargo || !digitalizarForm.hechosVerificados) {
      setMessage({ type: 'error', text: 'Complete los campos obligatorios del acta preimpresa.' });
      return;
    }
    setActionLoading(true);
    try {
      const uuid = generarUuid();
      await IntervencionesApi.crear({
        id: uuid,
        fechaHoraInicio: new Date().toISOString(),
        origenUbicacion: 'DIRECCION_MANUAL',
        direccionAproximada: digitalizarForm.direccionAproximada,
        origen: 'DOC_EXTERNO',
        tipoActuacion: 'INICIA_PAS',
        versionLocal: 1,
        administrado: {
          identificado: true,
          tipoDocumento: digitalizarForm.tipoDocumento,
          numeroDocumento: digitalizarForm.numeroDocumento,
          nombresRazonSocial: digitalizarForm.nombresRazonSocial,
          giroUso: digitalizarForm.giroUso,
        },
        cuis: [],
        actaFiscalizacion: {
          numeroCorrelativo: digitalizarForm.numeroActaFiscalizacion || `AF-${Date.now().toString().slice(-4)}`,
          hechosVerificados: digitalizarForm.hechosVerificados,
        },
        notificacionCargo: {
          numeroCorrelativo: digitalizarForm.numeroNotificacionCargo,
          baseCalculo: 'UIT_FIJO',
          montoPasibleMulta: Number(digitalizarForm.montoPasibleMulta) || undefined,
          fechaDeteccion: hoyLocal(),
        },
        testigos: [],
        actasMedidaProvisional: [],
        actasValorizacionObra: [],
        actasAdicionales: [],
      });
      setMessage({ type: 'success', text: `Acta física preimpresa digitalizada e ingresada al PAS correctamente.` });
      setActiveTab('validar');
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al digitalizar acta física.' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredExpedientes = expedientes.filter(
    (e) =>
      e.numeroExpediente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.fiscalizadorNombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header Bar */}
      <div className="flex items-start justify-between mb-[22px] flex-wrap gap-[16px]">
        <div>
          <h2 className="text-[22px] font-extrabold text-[#0f172a] tracking-[-0.3px] m-0">
            Mesa de Control y Calificación Formal
          </h2>
          <p className="text-[13px] text-[#64748b] mt-[4px] m-0">
            Validación de requisitos de procedibilidad, verificación de series de campo y control documental del PAS.
          </p>
        </div>
        <div className="flex gap-[10px]">
          <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={loading} onClick={cargar}>
            Actualizar
          </Button>
          <Button variant="primary" icon={<PlusIcon size={15} />} onClick={() => setActiveTab('digitalizar')}>
            Digitalizar Acta Física
          </Button>
        </div>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* KPI Stats Cards */}
      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[16px] mb-[24px]"
      >
        <div
          className="bg-[#ffffff] rounded-[12px] py-[16px] px-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between"
        >
          <div>
            <span className="text-[12px] font-semibold text-[#64748b]">Por Calificar</span>
            <div className="text-[26px] font-extrabold text-[#0f172a] mt-[2px]">{expedientes.length}</div>
            <span className="text-[11px] text-[#0284c7] font-semibold">En bandeja de validación</span>
          </div>
          <div className="w-[42px] h-[42px] rounded-[10px] bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center">
            <ExpedienteIcon size={22} />
          </div>
        </div>

        <div
          className="bg-[#ffffff] rounded-[12px] py-[16px] px-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between"
        >
          <div>
            <span className="text-[12px] font-semibold text-[#64748b]">Actas Observadas</span>
            <div className="text-[26px] font-extrabold text-[#dc2626] mt-[2px]">{observadas.length}</div>
            <span className="text-[11px] text-[#dc2626] font-semibold">Devueltas para subsanación</span>
          </div>
          <div className="w-[42px] h-[42px] rounded-[10px] bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
            <AlertTriangleIcon size={22} />
          </div>
        </div>

        <div
          className="bg-[#ffffff] rounded-[12px] py-[16px] px-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between"
        >
          <div>
            <span className="text-[12px] font-semibold text-[#64748b]">Ingreso Físico Recibido</span>
            <div className="text-[26px] font-extrabold text-[#059669] mt-[2px]">
              {expedientes.filter((e) => e.fechaIngresoFisico).length}
            </div>
            <span className="text-[11px] text-[#059669] font-semibold">Talonarios en custodia</span>
          </div>
          <div className="w-[42px] h-[42px] rounded-[10px] bg-[#dcfce7] text-[#059669] flex items-center justify-center">
            <FileTextIcon size={22} />
          </div>
        </div>

        <div
          className="bg-[#ffffff] rounded-[12px] py-[16px] px-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between"
        >
          <div>
            <span className="text-[12px] font-semibold text-[#64748b]">Conformidad Legal</span>
            <div className="text-[26px] font-extrabold text-[#0f172a] mt-[2px]">100%</div>
            <span className="text-[11px] text-[#64748b] font-semibold">Art. 248° TUO LPAG</span>
          </div>
          <div className="w-[42px] h-[42px] rounded-[10px] bg-[#f1f5f9] text-[#475569] flex items-center justify-center">
            <CheckCircleIcon size={22} />
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-[#ffffff] rounded-[12px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Segmented Control Bar & Search Toolbar */}
        <div
          className="py-[16px] px-[20px] border-b border-b-[#e2e8f0] flex items-center justify-between flex-wrap gap-[14px] bg-[#fafbfc]"
        >
          {/* Segmented Control Tabs */}
          <div className="inline-flex bg-[#f1f5f9] p-[4px] rounded-[8px] gap-[4px]">
            <button
              onClick={() => setActiveTab('validar')}
              className={`py-[7px] px-[16px] rounded-[6px] border-0 text-[13px] cursor-pointer flex items-center gap-[8px] [transition:all_150ms_ease] ${activeTab === 'validar' ? 'bg-[#ffffff]' : 'bg-transparent'} ${activeTab === 'validar' ? 'text-[#0f172a]' : 'text-[#64748b]'} ${activeTab === 'validar' ? 'font-bold' : 'font-medium'} ${activeTab === 'validar' ? 'shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'shadow-none'}`}
            >
              <span>Bandeja de Validación</span>
              <span
                className={`text-[11px] font-bold py-[1px] px-[7px] rounded-pill ${activeTab === 'validar' ? 'bg-[#e0f2fe]' : 'bg-[#e2e8f0]'} ${activeTab === 'validar' ? 'text-[#0369a1]' : 'text-[#64748b]'}`}
              >
                {expedientes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('observadas')}
              className={`py-[7px] px-[16px] rounded-[6px] border-0 text-[13px] cursor-pointer flex items-center gap-[8px] [transition:all_150ms_ease] ${activeTab === 'observadas' ? 'bg-[#ffffff]' : 'bg-transparent'} ${activeTab === 'observadas' ? 'text-[#0f172a]' : 'text-[#64748b]'} ${activeTab === 'observadas' ? 'font-bold' : 'font-medium'} ${activeTab === 'observadas' ? 'shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'shadow-none'}`}
            >
              <span>Actas Observadas</span>
              {observadas.length > 0 && (
                <span
                  className="text-[11px] font-bold py-[1px] px-[7px] rounded-pill bg-[#fee2e2] text-[#dc2626]"
                >
                  {observadas.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('digitalizar')}
              className={`py-[7px] px-[16px] rounded-[6px] border-0 text-[13px] cursor-pointer flex items-center gap-[8px] [transition:all_150ms_ease] ${activeTab === 'digitalizar' ? 'bg-[#ffffff]' : 'bg-transparent'} ${activeTab === 'digitalizar' ? 'text-[#0f172a]' : 'text-[#64748b]'} ${activeTab === 'digitalizar' ? 'font-bold' : 'font-medium'} ${activeTab === 'digitalizar' ? 'shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'shadow-none'}`}
            >
              <PlusIcon size={14} />
              <span>Digitalizar Acta Física</span>
            </button>
          </div>

          {/* Integrated Search Tool */}
          {activeTab === 'validar' && (
            <div className="flex items-center gap-[10px]">
              <div className="relative w-[320px]">
                <span className="absolute left-[10px] top-[9px] text-[#94a3b8]">
                  <SearchIcon size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por N°, inspector, infractor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-[7px] pr-[10px] pl-[32px] text-[13px] rounded-[6px] border border-[#cbd5e1] bg-[#ffffff] outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: BANDEJA DE VALIDACIÓN */}
        {activeTab === 'validar' && (
          <div>
            {loading ? (
              <div className="p-[48px] text-center">
                <Spinner size={32} />
                <p className="text-[13px] text-[#64748b] mt-[12px]">
                  Cargando expedientes pendientes de validación...
                </p>
              </div>
            ) : filteredExpedientes.length === 0 ? (
              <EmptyState
                icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
                title="Bandeja al día"
                description="No se encontraron expedientes pendientes de validación formal en este momento."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px] text-left">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-b-[#e2e8f0]">
                      <th className="py-[12px] px-[20px] font-semibold text-[#475569]">Expediente</th>
                      <th className="py-[12px] px-[20px] font-semibold text-[#475569]">Fecha de Emisión</th>
                      <th className="py-[12px] px-[20px] font-semibold text-[#475569]">Fiscalizador Asignado</th>
                      <th className="py-[12px] px-[20px] font-semibold text-[#475569]">Calificación & Custodia</th>
                      <th className="py-[12px] px-[20px] font-semibold text-[#475569] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpedientes.map((exp) => {
                      const fiscalizadorLimpio = (exp.fiscalizadorNombre || 'No asignado')
                        .replace(/\s*\(admin\s*dev\)/gi, '')
                        .trim();
                      return (
                        <tr
                          key={exp.id}
                          className="border-b border-b-[#f1f5f9] [transition:background_100ms] hover:bg-[#f8fafc]"
                        >
                          <td className="py-[14px] px-[20px] text-[#0f172a]">
                            <div className="flex items-center gap-[8px]">
                              <span className="text-[#0284c7]">
                                <ExpedienteIcon size={16} />
                              </span>
                              <span
                                className="font-bold text-[#1d4ed8] cursor-pointer"
                                onClick={() =>
                                  setDetalleModal({
                                    isOpen: true,
                                    intervencionId: exp.intervencionId,
                                    numeroExpediente: exp.numeroExpediente,
                                  })
                                }
                              >
                                {exp.numeroExpediente}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#64748b] mt-[2px] pl-[24px]">
                              Intervención de Fiscalización
                            </div>
                          </td>
                          <td className="py-[14px] px-[20px] text-[#334155]">
                            <div className="font-medium">
                              {exp.fechaHoraInicioIntervencion
                                ? formatearFecha(exp.fechaHoraInicioIntervencion)
                                : '---'}
                            </div>
                            <div className="text-[11px] text-[#64748b]">
                              {exp.fechaHoraInicioIntervencion
                                ? formatearHora(exp.fechaHoraInicioIntervencion) + ' hrs'
                                : '---'}
                            </div>
                          </td>
                          <td className="py-[14px] px-[20px] text-[#334155]">
                            <div className="flex items-center gap-[8px]">
                              <div
                                className="w-[28px] h-[28px] rounded-full bg-[#e0f2fe] text-[#0284c7] font-bold text-[11px] flex items-center justify-center shrink-0"
                              >
                                {fiscalizadorLimpio.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-[#0f172a]">{fiscalizadorLimpio}</div>
                                <div className="text-[11px] text-[#64748b]">Inspector de Campo</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-[14px] px-[20px]">
                            <div className="flex flex-col gap-[4px] items-start">
                              <Badge variant="warning">{formatEstado(exp.estado)}</Badge>
                              {exp.fechaIngresoFisico && (
                                <div className="flex items-center gap-[4px] text-[11px] text-[#059669] font-medium mt-[2px]">
                                  <FileTextIcon size={12} color="#059669" />
                                  <span>Documento físico: {formatearFecha(exp.fechaIngresoFisico)}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-[14px] px-[20px] text-right">
                            <div className="inline-flex items-center gap-[6px]">
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<EyeIcon size={14} />}
                                onClick={() =>
                                  setDetalleModal({
                                    isOpen: true,
                                    intervencionId: exp.intervencionId,
                                    numeroExpediente: exp.numeroExpediente,
                                  })
                                }
                              >
                                Revisar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => handleAprobar(exp.id, exp.numeroExpediente)}
                                className="border-[#86efac]! text-[#15803d]! bg-[#f0fdf4]!"
                              >
                                Aprobar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => {
                                  setObservarModal({ isOpen: true, id: exp.id, numero: exp.numeroExpediente });
                                  setObservacionesTexto('');
                                }}
                                className="border-[#fca5a5]! text-[#b91c1c]! bg-[#fef2f2]!"
                              >
                                Observar
                              </Button>
                              {!exp.fechaIngresoFisico && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={actionLoading}
                                  onClick={() => handleIngresoFisico(exp.id, exp.numeroExpediente)}
                                >
                                  Ingreso Físico
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      {/* TAB 2: ACTAS OBSERVADAS & SUBSANACIÓN */}
      {activeTab === 'observadas' && (
        <div className="p-[20px]">
          <div className="mb-[16px]">
            <h3 className="text-[15px] font-bold text-midnight-900">
              Actas con Defectos Subsanables (V-01)
            </h3>
            <p className="text-[13px] text-text-muted">
              Listado de intervenciones devueltas por la mesa de partes para que el fiscalizador subsane omisiones formales.
            </p>
          </div>

          {observadas.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
              title="Sin actas observadas"
              description="No tienes actas observadas pendientes de subsanación."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px] text-left">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-b-border">
                    <th className="py-[12px] px-[16px] font-bold">N° Expediente</th>
                    <th className="py-[12px] px-[16px] font-bold">Fecha Observación</th>
                    <th className="py-[12px] px-[16px] font-bold">Motivo de la Observación (Vicio Detectado)</th>
                    <th className="py-[12px] px-[16px] font-bold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {observadas.map((obs) => (
                    <tr key={obs.id} className="border-b border-b-border">
                      <td className="py-[14px] px-[16px] font-bold text-midnight-900">
                        {obs.numeroExpediente}
                      </td>
                      <td className="py-[14px] px-[16px] text-text-secondary">
                        {obs.fechaObservacion ? formatearFecha(obs.fechaObservacion) : 'Reciente'}
                      </td>
                      <td className="py-[14px] px-[16px] text-[#b91c1c] max-w-[400px]">
                        <div className="flex items-start gap-[8px] bg-[#fff1f2] py-[8px] px-[12px] rounded-[6px] border border-[#fecdd3] text-[12px]">
                          <span className="mt-[2px] shrink-0"><AlertTriangleIcon size={15} color="#dc2626" /></span>
                          <span>{obs.motivo}</span>
                        </div>
                      </td>
                      <td className="py-[14px] px-[16px] text-right">
                        <div className="inline-flex gap-[8px]">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<EyeIcon size={14} />}
                            onClick={() =>
                              setDetalleModal({
                                isOpen: true,
                                intervencionId: obs.id,
                                numeroExpediente: obs.numeroExpediente,
                              })
                            }
                          >
                            Revisar
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAbrirCorregir(obs)}
                          >
                            Subsanar y Corregir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIGITALIZAR ACTA FÍSICA MANUAL */}
      {activeTab === 'digitalizar' && (
        <div className="p-[24px]">
          <div className="mb-[20px]">
            <h3 className="text-[15px] font-bold text-midnight-900">
              Ingreso y Digitalización de Acta Preimpresa de Campo
            </h3>
            <p className="text-[13px] text-text-muted">
              Para actas levantadas físicamente en papel. El sistema verificará la disponibilidad de la serie física preimpresa.
            </p>
          </div>

          <form onSubmit={handleCrearIntervencionManual} className="flex flex-col gap-[16px]">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-[16px]">
              <div>
                <Input
                  label="N° Notificación de Cargo Preimpresa *"
                  placeholder="Ej. NC-004521"
                  value={digitalizarForm.numeroNotificacionCargo}
                  onChange={(e) => setDigitalizarForm({ ...digitalizarForm, numeroNotificacionCargo: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => handleValidarCorrelativo('NOTIFICACION_CARGO', digitalizarForm.numeroNotificacionCargo)}
                  className="mt-[6px] text-[11px] text-primary-600 bg-transparent border-0 cursor-pointer underline"
                >
                  Validar serie física en sistema
                </button>
              </div>

              <div>
                <Input
                  label="N° Acta de Fiscalización Preimpresa"
                  placeholder="Ej. AF-009823"
                  value={digitalizarForm.numeroActaFiscalizacion}
                  onChange={(e) => setDigitalizarForm({ ...digitalizarForm, numeroActaFiscalizacion: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => handleValidarCorrelativo('ACTA_FISCALIZACION', digitalizarForm.numeroActaFiscalizacion)}
                  className="mt-[6px] text-[11px] text-primary-600 bg-transparent border-0 cursor-pointer underline"
                >
                  Validar serie física en sistema
                </button>
              </div>

              <div>
                <Input
                  label="Monto Pasible de Multa (Soles)"
                  type="number"
                  placeholder="Ej. 2675.00"
                  value={digitalizarForm.montoPasibleMulta}
                  onChange={(e) => setDigitalizarForm({ ...digitalizarForm, montoPasibleMulta: e.target.value })}
                />
              </div>
            </div>

            {correlativoStatus && (
              <div className="py-[8px] px-[12px] bg-bg-subtle rounded-[6px] text-[12px]">
                {correlativoStatus}
              </div>
            )}

            <div className="grid grid-cols-[2fr_1fr] gap-[16px]">
              <Input
                label="Dirección del Predio / Intervención *"
                placeholder="Ej. Av. Próceres de la Independencia 1420"
                value={digitalizarForm.direccionAproximada}
                onChange={(e) => setDigitalizarForm({ ...digitalizarForm, direccionAproximada: e.target.value })}
                required
              />
              <Input
                label="DNI o RUC del Administrado"
                placeholder="Ej. 10452367891"
                value={digitalizarForm.numeroDocumento}
                onChange={(e) => setDigitalizarForm({ ...digitalizarForm, numeroDocumento: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-[1fr_1fr] gap-[16px]">
              <Input
                label="Código de Infracción (CUIS)"
                placeholder="Ej. G-010"
                value={digitalizarForm.cuisCodigo}
                onChange={(e) => setDigitalizarForm({ ...digitalizarForm, cuisCodigo: e.target.value })}
              />
              <Input
                label="Giro o Actividad Comercial"
                placeholder="Ej. Taller mecánico, Botica"
                value={digitalizarForm.giroUso}
                onChange={(e) => setDigitalizarForm({ ...digitalizarForm, giroUso: e.target.value })}
              />
            </div>

            <Input
              label="Razón Social / Nombre del Administrado"
              placeholder="Ej. Inversiones San Juan S.A.C."
              value={digitalizarForm.nombresRazonSocial}
              onChange={(e) => setDigitalizarForm({ ...digitalizarForm, nombresRazonSocial: e.target.value })}
            />

            <Textarea
              label="Hechos Constatados en el Acta de Fiscalización *"
              placeholder="Describa textualmente las circunstancias de modo, tiempo y lugar constatadas..."
              value={digitalizarForm.hechosVerificados}
              onChange={(e) => setDigitalizarForm({ ...digitalizarForm, hechosVerificados: e.target.value })}
              rows={4}
              required
            />

            <div className="flex justify-end gap-[10px] mt-[12px]">
              <Button variant="secondary" type="button" onClick={() => setActiveTab('validar')}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" loading={actionLoading}>
                Registrar Acta y Crear Expediente PAS
              </Button>
            </div>
          </form>
        </div>
      )}
      </div>

      {/* Modal para Observar (SP2) */}
      <Modal
        isOpen={observarModal.isOpen}
        onClose={() => setObservarModal({ isOpen: false, id: '', numero: '' })}
        title={`Observar Expediente: ${observarModal.numero}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setObservarModal({ isOpen: false, id: '', numero: '' })}>
              Cancelar
            </Button>
            <Button variant="danger" loading={actionLoading} onClick={handleObservarSubmit}>
              Confirmar Observación
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-text-secondary mb-[14px]">
          Indique de forma motivada los defectos formales o materiales subsanables del acta de fiscalización:
        </p>
        <Textarea
          label="Detalle de Observaciones (Requerido)"
          placeholder="Ej. Falta firma de testigo, error en numeración de predio o datos incompletos..."
          value={observacionesTexto}
          onChange={(e) => setObservacionesTexto(e.target.value)}
          rows={4}
        />
      </Modal>

      {/* Modal para Subsanar y Corregir (V-02) */}
      <Modal
        isOpen={corregirModal.isOpen}
        onClose={() => setCorregirModal({ isOpen: false, intervencionId: '', numeroExpediente: '', motivo: '' })}
        title={`Subsanar Acta Observada: ${corregirModal.numeroExpediente}`}
        maxWidth="680px"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCorregirModal({ isOpen: false, intervencionId: '', numeroExpediente: '', motivo: '' })}
            >
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleEnviarCorreccion}>
              Enviar Corrección a Mesa de Control
            </Button>
          </>
        }
      >
        <div className="mb-[16px] py-[10px] px-[14px] bg-[#fef2f2] border border-[#fecaca] rounded-[6px]">
          <div className="text-[12px] font-bold text-[#991b1b]">Motivo de la Observación:</div>
          <div className="text-[13px] text-[#b91c1c] mt-[2px]">{corregirModal.motivo}</div>
        </div>

        <div className="flex flex-col gap-[14px]">
          <Input
            label="Dirección Subsanada"
            value={correccionForm.direccionAproximada}
            onChange={(e) => setCorreccionForm({ ...correccionForm, direccionAproximada: e.target.value })}
          />
          <div className="grid grid-cols-[1fr_1fr] gap-[12px]">
            <Input
              label="Nombre / Razón Social"
              value={correccionForm.nombresRazonSocial}
              onChange={(e) => setCorreccionForm({ ...correccionForm, nombresRazonSocial: e.target.value })}
            />
            <Input
              label="DNI / RUC"
              value={correccionForm.numeroDocumento}
              onChange={(e) => setCorreccionForm({ ...correccionForm, numeroDocumento: e.target.value })}
            />
          </div>
          <Input
            label="Giro o Actividad"
            value={correccionForm.giroUso}
            onChange={(e) => setCorreccionForm({ ...correccionForm, giroUso: e.target.value })}
          />
          <Textarea
            label="Hechos Constatados Rectificados"
            value={correccionForm.hechosVerificados}
            onChange={(e) => setCorreccionForm({ ...correccionForm, hechosVerificados: e.target.value })}
            rows={3}
          />
          <Textarea
            label="Comentario Obligatorio de Corrección (V-02) *"
            placeholder="Explique qué vicio formal fue subsanado conforme a la observación..."
            value={correccionForm.comentarioCorreccion}
            onChange={(e) => setCorreccionForm({ ...correccionForm, comentarioCorreccion: e.target.value })}
            rows={3}
            required
          />
        </div>
      </Modal>

      {/* Visor Modal 360° */}
      <ExpedienteDetalleModal
        isOpen={detalleModal.isOpen}
        onClose={() => setDetalleModal({ isOpen: false, intervencionId: null })}
        intervencionId={detalleModal.intervencionId}
        numeroExpediente={detalleModal.numeroExpediente}
      />
    </div>
  );
};