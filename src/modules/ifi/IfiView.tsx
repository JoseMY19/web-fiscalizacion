import React, { useEffect, useState } from 'react';
import { IfiApi, ExpedienteIfiItem, PlanchazoData } from '../../api';
import { socket } from '../../lib/socket';
import { Card, Button, Badge, Modal, Input, Textarea, Alert, EmptyState, Spinner } from '../../components/common/Common';
import { FileTextIcon, RefreshCwIcon, CheckCircleIcon, EyeIcon, PenToolIcon } from '../../components/icons/Icons';

export const IfiView: React.FC = () => {
  const [pendientes, setPendientes] = useState<ExpedienteIfiItem[]>([]);
  const [esperando, setEsperando] = useState<ExpedienteIfiItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'esperando'>('pendientes');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales
  const [descargoModal, setDescargoModal] = useState<{ isOpen: boolean; expId: string; numero: string }>({
    isOpen: false,
    expId: '',
    numero: '',
  });
  const [descargoTexto, setDescargoTexto] = useState('');

  const [imputacionModal, setImputacionModal] = useState<{ isOpen: boolean; expId: string; numero: string; correcta: boolean }>({
    isOpen: false,
    expId: '',
    numero: '',
    correcta: true,
  });
  const [motivoVicio, setMotivoVicio] = useState('');

  const [analisisModal, setAnalisisModal] = useState<{ isOpen: boolean; expId: string; numero: string }>({
    isOpen: false,
    expId: '',
    numero: '',
  });
  const [analisisTexto, setAnalisisTexto] = useState('');

  const [planchazoModal, setPlanchazoModal] = useState<{ isOpen: boolean; data: PlanchazoData | null }>({
    isOpen: false,
    data: null,
  });

  const [notificarModal, setNotificarModal] = useState<{ isOpen: boolean; expId: string; numero: string }>({
    isOpen: false,
    expId: '',
    numero: '',
  });
  const [fechaNotificacion, setFechaNotificacion] = useState(new Date().toISOString().slice(0, 10));

  const cargar = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await IfiApi.getPendientes();
      setPendientes(Array.isArray(data.pendientes) ? data.pendientes : []);
      setEsperando(Array.isArray(data.esperandoNotificacion) ? data.esperandoNotificacion : []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cargar expedientes de instrucción.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    socket.on('ifi:pendiente', cargar);
    return () => {
      socket.off('ifi:pendiente', cargar);
    };
  }, []);

  const handleDescargoSubmit = async () => {
    if (!descargoTexto.trim()) {
      alert('Debe ingresar el contenido o resumen del descargo presentado.');
      return;
    }
    setActionLoading(true);
    try {
      await IfiApi.registrarDescargo(descargoModal.expId, descargoTexto.trim());
      setMessage({ type: 'success', text: `Descargo registrado para el expediente ${descargoModal.numero}.` });
      setDescargoModal({ isOpen: false, expId: '', numero: '' });
      setDescargoTexto('');
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrar descargo.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleImputacionSubmit = async () => {
    if (!imputacionModal.correcta && !motivoVicio.trim()) {
      alert('Debe fundamentar el vicio trascendente de imputación.');
      return;
    }
    setActionLoading(true);
    try {
      await IfiApi.sanearImputacion(imputacionModal.expId, imputacionModal.correcta, motivoVicio.trim());
      setMessage({
        type: 'success',
        text: `Imputación ${imputacionModal.correcta ? 'saneada como correcta' : 'declarada viciada'} para ${imputacionModal.numero}.`,
      });
      setImputacionModal({ isOpen: false, expId: '', numero: '', correcta: true });
      setMotivoVicio('');
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al sanear imputación.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlanchazo = async (expId: string) => {
    setActionLoading(true);
    try {
      const data = await IfiApi.generarPlanchazo(expId);
      setPlanchazoModal({ isOpen: true, data });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al generar planchazo automático.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnalisisSubmit = async () => {
    if (!analisisTexto.trim()) {
      alert('Debe ingresar el texto del análisis del instructor.');
      return;
    }
    setActionLoading(true);
    try {
      await IfiApi.registrarAnalisis(analisisModal.expId, analisisTexto.trim());
      setMessage({ type: 'success', text: `Análisis del instructor guardado para ${analisisModal.numero}.` });
      setAnalisisModal({ isOpen: false, expId: '', numero: '' });
      setAnalisisTexto('');
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar análisis.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecomendacion = async (expId: string, numero: string, rec: 'SANCIONAR' | 'ARCHIVAR') => {
    if (!window.confirm(`¿Confirmas la recomendación de ${rec} para el expediente ${numero}?`)) return;
    setActionLoading(true);
    try {
      await IfiApi.definirRecomendacion(expId, rec);
      setMessage({ type: 'success', text: `Recomendación ${rec} guardada para ${numero}.` });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar recomendación.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFirmar = async (expId: string, numero: string) => {
    if (!window.confirm(`¿Firmar digitalmente el IFI del expediente ${numero}?`)) return;
    setActionLoading(true);
    try {
      await IfiApi.firmarIfi(expId);
      setMessage({ type: 'success', text: `IFI del expediente ${numero} firmado correctamente.` });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al firmar IFI.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotificarSubmit = async () => {
    setActionLoading(true);
    try {
      await IfiApi.notificarIfi(notificarModal.expId, fechaNotificacion);
      setMessage({ type: 'success', text: `Notificación del IFI registrada para ${notificarModal.numero}.` });
      setNotificarModal({ isOpen: false, expId: '', numero: '' });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al notificar IFI.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-midnight-900)' }}>
            Fase de Instrucción e Informe Final (IFI - SP4)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Control de descargos, formulación del planchazo legal, análisis fáctico y propuesta instructora.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargar}>
          Actualizar
        </Button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('pendientes')}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'pendientes' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'pendientes' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'pendientes' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Expedientes en Instrucción ({pendientes.length})
        </button>
        <button
          onClick={() => setActiveTab('esperando')}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'esperando' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'esperando' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'esperando' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Esperando Notificación NC ({esperando.length})
        </button>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spinner size={32} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '12px' }}>
              Cargando expedientes de instrucción...
            </p>
          </div>
        ) : activeTab === 'esperando' ? (
          esperando.length === 0 ? (
            <EmptyState title="No hay expedientes en espera de notificación" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>N° Expediente</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Estado</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Condición Legal</th>
                  </tr>
                </thead>
                <tbody>
                  {esperando.map((e) => (
                    <tr key={e.expedienteId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{e.numeroExpediente}</td>
                      <td style={{ padding: '14px 16px' }}><Badge variant="neutral">{e.estado}</Badge></td>
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        ⏳ Bloqueado por regla de negocio hasta que la Notificación de Cargo sea efectivamente diligenciada.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : pendientes.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
            title="Bandeja IFI despejada"
            description="No hay expedientes pendientes de instrucción en este momento."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>N° Expediente</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Estado / Descargo</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Acciones de Instrucción</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Recomendación & Cierre</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((e) => (
                  <tr key={e.expedienteId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileTextIcon size={16} color="var(--color-primary-600)" />
                        {e.numeroExpediente}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        ID: {e.expedienteId.slice(0, 8)}...
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Badge variant="info">{e.estado}</Badge>
                        {e.tieneDescargo ? (
                          <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600 }}>
                            ✓ Descargo presentado
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--color-warning)', fontWeight: 500 }}>
                            Sin descargo aún
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setDescargoModal({ isOpen: true, expId: e.expedienteId, numero: e.numeroExpediente });
                            setDescargoTexto('');
                          }}
                        >
                          + Descargo
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setImputacionModal({ isOpen: true, expId: e.expedienteId, numero: e.numeroExpediente, correcta: true });
                          }}
                        >
                          Sanear Imputación
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<EyeIcon size={14} />}
                          onClick={() => handlePlanchazo(e.expedienteId)}
                        >
                          Planchazo
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setAnalisisModal({ isOpen: true, expId: e.expedienteId, numero: e.numeroExpediente });
                            setAnalisisTexto('');
                          }}
                        >
                          Análisis
                        </Button>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRecomendacion(e.expedienteId, e.numeroExpediente, 'SANCIONAR')}
                        >
                          Sancionar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRecomendacion(e.expedienteId, e.numeroExpediente, 'ARCHIVAR')}
                        >
                          Archivar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<PenToolIcon size={14} />}
                          onClick={() => handleFirmar(e.expedienteId, e.numeroExpediente)}
                        >
                          Firmar
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setNotificarModal({ isOpen: true, expId: e.expedienteId, numero: e.numeroExpediente });
                          }}
                        >
                          Notificar
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

      {/* Modal Registrar Descargo */}
      <Modal
        isOpen={descargoModal.isOpen}
        onClose={() => setDescargoModal({ isOpen: false, expId: '', numero: '' })}
        title={`Registrar Descargo del Administrado (${descargoModal.numero})`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDescargoModal({ isOpen: false, expId: '', numero: '' })}>
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleDescargoSubmit}>
              Guardar Descargo
            </Button>
          </>
        }
      >
        <Textarea
          label="Texto o Síntesis del Escrito de Descargos"
          placeholder="Transcriba o resuma los argumentos y medios probatorios presentados por el administrado dentro del plazo de 5 días hábiles..."
          value={descargoTexto}
          onChange={(e) => setDescargoTexto(e.target.value)}
          rows={5}
        />
      </Modal>

      {/* Modal Sanear Imputación */}
      <Modal
        isOpen={imputacionModal.isOpen}
        onClose={() => setImputacionModal({ isOpen: false, expId: '', numero: '', correcta: true })}
        title={`Sanear Imputación de Cargos (${imputacionModal.numero})`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setImputacionModal({ isOpen: false, expId: '', numero: '', correcta: true })}>
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleImputacionSubmit}>
              Guardar Evaluación
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            ¿La imputación de cargos en el acta y NC es jurídicamente correcta?
          </label>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="imputacion"
                checked={imputacionModal.correcta}
                onChange={() => setImputacionModal({ ...imputacionModal, correcta: true })}
              />
              Correcta (Sin vicios de nulidad)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="imputacion"
                checked={!imputacionModal.correcta}
                onChange={() => setImputacionModal({ ...imputacionModal, correcta: false })}
              />
              Incorrecta (Vicio trascendente)
            </label>
          </div>
        </div>

        {!imputacionModal.correcta && (
          <Textarea
            label="Motivo del Vicio Trascendente (Insanable)"
            placeholder="Explique el vicio esencial en la tipificación o hechos que impide proseguir con la sanción..."
            value={motivoVicio}
            onChange={(e) => setMotivoVicio(e.target.value)}
            rows={4}
          />
        )}
      </Modal>

      {/* Modal Visor de Planchazo Automatizado */}
      <Modal
        isOpen={planchazoModal.isOpen}
        onClose={() => setPlanchazoModal({ isOpen: false, data: null })}
        title="Planchazo Automatizado del IFI (SP4-T04)"
        maxWidth="720px"
        footer={
          <Button variant="primary" onClick={() => setPlanchazoModal({ isOpen: false, data: null })}>
            Cerrar Visor
          </Button>
        }
      >
        {planchazoModal.data && (
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <strong>Administrado:</strong> {planchazoModal.data.datosHeredados.administrado?.nombresRazonSocial || '(no identificado)'}<br />
              <strong>N° Expediente:</strong> {planchazoModal.data.datosHeredados.numeroExpediente}<br />
              <strong>Código(s) infracción:</strong>{' '}
              {planchazoModal.data.datosHeredados.infracciones.length > 0
                ? planchazoModal.data.datosHeredados.infracciones
                    .map((i) => `${i.codigo}${i.escala ? ` (${i.escala}${i.porcentajeAplicado ? `, ${i.porcentajeAplicado}%` : ''})` : ''}`)
                    .join('; ')
                : '(sin código registrado)'}
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '4px' }}>Antecedentes:</h4>
              <p style={{ backgroundColor: '#fdfdfd', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', whiteSpace: 'pre-wrap' }}>
                {planchazoModal.data.antecedentes}
              </p>
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '4px' }}>Marco Normativo:</h4>
              <p style={{ backgroundColor: '#fdfdfd', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', whiteSpace: 'pre-wrap' }}>
                {planchazoModal.data.marcoNormativo}
              </p>
            </div>
            {planchazoModal.data.transcripcionActa && (
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '4px' }}>Transcripción del Acta:</h4>
                <p style={{ backgroundColor: '#fdfdfd', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', whiteSpace: 'pre-wrap' }}>
                  {planchazoModal.data.transcripcionActa}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Registrar Análisis */}
      <Modal
        isOpen={analisisModal.isOpen}
        onClose={() => setAnalisisModal({ isOpen: false, expId: '', numero: '' })}
        title={`Análisis Jurídico del Instructor (${analisisModal.numero})`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAnalisisModal({ isOpen: false, expId: '', numero: '' })}>
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleAnalisisSubmit}>
              Guardar Análisis
            </Button>
          </>
        }
      >
        <Textarea
          label="Fundamentación del Instructor"
          placeholder="Escriba la valoración de los medios probatorios, descargos y determinación de la responsabilidad administrativa..."
          value={analisisTexto}
          onChange={(e) => setAnalisisTexto(e.target.value)}
          rows={6}
        />
      </Modal>

      {/* Modal Notificar IFI */}
      <Modal
        isOpen={notificarModal.isOpen}
        onClose={() => setNotificarModal({ isOpen: false, expId: '', numero: '' })}
        title={`Notificar IFI al Administrado (${notificarModal.numero})`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNotificarModal({ isOpen: false, expId: '', numero: '' })}>
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleNotificarSubmit}>
              Registrar Fecha Notificación
            </Button>
          </>
        }
      >
        <Input
          type="date"
          label="Fecha de Notificación Efectiva"
          value={fechaNotificacion}
          onChange={(e) => setFechaNotificacion(e.target.value)}
        />
      </Modal>
    </div>
  );
};