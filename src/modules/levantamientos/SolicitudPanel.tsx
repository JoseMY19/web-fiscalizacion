import React, { useCallback, useEffect, useState } from 'react';
import {
  LevantamientosApi,
  MedidaLevantamientoItem,
  MedioNotificacionCarta,
  SolicitudLevantamientoItem,
  abrirDocumentoLevantamiento,
  descargarCartaLevantamiento,
} from '../../api';
import { Alert, Badge, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { CheckIcon, EyeIcon, FileTextIcon, PenToolIcon } from '../../components/icons/Icons';
import { useConfirm } from '../../context/ConfirmContext';
import { formatearFecha, formatearFechaHora, hoyLocal } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import {
  CLASE_NIVEL,
  ETIQUETA_CARTA,
  ETIQUETA_ESTADO,
  VARIANTE_ESTADO,
  ahoraInputLima,
  cuentaRegresiva,
  isoDesdeInputLima,
  nombreArchivoCarta,
  tipoMedidaTexto,
  useAhora,
} from './levantamientoUi';

const estiloBloque = 'bg-[#f8fafc] py-[12px] px-[14px] rounded-[8px] border border-border text-[13px]';
const estiloTitulo = 'text-[13px] font-extrabold text-midnight-900 mb-[8px] uppercase tracking-[0.4px] flex items-center gap-[8px]';
const fila = 'flex gap-[12px] items-end flex-wrap mt-[8px]';
const claseSelect = 'w-full py-[10px] px-[14px] text-[14px] rounded-sm border border-border bg-[#ffffff] text-text-main outline-none';

interface Props {
  solicitudId: string;
  onClose: () => void;
  onCambio: () => void;
}

const Paso: React.FC<{ n: number; titulo: string; hecho: boolean; children: React.ReactNode }> = ({ n, titulo, hecho, children }) => (
  <section className="mb-[16px]">
    <div className={estiloTitulo}>
      <span
        className={cn(
          'w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
          hecho ? 'bg-[#16a34a] text-[#ffffff]' : 'bg-[#e2e8f0] text-[#475569]',
        )}
      >
        {hecho ? <CheckIcon size={12} /> : n}
      </span>
      {titulo}
    </div>
    <div className={estiloBloque}>{children}</div>
  </section>
);

/**
 * Panel de una solicitud de levantamiento: registro → evaluación → carta
 * Word → enviar a firma → firma (fecha y hora reales + N° de carta) →
 * notificar. Las fechas nacen vacías: siempre las escribe el usuario.
 */
export const SolicitudPanel: React.FC<Props> = ({ solicitudId, onClose, onCambio }) => {
  const confirm = useConfirm();
  const ahora = useAhora(1000);
  const [s, setS] = useState<SolicitudLevantamientoItem | null>(null);
  const [medida, setMedida] = useState<MedidaLevantamientoItem | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accion, setAccion] = useState<string | null>(null);

  const [resultado, setResultado] = useState<'FAVORABLE' | 'DESFAVORABLE' | ''>('');
  const [fundamentacion, setFundamentacion] = useState('');
  const [fechaEnvio, setFechaEnvio] = useState('');
  const [fechaHoraFirma, setFechaHoraFirma] = useState('');
  const [numeroCarta, setNumeroCarta] = useState('');
  const [conActa, setConActa] = useState(false);
  const [fechaHoraActa, setFechaHoraActa] = useState('');
  const [numeroActa, setNumeroActa] = useState('');
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [medio, setMedio] = useState<MedioNotificacionCarta | ''>('');
  const [nuevosPdf, setNuevosPdf] = useState<File[]>([]);

  const recargar = useCallback(async () => {
    try {
      const d = await LevantamientosApi.getDetalle(solicitudId);
      setS(d.solicitud);
      setMedida(d.medida);
      setErrorCarga(null);
      return d.solicitud;
    } catch (err: any) {
      setErrorCarga(err.message || 'No se pudo cargar la solicitud.');
      return null;
    }
  }, [solicitudId]);

  useEffect(() => {
    recargar().then((sol) => {
      // Lo ya registrado por el propio evaluador se muestra para poder corregirlo.
      if (sol?.resultado) setResultado(sol.resultado);
      if (sol?.fundamentacion) setFundamentacion(sol.fundamentacion);
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
      await recargar();
      onCambio();
      setAccion(null);
    }
  };
  const error = (text: string) => setMensaje({ type: 'error', text });

  if (!s) {
    return (
      <Modal isOpen onClose={onClose} title="Solicitud de levantamiento">
        {errorCarga ? <Alert type="error">{errorCarga}</Alert> : <div className="p-[30px] text-center"><Spinner size={28} /></div>}
      </Modal>
    );
  }

  const m = s.medida;
  const hoy = hoyLocal();
  const plazo = cuentaRegresiva(s.venceEn, s.esClausura, ahora);
  const firmada = !!s.fechaHoraFirma;
  const evaluacionEditable = s.estado === 'EN_EVALUACION' && !s.fechaEnvioFirma;
  const correspondeCartaVencimiento = s.estado === 'LEVANTADA_POR_VENCIMIENTO' && !firmada && s.tipoCarta !== 'LEVANTAMIENTO_VENCIMIENTO';
  const puedeEnviarAFirma = !!s.tipoCarta && !s.fechaEnvioFirma && !firmada && !correspondeCartaVencimiento;

  const evaluar = async () => {
    if (!resultado) return error('Elige el resultado de la evaluación.');
    if (!fundamentacion.trim()) return error('Escribe la fundamentación.');
    await ejecutar('evaluar', () => LevantamientosApi.evaluar(s.id, resultado, fundamentacion.trim()), 'Evaluación guardada. Descarga la carta en Word.');
  };

  const cartaVencimiento = async () => {
    const ok = await confirm({
      title: 'Carta por vencimiento del plazo',
      message: `El plazo venció el ${formatearFechaHora(s.venceEn)} sin carta firmada: la medida quedó sin efecto por ley. La carta pasa a ser la de "levantamiento por vencimiento del plazo"${s.fechaEnvioFirma ? ' y se deshace el envío a firma de la carta anterior' : ''}.`,
      confirmLabel: 'Generar carta por vencimiento',
    });
    if (!ok) return;
    await ejecutar('vencimiento', () => LevantamientosApi.disponerCartaVencimiento(s.id), 'Carta por vencimiento lista. Descárgala y llévala a firma.');
  };

  const descargar = () =>
    descargarCartaLevantamiento(s.id, nombreArchivoCarta(s)).catch((err: any) => error(err.message || 'No se pudo generar la carta.'));

  const enviar = () => {
    if (!fechaEnvio) return error('Ingresa la fecha real en que se entregó la carta al Subgerente.');
    if (fechaEnvio > hoy) return error('La fecha de envío no puede ser futura.');
    return ejecutar('enviar', () => LevantamientosApi.enviarAFirma(s.id, fechaEnvio), 'Envío a firma registrado.');
  };

  const firmar = async () => {
    if (!fechaHoraFirma) return error('Ingresa la fecha y hora reales en que firmó el Subgerente.');
    if (fechaHoraFirma > ahoraInputLima()) return error('La fecha de firma no puede ser futura.');
    if (!numeroCarta.trim()) return error('Ingresa el N° de carta tal como figura en el papel.');
    const iso = isoDesdeInputLima(fechaHoraFirma);
    const aTiempo = new Date(iso).getTime() <= new Date(s.venceEn).getTime();
    const ok = await confirm({
      title: 'Registrar firma de la carta',
      message: `Carta N° ${numeroCarta.trim()}, firmada el ${formatearFechaHora(iso)}. ${aTiempo ? 'Queda DENTRO del plazo.' : `Queda FUERA del plazo (vencía el ${formatearFechaHora(s.venceEn)}): la medida ya estaba levantada por ley.`}`,
      confirmLabel: 'Registrar firma',
      variant: aTiempo ? 'primary' : 'danger',
    });
    if (!ok) return;
    await ejecutar('firmar', () => LevantamientosApi.firmar(s.id, iso, numeroCarta.trim()), 'Firma registrada.');
  };

  const notificar = () => {
    if (!fechaNotificacion) return error('Ingresa la fecha real de notificación.');
    if (fechaNotificacion > hoy) return error('La fecha de notificación no puede ser futura.');
    if (!medio) return error('Elige el medio de notificación.');
    return ejecutar('notificar', () => LevantamientosApi.notificar(s.id, fechaNotificacion, medio), 'Notificación registrada.');
  };

  const adjuntar = () => {
    if (nuevosPdf.length === 0) return error('Elige al menos un PDF.');
    return ejecutar('adjuntar', async () => {
      await LevantamientosApi.adjuntarDocumentos(s.id, nuevosPdf);
      setNuevosPdf([]);
    }, 'PDF adjuntado.');
  };

  const otras = (medida?.solicitudes ?? []).filter((o) => o.id !== s.id);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Levantamiento — ${tipoMedidaTexto(m.tipoMedida)}, Acta N° ${m.numeroActa}`}
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
      <div className={cn(estiloBloque, 'mb-[16px]')}>
        <div className="flex items-center gap-[8px] flex-wrap mb-[6px]">
          <Badge variant={VARIANTE_ESTADO[s.estado]} size="md">
            {ETIQUETA_ESTADO[s.estado]}
          </Badge>
          {m.numeroExpediente ? <Badge variant="midnight">{m.numeroExpediente}</Badge> : <Badge variant="neutral">Sin expediente</Badge>}
          {s.estado === 'EN_EVALUACION' && <span className={cn('tabular-nums', CLASE_NIVEL[plazo.nivel])}>Vence en {plazo.texto}</span>}
        </div>
        <div>
          Administrado: <strong>{m.administradoNombre ?? 'no identificado'}</strong>
          {m.administradoDocumento ? ` (${m.administradoDocumento})` : ''}
          {m.numeroNotificacionCargo ? ` · NC N° ${m.numeroNotificacionCargo}` : ''}
        </div>
        <div className="text-text-secondary">
          Plazo: {s.plazoTexto} desde la presentación ({formatearFechaHora(s.fechaHoraPresentacion)}) — vence el{' '}
          <strong>{formatearFechaHora(s.venceEn)}</strong>. Base legal: {s.baseLegal}.
        </div>
      </div>

      {s.estado === 'LEVANTADA_POR_VENCIMIENTO' && (
        <Alert type="warning">
          Venció el plazo el {formatearFechaHora(s.venceEn)} sin carta firmada a tiempo: la medida quedó <strong>levantada por ley</strong>.
          {!firmada && ' Corresponde la carta que dispone el levantamiento por vencimiento del plazo.'}
          {correspondeCartaVencimiento && (
            <div className="mt-[8px]">
              <Button size="sm" variant="warning" loading={accion === 'vencimiento'} onClick={cartaVencimiento}>
                Generar carta por vencimiento del plazo
              </Button>
            </div>
          )}
        </Alert>
      )}

      {/* 1. SOLICITUD */}
      <Paso n={1} titulo="Solicitud registrada" hecho>
        <div>
          Presentada el <strong>{formatearFechaHora(s.fechaHoraPresentacion)}</strong> por Mesa de Partes{' '}
          {s.canal === 'VIRTUAL' ? 'virtual' : 'presencial'}
          {s.numeroRegistro ? ` — registro N° ${s.numeroRegistro}` : ''}.
        </div>
        <div>Correo declarado: {s.correoNotificacion ?? <span className="text-text-muted">no declaró</span>}</div>
        <div className="mt-[6px] whitespace-pre-wrap">{s.resumen}</div>
        {s.registradoPorNombre && <div className="text-[12px] text-text-muted mt-[4px]">Registrada por {s.registradoPorNombre}.</div>}
        <div className="flex gap-[6px] flex-wrap mt-[8px]">
          {s.documentos.map((d) => (
            <Button
              key={d.id}
              size="sm"
              variant="outline"
              icon={<EyeIcon size={14} />}
              onClick={() => abrirDocumentoLevantamiento(d.id).catch((err: any) => error(err.message || 'No se pudo abrir el PDF.'))}
            >
              {d.nombreOriginal}
            </Button>
          ))}
        </div>
        <div className={fila}>
          <input
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={(e) => setNuevosPdf(Array.from(e.target.files ?? []))}
            className="text-[12px] text-text-secondary file:mr-[8px] file:py-[4px] file:px-[10px] file:rounded-sm file:border file:border-border file:bg-[#ffffff] file:text-[12px] file:cursor-pointer"
          />
          <Button size="sm" variant="secondary" loading={accion === 'adjuntar'} disabled={nuevosPdf.length === 0} onClick={adjuntar}>
            Adjuntar PDF
          </Button>
        </div>
      </Paso>

      {/* 2. EVALUACIÓN */}
      <Paso n={2} titulo="Evaluación" hecho={!!s.resultado || s.tipoCarta === 'LEVANTAMIENTO_VENCIMIENTO'}>
        {evaluacionEditable ? (
          <>
            <div className="flex gap-[16px] flex-wrap mb-[10px]">
              {(['FAVORABLE', 'DESFAVORABLE'] as const).map((r) => (
                <label key={r} className="flex items-center gap-[6px] cursor-pointer">
                  <input type="radio" name="resultado" checked={resultado === r} onChange={() => setResultado(r)} />
                  {r === 'FAVORABLE' ? 'Favorable — se levanta la medida (p. ej. subsanó)' : 'Desfavorable — la medida sigue vigente'}
                </label>
              ))}
            </div>
            <Textarea
              label="Fundamentación"
              value={fundamentacion}
              onChange={(e) => setFundamentacion(e.target.value)}
              placeholder="Por qué se levanta o se deniega (va en la carta)"
              className="min-h-[120px]!"
            />
            <Button size="sm" loading={accion === 'evaluar'} onClick={evaluar}>
              {s.resultado ? 'Actualizar evaluación' : 'Guardar evaluación'}
            </Button>
          </>
        ) : s.resultado ? (
          <>
            <Badge variant={s.resultado === 'FAVORABLE' ? 'success' : 'danger'}>{s.resultado === 'FAVORABLE' ? 'Favorable' : 'Desfavorable'}</Badge>
            <div className="mt-[6px] whitespace-pre-wrap">{s.fundamentacion}</div>
          </>
        ) : (
          <span className="text-text-muted">
            {s.estado === 'LEVANTADA_POR_VENCIMIENTO' ? 'No se evaluó dentro del plazo.' : 'Sin evaluación.'}
          </span>
        )}
      </Paso>

      {/* 3. CARTA */}
      <Paso n={3} titulo="Carta (Word)" hecho={!!s.tipoCarta && !correspondeCartaVencimiento}>
        {s.tipoCarta && !correspondeCartaVencimiento ? (
          <div className="flex items-center gap-[10px] flex-wrap">
            <span className="font-semibold">{ETIQUETA_CARTA[s.tipoCarta]}</span>
            <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={descargar}>
              Descargar carta (Word)
            </Button>
          </div>
        ) : (
          <span className="text-text-muted">
            {correspondeCartaVencimiento ? 'Genera primero la carta por vencimiento del plazo.' : 'Disponible después de la evaluación.'}
          </span>
        )}
      </Paso>

      {/* EXCEPCIONAL: acta de levantamiento en lugar de carta (flujograma) */}
      {s.tipoCarta && s.tipoCarta !== 'DENEGATORIA' && !correspondeCartaVencimiento && !s.fechaEnvioFirma && !firmada && (
        <div className="mb-[12px] -mt-[6px] text-[13px]">
          <label className="flex items-center gap-[8px] cursor-pointer">
            <input type="checkbox" checked={conActa} onChange={(e) => setConActa(e.target.checked)} />
            Se levantó con <strong>acta de levantamiento</strong> (excepcional) en lugar de carta
          </label>
          {conActa && (
            <div className={fila}>
              <div className="w-[230px]">
                <Input type="datetime-local" label="Fecha y hora del acta" value={fechaHoraActa} max={ahoraInputLima()} onChange={(e) => setFechaHoraActa(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Input label="N° de acta" placeholder="Tal como figura en el papel" value={numeroActa} onChange={(e) => setNumeroActa(e.target.value)} />
              </div>
              <Button
                size="sm"
                variant="success"
                loading={accion === 'acta'}
                disabled={!fechaHoraActa || !numeroActa.trim()}
                className="mb-[14px]!"
                onClick={() =>
                  ejecutar('acta', () => LevantamientosApi.registrarActa(s.id, isoDesdeInputLima(fechaHoraActa), numeroActa.trim()), 'Acta de levantamiento registrada. Falta notificar.')
                }
              >
                Registrar acta
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 4. ENVÍO A FIRMA */}
      <Paso n={4} titulo="Envío a firma del Subgerente" hecho={!!s.fechaEnvioFirma}>
        {s.fechaEnvioFirma ? (
          <div>Entregada al Subgerente el {formatearFecha(s.fechaEnvioFirma)}.</div>
        ) : puedeEnviarAFirma ? (
          <div className={fila}>
            <div className="w-[230px]">
              <Input type="date" label="Fecha de entrega al Subgerente" value={fechaEnvio} max={hoy} onChange={(e) => setFechaEnvio(e.target.value)} />
            </div>
            <Button size="sm" icon={<PenToolIcon size={14} />} loading={accion === 'enviar'} onClick={enviar} className="mb-[14px]!">
              Registrar envío a firma
            </Button>
          </div>
        ) : (
          <span className="text-text-muted">Disponible cuando la carta esté lista.</span>
        )}
      </Paso>

      {/* 5. FIRMA */}
      <Paso n={5} titulo="Firma" hecho={firmada}>
        {firmada ? (
          <>
            <div>
              {s.esActaLevantamiento ? 'Acta de levantamiento' : 'Carta'} N° <strong>{s.numeroCarta}</strong>, firmada el {formatearFechaHora(s.fechaHoraFirma)}.
            </div>
            <div className={s.atendidaDentroDelPlazo ? 'text-[#047857] font-semibold' : 'text-[#be123c] font-semibold'}>
              {s.atendidaDentroDelPlazo ? 'Atendida dentro del plazo.' : `Atendida fuera del plazo (vencía el ${formatearFechaHora(s.venceEn)}).`}
            </div>
          </>
        ) : s.fechaEnvioFirma ? (
          <div className={fila}>
            <div className="w-[230px]">
              <Input
                type="datetime-local"
                label="Fecha y hora de firma"
                value={fechaHoraFirma}
                min={s.fechaEnvioFirma.slice(0, 10) + 'T00:00'}
                max={ahoraInputLima()}
                onChange={(e) => setFechaHoraFirma(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Input label="N° de carta" placeholder="Tal como figura en el papel" value={numeroCarta} onChange={(e) => setNumeroCarta(e.target.value)} />
            </div>
            <Button size="sm" variant="success" loading={accion === 'firmar'} onClick={firmar} className="mb-[14px]!">
              Registrar firma
            </Button>
          </div>
        ) : (
          <span className="text-text-muted">Disponible después del envío a firma.</span>
        )}
      </Paso>

      {/* 6. NOTIFICACIÓN */}
      <Paso n={6} titulo="Notificación" hecho={!!s.fechaNotificacion}>
        {s.fechaNotificacion ? (
          <div>
            Notificada el {formatearFecha(s.fechaNotificacion)} {s.medioNotificacion === 'CORREO' ? `por correo (${s.correoNotificacion})` : 'de forma presencial'}.
          </div>
        ) : firmada ? (
          <div className={fila}>
            <div className="w-[200px]">
              <Input
                type="date"
                label="Fecha de notificación"
                value={fechaNotificacion}
                min={s.fechaHoraFirma?.slice(0, 10)}
                max={hoy}
                onChange={(e) => setFechaNotificacion(e.target.value)}
              />
            </div>
            <div className="w-[220px] mb-[14px]">
              <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Medio</label>
              <select value={medio} onChange={(e) => setMedio(e.target.value as MedioNotificacionCarta | '')} className={claseSelect}>
                <option value="">— Elegir —</option>
                <option value="CORREO" disabled={!s.correoNotificacion}>
                  Correo{s.correoNotificacion ? '' : ' (no declaró)'}
                </option>
                <option value="PRESENCIAL">Presencial</option>
              </select>
            </div>
            <Button size="sm" variant="success" loading={accion === 'notificar'} onClick={notificar} className="mb-[14px]!">
              Registrar notificación
            </Button>
          </div>
        ) : (
          <span className="text-text-muted">Disponible después de registrar la firma.</span>
        )}
      </Paso>

      {otras.length > 0 && (
        <section>
          <div className={estiloTitulo}>Otras solicitudes de esta medida</div>
          <div className={estiloBloque}>
            {otras.map((o) => (
              <div key={o.id} className="flex items-center gap-[8px] flex-wrap py-[4px]">
                <span>Presentada el {formatearFechaHora(o.fechaHoraPresentacion)}</span>
                <Badge variant={VARIANTE_ESTADO[o.estado]}>{ETIQUETA_ESTADO[o.estado]}</Badge>
                {o.numeroCarta && <span className="text-text-muted">Carta N° {o.numeroCarta}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </Modal>
  );
};
