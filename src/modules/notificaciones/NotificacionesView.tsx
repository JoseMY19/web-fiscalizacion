import React, { useEffect, useState } from 'react';
import { NotificacionesApi, NotificacionItem, AuthApi } from '../../api';
import { Button, Modal, Input, Textarea, Alert } from '../../components/common/Common';
import { PageHeader, SegmentedTabs } from '../../components/common/PageKit';
import { TodoAlDia } from '../../components/common/TodoAlDia';
import { EsqueletoTarjetas } from '../../components/common/EsqueletoTarjetas';
import { VisitasNotificacionModal } from './VisitasNotificacionModal';
import { hoyLocal } from '../../lib/fechas';
import { CheckCircleIcon, RefreshCwIcon, UserIcon } from '../../components/icons/Icons';
import { socket } from '../../lib/socket';
import { TarjetaCedula } from './TarjetaCedula';
import type { BandejaCedulas } from './notificacionesUi';

export const NotificacionesView: React.FC = () => {
  const [tab, setTab] = useState<BandejaCedulas>('pendientes');
  // Las dos bandejas se cargan juntas para cambiar de pestaña sin esperar.
  const [pendientes, setPendientes] = useState<NotificacionItem[]>([]);
  const [asignadas, setAsignadas] = useState<NotificacionItem[]>([]);
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

  // Visitas del notificador: 1ª sin éxito (acta de aviso) → 2ª bajo puerta con fotos.
  const [visitasId, setVisitasId] = useState<string | null>(null);

  // Modal Entrega Domiciliaria
  const [entregaModal, setEntregaModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [fechaVisita, setFechaVisita] = useState(hoyLocal());
  const [fechaEntregaEfectiva, setFechaEntregaEfectiva] = useState(hoyLocal());
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);

  const cargar = async () => {
    setLoading(true);
    setMessage(null);
    const [pend, asig] = await Promise.allSettled([NotificacionesApi.getPendientesAsignacion(), NotificacionesApi.getAsignadas()]);
    if (pend.status === 'fulfilled') setPendientes(Array.isArray(pend.value) ? pend.value : []);
    if (asig.status === 'fulfilled') setAsignadas(Array.isArray(asig.value) ? asig.value : []);
    const fallo = [pend, asig].find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (fallo) setMessage({ type: 'error', text: fallo.reason?.message || 'Error al cargar notificaciones domiciliarias.' });
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    socket.on('notificacion-domiciliaria:pendiente', cargar);
    return () => {
      socket.off('notificacion-domiciliaria:pendiente', cargar);
    };
  }, []);

  const cedulas = tab === 'pendientes' ? pendientes : asignadas;

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
      cargar();
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
      <PageHeader
        etiqueta="Procedimiento sancionador · Paso 3"
        titulo="Notificación de Cédulas"
        descripcion="Asignación de cédulas de notificación de cargo (NC) no entregadas in situ para diligencia en domicilio."
        acciones={
          <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={loading} onClick={() => cargar()}>
            Actualizar
          </Button>
        }
      />

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="flex flex-col gap-[16px]">
        {/* Pestañas de la bandeja */}
        <div className="animate-aparecer [animation-delay:80ms]">
          <SegmentedTabs<BandejaCedulas>
            items={[
              { clave: 'pendientes', etiqueta: 'Pendientes de Asignación' },
              { clave: 'asignadas', etiqueta: 'Asignadas - Esperando Visita/Entrega' },
            ]}
            activa={tab}
            onChange={setTab}
          />
        </div>

        {/* Qué se está viendo */}
        <div className="py-[12px] px-[16px] rounded-lg bg-bg-card border border-border shadow-xs animate-aparecer [animation-delay:150ms]">
          <p key={tab} className="text-[13px] text-text-muted m-0 animate-aparecer [animation-duration:300ms]">
            {tab === 'pendientes' ? (
              <>
                <span className="font-bold text-text-main">Pendientes de asignación:</span> elige el notificador que hará la diligencia en el domicilio.
              </>
            ) : (
              <>
                <span className="font-bold text-text-main">Asignadas:</span> registra la entrega con el cargo firmado, o reprograma la visita si no se pudo notificar.
              </>
            )}
          </p>
        </div>

        {/* Cédulas */}
        {loading ? (
          <EsqueletoTarjetas />
        ) : cedulas.length === 0 ? (
          <div className="rounded-lg bg-bg-card border border-dashed border-border-dark py-[24px] flex items-center justify-center min-h-[max(280px,calc(100vh-365px))]">
            <TodoAlDia
              titulo={tab === 'pendientes' ? 'Sin notificaciones domiciliarias pendientes' : 'Sin notificaciones asignadas'}
              descripcion={
                tab === 'pendientes'
                  ? 'Todas las notificaciones de cargo han sido asignadas o entregadas exitosamente.'
                  : 'No hay cédulas asignadas a un notificador esperando visita o entrega en este momento.'
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {cedulas.map((notif, i) =>
              tab === 'pendientes' ? (
                <TarjetaCedula
                  key={notif.id}
                  cedula={notif}
                  indice={i}
                  accion={{
                    etiqueta: 'Asignar',
                    icono: <UserIcon size={14} />,
                    onClick: () => {
                      setAsignarModal({ isOpen: true, id: notif.id });
                      setNotificadorId('');
                    },
                  }}
                />
              ) : (
                <TarjetaCedula
                  key={notif.id}
                  cedula={notif}
                  indice={i}
                  accion={{ etiqueta: 'Registrar entrega', icono: <CheckCircleIcon size={14} />, onClick: () => setEntregaModal({ isOpen: true, id: notif.id }) }}
                  acciones={[
                    {
                      etiqueta: 'Reprogramar',
                      onClick: () => {
                        setReprogramarModal({ isOpen: true, id: notif.id });
                        setMotivoReprogramacion('');
                      },
                    },
                    { etiqueta: 'Visitas / bajo puerta', onClick: () => setVisitasId(notif.id) },
                  ]}
                />
              ),
            )}
          </div>
        )}
      </div>

      {visitasId && <VisitasNotificacionModal id={visitasId} onClose={() => setVisitasId(null)} onCambio={() => cargar()} />}

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
          <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">
            Notificador
          </label>
          <select
            className="w-full py-[10px] px-[14px] rounded-sm border border-border bg-white text-[14px] text-text-main outline-none [transition:border-color_150ms,box-shadow_150ms] focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
            value={notificadorId}
            onChange={(e) => setNotificadorId(e.target.value)}
          >
            <option value="">Selecciona un notificador…</option>
            {notificadores.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombres} - DNI {n.dni}
              </option>
            ))}
          </select>
          {notificadores.length === 0 && (
            <p className="text-[12px] text-text-muted mt-[6px]">
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
