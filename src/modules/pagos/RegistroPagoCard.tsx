import React, { useCallback, useEffect, useState } from 'react';
import { LABEL_SISTEMA_ORIGEN, NotificacionCargoPagoItem, PagosApi, SistemaOrigenPago } from '../../api/pagos';
import { Alert, Badge, Button, Input, Textarea } from '../../components/common/Common';
import { ComboboxExpediente } from '../../components/common/ComboboxExpediente';
import { montoSoles } from '../../components/common/PagadoBadge';
import { SelectorFecha } from '../../components/common/SelectorFecha';
import { SelectorOpciones } from '../../components/common/SelectorOpciones';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { ScaleIcon } from '../../components/icons/Icons';

/** Texto por el que se busca y se muestra cada NC en el combobox (N° de NC y N° de expediente). */
const etiquetaNc = (n: NotificacionCargoPagoItem) => `NC N° ${n.numeroNc} · Exp. ${n.numeroExpediente ?? 'sin expediente'}`;

const LABEL_ESTADO_RES: Record<string, string> = {
  EN_ELABORACION: 'en elaboración',
  EMITIDA: 'firmada',
  NOTIFICADA: 'notificada',
};

/** Regla legal visible donde se registra el pago. */
export const AvisoPagoNoExtingueMedida: React.FC = () => (
  <div className="bg-info-bg py-[12px] px-[14px] rounded-sm border border-info-border text-[#0369a1] text-[12.5px] leading-[1.45] mb-[20px]">
    <div className="flex items-start gap-[8px]">
      <span className="mt-[2px] shrink-0">
        <ScaleIcon size={15} />
      </span>
      <span>
        El pago <strong>extingue la multa</strong>, pero <strong>NO</strong> la medida complementaria (clausura, paralización, demolición…):
        esa sigue vigente y se ejecuta por separado.
      </span>
    </div>
  </div>
);

interface Props {
  /** Tras registrar un pago (la vista recarga su lista). */
  onRegistrado?: () => void;
}

/**
 * F5 — registro de pago por N° de NC (o N° de expediente). Se acepta en
 * cualquier momento, incluso antes de que exista resolución. Fecha, monto y
 * N° de recibo se copian tal cual del comprobante (nada se precarga).
 */
