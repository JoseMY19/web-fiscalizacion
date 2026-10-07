import React, { useCallback, useEffect, useState } from 'react';
import {
  DecisionGop,
  ExpedienteRecursos,
  InformeGop,
  RecursosApi,
  descargarDocumentoInformeGop,
  descargarDocumentoResolucion,
  descargarDocumentoRsgReconsideracion,
} from '../../api';
import { Alert, Badge, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { useConfirm } from '../../context/ConfirmContext';
import { RetrotraerNulidad } from '../retroaccion/RetrotraerNulidad';
import { CheckIcon, EyeIcon, FileTextIcon } from '../../components/icons/Icons';
import {
  LABEL_DECISION_GOP,
  LABEL_RESULTADO,
  LABEL_SITUACION,
  fechaCorta,
  hoyLocal,
  textoPlazoRecurso,
  textoUltimoActo,
  varianteSituacion,
} from './recursosUi';

type PasoEstado = 'completado' | 'actual' | 'pendiente';

interface StepDef {
  clave: string;
  titulo: string;
  estado: PasoEstado;
  descripcion: React.ReactNode;
  contenido?: React.ReactNode;
}

interface Props {
  expedienteId: string;
  numeroExpediente: string;
  onClose: () => void;
  onCambio: () => void;
}

const estiloBloque = 'bg-[#f8fafc] py-[12px] px-[14px] rounded-[8px] border border-border text-[13px]';
const estiloTituloSeccion = 'text-[13px] font-extrabold text-midnight-900 mb-[10px] uppercase tracking-[0.4px]';
const estiloTextoLargo =
  'whitespace-pre-wrap bg-[#ffffff] border border-border rounded-[6px] py-[10px] px-[12px] text-[12px] leading-[1.5] max-h-[260px] overflow-y-auto';
const estiloForm = 'flex flex-col gap-[8px] bg-[#f8fafc] border border-border rounded-[8px] p-[12px]';

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="text-text-muted">{children}</span>;

function montoTexto(n: number | null): string {
  return n === null ? '—' : `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const RecursoPanel: React.FC<Props> = ({ expedienteId, numeroExpediente, onClose, onCambio }) => {
  const confirm = useConfirm();
  const [d, setD] = useState<ExpedienteRecursos | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const [retrotraido, setRetrotraido] = useState(false);
  const hoy = hoyLocal();

  // Formularios. Las fechas son hechos reales: nacen vacías, nunca "hoy" por defecto.
  const [recFecha, setRecFecha] = useState('');
  const [recConPrueba, setRecConPrueba] = useState<'' | 'SI' | 'NO'>('');
  const [recPruebaTexto, setRecPruebaTexto] = useState('');
  const [subsFecha, setSubsFecha] = useState('');
  const [evalResultado, setEvalResultado] = useState<'' | 'FUNDADA' | 'INFUNDADA'>('');
  const [evalAnalisis, setEvalAnalisis] = useState('');
  const [rsgAnalisis, setRsgAnalisis] = useState('');
  const [rsgFechaEnvio, setRsgFechaEnvio] = useState('');
  const [rsgFechaFirma, setRsgFechaFirma] = useState('');
  const [rsgNumero, setRsgNumero] = useState('');
  const [rsgFechaNotif, setRsgFechaNotif] = useState('');
  const [apeFecha, setApeFecha] = useState('');
  const [elevFecha, setElevFecha] = useState('');
  const [decision, setDecision] = useState<'' | DecisionGop>('');
  const [decisionFecha, setDecisionFecha] = useState('');
  const [motivoNulidad, setMotivoNulidad] = useState('');
  const [informe, setInforme] = useState<InformeGop | null>(null);
  const [verInforme, setVerInforme] = useState(false);
  const [verRsg, setVerRsg] = useState(false);

  const recargar = useCallback(async () => {
    try {
      const data = await RecursosApi.getDetalle(expedienteId);
      setD(data);
      setErrorCarga(null);
      setRsgAnalisis((prev) => (prev ? prev : data.reconsideracion?.rsg?.analisisTexto ?? ''));
    } catch (err: any) {
      setErrorCarga(err.message || 'No se pudo cargar el expediente.');
    }
  }, [expedienteId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const ejecutar = async (clave: string, fn: () => Promise<unknown>, exito: string) => {
    setAccion(clave);
    setMensaje(null);
    try {
      await fn();
      setMensaje({ type: 'success', text: exito });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo completar la acción.' });
    } finally {
      await recargar();
      setAccion(null);
      onCambio();
    }
  };
  const error = (text: string) => setMensaje({ type: 'error', text });

  if (!d) {
    return (
      <Modal isOpen onClose={onClose} title={`Expediente ${numeroExpediente} — Recursos`} maxWidth="860px">
        {errorCarga ? (
          <Alert type="error">{errorCarga}</Alert>
        ) : (
          <div className="p-[40px] text-center">
            <Spinner size={32} />
          </div>
        )}
      </Modal>
    );
  }

  const rec = d.reconsideracion;
  const rsg = rec?.rsg ?? null;
  const ape = d.apelacion;
  const plazo = textoPlazoRecurso(d);
  const puedeRecurrir = d.situacion === 'PLAZO_ABIERTO' && !ape;
  const puedeReconsiderar = puedeRecurrir && !rec && d.resolucion.tipo === 'RSGSA';

  // ── Acciones ──
  const presentarReconsideracion = async () => {
    if (!recFecha) return error('Ingresa la fecha en que se presentó la reconsideración.');
    if (!recConPrueba) return error('Indica si el administrado presentó prueba nueva.');
    if (recConPrueba === 'SI' && !recPruebaTexto.trim()) return error('Describe la prueba nueva presentada.');
    if (recConPrueba === 'NO') {
      const ok = await confirm({
        title: 'Reconsideración sin prueba nueva',
        message: 'Sin prueba nueva la reconsideración es IMPROCEDENTE de inmediato (es su único requisito). Luego se emite la RSG que lo declara. ¿Registrar?',
        confirmLabel: 'Registrar',
      });
      if (!ok) return;
    }
    await ejecutar(
      'recPresentar',
      () =>
        RecursosApi.presentarReconsideracion(d.resolucion.id, {
          fechaPresentacion: recFecha,
          nuevaPrueba: recConPrueba === 'SI',
          ...(recConPrueba === 'SI' ? { nuevaPruebaTexto: recPruebaTexto.trim() } : {}),
        }),
      'Reconsideración registrada.',
    );
  };

  const presentarApelacion = async () => {
    if (!apeFecha) return error('Ingresa la fecha en que se presentó la apelación.');
    if (!d.ultimoActo) return;
    const ok = await confirm({
      title: 'Registrar apelación',
      message: `La apelación va contra el último acto: ${textoUltimoActo(d)}. Solo se puede presentar una por expediente. ¿Registrar?`,
      confirmLabel: 'Registrar apelación',
    });
    if (!ok) return;
    await ejecutar('apePresentar', () => RecursosApi.presentarApelacion(d.ultimoActo!.resolucionId, apeFecha), 'Apelación registrada.');
  };

  const cargarInforme = async () => {
    if (!ape) return;
    if (verInforme) return setVerInforme(false);
    try {
      const r = await RecursosApi.verInformeGop(ape.id);
      setInforme(r.informe);
      setVerInforme(true);
    } catch (err: any) {
      error(err.message || 'No se pudo cargar el informe.');
    }
  };

  const descargar = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err: any) {
      error(err.message || 'No se pudo generar el Word.');
    }
  };

  // ── Pasos de la reconsideración ──
  const pasosReconsideracion: StepDef[] = [];
  if (rec) {
    const evaluada = !!rec.resultado;
    pasosReconsideracion.push({
      clave: 'presentada',
      titulo: 'Reconsideración presentada',
      estado: 'completado',
      descripcion: (
        <>
          Presentada el <strong>{fechaCorta(rec.fechaPresentacion)}</strong> —{' '}
          {rec.nuevaPrueba ? 'con prueba nueva:' : <strong>sin prueba nueva (improcedente)</strong>}
          {rec.nuevaPrueba && <div className={`${estiloTextoLargo} mt-[6px]`}>{rec.nuevaPruebaTexto || 'Sin descripción.'}</div>}
        </>
      ),
    });
    if (rec.nuevaPrueba) {
      pasosReconsideracion.push({
        clave: 'subsanacion',
        titulo: 'Fecha de subsanación (opcional)',
        estado: rec.fechaSubsanacion ? 'completado' : evaluada ? 'completado' : 'actual',
        descripcion: rec.fechaSubsanacion ? (
          <>
            Subsanó el <strong>{fechaCorta(rec.fechaSubsanacion)}</strong>
            {d.ncFechaNotificacion && (
              <>
                {' '}
                — NC notificada el {fechaCorta(d.ncFechaNotificacion)}:{' '}
                {rec.fechaSubsanacion < d.ncFechaNotificacion ? (
                  <span className="text-[#047857] font-semibold">anterior a la NC (puede ser fundada)</span>
                ) : (
                  <span className="text-[#be123c] font-semibold">posterior a la NC (no exime)</span>
                )}
              </>
            )}
          </>
        ) : (
          <>
            Si la prueba acredita que el administrado subsanó, registra la fecha real. Para declararla <strong>fundada</strong> la
            subsanación tiene que ser <strong>anterior a la notificación de la NC</strong>
            {d.ncFechaNotificacion ? ` (${fechaCorta(d.ncFechaNotificacion)})` : ''}.
          </>
        ),
        contenido:
          !evaluada && !rec.fechaSubsanacion ? (
            <div className={estiloForm}>
              <Input type="date" label="Fecha de subsanación" value={subsFecha} max={hoy} onChange={(e) => setSubsFecha(e.target.value)} />
              <div>
                <Button
                  size="sm"
                  loading={accion === 'subs'}
                  onClick={() =>
                    subsFecha
                      ? ejecutar('subs', () => RecursosApi.subsanarReconsideracion(rec.id, subsFecha), 'Fecha de subsanación registrada.')
                      : error('Ingresa la fecha de subsanación.')
                  }
                >
                  Registrar subsanación
                </Button>
              </div>
            </div>
          ) : undefined,
      });
    }
    pasosReconsideracion.push({
      clave: 'evaluar',
      titulo: 'Evaluar la reconsideración',
      estado: evaluada ? 'completado' : 'actual',
      descripcion: evaluada ? (
        <>
          Resultado: <strong>{LABEL_RESULTADO[rec.resultado!]}</strong>
          {rec.analisisTexto && <div className={`${estiloTextoLargo} mt-[6px]`}>{rec.analisisTexto}</div>}
        </>
      ) : (
        'Evalúa la prueba nueva y declara la reconsideración fundada o infundada, con el análisis.'
      ),
      contenido:
        !evaluada && rec.nuevaPrueba ? (
          <div className={estiloForm}>
            <label className="text-[12px] font-bold">Resultado</label>
            <select
              value={evalResultado}
              onChange={(e) => setEvalResultado(e.target.value as '' | 'FUNDADA' | 'INFUNDADA')}
              className="py-[8px] px-[10px] text-[13px] border border-border rounded-sm bg-[#ffffff]"
            >
              <option value="">— Elegir —</option>
              <option value="FUNDADA">Fundada (la prueba acredita subsanación anterior a la NC)</option>
              <option value="INFUNDADA">Infundada (la prueba no desvirtúa la infracción)</option>
            </select>
            <Textarea label="Análisis" rows={5} value={evalAnalisis} onChange={(e) => setEvalAnalisis(e.target.value)} />
            <div>
              <Button
                size="sm"
                loading={accion === 'evaluar'}
                onClick={async () => {
                  if (!evalResultado) return error('Elige el resultado.');
                  if (!evalAnalisis.trim()) return error('Redacta el análisis.');
                  const ok = await confirm({
                    title: 'Registrar resultado',
                    message: `La reconsideración quedará ${evalResultado === 'FUNDADA' ? 'FUNDADA' : 'INFUNDADA'}. Esto no se puede cambiar después. ¿Continuar?`,
                    confirmLabel: 'Registrar',
                  });
                  if (!ok) return;
                  await ejecutar('evaluar', () => RecursosApi.evaluarReconsideracion(rec.id, evalResultado, evalAnalisis.trim()), 'Resultado registrado.');
                }}
              >
                Registrar resultado
              </Button>
            </div>
          </div>
        ) : undefined,
    });

    const rsgEditable = !!rsg && rsg.estado === 'EN_ELABORACION' && !rsg.fechaEnvioFirma;
    pasosReconsideracion.push({
      clave: 'rsg',
      titulo: 'RSG que resuelve la reconsideración',
      estado: rsg?.estado === 'NOTIFICADA' ? 'completado' : evaluada ? 'actual' : 'pendiente',
      descripcion: !evaluada ? (
        'Se habilita cuando la reconsideración tenga resultado.'
      ) : !rsg ? (
        'Inicia la RSG (resolución nueva, distinta de la recurrida). Luego redacta, descarga el Word, llévala a firma y notifícala.'
      ) : (
        <div className="flex flex-col gap-[3px]">
          <div>
            Estado:{' '}
            <strong>
              {rsg.estado === 'NOTIFICADA'
                ? `Notificada el ${fechaCorta(rsg.fechaNotificacion)}`
                : rsg.estado === 'EMITIDA'
                  ? `Firmada el ${fechaCorta(rsg.fechaEmision)} — falta notificar`
                  : rsg.fechaEnvioFirma
                    ? `En firma desde el ${fechaCorta(rsg.fechaEnvioFirma)}`
                    : 'En redacción'}
            </strong>
            {rsg.numeroResolucion && <> — N° {rsg.numeroResolucion}</>}
          </div>
        </div>
      ),
      contenido: !evaluada ? undefined : !rsg ? (
        <Button size="sm" loading={accion === 'rsgIniciar'} onClick={() => ejecutar('rsgIniciar', () => RecursosApi.emitirRsgQueResuelve(rec.id), 'RSG iniciada. Redacta el análisis.')}>
          Iniciar RSG
        </Button>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {rsgEditable && (
            <div className={estiloForm}>
              <Textarea label="Análisis (considerandos) de la RSG" rows={6} value={rsgAnalisis} onChange={(e) => setRsgAnalisis(e.target.value)} />
              <div>
                <Button
                  size="sm"
                  loading={accion === 'rsgAnalisis'}
                  onClick={() =>
                    rsgAnalisis.trim()
                      ? ejecutar('rsgAnalisis', () => RecursosApi.rsgAnalisis(rec.id, rsgAnalisis), 'Análisis guardado.')
                      : error('Redacta el análisis.')
                  }
                >
                  Guardar análisis
                </Button>
              </div>
            </div>
          )}
          {rsgEditable && rsg.analisisTexto && (
            <div className={estiloForm}>
              <Input
                type="date"
                label="Fecha de entrega al Subgerente (envío a firma)"
                value={rsgFechaEnvio}
                max={hoy}
                onChange={(e) => setRsgFechaEnvio(e.target.value)}
              />
              <div>
                <Button
                  size="sm"
                  loading={accion === 'rsgEnvio'}
                  onClick={() =>
                    rsgFechaEnvio
                      ? ejecutar('rsgEnvio', () => RecursosApi.rsgEnviarAFirma(rec.id, rsgFechaEnvio), 'RSG enviada a firma.')
                      : error('Ingresa la fecha de envío a firma.')
                  }
                >
                  Registrar envío a firma
                </Button>
              </div>
            </div>
          )}
          {rsg.estado === 'EN_ELABORACION' && rsg.fechaEnvioFirma && (
            <div className={estiloForm}>
              <Input type="date" label="Fecha real de la firma" value={rsgFechaFirma} max={hoy} onChange={(e) => setRsgFechaFirma(e.target.value)} />
              <Input label="N° de la RSG (como figura en el documento, opcional)" value={rsgNumero} onChange={(e) => setRsgNumero(e.target.value)} />
              <div className="flex gap-[8px] flex-wrap">
                <Button
                  size="sm"
                  loading={accion === 'rsgFirma'}
                  onClick={() =>
                    rsgFechaFirma
                      ? ejecutar('rsgFirma', () => RecursosApi.rsgFirmar(rec.id, rsgFechaFirma, rsgNumero.trim() || undefined), 'Firma registrada.')
                      : error('Ingresa la fecha de firma.')
                  }
                >
                  Registrar firma
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={accion === 'rsgRetirar'}
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Volver a elaboración',
                      message: 'Se quita el envío a firma para corregir la RSG. ¿Continuar?',
                      confirmLabel: 'Volver a elaboración',
                    });
                    if (ok) await ejecutar('rsgRetirar', () => RecursosApi.rsgRetirarDeFirma(rec.id), 'La RSG volvió a elaboración.');
                  }}
                >
                  Volver a elaboración
                </Button>
              </div>
            </div>
          )}
          {rsg.estado === 'EMITIDA' && (
            <div className={estiloForm}>
              <Input type="date" label="Fecha real de notificación" value={rsgFechaNotif} max={hoy} onChange={(e) => setRsgFechaNotif(e.target.value)} />
              <div>
                <Button
                  size="sm"
                  loading={accion === 'rsgNotif'}
                  onClick={async () => {
                    if (!rsgFechaNotif) return error('Ingresa la fecha de notificación.');
                    const ok = await confirm({
                      title: 'Notificar la RSG',
                      message:
                        rec.resultado === 'FUNDADA'
                          ? 'Con la RSG notificada, el caso concluye a favor del administrado (se deja sin efecto la sanción).'
                          : 'Desde esta fecha corren 15 días hábiles para que el administrado apele contra esta RSG.',
                      confirmLabel: 'Registrar notificación',
                    });
                    if (ok) await ejecutar('rsgNotif', () => RecursosApi.rsgNotificar(rec.id, rsgFechaNotif), 'Notificación registrada.');
                  }}
                >
                  Registrar notificación
                </Button>
              </div>
            </div>
          )}
        </div>
      ),
    });

    const notificada = rsg?.estado === 'NOTIFICADA';
    pasosReconsideracion.push({
      clave: 'resultado',
      titulo: 'Resultado',
      estado: notificada ? 'completado' : 'pendiente',
      descripcion: !notificada ? (
        'Surte efecto cuando la RSG quede notificada.'
      ) : rec.resultado === 'FUNDADA' ? (
        <span className="text-[#047857] font-semibold">Caso concluido a favor del administrado: se deja sin efecto la sanción.</span>
      ) : ape ? (
        'El administrado apeló contra esta RSG (ver apelación).'
      ) : d.situacion === 'PLAZO_ABIERTO' ? (
        <>Plazo de apelación abierto: {plazo?.texto}.</>
      ) : (
        <>Venció el plazo de apelación ({fechaCorta(d.fechaLimiteRecurso)}) sin apelación: puede declararse el acto firme.</>
      ),
    });
  }

  // ── Pasos de la apelación ──
  const pasosApelacion: StepDef[] = [];
  if (ape) {
    const firmado = !!ape.fechaFirmaInforme;
    pasosApelacion.push({
      clave: 'apePresentada',
      titulo: 'Apelación presentada',
      estado: 'completado',
      descripcion: (
        <>
          {ape.fechaPresentacion ? (
            <>
              Presentada el <strong>{fechaCorta(ape.fechaPresentacion)}</strong>
            </>
          ) : (
            'Fecha de presentación no registrada'
          )}{' '}
          contra la {ape.resolucionApeladaEsRsgReconsideracion ? 'RSG que resolvió la reconsideración' : 'resolución de primera instancia'}
          {ape.resolucionApeladaNumero ? ` N° ${ape.resolucionApeladaNumero}` : ''}.
        </>
      ),
    });
    pasosApelacion.push({
      clave: 'informe',
      titulo: 'Informe a GOP (sin análisis ni opinión)',
      estado: ape.informeGenerado ? 'completado' : 'actual',
      descripcion: ape.informeGenerado
        ? 'Informe generado con los antecedentes del expediente. Revísalo antes de firmar.'
        : 'Se genera automáticamente con los antecedentes del expediente (doble instancia: sin opinión).',
      contenido: !firmado ? (
        <Button
          size="sm"
          variant={ape.informeGenerado ? 'outline' : 'primary'}
          loading={accion === 'informe'}
          onClick={() =>
            ejecutar(
              'informe',
              async () => {
                const inf = await RecursosApi.generarInformeGop(ape.id);
                setInforme(inf);
                setVerInforme(true);
              },
              'Informe generado.',
            )
          }
        >
          {ape.informeGenerado ? 'Regenerar informe' : 'Generar informe'}
        </Button>
      ) : undefined,
    });
    pasosApelacion.push({
      clave: 'firma',
      titulo: 'Firmar informe',
      estado: firmado ? 'completado' : ape.informeGenerado ? 'actual' : 'pendiente',
      descripcion: firmado ? (
        <>
          Firmado el {fechaCorta(ape.fechaFirmaInforme)}
          {ape.firmadoPor ? ` por ${ape.firmadoPor}` : ''}.
        </>
      ) : (
        'Al firmar, el informe queda tal cual (ya no se regenera).'
      ),
      contenido:
        !firmado && ape.informeGenerado ? (
          <Button
            size="sm"
            loading={accion === 'firmaInf'}
            onClick={async () => {
              const ok = await confirm({ title: 'Firmar informe', message: 'El informe quedará firmado y ya no podrá regenerarse. ¿Firmar?', confirmLabel: 'Firmar' });
              if (ok) await ejecutar('firmaInf', () => RecursosApi.firmarInformeGop(ape.id), 'Informe firmado.');
            }}
          >
            Firmar informe
          </Button>
        ) : undefined,
    });
    pasosApelacion.push({
      clave: 'elevar',
      titulo: 'Elevar a GOP',
      estado: ape.fechaElevacionGop ? 'completado' : firmado ? 'actual' : 'pendiente',
      descripcion: ape.fechaElevacionGop ? (
        <>
          Elevado a la Gerencia de Orden Público el <strong>{fechaCorta(ape.fechaElevacionGop)}</strong>.
        </>
      ) : (
        'Registra la fecha real en que el expediente se remitió a GOP.'
      ),
      contenido:
        firmado && !ape.fechaElevacionGop ? (
          <div className={estiloForm}>
            <Input type="date" label="Fecha de elevación" value={elevFecha} max={hoy} onChange={(e) => setElevFecha(e.target.value)} />
            <div>
              <Button
                size="sm"
                loading={accion === 'elevar'}
                onClick={() =>
                  elevFecha ? ejecutar('elevar', () => RecursosApi.elevarAGop(ape.id, elevFecha), 'Elevación registrada.') : error('Ingresa la fecha de elevación.')
                }
              >
                Registrar elevación
              </Button>
            </div>
          </div>
        ) : undefined,
    });
    pasosApelacion.push({
      clave: 'decision',
      titulo: 'Decisión de GOP',
      estado: ape.decisionGop ? 'completado' : ape.fechaElevacionGop ? 'actual' : 'pendiente',
      descripcion: ape.decisionGop ? (
        <div className="flex flex-col gap-[6px]">
          <div>
            <strong>{LABEL_DECISION_GOP[ape.decisionGop]}</strong> — el {fechaCorta(ape.fechaDecisionGop)}.
          </div>
          {ape.decisionGop === 'FUNDADA' && (
            <span className="text-[#047857] font-semibold">Caso concluido a favor del administrado.</span>
          )}
          {ape.decisionGop === 'INFUNDADA' && (
            <span>
              Se agotó la vía administrativa: declara el <strong>acto firme</strong> (motivo: apelación infundada) en Acto firme / Cobranza.
            </span>
          )}
          {ape.decisionGop === 'NULIDAD' && !retrotraido && (
            <RetrotraerNulidad
              apelacionId={ape.id}
              motivoNulidad={ape.motivoNulidad}
              onHecho={(texto) => {
                setRetrotraido(true);
                setMensaje({ type: 'success', text: texto });
                onCambio();
              }}
            />
          )}
        </div>
      ) : (
        'Registra lo que resolvió GOP y la fecha real de su decisión.'
      ),
      contenido:
        ape.fechaElevacionGop && !ape.decisionGop ? (
          <div className={estiloForm}>
            <label className="text-[12px] font-bold">Decisión</label>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value as '' | DecisionGop)}
              className="py-[8px] px-[10px] text-[13px] border border-border rounded-sm bg-[#ffffff]"
            >
              <option value="">— Elegir —</option>
              <option value="FUNDADA">{LABEL_DECISION_GOP.FUNDADA}</option>
              <option value="INFUNDADA">{LABEL_DECISION_GOP.INFUNDADA}</option>
              <option value="NULIDAD">{LABEL_DECISION_GOP.NULIDAD} (luego se elige hasta dónde se retrotrae)</option>
            </select>
            {decision === 'NULIDAD' && (
              <Textarea label="Motivo de la nulidad" rows={3} value={motivoNulidad} onChange={(e) => setMotivoNulidad(e.target.value)} />
            )}
            <Input type="date" label="Fecha de la decisión de GOP" value={decisionFecha} max={hoy} onChange={(e) => setDecisionFecha(e.target.value)} />
            <div>
              <Button
                size="sm"
                loading={accion === 'decision'}
                onClick={async () => {
                  if (!decision) return error('Elige la decisión de GOP.');
                  if (!decisionFecha) return error('Ingresa la fecha de la decisión.');
                  if (decision === 'NULIDAD' && !motivoNulidad.trim()) return error('Indica el motivo de la nulidad.');
                  const ok = await confirm({
                    title: 'Registrar decisión de GOP',
                    message: `Se registrará: ${LABEL_DECISION_GOP[decision]}. No se puede cambiar después. ¿Continuar?`,
                    confirmLabel: 'Registrar',
                  });
                  if (!ok) return;
                  await ejecutar(
                    'decision',
                    () => RecursosApi.registrarDecisionGop(ape.id, decision, decisionFecha, decision === 'NULIDAD' ? motivoNulidad.trim() : undefined),
                    'Decisión registrada.',
                  );
                }}
              >
                Registrar decisión
              </Button>
            </div>
          </div>
        ) : undefined,
    });
  }

  return (
    <Modal isOpen onClose={onClose} title={`Expediente ${d.numeroExpediente} — Recursos`} maxWidth="860px">
      {mensaje && <Alert type={mensaje.type}>{mensaje.text}</Alert>}

      {d.tienePago && (
        <Alert type="warning">
          <strong>El administrado registró un pago</strong>
          {d.pago ? ` (${montoTexto(d.pago.montoPagado)} el ${fechaCorta(d.pago.fechaPago)})` : ''}. Según lo conversado con legal, quien paga
          pierde el derecho a recurrir: el recurso se puede registrar, pero corresponde evaluarlo como improcedente. (Pendiente de confirmar si
          el sistema debe bloquearlo.)
        </Alert>
      )}

      {/* 1. RESUMEN */}
      <section className="mb-[20px]">
        <div className="flex items-center gap-[8px] mb-[10px] flex-wrap">
          <Badge variant={varianteSituacion(d.situacion)}>{LABEL_SITUACION[d.situacion]}</Badge>
          {d.actoFirme && <Badge variant="neutral">Acto firme desde el {fechaCorta(d.actoFirme.fechaFirmeza)}</Badge>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
          <div className={estiloBloque}>
            <div className="font-bold mb-[4px]">Resolución de primera instancia</div>
            <div className="text-[12px] flex flex-col gap-[2px]">
              <div>
                {d.resolucion.tipo}
                {d.resolucion.numeroResolucion ? ` N° ${d.resolucion.numeroResolucion}` : ''} — notificada el {fechaCorta(d.resolucion.fechaNotificacion)}
              </div>
              {d.administrado && <div>Administrado: {d.administrado}</div>}
              <div>Multa: {montoTexto(d.resolucion.montoSinDescuento)}</div>
              {d.resolucion.medidaComplementaria && <div>Medida complementaria: {d.resolucion.medidaComplementaria}</div>}
            </div>
          </div>
          <div className={estiloBloque}>
            <div className="font-bold mb-[4px]">Plazo de recurso (15 días hábiles)</div>
            <div className="text-[12px] flex flex-col gap-[2px]">
              <div>Último acto: {d.ultimoActo ? textoUltimoActo(d) : <Muted>ninguno (hay un recurso en trámite)</Muted>}</div>
              <div>
                {d.situacion === 'PLAZO_ABIERTO' || d.situacion === 'PLAZO_VENCIDO' ? (
                  <span className={`font-semibold ${plazo?.urgente ? 'text-[#be123c]' : ''}`}>{plazo?.texto}</span>
                ) : (
                  <Muted>No corre plazo en esta situación.</Muted>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DOCUMENTOS */}
      <section className="mb-[20px]">
        <div className={estiloTituloSeccion}>Documentos</div>
        <div className="border border-border rounded-[8px] overflow-hidden">
          <FilaDocumento titulo={`Resolución de primera instancia${d.resolucion.numeroResolucion ? ` N° ${d.resolucion.numeroResolucion}` : ''} (Word)`}>
            <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={() => descargar(() => descargarDocumentoResolucion(d.expedienteId, d.numeroExpediente))}>
              Descargar
            </Button>
          </FilaDocumento>
          {rec && rsg && (
            <FilaDocumento
              titulo={`RSG que resuelve la reconsideración${rsg.numeroResolucion ? ` N° ${rsg.numeroResolucion}` : ''}`}
              detalle={rsg.analisisTexto ? 'Word con la plantilla de RSG de reconsideración.' : 'El Word se habilita cuando esté redactado el análisis.'}
              expandido={verRsg ? <div className={estiloTextoLargo}>{rsg.analisisTexto || 'Todavía no redactado.'}</div> : undefined}
            >
              {rsg.analisisTexto && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<FileTextIcon size={14} />}
                  className="mr-[6px]!"
                  onClick={() => descargar(() => descargarDocumentoRsgReconsideracion(rec.id, d.numeroExpediente))}
                >
                  Word
                </Button>
              )}
              <Button size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={() => setVerRsg((v) => !v)}>
                {verRsg ? 'Ocultar' : 'Ver'}
              </Button>
            </FilaDocumento>
          )}
          {ape?.informeGenerado && (
            <FilaDocumento
              titulo="Informe de elevación a GOP"
              detalle={ape.fechaFirmaInforme ? `Firmado el ${fechaCorta(ape.fechaFirmaInforme)}` : 'Sin firmar'}
              expandido={verInforme ? <div className={estiloTextoLargo}>{informe?.antecedentes || 'Sin contenido.'}</div> : undefined}
            >
              <Button
                size="sm"
                variant="outline"
                icon={<FileTextIcon size={14} />}
                className="mr-[6px]!"
                onClick={() => descargar(() => descargarDocumentoInformeGop(ape.id, d.numeroExpediente))}
              >
                Word
              </Button>
              <Button size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={cargarInforme}>
                {verInforme ? 'Ocultar' : 'Ver'}
              </Button>
            </FilaDocumento>
          )}
        </div>
      </section>

      {/* 3. REGISTRAR UN RECURSO */}
      {puedeRecurrir && (
        <section className="mb-[20px]">
          <div className={estiloTituloSeccion}>Registrar un recurso</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
            {puedeReconsiderar && (
              <div className={estiloForm}>
                <div className="font-bold text-[13px]">Reconsideración</div>
                <p className="text-[12px] text-text-muted">La resuelve esta Subgerencia. Su único requisito es presentar prueba nueva.</p>
                <Input type="date" label="Fecha de presentación" value={recFecha} max={hoy} onChange={(e) => setRecFecha(e.target.value)} />
                <label className="text-[12px] font-bold">¿Presentó prueba nueva?</label>
                <div className="flex gap-[14px] text-[13px]">
                  <label className="flex items-center gap-[6px] cursor-pointer">
                    <input type="radio" checked={recConPrueba === 'SI'} onChange={() => setRecConPrueba('SI')} /> Sí
                  </label>
                  <label className="flex items-center gap-[6px] cursor-pointer">
                    <input type="radio" checked={recConPrueba === 'NO'} onChange={() => setRecConPrueba('NO')} /> No
                  </label>
                </div>
                {recConPrueba === 'SI' && (
                  <Textarea label="Prueba nueva presentada" rows={3} value={recPruebaTexto} onChange={(e) => setRecPruebaTexto(e.target.value)} />
                )}
                <div>
                  <Button size="sm" loading={accion === 'recPresentar'} onClick={presentarReconsideracion}>
                    Registrar reconsideración
                  </Button>
                </div>
              </div>
            )}
            <div className={estiloForm}>
              <div className="font-bold text-[13px]">Apelación</div>
              <p className="text-[12px] text-text-muted">
                La resuelve GOP. Va contra el último acto: {textoUltimoActo(d)}.
              </p>
              <Input type="date" label="Fecha de presentación" value={apeFecha} max={hoy} onChange={(e) => setApeFecha(e.target.value)} />
              <div>
                <Button size="sm" loading={accion === 'apePresentar'} onClick={presentarApelacion}>
                  Registrar apelación
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
      {d.situacion === 'PLAZO_VENCIDO' && !ape && (
        <Alert type="info">
          Venció el plazo de 15 días hábiles sin recurso pendiente: el expediente puede declararse <strong>acto firme</strong> desde Acto firme / Cobranza.
        </Alert>
      )}

      {/* 4. PASOS */}
      {rec && (
        <section className="mb-[20px]">
          <div className={estiloTituloSeccion}>Reconsideración</div>
          <Stepper pasos={pasosReconsideracion} />
        </section>
      )}
      {ape && (
        <section>
          <div className={estiloTituloSeccion}>Apelación</div>
          <Stepper pasos={pasosApelacion} />
        </section>
      )}
    </Modal>
  );
};

const FilaDocumento: React.FC<{ titulo: string; detalle?: string; expandido?: React.ReactNode; children: React.ReactNode }> = ({
  titulo,
  detalle,
  expandido,
  children,
}) => (
  <div className="py-[10px] px-[14px] border-b border-b-border text-[13px]">
    <div className="flex items-center justify-between gap-[12px]">
      <div>
        <div className="font-semibold text-midnight-900">{titulo}</div>
        {detalle && <div className="text-[11px] text-text-muted">{detalle}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
    {expandido && <div className="mt-[10px]">{expandido}</div>}
  </div>
);

const Stepper: React.FC<{ pasos: StepDef[] }> = ({ pasos }) => (
  <div className="flex flex-col">
    {pasos.map((paso, idx) => (
      <div key={paso.clave} className="flex gap-[14px]">
        <div className="flex flex-col items-center">
          <div
            className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
              paso.estado === 'completado' ? 'bg-[#047857] text-[#ffffff]' : paso.estado === 'actual' ? 'bg-primary-600 text-[#ffffff]' : 'bg-[#e2e8f0] text-[#64748b]'
            }`}
          >
            {paso.estado === 'completado' ? <CheckIcon size={13} /> : idx + 1}
          </div>
          {idx < pasos.length - 1 && <div className={`w-[2px] flex-1 min-h-[24px] ${paso.estado === 'completado' ? 'bg-[#047857]' : 'bg-[#e2e8f0]'}`} />}
        </div>
        <div className="pb-[20px] flex-1 min-w-0">
          <div className={`text-[13px] font-bold ${paso.estado === 'pendiente' ? 'text-[#94a3b8]' : 'text-midnight-900'}`}>{paso.titulo}</div>
          <div className={`text-[12px] mt-[4px] ${paso.contenido ? 'mb-[8px]' : 'mb-0'}`}>{paso.descripcion}</div>
          {paso.contenido}
        </div>
      </div>
    ))}
  </div>
);
