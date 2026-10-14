import React, { useState } from 'react';
import { AmpliacionApi, ResolucionDetalle, ResolucionesApi, descargarDocumentoAmpliacion } from '../../api';
import { Badge, Button, Input } from '../../components/common/Common';
import { FileTextIcon, PenToolIcon } from '../../components/icons/Icons';
import { useConfirm } from '../../context/ConfirmContext';
import { diasDesde, fechaCorta, hoyLocal, soloFechaIso, varianteDiasEnFirma } from './resolucionUi';

const estiloBloque = 'bg-[#f8fafc] py-[12px] px-[14px] rounded-[8px] border border-border text-[13px]';
const estiloTituloSeccion = 'text-[13px] font-extrabold text-midnight-900 mb-[10px] uppercase tracking-[0.4px]';
const fila = 'flex gap-[12px] items-end flex-wrap mt-[8px]';

interface Props {
  expedienteId: string;
  numeroExpediente: string;
  /** Plazos y ampliación tal como los devuelve GET /resoluciones/:expedienteId. */
  plazos: ResolucionDetalle['plazos'];
  ampliacion: ResolucionDetalle['ampliacion'];
  /** La resolución final ya notificada detiene el reloj: no corresponde ampliar. */
  resolucionNotificada: boolean;
  /** Mensaje de éxito / error para el panel que la contiene. */
  onMensaje: (m: { type: 'success' | 'error'; text: string }) => void;
  /** Tras cada acción (éxito o error): el panel recarga su detalle y avisa a la bandeja. */
  onCambio: () => void | Promise<void>;
}

/**
 * O6 — RSG de ampliación de plazo (resolución intermedia, opcional, una sola
 * por expediente): emitir → Word → enviar a firma → registrar firma →
 * notificar. Se puede emitir desde que se notificó la NC, ANTES o DESPUÉS del
 * IFI — por eso vive fuera del panel de Resolución y la usan también el IFI.
 * Las reglas (antes de los 9 meses, resolución final no notificada, una por
 * expediente) las valida el backend; acá solo se guía.
 */