export const RegistroPagoCard: React.FC<Props> = ({ onRegistrado }) => {
  const [opciones, setOpciones] = useState<NotificacionCargoPagoItem[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [nc, setNc] = useState<NotificacionCargoPagoItem | null>(null);

  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [numeroRecibo, setNumeroRecibo] = useState('');
  const [sistema, setSistema] = useState<SistemaOrigenPago | ''>('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorLista(null);
    try {
      const data = await PagosApi.buscarNotificacionesSinPago('');
      setOpciones(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorLista(err.message || 'No se pudieron cargar las Notificaciones de Cargo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const limpiar = () => {
    setNc(null);
    setMonto('');
    setFechaPago('');
    setNumeroRecibo('');
    setSistema('');
    setObservacion('');
  };

  const registrar = async () => {
    setMensaje(null);
    const montoNum = Number(monto);
    if (!nc) return setMensaje({ type: 'error', text: 'Elige la Notificación de Cargo (por N° de NC o de expediente).' });
    if (!monto || Number.isNaN(montoNum) || montoNum <= 0) return setMensaje({ type: 'error', text: 'Ingresa el monto pagado según el comprobante.' });
    if (!fechaPago) return setMensaje({ type: 'error', text: 'Ingresa la fecha de pago que figura en el comprobante.' });
    if (fechaPago > hoyLocal()) return setMensaje({ type: 'error', text: 'La fecha de pago no puede ser futura.' });
    if (!sistema) return setMensaje({ type: 'error', text: 'Indica en qué sistema se registró el pago.' });

    setGuardando(true);
    try {
      await PagosApi.registrar({
        notificacionCargoId: nc.notificacionCargoId,
        montoPagado: montoNum,
        fechaPago,
        numeroRecibo: numeroRecibo.trim() || undefined,
        sistemaOrigen: sistema,
        observacion: observacion.trim() || undefined,
      });
      setMensaje({ type: 'success', text: `Pago de ${montoSoles(montoNum)} registrado para la NC N° ${nc.numeroNc}.` });
      limpiar();
      cargar();
      onRegistrado?.();
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo registrar el pago.' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="relative z-[20] bg-bg-card rounded-md border border-border shadow-xs">
      <header className="py-[18px] px-[24px] border-b border-border">
        <h3 className="text-[15px] font-bold text-midnight-900 m-0">Registrar pago</h3>
        <p className="text-[12.5px] text-text-muted mt-[3px] mb-0">Por N° de Notificación de Cargo, tal como figura en el comprobante.</p>
      </header>
      <div className="p-[24px]">
      <AvisoPagoNoExtingueMedida />
      {mensaje && <Alert type={mensaje.type}>{mensaje.text}</Alert>}

      <ComboboxExpediente<NotificacionCargoPagoItem>
        label="Notificación de Cargo (N° de expediente)"
        placeholder="Haz clic para ver las NC sin pago, o escribe el N° de NC / expediente"
        opciones={opciones}
        cargando={cargando}
        error={errorLista}
        seleccionada={nc}
        onSeleccionar={setNc}
        obtenerClave={(n) => n.notificacionCargoId}
        obtenerNumeroExpediente={etiquetaNc}
        renderDetalle={(n) => (
          <>
            {n.administrado && <span className="text-[11px] text-text-muted">{n.administrado}</span>}
            {n.montoPasibleMulta !== null && <span className="text-[11px] font-semibold text-text-secondary">NC {montoSoles(n.montoPasibleMulta)}</span>}
            {n.resolucion ? <Badge variant="info">{n.resolucion.tipo} {LABEL_ESTADO_RES[n.resolucion.estado]}</Badge> : <Badge variant="neutral">Sin resolución</Badge>}
          </>
        )}
        mensajeVacio="No hay Notificaciones de Cargo sin pago."
      />

      {nc && (
        <div className="bg-bg-subtle py-[12px] px-[14px] rounded-sm border border-border text-[12.5px] mb-[14px]">
          <div className="font-bold text-midnight-900 mb-[4px]">
            NC N° {nc.numeroNc} - Expediente {nc.numeroExpediente ?? '(sin expediente todavía)'}
          </div>
          <div className="text-text-secondary">Administrado: {nc.administrado ?? 'no identificado'}</div>
          <div className="text-text-secondary">
            Detectada el {formatearFecha(nc.fechaDeteccion)} · Notificada: {nc.fechaNotificacion ? formatearFecha(nc.fechaNotificacion) : 'aún no'}
            {nc.montoPasibleMulta !== null && ` · Multa pasible (NC): ${montoSoles(nc.montoPasibleMulta)}`}
          </div>
          {nc.resolucion ? (
            <div className="text-text-secondary">
              Resolución {nc.resolucion.tipo}
              {nc.resolucion.numeroResolucion ? ` N° ${nc.resolucion.numeroResolucion}` : ''} ({LABEL_ESTADO_RES[nc.resolucion.estado]})
              {nc.resolucion.montoSinDescuento !== null && ` · Multa ${montoSoles(nc.resolucion.montoSinDescuento)}`}
              {nc.resolucion.montoConDescuento !== null && ` (c/desc. ${montoSoles(nc.resolucion.montoConDescuento)})`}
            </div>
          ) : (
            <div className="text-text-muted">Todavía no hay resolución: el pago queda registrado contra la NC.</div>
          )}
          {nc.medidaComplementaria && (
            <div className="text-[#b45309] font-semibold mt-[4px]">Medida complementaria: {nc.medidaComplementaria} (el pago no la extingue).</div>
          )}
        </div>
      )}

      {/* Uno debajo del otro: la tarjeta es angosta y la fecha se muestra completa ("21 de octubre de 2026"). */}
      <Input label="Monto pagado (S/)" placeholder="Ej. 1375.00" type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} />
      <SelectorFecha etiqueta="Fecha de pago" valor={fechaPago} max={hoyLocal()} onCambio={setFechaPago} />
      <Input label="N° de recibo / operación (opcional)" value={numeroRecibo} onChange={(e) => setNumeroRecibo(e.target.value)} />
      <div className="mb-[14px]">
        <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Sistema donde se registró</label>
        <SelectorOpciones
          etiqueta="Sistema donde se registró"
          valor={sistema || null}
          onCambio={(v) => setSistema(v as SistemaOrigenPago)}
          marcador="Elegir sistema"
          className="min-h-[42px]! pl-[14px]! text-[14px]!"
          opciones={(Object.keys(LABEL_SISTEMA_ORIGEN) as SistemaOrigenPago[]).map((s) => ({ valor: s, etiqueta: LABEL_SISTEMA_ORIGEN[s] }))}
        />
      </div>
      <Textarea label="Observación (opcional)" value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2} />

      <Button variant="success" loading={guardando} onClick={registrar} className="w-full">
        Registrar pago
      </Button>
      </div>
    </section>
  );
};
