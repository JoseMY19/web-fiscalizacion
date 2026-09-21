import React, { useEffect, useState } from 'react';
import { ResolucionesApi, ExpedienteResolucionItem } from '../../api';
import { socket } from '../../lib/socket';
import { Card, Button, Badge, Modal, Input, Textarea, Alert, EmptyState, Spinner } from '../../components/common/Common';
import { GavelIcon, RefreshCwIcon, CheckCircleIcon, SearchIcon, PenToolIcon, ZapIcon } from '../../components/icons/Icons';

export const ResolucionesView: React.FC = () => {
  const [pendientes, setPendientes] = useState<ExpedienteResolucionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Consulta individual
  const [expedienteConsultaId, setExpedienteConsultaId] = useState('');
  const [resolucionDetalle, setResolucionDetalle] = useState<any | null>(null);

  // Modal Gestión de Resolución
  const [modalResolucion, setModalResolucion] = useState<{ isOpen: boolean; expId: string; numero: string }>({
    isOpen: false,
    expId: '',
    numero: '',
  });

  // Campos de edición
  const [tipoResolucion, setTipoResolucion] = useState<'RSG' | 'RSGSA'>('RSGSA');
  const [montoSinDescuento, setMontoSinDescuento] = useState('');
  const [montoConDescuento, setMontoConDescuento] = useState('');
  const [medidaComplementaria, setMedidaComplementaria] = useState('');
  const [analisisTexto, setAnalisisTexto] = useState('');
  const [responsableRetiroId, setResponsableRetiroId] = useState('');
  const [fechaNotificacion, setFechaNotificacion] = useState(new Date().toISOString().slice(0, 10));

  const cargar = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await ResolucionesApi.getPendientes();
      setPendientes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cargar expedientes pendientes de resolución.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    socket.on('resolucion:pendiente', cargar);
    return () => {
      socket.off('resolucion:pendiente', cargar);
    };
  }, []);

  const abrirGestion = (expId: string, numero: string) => {
    setModalResolucion({ isOpen: true, expId, numero });
    setTipoResolucion('RSGSA');
    setMontoSinDescuento('');
    setMontoConDescuento('');
    setMedidaComplementaria('');
    setAnalisisTexto('');
    setResponsableRetiroId('');
  };

  const handleGuardarTipo = async () => {
    setActionLoading(true);
    try {
      await ResolucionesApi.definirTipo(modalResolucion.expId, tipoResolucion);
      setMessage({ type: 'success', text: `Tipo ${tipoResolucion} guardado.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar tipo.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGuardarMontos = async () => {
    setActionLoading(true);
    try {
      const sinDesc = montoSinDescuento ? Number(montoSinDescuento) : undefined;
      const conDesc = montoConDescuento ? Number(montoConDescuento) : undefined;
      await ResolucionesApi.guardarMontos(modalResolucion.expId, sinDesc, conDesc);
      setMessage({ type: 'success', text: 'Montos de multa guardados exitosamente.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar montos.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGuardarMedida = async () => {
    setActionLoading(true);
    try {
      await ResolucionesApi.guardarMedidaComplementaria(modalResolucion.expId, medidaComplementaria);
      setMessage({ type: 'success', text: 'Medida complementaria guardada.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar medida complementaria.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerarSeccion = async () => {
    setActionLoading(true);
    try {
      await ResolucionesApi.generarSeccionAutomatica(modalResolucion.expId);
      setMessage({ type: 'success', text: 'Sección automática de la resolución generada con éxito.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al generar sección automática.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGuardarAnalisis = async () => {
    if (!analisisTexto.trim()) {
      alert('Debe redactar el análisis del resolutor.');
      return;
    }
    setActionLoading(true);
    try {
      await ResolucionesApi.registrarAnalisis(modalResolucion.expId, analisisTexto.trim());
      setMessage({ type: 'success', text: 'Análisis del resolutor guardado.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar análisis.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetiroCuenta = async () => {
    if (!responsableRetiroId.trim()) {
      alert('Ingrese el ID del responsable de retiro de cuenta.');
      return;
    }
    setActionLoading(true);
    try {
      await ResolucionesApi.tareaRetiroEstadoCuenta(modalResolucion.expId, responsableRetiroId.trim(), true);
      setMessage({ type: 'success', text: 'Tarea de retiro de estado de cuenta confirmada.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrar retiro de cuenta.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFirmarResolucion = async (expId: string, numero: string) => {
    if (!window.confirm(`¿Firmar oficialmente la Resolución del expediente ${numero}?`)) return;
    setActionLoading(true);
    try {
      await ResolucionesApi.firmar(expId);
      setMessage({ type: 'success', text: `Resolución del expediente ${numero} firmada exitosamente.` });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al firmar resolución.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotificarResolucion = async () => {
    setActionLoading(true);
    try {
      await ResolucionesApi.notificar(modalResolucion.expId, fechaNotificacion);
      setMessage({ type: 'success', text: 'Notificación de resolución registrada.' });
      setModalResolucion({ isOpen: false, expId: '', numero: '' });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al notificar resolución.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConsultar = async () => {
    if (!expedienteConsultaId.trim()) return;
    setActionLoading(true);
    try {
      const data = await ResolucionesApi.getDetalle(expedienteConsultaId.trim());
      setResolucionDetalle(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'No se encontró resolución para este expediente.' });
      setResolucionDetalle(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Gap encontrado en prueba end-to-end (2026-09-13): una vez firmada, la
  // resolución sale de "pendientes" y con ella desaparecía el único botón
  // que abría el modal con "Notificar Resolución" — quedaba sin forma de
  // notificarla desde la UI. Se agrega la acción acá, sobre el resultado
  // de la consulta por expediente, en vez de depender de esa bandeja.
  const [fechaNotificacionConsulta, setFechaNotificacionConsulta] = useState(new Date().toISOString().slice(0, 10));
  const handleNotificarDesdeConsulta = async () => {
    if (!expedienteConsultaId.trim()) return;
    setActionLoading(true);
    try {
      await ResolucionesApi.notificar(expedienteConsultaId.trim(), fechaNotificacionConsulta);
      setMessage({ type: 'success', text: 'Notificación de resolución registrada.' });
      await handleConsultar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al notificar resolución.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-midnight-900)' }}>
            Emisión de Resoluciones Finales (SP5)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Determinación de la sanción (RSGSA) o archivamiento (RSG) por parte de la Subgerencia.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargar}>
          Actualizar
        </Button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Main Table */}
      <Card title="Expedientes Listos para Resolución Final">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spinner size={32} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '12px' }}>
              Cargando expedientes pendientes de resolución...
            </p>
          </div>
        ) : pendientes.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
            title="Sin resoluciones pendientes"
            description="No hay expedientes pendientes de resolver en este momento."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>N° Expediente</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Estado</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Dictamen IFI</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Acciones Resolutorias</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((e) => (
                  <tr key={e.expedienteId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GavelIcon size={16} color="var(--color-purple)" />
                        {e.numeroExpediente}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        ID: {e.expedienteId.slice(0, 8)}...
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant="purple">{e.estado}</Badge>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {e.recomendacionIfi === 'SANCIONAR' ? (
                        <Badge variant="danger">SANCIONAR</Badge>
                      ) : e.recomendacionIfi === 'ARCHIVAR' ? (
                        <Badge variant="neutral">ARCHIVAR</Badge>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Pendiente</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => abrirGestion(e.expedienteId, e.numeroExpediente)}
                        >
                          Configurar & Emitir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<PenToolIcon size={14} />}
                          onClick={() => handleFirmarResolucion(e.expedienteId, e.numeroExpediente)}
                        >
                          Firmar RSG
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

      {/* Visor / Buscador de Resolución */}
      <div style={{ marginTop: '24px' }}>
        <Card title="Consultar Resolución Emitida por ID de Expediente">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Pegar ID del Expediente..."
              value={expedienteConsultaId}
              onChange={(e) => setExpedienteConsultaId(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '13px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            />
            <Button variant="secondary" icon={<SearchIcon size={16} />} loading={actionLoading} onClick={handleConsultar}>
              Consultar Resolución
            </Button>
          </div>

          {resolucionDetalle && (
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              {resolucionDetalle.estado === 'EMITIDA' && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '14px' }}>
                  <Input
                    type="date"
                    label="Fecha de Notificación Efectiva"
                    value={fechaNotificacionConsulta}
                    onChange={(e) => setFechaNotificacionConsulta(e.target.value)}
                  />
                  <Button variant="success" loading={actionLoading} onClick={handleNotificarDesdeConsulta}>
                    Notificar Resolución
                  </Button>
                </div>
              )}
              <pre style={{ fontSize: '12px', overflowX: 'auto' }}>
                {JSON.stringify(resolucionDetalle, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </div>

      {/* Modal Configuración Completa de Resolución */}
      <Modal
        isOpen={modalResolucion.isOpen}
        onClose={() => setModalResolucion({ isOpen: false, expId: '', numero: '' })}
        title={`Configurar Resolución: ${modalResolucion.numero}`}
        maxWidth="680px"
        footer={
          <Button variant="secondary" onClick={() => setModalResolucion({ isOpen: false, expId: '', numero: '' })}>
            Cerrar Ventana
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Tipo */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              1. Tipo de Resolución Final
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={tipoResolucion}
                onChange={(e) => setTipoResolucion(e.target.value as any)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
              >
                <option value="RSGSA">RSGSA — Con Sanción Administrativa y Multa</option>
                <option value="RSG">RSG — Subgerencia (Absolutoria / Sin Multa)</option>
              </select>
              <Button size="sm" variant="primary" onClick={handleGuardarTipo}>
                Guardar Tipo
              </Button>
            </div>
          </div>

          {/* 2. Montos & Medida Complementaria */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              2. Determinación de la Multa y Medidas Complementarias
            </label>
            <Alert type="warning" style={{ marginBottom: '12px' }}>
              El sistema NO calcula el descuento por pronto pago (no existe un % confirmado por la Subgerencia —
              ver decisión §2.13 de erd-sp1-decisiones.md). Ambos montos son de cálculo y verificación manual.
            </Alert>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Monto Multa (S/)"
                placeholder="Ej. 2750.00"
                type="number"
                value={montoSinDescuento}
                onChange={(e) => setMontoSinDescuento(e.target.value)}
              />
              <Input
                label="Monto con Descuento (S/)"
                placeholder="Opcional"
                type="number"
                value={montoConDescuento}
                onChange={(e) => setMontoConDescuento(e.target.value)}
              />
            </div>
            <Button size="sm" variant="secondary" onClick={handleGuardarMontos} style={{ marginBottom: '12px' }}>
              Guardar Montos
            </Button>

            <Input
              label="Medida Complementaria Sancionadora"
              placeholder="Ej. CLAUSURA TEMPORAL POR 30 DÍAS / DECOMISO"
              value={medidaComplementaria}
              onChange={(e) => setMedidaComplementaria(e.target.value)}
            />
            <Button size="sm" variant="secondary" onClick={handleGuardarMedida}>
              Guardar Medida Complementaria
            </Button>
          </div>

          {/* 3. Sección Automática y Análisis */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              3. Fundamentación Jurídica
            </label>
            <div style={{ marginBottom: '10px' }}>
              <Button size="sm" variant="outline" icon={<ZapIcon size={14} />} onClick={handleGenerarSeccion}>
                Generar Sección Automática de Antecedentes
              </Button>
            </div>
            <Textarea
              label="Análisis Jurídico del Resolutor (Subgerente)"
              placeholder="Escriba la fundamentación de derecho y decisión de la autoridad resolutoria..."
              value={analisisTexto}
              onChange={(e) => setAnalisisTexto(e.target.value)}
              rows={4}
            />
            <Button size="sm" variant="secondary" onClick={handleGuardarAnalisis}>
              Guardar Análisis
            </Button>
          </div>

          {/* 4. Retiro Estado de Cuenta (solo si es RSG) */}
          {tipoResolucion === 'RSG' && (
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#92400e' }}>
                4. Retiro de Estado de Cuenta (Solo Resoluciones Absolutorias RSG)
              </label>
              <Input
                label="ID del Responsable Tributario"
                placeholder="ID del usuario asignado"
                value={responsableRetiroId}
                onChange={(e) => setResponsableRetiroId(e.target.value)}
              />
              <Button size="sm" variant="warning" onClick={handleRetiroCuenta}>
                Confirmar Tarea de Retiro de Cuenta
              </Button>
            </div>
          )}

          {/* 5. Notificación */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              5. Notificación al Administrado
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input
                  type="date"
                  label="Fecha Notificación Efectiva"
                  value={fechaNotificacion}
                  onChange={(e) => setFechaNotificacion(e.target.value)}
                />
              </div>
              <Button size="sm" variant="success" onClick={handleNotificarResolucion} style={{ marginBottom: '14px' }}>
                Notificar Resolución
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};