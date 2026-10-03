import React, { useState } from 'react';
import { DestinoMemorandoPrescripcion, MotivoSuspensionPrescripcion, MultaPrescripcionItem, PrescripcionApi } from '../../api';
import { Badge, Button, Input, Textarea } from '../../components/common/Common';
import { claseFilaTramite, claseSelectTramite } from '../../components/common/PasoTramite';
import { useConfirm } from '../../context/ConfirmContext';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { ETIQUETA_MOTIVO_SUSPENSION, ETIQUETA_ORIGEN_FIRMEZA, MONEDA } from './prescripcionUi';

interface Props {
  solicitudId: string;
  multa: MultaPrescripcionItem;
  letra: string;
  editable: boolean;
  /** Ejecuta la acción con el manejo de mensajes/recarga del panel. */
  ejecutar: (clave: string, fn: () => Promise<unknown>, exito: string) => Promise<void>;
  accion: string | null;
  onError: (texto: string) => void;
}

/**
 * Una multa de la solicitud: datos, cómputo (2 años + suspensiones), memorando
 * si figura COA/DC, y la decisión (prescrita / no prescrita). Cambiar datos o
 * suspensiones deja la decisión sin efecto (hay que volver a decidir).
 */
export const MultaPrescripcionCard: React.FC<Props> = ({ solicitudId, multa: m, letra, editable, ejecutar, accion, onError }) => {
  const confirm = useConfirm();
  const hoy = hoyLocal();
  const k = (s: string) => `${s}-${m.id}`;
  const c = m.calculo;

  const [motivo, setMotivo] = useState<MotivoSuspensionPrescripcion | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [detalle, setDetalle] = useState('');
  const [memoNumero, setMemoNumero] = useState(m.memorando.numero ?? '');
  const [memoFecha, setMemoFecha] = useState(m.memorando.fecha?.slice(0, 10) ?? '');
  const [memoDestino, setMemoDestino] = useState<DestinoMemorandoPrescripcion | ''>(m.memorando.dirigidoA ?? '');
  const [memoRespFecha, setMemoRespFecha] = useState(m.memorando.respuestaFecha?.slice(0, 10) ?? '');
  const [memoRespResumen, setMemoRespResumen] = useState(m.memorando.respuestaResumen ?? '');
  const [resultado, setResultado] = useState<'PRESCRITA' | 'NO_PRESCRITA' | ''>(m.resultado ?? '');
  const [motivoResultado, setMotivoResultado] = useState(m.motivoResultado ?? '');

  const agregarSuspension = () => {
    if (!motivo || !desde) return onError('Elige el motivo y la fecha de inicio de la suspensión.');
    if (desde > hoy || (hasta && hasta > hoy)) return onError('Las fechas de suspensión no pueden ser futuras.');
    if (hasta && hasta <= desde) return onError('El fin de la suspensión debe ser posterior a su inicio.');
    return ejecutar(
      k('susp'),
      async () => {
        await PrescripcionApi.agregarSuspension(solicitudId, m.id, { motivo, desde, hasta: hasta || undefined, detalle: detalle.trim() || undefined });
        setMotivo('');
        setDesde('');
        setHasta('');
        setDetalle('');
      },
      'Suspensión registrada (la decisión de esta multa se reinició).',
    );
  };

  const guardarMemorando = () => {
    if (!memoNumero.trim() || !memoFecha || !memoDestino) return onError('Ingresa N°, fecha y destino del memorando.');
    if (memoFecha > hoy || (memoRespFecha && memoRespFecha > hoy)) return onError('Las fechas del memorando no pueden ser futuras.');
    return ejecutar(
      k('memo'),
      () =>
        PrescripcionApi.registrarMemorando(solicitudId, m.id, {
          numero: memoNumero.trim(),
          fecha: memoFecha,
          dirigidoA: memoDestino,
          respuestaFecha: memoRespFecha || undefined,
          respuestaResumen: memoRespResumen.trim() || undefined,
        }),
      'Memorando guardado.',
    );
  };

  const decidir = () => {
    if (!resultado) return onError('Elige el resultado de esta multa.');
    if (resultado === 'NO_PRESCRITA' && !motivoResultado.trim()) return onError('Indica por qué no prescribió (va en la RSG).');
    return ejecutar(k('decidir'), () => PrescripcionApi.decidir(solicitudId, m.id, resultado, motivoResultado.trim()), 'Decisión guardada.');
  };

  const eliminar = async () => {
    const ok = await confirm({ title: 'Quitar multa', message: `Se quita la multa ${letra} de esta solicitud.`, confirmLabel: 'Quitar', variant: 'danger' });
    if (ok) await ejecutar(k('eliminar'), () => PrescripcionApi.eliminarMulta(solicitudId, m.id), 'Multa quitada.');
  };

  const alternarCoaDc = () =>
    ejecutar(k('coa'), () => PrescripcionApi.editarMulta(solicitudId, m.id, { figuraCoaDc: !m.figuraCoaDc }), 'Marca COA/DC actualizada (la decisión se reinició).');

  return (
    <div className="border border-border rounded-[8px] bg-[#ffffff] p-[12px] mb-[10px]">
      <div className="flex items-start justify-between gap-[10px] flex-wrap">
        <div>
          <div className="font-bold text-midnight-900">
            {letra} {m.codigoCuis ? `CUIS ${m.codigoCuis}` : 'Multa'} — Resolución N° {m.numeroResolucionSancion ?? '—'}
          </div>
          <div className="text-[12px] text-text-secondary">
            {m.descripcionInfraccion ?? 'Sin descripción'} · {m.monto !== null ? MONEDA.format(m.monto) : 'monto no registrado'}
            {m.fechaResolucion && ` · de fecha ${formatearFecha(m.fechaResolucion)}`}
            {m.fechaNotificacion && ` · notificada ${formatearFecha(m.fechaNotificacion)}`}
            {m.ordenanza && ` · ${m.ordenanza}`}
          </div>
          <div className="flex gap-[6px] mt-[4px] flex-wrap">
            {m.resolucion ? <Badge variant="midnight">Sistema · Exp. {m.resolucion.numeroExpediente}</Badge> : <Badge variant="neutral">Multa antigua (manual)</Badge>}
            {m.figuraCoaDc && <Badge variant="warning">COA / DC</Badge>}
            {m.resultado && <Badge variant={m.resultado === 'PRESCRITA' ? 'success' : 'danger'}>{m.resultado === 'PRESCRITA' ? 'Prescrita' : 'No prescrita'}</Badge>}
          </div>
        </div>
        {editable && (
          <div className="flex gap-[6px]">
            <Button size="sm" variant="ghost" loading={accion === k('coa')} onClick={alternarCoaDc}>
              {m.figuraCoaDc ? 'Quitar COA/DC' : 'Marcar COA/DC'}
            </Button>
            <Button size="sm" variant="ghost" loading={accion === k('eliminar')} onClick={eliminar}>
              Quitar
            </Button>
          </div>
        )}
      </div>

      {/* CÓMPUTO */}
      <div className={cn('mt-[8px] text-[12px] rounded-[6px] py-[8px] px-[10px]', c.cumplePlazo ? 'bg-[#ecfdf5]' : 'bg-[#fff7ed]')}>
        Firme el <strong>{formatearFecha(m.fechaFirmeza)}</strong> ({ETIQUETA_ORIGEN_FIRMEZA[m.origenFirmeza]})
        {m.fechaContenciosoDesfavorable && ` · contencioso desfavorable ${formatearFecha(m.fechaContenciosoDesfavorable)}`} · inicio del cómputo{' '}
        {formatearFecha(c.inicioComputo)} · 2 años: {formatearFecha(c.vencimientoBase)}
        {c.diasSuspendidos > 0 && ` + ${c.diasSuspendidos} días suspendidos`} →{' '}
        {c.suspensionAbierta ? (
          <strong className="text-[#be123c]">cómputo suspendido (sin fecha de término)</strong>
        ) : (
          <>
            prescribe el <strong>{formatearFecha(c.fechaPrescripcion)}</strong> —{' '}
            <strong className={c.cumplePlazo ? 'text-[#047857]' : 'text-[#b45309]'}>
              {c.cumplePlazo ? 'cumplido a la fecha de la solicitud' : 'NO cumplido a la fecha de la solicitud'}
            </strong>
          </>
        )}
      </div>

      {/* SUSPENSIONES */}
      <div className="mt-[8px] text-[12px]">
        <div className="font-semibold">Suspensiones del cómputo</div>
        {m.suspensiones.length === 0 && <div className="text-text-muted">Ninguna registrada.</div>}
        {m.suspensiones.map((s) => (
          <div key={s.id} className="flex items-center gap-[8px] flex-wrap py-[2px]">
            <span>
              {ETIQUETA_MOTIVO_SUSPENSION[s.motivo]}: {formatearFecha(s.desde)} → {s.hasta ? formatearFecha(s.hasta) : 'sin término'}
              {s.detalle ? ` (${s.detalle})` : ''}
            </span>
            {editable && (
              <Button
                size="sm"
                variant="ghost"
                loading={accion === k(`del-${s.id}`)}
                onClick={() => ejecutar(k(`del-${s.id}`), () => PrescripcionApi.eliminarSuspension(solicitudId, m.id, s.id), 'Suspensión quitada.')}
              >
                Quitar
              </Button>
            )}
          </div>
        ))}
        {editable && (
          <div className={claseFilaTramite}>
            <div className="w-[200px] mb-[14px]">
              <select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoSuspensionPrescripcion | '')} className={claseSelectTramite}>
                <option value="">— Motivo —</option>
                {(Object.keys(ETIQUETA_MOTIVO_SUSPENSION) as MotivoSuspensionPrescripcion[]).map((mo) => (
                  <option key={mo} value={mo}>
                    {ETIQUETA_MOTIVO_SUSPENSION[mo]}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[150px]">
              <Input type="date" label="Desde" value={desde} max={hoy} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="w-[150px]">
              <Input type="date" label="Hasta (opcional)" value={hasta} max={hoy} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Input label="Detalle (opcional)" value={detalle} onChange={(e) => setDetalle(e.target.value)} />
            </div>
            <Button size="sm" variant="secondary" loading={accion === k('susp')} onClick={agregarSuspension} className="mb-[14px]!">
              Agregar
            </Button>
          </div>
        )}
      </div>

      {/* MEMORANDO (COA / DC) */}
      {m.figuraCoaDc && (
        <div className="mt-[8px] text-[12px] border-t border-t-border pt-[8px]">
          <div className="font-semibold">Memorando (figura con siglas COA/DC — obligatorio antes de decidir prescrita)</div>
          {editable ? (
            <>
              <div className={claseFilaTramite}>
                <div className="w-[160px]">
                  <Input label="N° memorando" value={memoNumero} onChange={(e) => setMemoNumero(e.target.value)} />
                </div>
                <div className="w-[150px]">
                  <Input type="date" label="Fecha" value={memoFecha} max={hoy} onChange={(e) => setMemoFecha(e.target.value)} />
                </div>
                <div className="w-[240px] mb-[14px]">
                  <select value={memoDestino} onChange={(e) => setMemoDestino(e.target.value as DestinoMemorandoPrescripcion | '')} className={claseSelectTramite}>
                    <option value="">— Dirigido a —</option>
                    <option value="COACTIVA">Coactiva (Palacio)</option>
                    <option value="RIESGOS_DESASTRES">Subgerencia de Riesgos y Desastres</option>
                  </select>
                </div>
                <div className="w-[150px]">
                  <Input type="date" label="Fecha de respuesta" value={memoRespFecha} max={hoy} onChange={(e) => setMemoRespFecha(e.target.value)} />
                </div>
              </div>
              <Textarea label="Resumen de la respuesta" value={memoRespResumen} onChange={(e) => setMemoRespResumen(e.target.value)} className="min-h-[50px]!" />
              <Button size="sm" variant="secondary" loading={accion === k('memo')} onClick={guardarMemorando}>
                Guardar memorando
              </Button>
            </>
          ) : (
            <div>
              {m.memorando.numero ? `Memorando N° ${m.memorando.numero} (${formatearFecha(m.memorando.fecha)}) — respuesta ${formatearFecha(m.memorando.respuestaFecha)}` : 'Sin memorando.'}
              {m.memorando.respuestaResumen && `: ${m.memorando.respuestaResumen}`}
            </div>
          )}
        </div>
      )}

      {/* DECISIÓN */}
      <div className="mt-[8px] text-[12px] border-t border-t-border pt-[8px]">
        <div className="font-semibold">Decisión</div>
        {editable ? (
          <>
            {m.faltantesParaPrescribir.length > 0 && <div className="text-[#b45309] mb-[4px]">Para declararla prescrita falta: {m.faltantesParaPrescribir.join('; ')}.</div>}
            <div className="flex gap-[16px] flex-wrap mb-[6px]">
              <label className={cn('flex items-center gap-[6px]', m.faltantesParaPrescribir.length > 0 ? 'opacity-60' : 'cursor-pointer')}>
                <input type="radio" name={`res-${m.id}`} disabled={m.faltantesParaPrescribir.length > 0} checked={resultado === 'PRESCRITA'} onChange={() => setResultado('PRESCRITA')} />
                Prescrita
              </label>
              <label className="flex items-center gap-[6px] cursor-pointer">
                <input type="radio" name={`res-${m.id}`} checked={resultado === 'NO_PRESCRITA'} onChange={() => setResultado('NO_PRESCRITA')} />
                No prescrita (improcedente)
              </label>
            </div>
            <Textarea
              label={resultado === 'NO_PRESCRITA' ? 'Motivo (obligatorio, va en la RSG)' : 'Motivo (opcional)'}
              value={motivoResultado}
              onChange={(e) => setMotivoResultado(e.target.value)}
              className="min-h-[50px]!"
            />
            <Button size="sm" loading={accion === k('decidir')} onClick={decidir}>
              Guardar decisión
            </Button>
          </>
        ) : (
          <div>
            {m.resultado ? (m.resultado === 'PRESCRITA' ? 'Prescrita' : 'No prescrita') : 'Sin decidir'}
            {m.motivoResultado && ` — ${m.motivoResultado}`}
          </div>
        )}
      </div>
    </div>
  );
};
