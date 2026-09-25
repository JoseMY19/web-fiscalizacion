import React, { useEffect, useState } from 'react';
import { NotificacionesApi, NotificacionItem, AuthApi } from '../../api';
import { Card, Button, Badge, Modal, Input, Textarea, Alert, EmptyState, Spinner } from '../../components/common/Common';
import { hoyLocal } from '../../lib/fechas';
import { MailIcon, RefreshCwIcon, UserIcon, CheckCircleIcon } from '../../components/icons/Icons';
import { socket } from '../../lib/socket';

type Tab = 'pendientes' | 'asignadas';

export const NotificacionesView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('pendientes');
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Asignar
  const [asignarModal, setAsignarModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [notificadorId, setNotificadorId] = useState('');
  const [notificadores, setNotificadores] = useState<{ id: string; dni: string; nombres: string }[]>([]);

  // Modal Reprogramar
  const [reprogramarModal, setReprogramarModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [motivoReprogramacion, setMotivoReprogramacion] = useState('');

  // Modal Entrega Domiciliaria
  const [entregaModal, setEntregaModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [fechaVisita, setFechaVisita] = useState(hoyLocal());
  const [fechaEntregaEfectiva, setFechaEntregaEfectiva] = useState(hoyLocal());
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);

  const cargar = async (tabActual: Tab = tab) => {
    setLoading(true);
    setMessage(null);
    try {
      const data =
        tabActual === 'pendientes'
          ? await NotificacionesApi.getPendientesAsignacion()
          : await NotificacionesApi.getAsignadas();
      setNotificaciones(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cargar notificaciones domiciliarias.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const recargar = () => cargar(tab);
    cargar(tab);
    socket.on('notificacion-domiciliaria:pendiente', recargar);
    return () => {
      socket.off('notificacion-domiciliaria:pendiente', recargar);
    };
  }, [tab]);

  useEffect(() => {
    if (!asignarModal.isOpen) return;
    AuthApi.getUsuariosPorRol('NOTIFICADOR')
      .then(setNotificadores)
      .catch(() => setNotificadores([]));
  }, [asignarModal.isOpen]);

  const handleAsignarSubmit = async () => {
    if (!notificadorId.trim()) {
      setMessage({ type: 'error', text: 'Debes seleccionar un notificador.' });
      return;
    }
    setActionLoading(true);
    try {
      await NotificacionesApi.asignar(asignarModal.id, notificadorId.trim());
      setMessage({ type: 'success', text: 'Notificador asignado correctamente a la cédula.' });
      setAsignarModal({ isOpen: false, id: '' });
      setNotificadorId('');
      setTab('asignadas');
      cargar('asignadas');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al asignar notificador.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReprogramarSubmit = async () => {
    if (!motivoReprogramacion.trim()) {
      setMessage({ type: 'error', text: 'Debes indicar el motivo de reprogramación (ej. domicilio cerrado, segunda visita).' });
      return;
    }
    setActionLoading(true);
    try {
      await NotificacionesApi.reprogramar(reprogramarModal.id, motivoReprogramacion.trim());
      setMessage({ type: 'success', text: 'Visita reprogramada exitosamente.' });
      setReprogramarModal({ isOpen: false, id: '' });
      setMotivoReprogramacion('');
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al reprogramar visita.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEntregaSubmit = async () => {
    if (!archivoEvidencia) {
      setMessage({ type: 'error', text: 'Debe adjuntar el archivo o foto del cargo de notificación firmado.' });
      return;
    }
    setActionLoading(true);
    try {
      await NotificacionesApi.registrarEntrega(
        entregaModal.id,
        fechaVisita,
        fechaEntregaEfectiva,
        archivoEvidencia
      );
      setMessage({ type: 'success', text: 'Entrega de notificación y cargo registrados exitosamente.' });
      setEntregaModal({ isOpen: false, id: '' });
      setArchivoEvidencia(null);
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrar entrega domiciliaria.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-midnight-900)' }}>
            Diligenciamiento de Notificaciones Domiciliarias (SP3)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Asignación de cédulas de notificación de cargo (NC) no entregadas in situ para diligencia en domicilio.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={() => cargar()}>
          Actualizar
        </Button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Button variant={tab === 'pendientes' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('pendientes')}>
          Pendientes de Asignación
        </Button>
        <Button variant={tab === 'asignadas' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('asignadas')}>
          Asignadas — Esperando Visita/Entrega
        </Button>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spinner size={32} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '12px' }}>
              Cargando cédulas de notificación...
            </p>
          </div>
        ) : notificaciones.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
            title={tab === 'pendientes' ? 'Sin notificaciones domiciliarias pendientes' : 'Sin notificaciones asignadas'}
            description={
              tab === 'pendientes'
                ? 'Todas las notificaciones de cargo han sido asignadas o entregadas exitosamente.'
                : 'No hay cédulas asignadas a un notificador esperando visita o entrega en este momento.'
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>ID Cédula</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>NC Asociada</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Notificador</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Estado</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {notificaciones.map((notif) => (
                  <tr
                    key={notif.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MailIcon size={16} color="var(--color-primary-600)" />
                        {notif.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)' }}>
                      {notif.notificacionCargoId || '---'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)' }}>
                      {notif.notificadorId ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserIcon size={14} />
                          {notif.notificadorNombre || notif.notificadorId}
                        </span>
                      ) : (
                        <Badge variant="warning">Sin asignar</Badge>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant={notif.estado === 'PENDIENTE_ASIGNACION' ? 'warning' : 'info'}>
                        {notif.estado}
                      </Badge>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {tab === 'pendientes' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setAsignarModal({ isOpen: true, id: notif.id });
                              setNotificadorId('');
                            }}
                          >
                            Asignar
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="warning"
                              size="sm"
                              onClick={() => {
                                setReprogramarModal({ isOpen: true, id: notif.id });
                                setMotivoReprogramacion('');
                              }}
                            >
                              Reprogramar
                            </Button>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => {
                                setEntregaModal({ isOpen: true, id: notif.id });
                              }}
                            >
                              Registrar Entrega
                            </Button>
                          </>
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

      {/* Modal Asignar Notificador */}
      <Modal
        isOpen={asignarModal.isOpen}
        onClose={() => {
          setAsignarModal({ isOpen: false, id: '' });
          setNotificadorId('');
        }}
        title="Asignar Notificador Institucional"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setAsignarModal({ isOpen: false, id: '' });
                setNotificadorId('');
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleAsignarSubmit}>
              Guardar Asignación
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label form-label-required" style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 600 }}>
            Notificador
          </label>
          <select
            className="form-select"
            value={notificadorId}
            onChange={(e) => setNotificadorId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '0.9375rem',
            }}
          >
            <option value="">Selecciona un notificador…</option>
            {notificadores.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombres} — DNI {n.dni}
              </option>
            ))}
          </select>
          {notificadores.length === 0 && (
            <p className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
              No hay usuarios con rol NOTIFICADOR registrados.
            </p>
          )}
        </div>
      </Modal>

      {/* Modal Reprogramar */}
      <Modal
        isOpen={reprogramarModal.isOpen}
        onClose={() => setReprogramarModal({ isOpen: false, id: '' })}
        title="Reprogramar Visita Domiciliaria"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReprogramarModal({ isOpen: false, id: '' })}>
              Cancelar
            </Button>
            <Button variant="warning" loading={actionLoading} onClick={handleReprogramarSubmit}>
              Confirmar Reprogramación
            </Button>
          </>
        }
      >
        <Textarea
          label="Causa o Resultado de la Visita Fallida"
          placeholder="Ej. Inmueble cerrado en horario hábil; se fija aviso de visita para 2da fecha."
          value={motivoReprogramacion}
          onChange={(e) => setMotivoReprogramacion(e.target.value)}
        />
      </Modal>

      {/* Modal Registrar Entrega */}
      <Modal
        isOpen={entregaModal.isOpen}
        onClose={() => setEntregaModal({ isOpen: false, id: '' })}
        title="Registrar Entrega Efectiva y Cargo de Notificación"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEntregaModal({ isOpen: false, id: '' })}>
              Cancelar
            </Button>
            <Button variant="success" loading={actionLoading} onClick={handleEntregaSubmit}>
              Registrar Entrega y Evidencia
            </Button>
          </>
        }
      >
        <Input
          type="date"
          label="Fecha de la Visita"
          value={fechaVisita}
          onChange={(e) => setFechaVisita(e.target.value)}
        />
        <Input
          type="date"
          label="Fecha de Entrega Efectiva"
          value={fechaEntregaEfectiva}
          onChange={(e) => setFechaEntregaEfectiva(e.target.value)}
        />
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
            Evidencia Documental / Foto de Cargo Firmado
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setArchivoEvidencia(e.target.files?.[0] || null)}
            style={{ fontSize: '13px' }}
          />
        </div>
      </Modal>
    </div>
  );
};