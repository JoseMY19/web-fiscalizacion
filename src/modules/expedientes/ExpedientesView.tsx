import React, { useEffect, useState } from 'react';
import {
  ExpedientesApi,
  ExpedienteItem,
  IntervencionesApi,
  IntervencionObservadaItem,
  ActasApi,
} from '../../api';
import { Card, Button, Badge, Modal, Input, Textarea, Alert, EmptyState, Spinner } from '../../components/common/Common';
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
    if (!window.confirm(`¿Confirmas la aprobación del expediente ${numero}? Pasará a la fase de Instrucción (SP4).`)) return;
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
      alert('Debes ingresar el motivo de la observación.');
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
      alert('El comentario de corrección es obligatorio (V-02). Debe detallar qué subsanó.');
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
      alert('Complete los campos obligatorios del acta preimpresa.');
      return;
    }
    setActionLoading(true);
    try {
      const uuid = crypto.randomUUID();
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
          fechaDeteccion: new Date().toISOString().split('T')[0],
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Control y Validación Formal de Expedientes
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            Revisión de requisitos de validez del PAS, subsanación y digitalización de actas físicas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" icon={<RefreshCwIcon size={15} />} loading={loading} onClick={cargar}>
            Actualizar
          </Button>
        </div>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Tabs Selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('validar')}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderBottom: activeTab === 'validar' ? '2px solid #0284c7' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'validar' ? '#0369a1' : '#64748b',
            fontWeight: activeTab === 'validar' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 150ms ease',
          }}
        >
          <ExpedienteIcon size={16} />
          Bandeja de Validación
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
            {expedientes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('observadas')}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderBottom: activeTab === 'observadas' ? '2px solid #0284c7' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'observadas' ? '#0369a1' : '#64748b',
            fontWeight: activeTab === 'observadas' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 150ms ease',
          }}
        >
          <AlertTriangleIcon size={16} />
          Actas Observadas
          {observadas.length > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#991b1b' }}>
              {observadas.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('digitalizar')}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderBottom: activeTab === 'digitalizar' ? '2px solid #0284c7' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'digitalizar' ? '#0369a1' : '#64748b',
            fontWeight: activeTab === 'digitalizar' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 150ms ease',
          }}
        >
          <PlusIcon size={16} />
          Digitalizar Acta Física
        </button>
      </div>

      {/* TAB 1: BANDEJA DE VALIDACIÓN */}
      {activeTab === 'validar' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
            <div style={{ position: 'relative', maxWidth: '380px', width: '100%' }}>
              <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }}>
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                placeholder="Buscar por N° expediente, infractor o fiscalizador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Mostrando <strong>{filteredExpedientes.length}</strong> expedientes pendientes
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Spinner size={32} />
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>N° Expediente</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Fecha Intervención</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Fiscalizador</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Estado</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpedientes.map((exp) => (
                    <tr
                      key={exp.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 100ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#0284c7' }}>
                            <ExpedienteIcon size={16} />
                          </span>
                          {exp.numeroExpediente}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {exp.fechaHoraInicioIntervencion
                          ? new Date(exp.fechaHoraInicioIntervencion).toLocaleString('es-PE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '---'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{exp.fiscalizadorNombre || 'No asignado'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Fiscalizador de Campo</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <Badge variant="warning">{formatEstado(exp.estado)}</Badge>
                          {exp.fechaIngresoFisico && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              <FileTextIcon size={12} color="#94a3b8" />
                              Ingreso físico: {new Date(exp.fechaIngresoFisico).toLocaleDateString('es-PE')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <Button
                            variant="secondary"
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
                            variant="success"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleAprobar(exp.id, exp.numeroExpediente)}
                          >
                            Aprobar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => {
                              setObservarModal({ isOpen: true, id: exp.id, numero: exp.numeroExpediente });
                              setObservacionesTexto('');
                            }}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: ACTAS OBSERVADAS & SUBSANACIÓN */}
      {activeTab === 'observadas' && (
        <Card>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>
              Actas con Defectos Subsanables (V-01)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>N° Expediente</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Fecha Observación</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Motivo de la Observación (Vicio Detectado)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {observadas.map((obs) => (
                    <tr key={obs.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>
                        {obs.numeroExpediente}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)' }}>
                        {obs.fechaObservacion ? new Date(obs.fechaObservacion).toLocaleDateString('es-PE') : 'Reciente'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#b91c1c', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: '#fff1f2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecdd3', fontSize: '12px' }}>
                          <span style={{ marginTop: '2px', flexShrink: 0 }}><AlertTriangleIcon size={15} color="#dc2626" /></span>
                          <span>{obs.motivo}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
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
        </Card>
      )}

      {/* TAB 3: DIGITALIZAR ACTA FÍSICA MANUAL */}
      {activeTab === 'digitalizar' && (
        <Card>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>
              Ingreso y Digitalización de Acta Preimpresa de Campo
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Para actas levantadas físicamente en papel. El sistema verificará la disponibilidad de la serie física preimpresa.
            </p>
          </div>

          <form onSubmit={handleCrearIntervencionManual} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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
                  style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: 'var(--color-primary-600)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
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
                  style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: 'var(--color-primary-600)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
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
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', fontSize: '12px' }}>
                {correlativoStatus}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
              <Input
                label="Dirección del Predio / Intervención *"
                placeholder="Ej. Av. Próceres de la Independencia 1420"
                value={digitalizarForm.direccionAproximada}
                onChange={(e) => setDigitalizarForm({ ...digitalizarForm, direccionAproximada: e.target.value })}
                required
              />
              <Input
                label="DNI o RUC Administrado"
                placeholder="Ej. 10458923412"
                value={digitalizarForm.numeroDocumento}
                onChange={(e) => setDigitalizarForm({ ...digitalizarForm, numeroDocumento: e.target.value })}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <Button variant="secondary" type="button" onClick={() => setActiveTab('validar')}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" loading={actionLoading}>
                Registrar Acta y Crear Expediente PAS
              </Button>
            </div>
          </form>
        </Card>
      )}

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
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
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
        <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>Motivo de la Observación:</div>
          <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '2px' }}>{corregirModal.motivo}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Dirección Subsanada"
            value={correccionForm.direccionAproximada}
            onChange={(e) => setCorreccionForm({ ...correccionForm, direccionAproximada: e.target.value })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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