export const AmpliacionPlazoCard: React.FC<Props> = ({
  expedienteId,
  numeroExpediente,
  plazos: p,
  ampliacion: a,
  resolucionNotificada,
  onMensaje,
  onCambio,
}) => {
  const confirm = useConfirm();
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  // Fechas reales que ingresa el abogado — nacen vacías, nunca "hoy" por defecto.
  const [fechaEnvio, setFechaEnvio] = useState('');
  const [fechaFirma, setFechaFirma] = useState('');
  const [numero, setNumero] = useState('');
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [documentoSgd, setDocumentoSgd] = useState(a?.notificarDocumentoSgd ?? '');
  const [domicilioSgd, setDomicilioSgd] = useState(a?.notificarDomicilio ?? '');

  if (!a && !(p.fechaCaducidadOriginal && !resolucionNotificada)) return null;

  const hoy = hoyLocal();
  const finNueve = soloFechaIso(p.fechaCaducidadOriginal);
  const nueveVencidos = !!finNueve && hoy >= finNueve;
  const error = (text: string) => onMensaje({ type: 'error', text });

  const ejecutar = async (clave: string, fn: () => Promise<unknown>, exito: string) => {
    setAccionEnCurso(clave);
    try {
      await fn();
      onMensaje({ type: 'success', text: exito });
    } catch (err: any) {
      onMensaje({ type: 'error', text: err.message || 'No se pudo completar la acción.' });
    } finally {
      await onCambio();
      setAccionEnCurso(null);
    }
  };

  const descargar = () =>
    descargarDocumentoAmpliacion(expedienteId, numeroExpediente).catch((err: any) => error(err.message || 'No se pudo generar la RSG de ampliación.'));

  const emitir = async () => {
    const ok = await confirm({
      title: 'Emitir RSG de ampliación',
      message: `Se inicia la RSG de ampliación de plazo: 3 meses más contados desde el fin de los 9 meses (${fechaCorta(p.fechaCaducidadOriginal)}), nuevo límite ${fechaCorta(p.fechaCaducidadConAmpliacion)}. Solo cuenta cuando se registre la firma, y tiene que firmarse antes del ${fechaCorta(p.fechaCaducidadOriginal)}.`,
      confirmLabel: 'Emitir',
    });
    if (!ok) return;
    await ejecutar('ampEmitir', () => ResolucionesApi.emitirAmpliacion(expedienteId), 'RSG de ampliación iniciada. Descarga el Word y llévalo a firma.');
  };

  const enviar = () => {
    if (!fechaEnvio) return error('Ingresa la fecha real en que se entregó la RSG de ampliación al Subgerente.');
    if (fechaEnvio > hoy) return error('La fecha de envío no puede ser futura.');
    return ejecutar('ampEnviar', () => ResolucionesApi.enviarAmpliacionAFirma(expedienteId, fechaEnvio), 'Envío a firma de la ampliación registrado.');
  };

  const firmar = async () => {
    if (!fechaFirma) return error('Ingresa la fecha real en que firmó el Subgerente la ampliación.');
    if (fechaFirma > hoy) return error('La fecha de firma no puede ser futura.');
    const n = numero.trim();
    const ok = await confirm({
      title: 'Registrar firma de la ampliación',
      message: `Se registrará la firma del ${fechaCorta(fechaFirma)}${n ? ` — Resolución N° ${n}` : ' (sin N°)'}. Desde ahí el plazo de caducidad pasa al ${fechaCorta(p.fechaCaducidadConAmpliacion)}.`,
      confirmLabel: 'Registrar firma',
    });
    if (!ok) return;
    await ejecutar('ampFirmar', () => ResolucionesApi.firmarAmpliacion(expedienteId, fechaFirma, n || undefined), 'Firma de la ampliación registrada.');
  };

  const notificar = () => {
    if (!fechaNotificacion) return error('Ingresa la fecha real de notificación de la ampliación.');
    if (fechaNotificacion > hoy) return error('La fecha de notificación no puede ser futura.');
    return ejecutar('ampNotificar', () => ResolucionesApi.notificarAmpliacion(expedienteId, fechaNotificacion), 'Notificación de la ampliación registrada.');
  };

  const enFirma = !!a && a.estado === 'EN_ELABORACION' && !!a.fechaEnvioFirma;
  const diasEnFirma = enFirma ? diasDesde(a!.fechaEnvioFirma) : null;

  return (
    <section className="mb-[20px]">
      <div className={estiloTituloSeccion}>Ampliación de plazo (RSG)</div>
      <div className={`${estiloBloque} ${p.alertaAmpliacion ? 'bg-[#fff1f2]! border-[#fda4af]!' : ''}`}>
        <div className="text-[12px] mb-[6px]">
          Da 3 meses más, contados desde que vencen los 9 meses ({fechaCorta(p.fechaCaducidadOriginal)}): nuevo límite{' '}
          <strong>{fechaCorta(p.fechaCaducidadConAmpliacion)}</strong>. Es opcional, se puede emitir antes o después del IFI, y solo se puede emitir y
          firmar antes del {fechaCorta(p.fechaCaducidadOriginal)}. Cuenta desde que se registra la firma.
        </div>
        {p.alertaAmpliacion && (
          <div className="text-[#be123c] font-bold text-[12px] mb-[6px]">
            Faltan {p.diasParaCaducidad} días para caducar y no hay resolución final firmada. El Subgerente tarda 12 a 15 días en firmar.
          </div>
        )}
        {!a ? (
          nueveVencidos ? (
            <span className="text-text-muted">Ya vencieron los 9 meses: no se puede ampliar.</span>
          ) : (
            <Button size="sm" variant={p.alertaAmpliacion ? 'danger' : 'outline'} loading={accionEnCurso === 'ampEmitir'} onClick={emitir}>
              Emitir RSG de ampliación
            </Button>
          )
        ) : (
          <div className="text-[12px]">
            <div className="flex gap-[8px] items-center flex-wrap">
              <Badge variant={a.estado === 'NOTIFICADA' ? 'neutral' : a.estado === 'EMITIDA' ? 'success' : enFirma ? varianteDiasEnFirma(diasEnFirma) : 'info'}>
                {a.estado === 'NOTIFICADA'
                  ? 'Notificada'
                  : a.estado === 'EMITIDA'
                    ? 'Firmada, falta notificar'
                    : enFirma
                      ? `En firma hace ${diasEnFirma} día${diasEnFirma === 1 ? '' : 's'}`
                      : 'En elaboración'}
              </Badge>
              <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={descargar}>
                Descargar RSG de ampliación (Word)
              </Button>
            </div>
            {a.fechaEnvioFirma && <div className="mt-[6px]">Entregada al Subgerente el {fechaCorta(a.fechaEnvioFirma)}.</div>}
            {a.fechaFirma && (
              <div>
                Firmada el {fechaCorta(a.fechaFirma)}
                {a.numeroResolucion ? ` — Resolución N° ${a.numeroResolucion}` : ' (sin N° registrado)'}.
              </div>
            )}
            {a.fechaNotificacion && <div>Notificada el {fechaCorta(a.fechaNotificacion)}.</div>}

            {a.notificarDocumentoSgd && (
              <div className="mt-[6px]">
                Se notifica en el domicilio señalado en el Documento <strong>{a.notificarDocumentoSgd}</strong>: {a.notificarDomicilio}.
              </div>
            )}
            {a.estado === 'EN_ELABORACION' && !a.fechaEnvioFirma && !nueveVencidos && (
              <div className={fila}>
                <div className="w-[200px]">
                  <Input label="Documento SGD (opcional)" placeholder="Ej. S-56578-2025" value={documentoSgd} onChange={(e) => setDocumentoSgd(e.target.value)} />
                </div>
                <div className="flex-1 min-w-[220px]">
                  <Input label="Domicilio que señala ese documento" value={domicilioSgd} onChange={(e) => setDomicilioSgd(e.target.value)} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  loading={accionEnCurso === 'ampDomicilio'}
                  className="mb-[14px]!"
                  onClick={() => {
                    if (!!documentoSgd.trim() !== !!domicilioSgd.trim()) return error('Indica el documento y el domicilio, o deja ambos vacíos.');
                    return ejecutar(
                      'ampDomicilio',
                      () => AmpliacionApi.domicilioNotificacion(expedienteId, documentoSgd.trim(), domicilioSgd.trim()),
                      documentoSgd.trim() ? 'Domicilio de notificación guardado.' : 'Se notificará en el domicilio de la NC.',
                    );
                  }}
                >
                  Guardar domicilio
                </Button>
              </div>
            )}
            {a.estado === 'EN_ELABORACION' && !a.fechaEnvioFirma && !nueveVencidos && (
              <div className={fila}>
                <div className="w-[220px]">
                  <Input type="date" label="Fecha de entrega al Subgerente" value={fechaEnvio} max={hoy} onChange={(e) => setFechaEnvio(e.target.value)} />
                </div>
                <Button size="sm" icon={<PenToolIcon size={14} />} loading={accionEnCurso === 'ampEnviar'} onClick={enviar} className="mb-[14px]!">
                  Registrar envío a firma
                </Button>
              </div>
            )}
            {enFirma && !nueveVencidos && (
              <div className={fila}>
                <div className="w-[200px]">
                  <Input
                    type="date"
                    label="Fecha de firma"
                    value={fechaFirma}
                    min={soloFechaIso(a.fechaEnvioFirma)}
                    max={hoy}
                    onChange={(e) => setFechaFirma(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Input label="N° de resolución (opcional)" placeholder="Tal como figura en el papel" value={numero} onChange={(e) => setNumero(e.target.value)} />
                </div>
                <Button size="sm" variant="success" loading={accionEnCurso === 'ampFirmar'} onClick={firmar} className="mb-[14px]!">
                  Registrar firma
                </Button>
              </div>
            )}
            {a.estado === 'EN_ELABORACION' && nueveVencidos && (
              <div className="text-[#be123c] mt-[6px]">Vencieron los 9 meses sin firmarse la ampliación: ya no se puede registrar.</div>
            )}
            {a.estado === 'EMITIDA' && (
              <div className={fila}>
                <div className="w-[220px]">
                  <Input
                    type="date"
                    label="Fecha de notificación"
                    value={fechaNotificacion}
                    min={soloFechaIso(a.fechaFirma)}
                    max={hoy}
                    onChange={(e) => setFechaNotificacion(e.target.value)}
                  />
                </div>
                <Button size="sm" variant="success" loading={accionEnCurso === 'ampNotificar'} onClick={notificar} className="mb-[14px]!">
                  Registrar notificación
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
