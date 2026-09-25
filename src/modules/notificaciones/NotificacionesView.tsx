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
      <div className="flex items-center justify-between mb-[20px]">
        <div>
          <h2 className="text-[18px] font-extrabold text-midnight-900">
            Diligenciamiento de Notificaciones Domiciliarias (SP3)
          </h2>
          <p className="text-[13px] text-text-muted mt-[2px]">
            Asignación de cédulas de notificación de cargo (NC) no entregadas in situ para diligencia en domicilio.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={() => cargar()}>
          Actualizar
        </Button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="flex gap-[8px] mb-[16px]">
        <Button variant={tab === 'pendientes' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('pendientes')}>
          Pendientes de Asignación
        </Button>
        <Button variant={tab === 'asignadas' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('asignadas')}>
          Asignadas — Esperando Visita/Entrega
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-[40px] text-center">
            <Spinner size={32} />
            <p className="text-[13px] text-text-muted mt-[12px]">
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] text-left">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-b-border">
                  <th className="py-[12px] px-[16px] font-bold text-text-secondary">ID Cédula</th>
                  <th className="py-[12px] px-[16px] font-bold text-text-secondary">NC Asociada</th>
                  <th className="py-[12px] px-[16px] font-bold text-text-secondary">Notificador</th>
                  <th className="py-[12px] px-[16px] font-bold text-text-secondary">Estado</th>
                  <th className="py-[12px] px-[16px] font-bold text-text-secondary text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {notificaciones.map((notif) => (
                  <tr
                    key={notif.id}
                    className="border-b border-b-border"
                  >
                    <td className="py-[14px] px-[16px] font-mono font-semibold">
                      <div className="flex items-center gap-[8px]">
                        <MailIcon size={16} color="var(--color-primary-600)" />
                        {notif.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="py-[14px] px-[16px] text-text-secondary">
                      {notif.notificacionCargoId || '---'}
                    </td>
                    <td className="py-[14px] px-[16px] text-text-secondary">
                      {notif.notificadorId ? (
                        <span className="flex items-center gap-[6px]">
                          <UserIcon size={14} />
                          {notif.notificadorNombre || notif.notificadorId}
                        </span>
                      ) : (
                        <Badge variant="warning">Sin asignar</Badge>
                      )}
                    </td>
                    <td className="py-[14px] px-[16px]">
                      <Badge variant={notif.estado === 'PENDIENTE_ASIGNACION' ? 'warning' : 'info'}>
                        {notif.estado}
                      </Badge>
                    </td>
                    <td className="py-[14px] px-[16px] text-right">
                      <div className="inline-flex gap-[8px]">
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
        <div>
          <label className="block mb-[0.375rem] text-[0.875rem] font-semibold">
            Notificador
          </label>
          <select
            className="w-full py-[0.625rem] px-[0.875rem] rounded-sm border border-border text-[0.9375rem]"
            value={notificadorId}
            onChange={(e) => setNotificadorId(e.target.value)}
          >
            <option value="">Selecciona un notificador…</option>
            {notificadores.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombres} — DNI {n.dni}
              </option>
            ))}
          </select>
          {notificadores.length === 0 && (
            <p className="text-[0.75rem] text-text-muted mt-[0.375rem]">
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
        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">
            Evidencia Documental / Foto de Cargo Firmado
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setArchivoEvidencia(e.target.files?.[0] || null)}
            className="text-[13px]"
          />
        </div>
      </Modal>
    </div>
  );
};