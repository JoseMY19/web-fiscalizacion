import React, { useCallback, useEffect, useState } from 'react';
import { PrescripcionApi, SolicitudPrescripcionItem, abrirDocumentoPrescripcion, descargarRsgPrescripcion } from '../../api';
import { UsuariosApi } from '../../api/usuarios';
import { Alert, Badge, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { claseBloqueTramite, claseFilaTramite, claseInputArchivo, claseSelectTramite, PasoTramite } from '../../components/common/PasoTramite';
import { EyeIcon, FileTextIcon, PenToolIcon, PlusIcon } from '../../components/icons/Icons';
import { formatearFecha, formatearFechaHora, hoyLocal } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { AgregarMultaModal } from './AgregarMultaModal';
import { MultaPrescripcionCard } from './MultaPrescripcionCard';
import { nombreArchivoRsgPrescripcion, resumenMultas } from './prescripcionUi';

interface Props {
  solicitudId: string;
  onClose: () => void;
  onCambio: () => void;
}

/**
 * Panel de una solicitud de prescripción: solicitud → multas (cómputo,
 * suspensiones, memorando COA/DC, decisión) → RSG Word → firma física →
 * notificación → el analista actualiza el estado de cuenta.
 */
export const PrescripcionPanel: React.FC<Props> = ({ solicitudId, onClose, onCambio }) => {
  const [s, setS] = useState<SolicitudPrescripcionItem | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const [agregando, setAgregando] = useState<'sistema' | 'manual' | null>(null);
  const [usuarios, setUsuarios] = useState<{ id: string; nombres: string }[]>([]);

  const [analisis, setAnalisis] = useState('');
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [fechaEnvio, setFechaEnvio] = useState('');
  const [fechaFirma, setFechaFirma] = useState('');
  const [numeroResolucion, setNumeroResolucion] = useState('');
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [confirmada, setConfirmada] = useState(false);

  const recargar = useCallback(async () => {
    try {
      const d = await PrescripcionApi.getDetalle(solicitudId);
      setS(d);
      setErrorCarga(null);
      return d;
    } catch (err: any) {
      setErrorCarga(err.message || 'No se pudo cargar la solicitud.');
      return null;
    }
  }, [solicitudId]);

  useEffect(() => {
    recargar().then((d) => {
      setAnalisis(d?.analisisTexto ?? '');
      setResponsableId(d?.estadoCuenta.responsableId ?? '');
    });
    UsuariosApi.opciones('prescripcion')
      .then((u) => setUsuarios(Array.isArray(u) ? u : []))
      .catch(() => undefined);
  }, [recargar]);

  const ejecutar = async (clave: string, fn: () => Promise<unknown>, exito: string) => {
    setAccion(clave);
    try {
      await fn();
      setMensaje({ type: 'success', text: exito });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo completar la acción.' });
    } finally {
      await recargar();
      onCambio();
      setAccion(null);
    }
  };
  const error = (text: string) => setMensaje({ type: 'error', text });

  if (!s) {
    return (
      <Modal isOpen onClose={onClose} title="Solicitud de prescripción">
        {errorCarga ? <Alert type="error">{errorCarga}</Alert> : <div className="p-[30px] text-center"><Spinner size={28} /></div>}
      </Modal>
    );
  }

  const hoy = hoyLocal();
  const todasDecididas = s.multas.length > 0 && s.multas.every((m) => m.resultado);

  const adjuntar = () => {
    if (pdfs.length === 0) return error('Elige al menos un PDF.');
    return ejecutar('adjuntar', async () => {
      await PrescripcionApi.adjuntarDocumentos(s.id, pdfs);
      setPdfs([]);
    }, 'PDF adjuntado.');
  };
  const descargar = () => descargarRsgPrescripcion(s.id, nombreArchivoRsgPrescripcion(s)).catch((err: any) => error(err.message || 'No se pudo generar la RSG.'));
  const enviar = () => {
    if (!fechaEnvio) return error('Ingresa la fecha real de entrega al Subgerente.');
    return ejecutar('enviar', () => PrescripcionApi.enviarAFirma(s.id, fechaEnvio), 'Envío a firma registrado.');
  };
  const firmar = () => {
    if (!fechaFirma) return error('Ingresa la fecha real de firma.');
    if (!numeroResolucion.trim()) return error('Ingresa el N° de la RSG tal como figura en el papel.');
    return ejecutar('firmar', () => PrescripcionApi.firmar(s.id, fechaFirma, numeroResolucion.trim()), 'Firma registrada.');
  };
  const notificar = () => {
    if (!fechaNotificacion) return error('Ingresa la fecha real de notificación.');
    return ejecutar('notificar', () => PrescripcionApi.notificar(s.id, fechaNotificacion), 'Notificación registrada.');
  };
  const guardarEstadoCuenta = () => {
    if (!responsableId) return error('Elige al analista responsable de la lista de usuarios.');
    return ejecutar('estado', () => PrescripcionApi.estadoCuenta(s.id, responsableId, confirmada), confirmada ? 'Actualización del estado de cuenta confirmada.' : 'Responsable asignado.');
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Prescripción — ${s.administradoNombre}`}
      maxWidth="900px"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {mensaje && (
        <div className="sticky top-0 z-[2] bg-[#ffffff] pb-[4px] mb-[8px]">
          <div onClick={() => setMensaje(null)} title="Clic para cerrar" className="cursor-pointer">
            <Alert type={mensaje.type} className="mb-0!">
              {mensaje.text}
            </Alert>
          </div>
        </div>
      )}

      <div className={cn(claseBloqueTramite, 'mb-[16px]')}>
        <div className="flex items-center gap-[8px] flex-wrap mb-[6px]">
          <Badge variant={s.resuelta ? 'success' : 'info'} size="md">
            {s.resuelta ? 'Resuelta' : 'En evaluación'}
          </Badge>
          <span className="text-text-secondary">{resumenMultas(s)}</span>
        </div>
        <div>
          Administrado: <strong>{s.administradoNombre}</strong>
          {s.administradoNumeroDocumento ? ` (${s.administradoTipoDocumento ?? 'Doc.'} ${s.administradoNumeroDocumento})` : ''}
          {s.codigoContribuyente ? ` · Cód. contribuyente ${s.codigoContribuyente}` : ''}
        </div>
        <div className="text-text-secondary">Domicilio: {s.domicilio ?? '—'}</div>
      </div>

      {/* 1. SOLICITUD */}
      <PasoTramite n={1} titulo="Solicitud (a pedido de parte)" hecho>
        <div>
          Presentada el <strong>{formatearFecha(s.fechaPresentacion)}</strong>
          {s.numeroSgd ? ` — Documento ${s.numeroSgd}` : ''}.
        </div>
        <div className="mt-[6px] whitespace-pre-wrap">{s.resumen}</div>
        <div className="flex gap-[6px] flex-wrap mt-[8px]">
          {s.documentos.map((d) => (
            <Button key={d.id} size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={() => abrirDocumentoPrescripcion(d.id).catch((err: any) => error(err.message))}>
              {d.nombreOriginal}
            </Button>
          ))}
        </div>
        <div className={claseFilaTramite}>
          <input type="file" accept="application/pdf,.pdf" multiple onChange={(e) => setPdfs(Array.from(e.target.files ?? []))} className={claseInputArchivo} />
          <Button size="sm" variant="secondary" loading={accion === 'adjuntar'} disabled={pdfs.length === 0} onClick={adjuntar}>
            Adjuntar PDF
          </Button>
        </div>
      </PasoTramite>

      {/* 2. MULTAS */}
      <PasoTramite n={2} titulo="Multas: cómputo y decisión" hecho={todasDecididas}>
        {s.editable && (
          <div className="flex gap-[8px] flex-wrap mb-[10px]">
            <Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setAgregando('sistema')}>
              Agregar multa del sistema
            </Button>
            <Button size="sm" variant="secondary" icon={<PlusIcon size={14} />} onClick={() => setAgregando('manual')}>
              Agregar multa antigua (manual)
            </Button>
          </div>
        )}
        {s.multas.length === 0 && <div className="text-text-muted">Todavía no hay multas en esta solicitud.</div>}
        {s.multas.map((m, i) => (
          <MultaPrescripcionCard
            key={m.id}
            solicitudId={s.id}
            multa={m}
            letra={`${String.fromCharCode(97 + (i % 26))})`}
            editable={s.editable}
            ejecutar={ejecutar}
            accion={accion}
            onError={error}
          />
        ))}
        <div className="mt-[8px]">
          {s.editable ? (
            <>
              <Textarea
                label="Análisis del abogado (opcional; se agrega al ANÁLISIS de la RSG)"
                value={analisis}
                onChange={(e) => setAnalisis(e.target.value)}
                className="min-h-[90px]!"
              />
              <Button size="sm" variant="secondary" loading={accion === 'analisis'} onClick={() => ejecutar('analisis', () => PrescripcionApi.guardarAnalisis(s.id, analisis), 'Análisis guardado.')}>
                Guardar análisis
              </Button>
            </>
          ) : (
            s.analisisTexto && <div className="whitespace-pre-wrap text-[12px]">{s.analisisTexto}</div>
          )}
        </div>
      </PasoTramite>

      {/* 3. RSG */}
      <PasoTramite n={3} titulo="RSG (Word)" hecho={todasDecididas}>
        {todasDecididas ? (
          <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={descargar}>
            Descargar RSG de prescripción (Word)
          </Button>
        ) : (
          <span className="text-text-muted">Disponible cuando cada multa tenga su decisión.</span>
        )}
      </PasoTramite>

      {/* 4. ENVÍO A FIRMA */}
      <PasoTramite n={4} titulo="Envío a firma del Subgerente" hecho={!!s.fechaEnvioFirma}>
        {s.fechaEnvioFirma ? (
          <div>Entregada al Subgerente el {formatearFecha(s.fechaEnvioFirma)}. El contenido ya no se puede editar.</div>
        ) : todasDecididas ? (
          <div className={claseFilaTramite}>
            <div className="w-[230px]">
              <Input type="date" label="Fecha de entrega al Subgerente" value={fechaEnvio} max={hoy} onChange={(e) => setFechaEnvio(e.target.value)} />
            </div>
            <Button size="sm" icon={<PenToolIcon size={14} />} loading={accion === 'enviar'} onClick={enviar} className="mb-[14px]!">
              Registrar envío a firma
            </Button>
          </div>
        ) : (
          <span className="text-text-muted">Disponible cuando la RSG esté lista.</span>
        )}
      </PasoTramite>

      {/* 5. FIRMA */}
      <PasoTramite n={5} titulo="Firma" hecho={!!s.fechaFirma}>
        {s.fechaFirma ? (
          <div>
            RSG N° <strong>{s.numeroResolucion}</strong>, firmada el {formatearFecha(s.fechaFirma)}.
          </div>
        ) : s.fechaEnvioFirma ? (
          <div className={claseFilaTramite}>
            <div className="w-[200px]">
              <Input type="date" label="Fecha de firma" value={fechaFirma} min={s.fechaEnvioFirma.slice(0, 10)} max={hoy} onChange={(e) => setFechaFirma(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Input label="N° de RSG" placeholder="Tal como figura en el papel" value={numeroResolucion} onChange={(e) => setNumeroResolucion(e.target.value)} />
            </div>
            <Button size="sm" variant="success" loading={accion === 'firmar'} onClick={firmar} className="mb-[14px]!">
              Registrar firma
            </Button>
          </div>
        ) : (
          <span className="text-text-muted">Disponible después del envío a firma.</span>
        )}
      </PasoTramite>

      {/* 6. NOTIFICACIÓN */}
      <PasoTramite n={6} titulo="Notificación" hecho={!!s.fechaNotificacion}>
        {s.fechaNotificacion ? (
          <div>Notificada el {formatearFecha(s.fechaNotificacion)}.</div>
        ) : s.fechaFirma ? (
          <div className={claseFilaTramite}>
            <div className="w-[200px]">
              <Input type="date" label="Fecha de notificación" value={fechaNotificacion} min={s.fechaFirma.slice(0, 10)} max={hoy} onChange={(e) => setFechaNotificacion(e.target.value)} />
            </div>
            <Button size="sm" variant="success" loading={accion === 'notificar'} onClick={notificar} className="mb-[14px]!">
              Registrar notificación
            </Button>
          </div>
        ) : (
          <span className="text-text-muted">Disponible después de registrar la firma.</span>
        )}
      </PasoTramite>

      {/* 7. ESTADO DE CUENTA */}
      <PasoTramite n={7} titulo="El analista actualiza el Estado de Cuenta" hecho={s.estadoCuenta.confirmada || (s.resuelta && !s.hayPrescritas)}>
        {s.estadoCuenta.confirmada ? (
          <div>
            Confirmado por <strong>{s.estadoCuenta.responsableNombre ?? '—'}</strong> el {formatearFechaHora(s.estadoCuenta.fechaConfirmacion)}.
          </div>
        ) : !s.fechaNotificacion ? (
          <span className="text-text-muted">Disponible después de notificar la RSG.</span>
        ) : !s.hayPrescritas ? (
          <span className="text-text-muted">Ninguna multa se declaró prescrita: no hay nada que actualizar.</span>
        ) : (
          <>
            <div className="text-[12px] text-text-muted mb-[6px]">
              Tarea manual (sin integración con SATRIM): el responsable retira las multas prescritas del estado de cuenta y lo confirma aquí.
              {s.estadoCuenta.responsableNombre ? ` Responsable asignado: ${s.estadoCuenta.responsableNombre}.` : ''}
            </div>
            <div className={claseFilaTramite}>
              <div className="w-[280px] mb-[14px]">
                <select value={responsableId} onChange={(e) => setResponsableId(e.target.value)} className={claseSelectTramite}>
                  <option value="">— Responsable —</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombres}
                    </option>
                  ))}
                  {responsableId && !usuarios.some((u) => u.id === responsableId) && (
                    <option value={responsableId}>{s.estadoCuenta.responsableNombre ?? 'Usuario asignado'}</option>
                  )}
                </select>
              </div>
              <label className="flex items-center gap-[6px] text-[13px] mb-[16px] cursor-pointer">
                <input type="checkbox" checked={confirmada} onChange={(e) => setConfirmada(e.target.checked)} />
                Estado de cuenta ya actualizado
              </label>
              <Button size="sm" variant={confirmada ? 'success' : 'secondary'} loading={accion === 'estado'} onClick={guardarEstadoCuenta} className="mb-[14px]!">
                {confirmada ? 'Confirmar' : 'Asignar responsable'}
              </Button>
            </div>
          </>
        )}
      </PasoTramite>

      {agregando && (
        <AgregarMultaModal
          solicitudId={s.id}
          modo={agregando}
          yaIncluidas={s.multas.map((m) => m.resolucion?.id).filter((x): x is string => !!x)}
          onClose={() => setAgregando(null)}
          onAgregada={() => {
            setAgregando(null);
            setMensaje({ type: 'success', text: 'Multa agregada.' });
            recargar();
            onCambio();
          }}
        />
      )}
    </Modal>
  );
};
