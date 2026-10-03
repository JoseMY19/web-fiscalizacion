import React, { useCallback, useEffect, useState } from 'react';
import { CaducidadApi, CaducidadExpedienteItem, abrirDocumentoCaducidad, descargarRsgCaducidad } from '../../api';
import { Alert, Badge, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { claseBloqueTramite, claseFilaTramite, claseInputArchivo, PasoTramite } from '../../components/common/PasoTramite';
import { EyeIcon, FileTextIcon, PenToolIcon } from '../../components/icons/Icons';
import { useConfirm } from '../../context/ConfirmContext';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { nombreArchivoRsgCaducidad, textoPlazoCaducidad, textoResultadoCaducidad, tramitesAnteriores, tramiteVigente } from './caducidadUi';

interface Props {
  expedienteId: string;
  onClose: () => void;
  onCambio: () => void;
}

/**
 * Panel de caducidad de un expediente: inicio (de oficio / solicitud del
 * administrado) → evaluación → RSG Word → envío a firma → firma (fecha + N°)
 * → notificación → ¿nuevo PAS o archivo? Las fechas nacen vacías: siempre
 * las escribe el usuario.
 */
export const CaducidadPanel: React.FC<Props> = ({ expedienteId, onClose, onCambio }) => {
  const confirm = useConfirm();
  const [e, setE] = useState<CaducidadExpedienteItem | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accion, setAccion] = useState<string | null>(null);

  const [fundamentacionOficio, setFundamentacionOficio] = useState('');
  const [fechaSolicitud, setFechaSolicitud] = useState('');
  const [numeroRegistro, setNumeroRegistro] = useState('');
  const [resumen, setResumen] = useState('');
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [resultado, setResultado] = useState<'DECLARADA' | 'DENEGADA' | ''>('');
  const [fundamentacion, setFundamentacion] = useState('');
  const [fechaEnvio, setFechaEnvio] = useState('');
  const [fechaFirma, setFechaFirma] = useState('');
  const [numeroResolucion, setNumeroResolucion] = useState('');
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [decision, setDecision] = useState<'NUEVO_PAS' | 'ARCHIVO' | ''>('');
  const [nota, setNota] = useState('');
  const [nuevoExpediente, setNuevoExpediente] = useState('');

  const recargar = useCallback(async () => {
    try {
      const d = await CaducidadApi.getExpediente(expedienteId);
      setE(d);
      setErrorCarga(null);
      return d;
    } catch (err: any) {
      setErrorCarga(err.message || 'No se pudo cargar la caducidad del expediente.');
      return null;
    }
  }, [expedienteId]);

  useEffect(() => {
    recargar().then((d) => {
      const t = d ? tramiteVigente(d) : null;
      if (t?.resultado) setResultado(t.resultado);
      if (t?.fundamentacion) setFundamentacion(t.fundamentacion);
    });
  }, [recargar]);

  const ejecutar = async (clave: string, fn: () => Promise<unknown>, exito: string) => {
    setAccion(clave);
    try {
      await fn();
      setMensaje({ type: 'success', text: exito });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo completar la acción.' });
    } finally {
      const d = await recargar();
      const t = d ? tramiteVigente(d) : null;
      setResultado(t?.resultado ?? '');
      if (!t) setFundamentacion('');
      onCambio();
      setAccion(null);
    }
  };
  const error = (text: string) => setMensaje({ type: 'error', text });

  if (!e) {
    return (
      <Modal isOpen onClose={onClose} title="Caducidad del PAS">
        {errorCarga ? <Alert type="error">{errorCarga}</Alert> : <div className="p-[30px] text-center"><Spinner size={28} /></div>}
      </Modal>
    );
  }

  const c = tramiteVigente(e);
  const anteriores = tramitesAnteriores(e);
  const hoy = hoyLocal();
  const plazo = textoPlazoCaducidad(e);
  const estado = textoResultadoCaducidad(e);
  const vencido = e.plazo.estado === 'VENCIDO';
  const evaluacionEditable = !!c && !c.fechaEnvioFirma;

  const declararDeOficio = async () => {
    const ok = await confirm({
      title: 'Declarar la caducidad de oficio',
      message: `El plazo venció el ${formatearFecha(e.plazo.fechaLimite)} sin resolución final notificada. Se inicia la RSG que declara la caducidad del Expediente ${e.numeroExpediente}.`,
      confirmLabel: 'Declarar de oficio',
    });
    if (!ok) return;
    await ejecutar('oficio', () => CaducidadApi.declararDeOficio(expedienteId, fundamentacionOficio.trim()), 'Caducidad iniciada de oficio. Descarga la RSG en Word.');
  };

  const registrarSolicitud = () => {
    if (!fechaSolicitud) return error('Ingresa la fecha real de presentación de la solicitud.');
    if (fechaSolicitud > hoy) return error('La fecha de la solicitud no puede ser futura.');
    if (!resumen.trim()) return error('Escribe un resumen de lo que solicita el administrado.');
    return ejecutar(
      'solicitud',
      () => CaducidadApi.registrarSolicitud(expedienteId, { fechaSolicitud, numeroRegistro: numeroRegistro.trim() || undefined, resumen: resumen.trim(), archivos: pdfs }),
      'Solicitud registrada. Evalúala.',
    );
  };

  const evaluar = () => {
    if (!resultado) return error('Elige si corresponde declarar la caducidad o denegarla.');
    if (resultado === 'DENEGADA' && !fundamentacion.trim()) return error('La denegatoria exige fundamentación.');
    return ejecutar('evaluar', () => CaducidadApi.evaluar(expedienteId, resultado, fundamentacion.trim()), 'Evaluación guardada. Descarga la RSG en Word.');
  };

  const descargar = () => descargarRsgCaducidad(expedienteId, nombreArchivoRsgCaducidad(e)).catch((err: any) => error(err.message || 'No se pudo generar la RSG.'));

  const enviar = () => {
    if (!fechaEnvio) return error('Ingresa la fecha real en que se entregó la RSG al Subgerente.');
    return ejecutar('enviar', () => CaducidadApi.enviarAFirma(expedienteId, fechaEnvio), 'Envío a firma registrado.');
  };

  const firmar = () => {
    if (!fechaFirma) return error('Ingresa la fecha real de firma.');
    if (!numeroResolucion.trim()) return error('Ingresa el N° de la RSG tal como figura en el papel.');
    return ejecutar('firmar', () => CaducidadApi.firmar(expedienteId, fechaFirma, numeroResolucion.trim()), 'Firma registrada.');
  };

  const notificar = async () => {
    if (!fechaNotificacion) return error('Ingresa la fecha real de notificación.');
    if (c?.resultado === 'DECLARADA') {
      const ok = await confirm({
        title: 'Notificar la RSG de caducidad',
        message: `Al registrar la notificación, el Expediente ${e.numeroExpediente} queda CERRADO: IFI y Resolución ya no admitirán actuaciones y sale de sus bandejas.`,
        confirmLabel: 'Registrar notificación',
        variant: 'danger',
      });
      if (!ok) return;
    }
    await ejecutar('notificar', () => CaducidadApi.notificar(expedienteId, fechaNotificacion), 'Notificación registrada.');
  };

  const decidir = () => {
    if (!decision) return error('Elige: iniciar nuevo PAS o archivar.');
    if (decision === 'ARCHIVO' && !e.potestad.prescrita && !nota.trim()) return error('Explica por qué se archiva (p. ej. subsanó la conducta).');
    return ejecutar('decidir', () => CaducidadApi.decidir(expedienteId, decision, nota.trim()), 'Decisión registrada.');
  };

  const vincular = () => {
    if (!nuevoExpediente.trim()) return error('Ingresa el N° del expediente del nuevo PAS.');
    return ejecutar('vincular', () => CaducidadApi.vincularNuevoExpediente(expedienteId, nuevoExpediente.trim()), 'Nuevo expediente vinculado.');
  };

  const adjuntar = () => {
    if (pdfs.length === 0) return error('Elige al menos un PDF.');
    return ejecutar('adjuntar', async () => {
      await CaducidadApi.adjuntarDocumentos(expedienteId, pdfs);
      setPdfs([]);
    }, 'PDF adjuntado.');
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Caducidad del PAS — Expediente ${e.numeroExpediente}`}
      maxWidth="820px"
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

      {/* RESUMEN */}
      <div className={cn(claseBloqueTramite, 'mb-[16px]')}>
        <div className="flex items-center gap-[8px] flex-wrap mb-[6px]">
          <Badge variant={plazo.variante} size="md">
            {plazo.texto}
          </Badge>
          {estado && <Badge variant={estado.variante}>{estado.texto}</Badge>}
          {e.ampliacionFirmada && <Badge variant="purple">Ampliado a 12 meses</Badge>}
        </div>
        <div>
          Administrado: <strong>{e.administradoNombre ?? 'no identificado'}</strong>
          {e.administradoDocumento ? ` (${e.administradoDocumento})` : ''}
        </div>
        <div className="text-text-secondary">
          NC N° {e.numeroNotificacionCargo ?? '—'} notificada el <strong>{formatearFecha(e.ncFechaNotificacion)}</strong> · límite (
          {e.ampliacionFirmada ? '12' : '9'} meses): <strong>{formatearFecha(e.plazo.fechaLimite)}</strong>
          {e.resolucionFinal && ` · Resolución final ${e.resolucionFinal.tipo}: ${e.resolucionFinal.estado === 'NOTIFICADA' ? `notificada el ${formatearFecha(e.resolucionFinal.fechaNotificacion)}` : 'sin notificar'}`}
        </div>
        <div className="text-text-secondary">
          Infracción: {formatearFecha(e.potestad.fechaInfraccion)} · potestad sancionadora (4 años) {e.potestad.prescrita ? 'prescribió' : 'prescribe'} el{' '}
          <strong>{formatearFecha(e.potestad.fechaPrescripcion)}</strong>.
        </div>
      </div>

      {e.caducado && (
        <Alert type="error">
          <strong>Expediente caducado.</strong> RSG N° {c?.numeroResolucion} notificada el {formatearFecha(c?.fechaNotificacion)}: el expediente está cerrado.
        </Alert>
      )}

      {anteriores.length > 0 && (
        <div className={cn(claseBloqueTramite, 'mb-[16px]')}>
          <div className="font-bold mb-[6px]">Solicitudes anteriores denegadas</div>
          <ul className="flex flex-col gap-[4px]">
            {anteriores.map((a) => (
              <li key={a.createdAt} className="text-text-secondary">
                {a.origen === 'DE_OFICIO' ? 'De oficio' : `Solicitud del ${formatearFecha(a.fechaSolicitud)}`}
                {a.numeroRegistro ? ` (registro N° ${a.numeroRegistro})` : ''} — denegada con RSG N° <strong>{a.numeroResolucion ?? '—'}</strong>, notificada el{' '}
                <strong>{formatearFecha(a.fechaNotificacion)}</strong>.
              </li>
            ))}
          </ul>
          <div className="text-[12px] text-text-muted mt-[6px]">El expediente admite un nuevo trámite: de oficio si el plazo vence, o una nueva solicitud del administrado.</div>
        </div>
      )}

      {/* 1. INICIO */}
      <PasoTramite n={1} titulo="Inicio del trámite" hecho={!!c}>
        {c ? (
          c.origen === 'DE_OFICIO' ? (
            <div>
              <strong>De oficio</strong> — la SFSA advirtió el vencimiento del plazo{c.registradoPorNombre ? ` (registró ${c.registradoPorNombre})` : ''}.
            </div>
          ) : (
            <>
              <div>
                <strong>A pedido de parte</strong> — solicitud presentada el <strong>{formatearFecha(c.fechaSolicitud)}</strong>
                {c.numeroRegistro ? ` (registro N° ${c.numeroRegistro})` : ''}.
              </div>
              <div className="mt-[6px] whitespace-pre-wrap">{c.resumenSolicitud}</div>
              <div className="flex gap-[6px] flex-wrap mt-[8px]">
                {c.documentos.map((d) => (
                  <Button key={d.id} size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={() => abrirDocumentoCaducidad(d.id).catch((err: any) => error(err.message))}>
                    {d.nombreOriginal}
                  </Button>
                ))}
              </div>
              <div className={claseFilaTramite}>
                <input type="file" accept="application/pdf,.pdf" multiple onChange={(ev) => setPdfs(Array.from(ev.target.files ?? []))} className={claseInputArchivo} />
                <Button size="sm" variant="secondary" loading={accion === 'adjuntar'} disabled={pdfs.length === 0} onClick={adjuntar}>
                  Adjuntar PDF
                </Button>
              </div>
            </>
          )
        ) : (
          <div className="flex flex-col gap-[14px]">
            <div>
              <div className="font-bold mb-[4px]">De oficio</div>
              {e.puedeDeclararDeOficio ? (
                <>
                  <Textarea
                    label="Considerandos adicionales (opcional)"
                    value={fundamentacionOficio}
                    onChange={(ev) => setFundamentacionOficio(ev.target.value)}
                    className="min-h-[80px]!"
                  />
                  <Button size="sm" variant="danger" loading={accion === 'oficio'} onClick={declararDeOficio}>
                    Declarar caducidad de oficio
                  </Button>
                </>
              ) : (
                <span className="text-text-muted">Solo cuando el plazo ya venció sin resolución final notificada.</span>
              )}
            </div>
            <div className="border-t border-t-border pt-[12px]">
              <div className="font-bold mb-[4px]">Solicitud del administrado (a pedido de parte)</div>
              <div className={claseFilaTramite}>
                <div className="w-[200px]">
                  <Input type="date" label="Fecha de presentación" value={fechaSolicitud} max={hoy} onChange={(ev) => setFechaSolicitud(ev.target.value)} />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <Input label="N° de registro (SGD, opcional)" value={numeroRegistro} onChange={(ev) => setNumeroRegistro(ev.target.value)} />
                </div>
              </div>
              <Textarea label="Resumen de la solicitud" value={resumen} onChange={(ev) => setResumen(ev.target.value)} className="min-h-[80px]!" />
              <div className={claseFilaTramite}>
                <input type="file" accept="application/pdf,.pdf" multiple onChange={(ev) => setPdfs(Array.from(ev.target.files ?? []))} className={claseInputArchivo} />
                <Button size="sm" loading={accion === 'solicitud'} onClick={registrarSolicitud}>
                  Registrar solicitud
                </Button>
              </div>
            </div>
          </div>
        )}
      </PasoTramite>

      {/* 2. EVALUACIÓN */}
      <PasoTramite n={2} titulo="Evaluación de la SFSA" hecho={!!c?.resultado}>
        {!c ? (
          <span className="text-text-muted">Disponible después de iniciar el trámite.</span>
        ) : evaluacionEditable ? (
          <>
            {c.origen === 'A_PEDIDO' && (
              <div className="flex flex-col gap-[6px] mb-[10px]">
                <label className={cn('flex items-center gap-[6px]', vencido ? 'cursor-pointer' : 'opacity-60')}>
                  <input type="radio" name="resultado" disabled={!vencido} checked={resultado === 'DECLARADA'} onChange={() => setResultado('DECLARADA')} />
                  Corresponde — RSG que declara la caducidad{!vencido && ' (el plazo no ha vencido según las fechas registradas)'}
                </label>
                <label className="flex items-center gap-[6px] cursor-pointer">
                  <input type="radio" name="resultado" checked={resultado === 'DENEGADA'} onChange={() => setResultado('DENEGADA')} />
                  No corresponde — RSG denegatoria (improcedente); el PAS continúa
                </label>
              </div>
            )}
            <div className="text-[12px] text-text-muted mb-[6px]">
              Verificado: NC notificada el {formatearFecha(e.ncFechaNotificacion)}; límite {formatearFecha(e.plazo.fechaLimite)};{' '}
              {e.resolucionFinal?.estado === 'NOTIFICADA' ? `resolución final notificada el ${formatearFecha(e.resolucionFinal.fechaNotificacion)}` : 'sin resolución final notificada'}.
            </div>
            <Textarea
              label={resultado === 'DENEGADA' ? 'Fundamentación (obligatoria)' : 'Fundamentación / considerandos adicionales (opcional)'}
              value={fundamentacion}
              onChange={(ev) => setFundamentacion(ev.target.value)}
              className="min-h-[100px]!"
            />
            <Button size="sm" loading={accion === 'evaluar'} onClick={() => (c.origen === 'DE_OFICIO' ? ejecutar('evaluar', () => CaducidadApi.evaluar(expedienteId, 'DECLARADA', fundamentacion.trim()), 'Fundamentación guardada.') : evaluar())}>
              {c.resultado ? 'Actualizar' : 'Guardar evaluación'}
            </Button>
          </>
        ) : (
          <>
            <Badge variant={c.resultado === 'DECLARADA' ? 'danger' : 'neutral'}>{c.resultado === 'DECLARADA' ? 'Declara la caducidad' : 'Denegatoria'}</Badge>
            {c.fundamentacion && <div className="mt-[6px] whitespace-pre-wrap">{c.fundamentacion}</div>}
          </>
        )}
      </PasoTramite>

      {/* 3. RSG */}
      <PasoTramite n={3} titulo="RSG (Word)" hecho={!!c?.resultado}>
        {c?.resultado ? (
          <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={descargar}>
            Descargar RSG {c.resultado === 'DECLARADA' ? 'que declara la caducidad' : 'denegatoria'} (Word)
          </Button>
        ) : (
          <span className="text-text-muted">Disponible después de la evaluación.</span>
        )}
      </PasoTramite>

      {/* 4. ENVÍO A FIRMA */}
      <PasoTramite n={4} titulo="Envío a firma del Subgerente" hecho={!!c?.fechaEnvioFirma}>
        {c?.fechaEnvioFirma ? (
          <div>Entregada al Subgerente el {formatearFecha(c.fechaEnvioFirma)}.</div>
        ) : c?.resultado ? (
          <div className={claseFilaTramite}>
            <div className="w-[230px]">
              <Input type="date" label="Fecha de entrega al Subgerente" value={fechaEnvio} max={hoy} onChange={(ev) => setFechaEnvio(ev.target.value)} />
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
      <PasoTramite n={5} titulo="Firma" hecho={!!c?.fechaFirma}>
        {c?.fechaFirma ? (
          <div>
            RSG N° <strong>{c.numeroResolucion}</strong>, firmada el {formatearFecha(c.fechaFirma)}.
          </div>
        ) : c?.fechaEnvioFirma ? (
          <div className={claseFilaTramite}>
            <div className="w-[200px]">
              <Input type="date" label="Fecha de firma" value={fechaFirma} min={c.fechaEnvioFirma.slice(0, 10)} max={hoy} onChange={(ev) => setFechaFirma(ev.target.value)} />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Input label="N° de RSG" placeholder="Tal como figura en el papel" value={numeroResolucion} onChange={(ev) => setNumeroResolucion(ev.target.value)} />
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
      <PasoTramite n={6} titulo="Notificación" hecho={!!c?.fechaNotificacion}>
        {c?.fechaNotificacion ? (
          <div>Notificada el {formatearFecha(c.fechaNotificacion)}.</div>
        ) : c?.fechaFirma ? (
          <div className={claseFilaTramite}>
            <div className="w-[200px]">
              <Input type="date" label="Fecha de notificación" value={fechaNotificacion} min={c.fechaFirma.slice(0, 10)} max={hoy} onChange={(ev) => setFechaNotificacion(ev.target.value)} />
            </div>
            <Button size="sm" variant="success" loading={accion === 'notificar'} onClick={notificar} className="mb-[14px]!">
              Registrar notificación
            </Button>
          </div>
        ) : (
          <span className="text-text-muted">Disponible después de registrar la firma.</span>
        )}
      </PasoTramite>

      {/* 7. DECISIÓN POSTERIOR */}
      {c?.resultado !== 'DENEGADA' && (
        <PasoTramite n={7} titulo="¿Subsiste la conducta y no prescribió la potestad? (4 años)" hecho={!!c?.decisionPosterior}>
          {c?.decisionPosterior ? (
            <>
              <Badge variant={c.decisionPosterior === 'NUEVO_PAS' ? 'purple' : 'midnight'}>
                {c.decisionPosterior === 'NUEVO_PAS' ? 'Iniciar nuevo PAS' : 'Archivo del expediente caducado'}
              </Badge>
              {c.notaDecision && <div className="mt-[6px] whitespace-pre-wrap">{c.notaDecision}</div>}
              {c.decisionPosterior === 'NUEVO_PAS' &&
                (c.nuevoExpediente ? (
                  <div className="mt-[6px]">
                    Nuevo PAS: expediente <strong>{c.nuevoExpediente.numeroExpediente}</strong>.
                  </div>
                ) : (
                  <>
                    <Alert type="warning" className="mt-[8px]! mb-[4px]!">
                      Pendiente de nueva fiscalización: el nuevo PAS nace de una nueva intervención de campo.
                    </Alert>
                    <div className={claseFilaTramite}>
                      <div className="w-[260px]">
                        <Input label="N° de expediente del nuevo PAS (cuando exista)" value={nuevoExpediente} onChange={(ev) => setNuevoExpediente(ev.target.value)} />
                      </div>
                      <Button size="sm" variant="secondary" loading={accion === 'vincular'} onClick={vincular} className="mb-[14px]!">
                        Vincular
                      </Button>
                    </div>
                  </>
                ))}
            </>
          ) : c?.resultado === 'DECLARADA' && c.fechaNotificacion ? (
            <>
              <div className="flex flex-col gap-[6px] mb-[10px]">
                <label className={cn('flex items-center gap-[6px]', e.potestad.prescrita ? 'opacity-60' : 'cursor-pointer')}>
                  <input type="radio" name="decision" disabled={e.potestad.prescrita} checked={decision === 'NUEVO_PAS'} onChange={() => setDecision('NUEVO_PAS')} />
                  Sí — iniciar nuevo PAS{e.potestad.prescrita && ` (la potestad prescribió el ${formatearFecha(e.potestad.fechaPrescripcion)})`}
                </label>
                <label className="flex items-center gap-[6px] cursor-pointer">
                  <input type="radio" name="decision" checked={decision === 'ARCHIVO'} onChange={() => setDecision('ARCHIVO')} />
                  No — archivo del expediente caducado (prescribió o subsanó)
                </label>
              </div>
              <Textarea
                label={decision === 'ARCHIVO' && !e.potestad.prescrita ? 'Nota (obligatoria: por qué se archiva)' : 'Nota (opcional)'}
                value={nota}
                onChange={(ev) => setNota(ev.target.value)}
                className="min-h-[70px]!"
              />
              <Button size="sm" loading={accion === 'decidir'} onClick={decidir}>
                Registrar decisión
              </Button>
            </>
          ) : (
            <span className="text-text-muted">Disponible después de notificar la RSG que declara la caducidad.</span>
          )}
        </PasoTramite>
      )}
    </Modal>
  );
};
