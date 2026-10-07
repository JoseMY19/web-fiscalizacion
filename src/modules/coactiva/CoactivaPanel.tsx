import React, { useCallback, useEffect, useState } from 'react';
import {
  CasoCoactivoItem,
  ClaseSuspension,
  CoactivaApi,
  FormaMedidaCautelar,
  MotivoSuspension,
  ResolucionCoactivaItem,
  TipoResolucionCoactiva,
  abrirDocumentoCoactivo,
} from '../../api';
import { Alert, Badge, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { PagadoBadge } from '../../components/common/PagadoBadge';
import { claseBloqueTramite, claseFilaTramite, claseInputArchivo, claseSelectTramite, PasoTramite } from '../../components/common/PasoTramite';
import { EyeIcon } from '../../components/icons/Icons';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import {
  estadoCoactivo,
  LABEL_CLASE_SUSPENSION,
  LABEL_FORMA_MEDIDA,
  LABEL_MOTIVO_SUSPENSION,
  LABEL_TIPO_REC,
  montoSoles,
  MOTIVOS_POR_CLASE,
  siguientePasoCoactivo,
} from './coactivaUi';

interface Props {
  actoFirmeId: string;
  onClose: () => void;
  onCambio: () => void;
}

type Ejecutar = (clave: string, fn: () => Promise<unknown>, exito: string) => Promise<boolean>;

/**
 * Expediente coactivo de un acto firme: inicio → resoluciones (REC, las que
 * correspondan al caso) → suspensiones → medida complementaria → devolución
 * a PAS. Todas las fechas y números los escribe el usuario.
 */
export const CoactivaPanel: React.FC<Props> = ({ actoFirmeId, onClose, onCambio }) => {
  const [c, setC] = useState<CasoCoactivoItem | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accion, setAccion] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      setC(await CoactivaApi.getPorActoFirme(actoFirmeId));
      setErrorCarga(null);
    } catch (err: any) {
      setErrorCarga(err.message || 'No se pudo cargar el expediente coactivo.');
    }
  }, [actoFirmeId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const ejecutar: Ejecutar = async (clave, fn, exito) => {
    setAccion(clave);
    let ok = false;
    try {
      await fn();
      setMensaje({ type: 'success', text: exito });
      ok = true;
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo completar la acción.' });
    } finally {
      await recargar();
      onCambio();
      setAccion(null);
    }
    return ok;
  };

  if (!c) {
    return (
      <Modal isOpen onClose={onClose} title="Ejecución coactiva">
        {errorCarga ? <Alert type="error">{errorCarga}</Alert> : <div className="p-[30px] text-center"><Spinner size={28} /></div>}
      </Modal>
    );
  }

  const e = c.expedienteCoactivo;
  const s = c.situacion;
  const est = estadoCoactivo(s.estado);
  const archivado = s.estado === 'ARCHIVADO';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Ejecución coactiva — ${c.numeroExpediente}${e ? ` · Exp. coactivo ${e.numeroExpedienteCoactivo}` : ''}`}
      maxWidth="880px"
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

      {/* RESUMEN: N° de sanción y N° coactivo juntos */}
      <div className={cn(claseBloqueTramite, 'mb-[16px]')}>
        <div className="flex items-center gap-[8px] flex-wrap mb-[6px]">
          <Badge variant={est.variante} size="md">
            {est.texto}
          </Badge>
          {c.pago && <PagadoBadge tienePago montoPagado={c.pago.montoPagado} fechaPago={c.pago.fechaPago} size="md" />}
          {s.suspensionPendiente && <Badge variant="warning">Suspensión por resolver</Badge>}
        </div>
        <div className="grid grid-cols-[1fr_1fr] gap-x-[16px] gap-y-[2px]">
          <div>
            Sanción N° <strong>{c.numeroSancion ?? '—'}</strong> · Expediente {c.numeroExpediente}
          </div>
          <div>
            Expediente coactivo N° <strong>{e?.numeroExpedienteCoactivo ?? '—'}</strong>
          </div>
          <div>
            Administrado: <strong>{c.administradoNombre ?? 'no identificado'}</strong>
            {c.administradoDocumento ? ` (${c.administradoDocumento})` : ''}
          </div>
          <div>
            Deuda: <strong>{montoSoles(e?.montoDeuda ?? c.montoSancion)}</strong>
          </div>
          <div className="text-text-secondary">Acto firme el {formatearFecha(c.fechaFirmeza)}</div>
          <div className="text-text-secondary">Medida complementaria: {(e?.medidaComplementaria ?? c.medidaComplementariaSancion) || 'no tiene'}</div>
        </div>
        <div className="mt-[6px] font-semibold text-text-secondary">{siguientePasoCoactivo(c)}</div>
      </div>

      {s.pagado && !archivado && (
        <Alert type="success">
          <strong>El administrado pagó la multa{c.pago ? ` (${montoSoles(c.pago.montoPagado)} el ${formatearFecha(c.pago.fechaPago)})` : ''}: no embargar.</strong>{' '}
          {s.medidaPendiente
            ? 'La medida complementaria sigue pendiente hasta que se cumpla.'
            : 'Corresponde la suspensión definitiva por pago y el archivo.'}
        </Alert>
      )}

      {/* 1. INICIO */}
      <PasoTramite n={1} titulo="Inicio del expediente coactivo" hecho={!!e}>
        {e ? (
          <div>
            Iniciado el <strong>{formatearFecha(e.fechaInicio)}</strong>
            {e.ejecutorNombre ? ` · Ejecutor: ${e.ejecutorNombre}` : ''}
            {e.registradoPorNombre ? ` · registró ${e.registradoPorNombre}` : ''}.
          </div>
        ) : (
          <FormIniciar c={c} accion={accion} ejecutar={ejecutar} />
        )}
      </PasoTramite>

      {e && (
        <>
          {/* 2. RESOLUCIONES */}
          <PasoTramite n={2} titulo="Resoluciones de ejecución coactiva (REC)" hecho={archivado}>
            <div className="text-[12px] text-text-muted mb-[8px]">
              Dependen del caso: registra las que correspondan (REC 1 requerimiento, medidas cautelares, ejecución de la medida complementaria,
              levantamientos, respuestas a escritos…). Las plantillas Word se agregarán cuando coactivo las envíe; por ahora, adjunta el PDF firmado.
              {s.venceRequerimiento && (
                <>
                  {' '}
                  Plazo del requerimiento: vence el <strong>{formatearFecha(s.venceRequerimiento)}</strong>
                  {s.requerimientoVencido ? ' (vencido).' : '.'}
                </>
              )}
            </div>
            {e.resoluciones.length === 0 && <div className="text-text-muted mb-[8px]">Todavía no hay resoluciones registradas.</div>}
            <div className="flex flex-col gap-[8px]">
              {e.resoluciones.map((r) => (
                <FilaRec key={r.id} expedienteCoactivoId={e.id} r={r} accion={accion} ejecutar={ejecutar} />
              ))}
            </div>
            {!archivado && <FormRec c={c} accion={accion} ejecutar={ejecutar} />}
          </PasoTramite>

          {/* 3. SUSPENSIONES */}
          <PasoTramite n={3} titulo="Suspensiones" hecho={e.suspensiones.length > 0 && !s.suspensionPendiente}>
            <div className="text-[12px] text-text-muted mb-[8px]">
              Se pueden pedir desde la notificación de la REC 1. Definitiva: pagó, no es el obligado, mala notificación, mandato judicial.
              Temporal: revisión judicial o cautelar judicial.
            </div>
            <div className="flex flex-col gap-[8px]">
              {e.suspensiones.map((x) => (
                <FilaSuspension key={x.id} c={c} suspensionId={x.id} accion={accion} ejecutar={ejecutar} />
              ))}
            </div>
            {!archivado && <FormSuspension expedienteCoactivoId={e.id} accion={accion} ejecutar={ejecutar} />}
          </PasoTramite>

          {/* 4. MEDIDA COMPLEMENTARIA */}
          {e.incluyeMedidaComplementaria && (
            <PasoTramite n={4} titulo="Medida complementaria" hecho={!!e.medidaCumplidaFecha}>
              <div className="mb-[6px]">
                <strong>{e.medidaComplementaria}</strong> — subsiste aunque el administrado pague la multa.
              </div>
              {e.medidaCumplidaFecha ? (
                <div>
                  Cumplida el <strong>{formatearFecha(e.medidaCumplidaFecha)}</strong>
                  {e.medidaCumplidaNota ? ` — ${e.medidaCumplidaNota}` : ''}.
                </div>
              ) : (
                !archivado && (
                  <AccionFechaNota
                    etiqueta="Fecha de cumplimiento"
                    nota="Cómo se verificó (acta, fotos, regularizó…)"
                    boton="Registrar cumplimiento"
                    cargando={accion === 'medida'}
                    onEnviar={(fecha, nota) => ejecutar('medida', () => CoactivaApi.cumplimientoMedida(e.id, fecha, nota), 'Cumplimiento de la medida registrado.')}
                  />
                )
              )}
            </PasoTramite>
          )}

          {/* 5. DEVOLUCIÓN A PAS */}
          <PasoTramite n={e.incluyeMedidaComplementaria ? 5 : 4} titulo="Devolución a PAS" hecho={false}>
            <div className="text-[12px] text-text-muted mb-[8px]">
              Si coactivo le da la razón al administrado porque la resolución final no se notificó bien, el expediente vuelve a la oficina de PAS: se
              renotifica y retorna a coactiva, o se archiva si ya prescribió.
            </div>
            <div className="flex flex-col gap-[8px]">
              {e.devoluciones.map((d) => (
                <FilaDevolucion key={d.id} c={c} devolucionId={d.id} accion={accion} ejecutar={ejecutar} />
              ))}
            </div>
            {!archivado && s.estado !== 'DEVUELTO_PAS' && <FormDevolucion expedienteCoactivoId={e.id} accion={accion} ejecutar={ejecutar} />}
          </PasoTramite>
        </>
      )}
    </Modal>
  );
};

// ─── Inicio ────────────────────────────────────────────────────────────────

const FormIniciar: React.FC<{ c: CasoCoactivoItem; accion: string | null; ejecutar: Ejecutar }> = ({ c, accion, ejecutar }) => {
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState('');
  const [ejecutor, setEjecutor] = useState('');
  const hoy = hoyLocal();
  const s = c.situacion;
  return (
    <div>
      {s.estado === 'EN_ESPERA' ? (
        <Alert type="info" className="mb-[8px]!">
          Espera de 90 días desde la firmeza ({formatearFecha(c.fechaFirmeza)}) por si el administrado va a lo contencioso: se puede iniciar desde
          el <strong>{formatearFecha(s.habilitadoDesde)}</strong> (faltan {s.diasParaHabilitar} días).
        </Alert>
      ) : (
        <div className="text-[12px] text-text-muted mb-[6px]">Espera de 90 días cumplida el {formatearFecha(s.habilitadoDesde)}.</div>
      )}
      <div className={claseFilaTramite}>
        <div className="flex-1 min-w-[200px]">
          <Input label="N° de expediente coactivo" value={numero} onChange={(ev) => setNumero(ev.target.value)} placeholder="Tal como lo asigna coactivo" />
        </div>
        <div className="w-[180px]">
          <Input type="date" label="Fecha de inicio" value={fecha} max={hoy} onChange={(ev) => setFecha(ev.target.value)} />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Input label="Ejecutor coactivo (opcional)" value={ejecutor} onChange={(ev) => setEjecutor(ev.target.value)} />
        </div>
      </div>
      <Button
        size="sm"
        className="mt-[8px]"
        loading={accion === 'iniciar'}
        disabled={!numero.trim() || !fecha}
        onClick={() =>
          ejecutar(
            'iniciar',
            () => CoactivaApi.iniciar(c.actoFirmeId, { numeroExpedienteCoactivo: numero.trim(), fechaInicio: fecha, ejecutorNombre: ejecutor.trim() || undefined }),
            'Expediente coactivo iniciado. Registra el requerimiento de pago (REC 1).',
          )
        }
      >
        Iniciar expediente coactivo
      </Button>
    </div>
  );
};

// ─── Resoluciones (REC) ───────────────────────────────────────────────────

const TIPOS_REC: TipoResolucionCoactiva[] = [
  'REQUERIMIENTO_PAGO',
  'MEDIDA_CAUTELAR',
  'SECUESTRO_BIENES',
  'EJECUCION_MEDIDA_COMPLEMENTARIA',
  'LEVANTAMIENTO_MEDIDA',
  'SUSPENSION',
  'CUMPLIMIENTO_ARCHIVO',
  'OTRA',
];
const FORMAS: FormaMedidaCautelar[] = ['RETENCION_BANCARIA', 'INSCRIPCION', 'DEPOSITO_SECUESTRO', 'INTERVENCION', 'OTRA'];

const FormRec: React.FC<{ c: CasoCoactivoItem; accion: string | null; ejecutar: Ejecutar }> = ({ c, accion, ejecutar }) => {
  const e = c.expedienteCoactivo!;
  const sugerido: TipoResolucionCoactiva = e.resoluciones.length === 0 ? 'REQUERIMIENTO_PAGO' : 'MEDIDA_CAUTELAR';
  const [abierto, setAbierto] = useState(false);
  const [numeroRec, setNumeroRec] = useState(String(c.situacion.siguienteRec));
  const [tipo, setTipo] = useState<TipoResolucionCoactiva>(sugerido);
  const [forma, setForma] = useState<FormaMedidaCautelar>('RETENCION_BANCARIA');
  const [detalle, setDetalle] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [otraCausal, setOtraCausal] = useState(false);
  const hoy = hoyLocal();

  useEffect(() => setNumeroRec(String(c.situacion.siguienteRec)), [c.situacion.siguienteRec]);

  if (!abierto) {
    return (
      <Button size="sm" variant="outline" className="mt-[10px]" onClick={() => setAbierto(true)}>
        + Registrar REC {c.situacion.siguienteRec}
      </Button>
    );
  }
  const esOtraCausal = tipo === 'CUMPLIMIENTO_ARCHIVO' && otraCausal;
  const pideDescripcion = tipo === 'OTRA' || (tipo === 'MEDIDA_CAUTELAR' && forma === 'OTRA') || esOtraCausal;
  return (
    <div className="mt-[10px] border-t border-t-border pt-[10px]">
      <div className={claseFilaTramite}>
        <div className="w-[110px]">
          <Input label="REC N°" type="number" min={1} value={numeroRec} onChange={(ev) => setNumeroRec(ev.target.value)} />
        </div>
        <div className="flex-1 min-w-[240px]">
          <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Tipo</label>
          <select className={claseSelectTramite} value={tipo} onChange={(ev) => setTipo(ev.target.value as TipoResolucionCoactiva)}>
            {TIPOS_REC.map((t) => (
              <option key={t} value={t}>
                {LABEL_TIPO_REC[t]}
              </option>
            ))}
          </select>
        </div>
        {tipo === 'MEDIDA_CAUTELAR' && (
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Forma del embargo</label>
            <select className={claseSelectTramite} value={forma} onChange={(ev) => setForma(ev.target.value as FormaMedidaCautelar)}>
              {FORMAS.map((f) => (
                <option key={f} value={f}>
                  {LABEL_FORMA_MEDIDA[f]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="w-[170px]">
          <Input type="date" label="Fecha de emisión" value={fecha} max={hoy} onChange={(ev) => setFecha(ev.target.value)} />
        </div>
      </div>
      {tipo === 'CUMPLIMIENTO_ARCHIVO' && (
        <label className="flex items-center gap-[8px] text-[13px] mt-[8px] cursor-pointer">
          <input type="checkbox" checked={otraCausal} onChange={(ev) => setOtraCausal(ev.target.checked)} />
          Archivo por otra causal prevista en la normativa (no por pago / suspensión definitiva)
        </label>
      )}
      {pideDescripcion && (
        <Input label="Descripción (obligatoria)" value={descripcion} onChange={(ev) => setDescripcion(ev.target.value)} placeholder="De qué trata la resolución / la medida" />
      )}
      <Textarea
        label="Detalle (opcional)"
        value={detalle}
        onChange={(ev) => setDetalle(ev.target.value)}
        placeholder={tipo === 'MEDIDA_CAUTELAR' ? 'Banco y monto retenido, placa, partida registral, bienes…' : 'Observaciones'}
        className="min-h-[60px]!"
      />
      <div className={claseFilaTramite}>
        <input type="file" accept="application/pdf,.pdf" multiple onChange={(ev) => setPdfs(Array.from(ev.target.files ?? []))} className={claseInputArchivo} />
        <Button
          size="sm"
          loading={accion === 'rec'}
          disabled={!fecha || !Number(numeroRec) || (pideDescripcion && !descripcion.trim())}
          onClick={async () => {
            const ok = await ejecutar(
              'rec',
              () =>
                CoactivaApi.registrarResolucion(e.id, {
                  numeroRec: Number(numeroRec),
                  tipo,
                  formaMedidaCautelar: tipo === 'MEDIDA_CAUTELAR' ? forma : undefined,
                  detalle: detalle.trim() || undefined,
                  descripcion: descripcion.trim() || undefined,
                  otraCausal: esOtraCausal || undefined,
                  fechaEmision: fecha,
                  archivos: pdfs,
                }),
              `REC ${numeroRec} registrada. Registra su notificación cuando se entregue.`,
            );
            if (ok) {
              setAbierto(false);
              setDetalle('');
              setDescripcion('');
              setFecha('');
              setPdfs([]);
            }
          }}
        >
          Guardar REC
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

const FilaRec: React.FC<{ expedienteCoactivoId: string; r: ResolucionCoactivaItem; accion: string | null; ejecutar: Ejecutar }> = ({
  expedienteCoactivoId,
  r,
  accion,
  ejecutar,
}) => {
  const [fecha, setFecha] = useState('');
  const [pdfs, setPdfs] = useState<File[]>([]);
  return (
    <div className="bg-[#ffffff] border border-border rounded-[6px] py-[8px] px-[10px]">
      <div className="flex items-center gap-[8px] flex-wrap">
        <Badge variant="info">REC {r.numeroRec}</Badge>
        <strong>{LABEL_TIPO_REC[r.tipo]}</strong>
        {r.formaMedidaCautelar && <Badge variant="danger">{LABEL_FORMA_MEDIDA[r.formaMedidaCautelar]}</Badge>}
        <span className="text-text-muted text-[12px]">
          Emitida el {formatearFecha(r.fechaEmision)} ·{' '}
          {r.fechaNotificacion ? `notificada el ${formatearFecha(r.fechaNotificacion)}` : <span className="text-[#b45309] font-semibold">sin notificar</span>}
        </span>
      </div>
      {r.descripcion && <div className="mt-[4px]">{r.descripcion}</div>}
      {r.detalle && <div className="mt-[4px] text-text-secondary whitespace-pre-wrap">{r.detalle}</div>}
      <div className="flex gap-[6px] flex-wrap mt-[6px]">
        {r.documentos.map((d) => (
          <Button key={d.id} size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={() => abrirDocumentoCoactivo(d.id)}>
            {d.nombreOriginal}
          </Button>
        ))}
      </div>
      <div className={claseFilaTramite}>
        {!r.fechaNotificacion && (
          <>
            <div className="w-[170px]">
              <Input type="date" label="Fecha de notificación" value={fecha} max={hoyLocal()} onChange={(ev) => setFecha(ev.target.value)} />
            </div>
            <Button
              size="sm"
              variant="outline"
              loading={accion === `notif-${r.id}`}
              disabled={!fecha}
              onClick={() => ejecutar(`notif-${r.id}`, () => CoactivaApi.notificarResolucion(expedienteCoactivoId, r.id, fecha), `Notificación de la REC ${r.numeroRec} registrada.`)}
            >
              Registrar notificación
            </Button>
          </>
        )}
        <input type="file" accept="application/pdf,.pdf" multiple onChange={(ev) => setPdfs(Array.from(ev.target.files ?? []))} className={claseInputArchivo} />
        <Button
          size="sm"
          variant="secondary"
          loading={accion === `pdf-${r.id}`}
          disabled={pdfs.length === 0}
          onClick={async () => {
            if (await ejecutar(`pdf-${r.id}`, () => CoactivaApi.adjuntarPdf(expedienteCoactivoId, r.id, pdfs), 'PDF adjuntado.')) setPdfs([]);
          }}
        >
          Adjuntar PDF
        </Button>
      </div>
    </div>
  );
};

// ─── Suspensiones ─────────────────────────────────────────────────────────

const FormSuspension: React.FC<{ expedienteCoactivoId: string; accion: string | null; ejecutar: Ejecutar }> = ({ expedienteCoactivoId, accion, ejecutar }) => {
  const [abierto, setAbierto] = useState(false);
  const [clase, setClase] = useState<ClaseSuspension>('DEFINITIVA');
  const [motivo, setMotivo] = useState<MotivoSuspension>('PAGO');
  const [detalle, setDetalle] = useState('');
  const [fecha, setFecha] = useState('');
  if (!abierto) {
    return (
      <Button size="sm" variant="outline" className="mt-[10px]" onClick={() => setAbierto(true)}>
        + Registrar solicitud de suspensión
      </Button>
    );
  }
  return (
    <div className="mt-[10px] border-t border-t-border pt-[10px]">
      <div className={claseFilaTramite}>
        <div className="w-[160px]">
          <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Clase</label>
          <select
            className={claseSelectTramite}
            value={clase}
            onChange={(ev) => {
              const c = ev.target.value as ClaseSuspension;
              setClase(c);
              setMotivo(MOTIVOS_POR_CLASE[c][0]);
            }}
          >
            {(['DEFINITIVA', 'TEMPORAL'] as ClaseSuspension[]).map((c) => (
              <option key={c} value={c}>
                {LABEL_CLASE_SUSPENSION[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Motivo</label>
          <select className={claseSelectTramite} value={motivo} onChange={(ev) => setMotivo(ev.target.value as MotivoSuspension)}>
            {MOTIVOS_POR_CLASE[clase].map((m) => (
              <option key={m} value={m}>
                {LABEL_MOTIVO_SUSPENSION[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="w-[170px]">
          <Input type="date" label="Fecha de la solicitud" value={fecha} max={hoyLocal()} onChange={(ev) => setFecha(ev.target.value)} />
        </div>
      </div>
      <Textarea
        label={motivo === 'OTRO' ? 'Detalle (obligatorio)' : 'Detalle (opcional)'}
        value={detalle}
        onChange={(ev) => setDetalle(ev.target.value)}
        className="min-h-[60px]!"
      />
      <div className="flex gap-[8px]">
        <Button
          size="sm"
          loading={accion === 'suspension'}
          disabled={!fecha || (motivo === 'OTRO' && !detalle.trim())}
          onClick={async () => {
            const ok = await ejecutar(
              'suspension',
              () => CoactivaApi.registrarSuspension(expedienteCoactivoId, { clase, motivo, detalle: detalle.trim() || undefined, fechaSolicitud: fecha }),
              'Solicitud de suspensión registrada. Resuélvela cuando coactivo se pronuncie.',
            );
            if (ok) {
              setAbierto(false);
              setDetalle('');
              setFecha('');
            }
          }}
        >
          Guardar solicitud
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

const FilaSuspension: React.FC<{ c: CasoCoactivoItem; suspensionId: string; accion: string | null; ejecutar: Ejecutar }> = ({ c, suspensionId, accion, ejecutar }) => {
  const e = c.expedienteCoactivo!;
  const x = e.suspensiones.find((s) => s.id === suspensionId)!;
  const [resultado, setResultado] = useState<'FUNDADA' | 'INFUNDADA'>('FUNDADA');
  const [fecha, setFecha] = useState('');
  const [resolucionId, setResolucionId] = useState('');
  const recsSuspension = e.resoluciones.filter((r) => r.tipo === 'SUSPENSION');
  return (
    <div className="bg-[#ffffff] border border-border rounded-[6px] py-[8px] px-[10px]">
      <div className="flex items-center gap-[8px] flex-wrap">
        <Badge variant="purple">{LABEL_CLASE_SUSPENSION[x.clase]}</Badge>
        <strong>{LABEL_MOTIVO_SUSPENSION[x.motivo]}</strong>
        <span className="text-text-muted text-[12px]">Solicitada el {formatearFecha(x.fechaSolicitud)}</span>
        {x.resultado && (
          <Badge variant={x.resultado === 'FUNDADA' ? 'success' : 'neutral'}>
            {x.resultado === 'FUNDADA' ? 'Fundada' : 'Infundada'} el {formatearFecha(x.fechaResolucion)}
          </Badge>
        )}
        {x.fechaFin && <span className="text-text-muted text-[12px]">· terminó el {formatearFecha(x.fechaFin)}</span>}
      </div>
      {x.detalle && <div className="mt-[4px] text-text-secondary">{x.detalle}</div>}
      {!x.resultado && (
        <div className={claseFilaTramite}>
          <div className="w-[150px]">
            <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Resultado</label>
            <select className={claseSelectTramite} value={resultado} onChange={(ev) => setResultado(ev.target.value as 'FUNDADA' | 'INFUNDADA')}>
              <option value="FUNDADA">Fundada</option>
              <option value="INFUNDADA">Infundada</option>
            </select>
          </div>
          <div className="w-[170px]">
            <Input type="date" label="Fecha" value={fecha} max={hoyLocal()} onChange={(ev) => setFecha(ev.target.value)} />
          </div>
          {recsSuspension.length > 0 && (
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Resolución que la resuelve</label>
              <select className={claseSelectTramite} value={resolucionId} onChange={(ev) => setResolucionId(ev.target.value)}>
                <option value="">— (opcional) —</option>
                {recsSuspension.map((r) => (
                  <option key={r.id} value={r.id}>
                    REC {r.numeroRec} ({formatearFecha(r.fechaEmision)})
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            loading={accion === `resolver-${x.id}`}
            disabled={!fecha}
            onClick={() =>
              ejecutar(
                `resolver-${x.id}`,
                () => CoactivaApi.resolverSuspension(e.id, x.id, { resultado, fechaResolucion: fecha, resolucionCoactivaId: resolucionId || undefined }),
                'Suspensión resuelta.',
              )
            }
          >
            Resolver
          </Button>
        </div>
      )}
      {x.clase === 'TEMPORAL' && x.resultado === 'FUNDADA' && !x.fechaFin && (
        <AccionFecha
          etiqueta="Fin de la suspensión"
          boton="Reanudar cobro"
          cargando={accion === `fin-${x.id}`}
          onEnviar={(f) => ejecutar(`fin-${x.id}`, () => CoactivaApi.finalizarSuspension(e.id, x.id, f), 'Suspensión terminada: se reanuda el cobro.')}
        />
      )}
    </div>
  );
};

// ─── Devolución a PAS ─────────────────────────────────────────────────────

const FormDevolucion: React.FC<{ expedienteCoactivoId: string; accion: string | null; ejecutar: Ejecutar }> = ({ expedienteCoactivoId, accion, ejecutar }) => {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('Mala notificación de la resolución final');
  const [fecha, setFecha] = useState('');
  const [nota, setNota] = useState('');
  if (!abierto) {
    return (
      <Button size="sm" variant="outline" className="mt-[10px]" onClick={() => setAbierto(true)}>
        + Registrar devolución a PAS
      </Button>
    );
  }
  return (
    <div className="mt-[10px] border-t border-t-border pt-[10px]">
      <div className={claseFilaTramite}>
        <div className="flex-1 min-w-[240px]">
          <Input label="Motivo" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} />
        </div>
        <div className="w-[170px]">
          <Input type="date" label="Fecha de devolución" value={fecha} max={hoyLocal()} onChange={(ev) => setFecha(ev.target.value)} />
        </div>
      </div>
      <Textarea label="Nota (opcional)" value={nota} onChange={(ev) => setNota(ev.target.value)} className="min-h-[60px]!" />
      <div className="flex gap-[8px]">
        <Button
          size="sm"
          loading={accion === 'devolucion'}
          disabled={!fecha || !motivo.trim()}
          onClick={async () => {
            const ok = await ejecutar(
              'devolucion',
              () => CoactivaApi.registrarDevolucion(expedienteCoactivoId, { motivo: motivo.trim(), fechaDevolucion: fecha, nota: nota.trim() || undefined }),
              'Devolución a PAS registrada.',
            );
            if (ok) setAbierto(false);
          }}
        >
          Guardar devolución
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

const FilaDevolucion: React.FC<{ c: CasoCoactivoItem; devolucionId: string; accion: string | null; ejecutar: Ejecutar }> = ({ c, devolucionId, accion, ejecutar }) => {
  const e = c.expedienteCoactivo!;
  const d = e.devoluciones.find((x) => x.id === devolucionId)!;
  const abierta = !d.fechaRetornoCoactiva && !d.fechaArchivo;
  return (
    <div className="bg-[#ffffff] border border-border rounded-[6px] py-[8px] px-[10px]">
      <div className="flex items-center gap-[8px] flex-wrap">
        <strong>{d.motivo}</strong>
        <span className="text-text-muted text-[12px]">Devuelto el {formatearFecha(d.fechaDevolucion)}</span>
        {d.fechaRenotificacion && <Badge variant="info">Renotificado el {formatearFecha(d.fechaRenotificacion)}</Badge>}
        {d.fechaRetornoCoactiva && <Badge variant="success">Retornó a coactiva el {formatearFecha(d.fechaRetornoCoactiva)}</Badge>}
        {d.fechaArchivo && <Badge variant="midnight">Archivado por prescripción el {formatearFecha(d.fechaArchivo)}</Badge>}
      </div>
      {d.nota && <div className="mt-[4px] text-text-secondary">{d.nota}</div>}
      {abierta && (
        <div className="flex flex-col gap-[4px]">
          {!d.fechaRenotificacion ? (
            <AccionFecha
              etiqueta="Fecha de la nueva notificación de la resolución final"
              boton="Registrar renotificación"
              cargando={accion === `renot-${d.id}`}
              onEnviar={(f) => ejecutar(`renot-${d.id}`, () => CoactivaApi.renotificar(e.id, d.id, f), 'Renotificación registrada.')}
            />
          ) : (
            <AccionFecha
              etiqueta="Fecha de retorno a coactiva"
              boton="Retornar a coactiva"
              cargando={accion === `ret-${d.id}`}
              onEnviar={(f) => ejecutar(`ret-${d.id}`, () => CoactivaApi.retornar(e.id, d.id, f), 'El expediente retornó a coactiva.')}
            />
          )}
          <AccionFechaNota
            etiqueta="Archivar por prescripción — fecha"
            nota="Sustento (plazo de prescripción vencido)"
            boton="Archivar"
            variante="danger"
            cargando={accion === `arch-${d.id}`}
            onEnviar={(f, n) => ejecutar(`arch-${d.id}`, () => CoactivaApi.archivarPrescrito(e.id, d.id, f, n), 'Expediente archivado por prescripción.')}
          />
        </div>
      )}
    </div>
  );
};

// ─── Controles genéricos ──────────────────────────────────────────────────

const AccionFecha: React.FC<{ etiqueta: string; boton: string; cargando: boolean; onEnviar: (fecha: string) => Promise<boolean> }> = ({
  etiqueta,
  boton,
  cargando,
  onEnviar,
}) => {
  const [fecha, setFecha] = useState('');
  return (
    <div className={claseFilaTramite}>
      <div className="w-[260px]">
        <Input type="date" label={etiqueta} value={fecha} max={hoyLocal()} onChange={(ev) => setFecha(ev.target.value)} />
      </div>
      <Button size="sm" variant="outline" loading={cargando} disabled={!fecha} onClick={async () => (await onEnviar(fecha)) && setFecha('')}>
        {boton}
      </Button>
    </div>
  );
};

const AccionFechaNota: React.FC<{
  etiqueta: string;
  nota: string;
  boton: string;
  cargando: boolean;
  variante?: 'outline' | 'danger';
  onEnviar: (fecha: string, nota?: string) => Promise<boolean>;
}> = ({ etiqueta, nota, boton, cargando, variante = 'outline', onEnviar }) => {
  const [fecha, setFecha] = useState('');
  const [texto, setTexto] = useState('');
  return (
    <div className={claseFilaTramite}>
      <div className="w-[230px]">
        <Input type="date" label={etiqueta} value={fecha} max={hoyLocal()} onChange={(ev) => setFecha(ev.target.value)} />
      </div>
      <div className="flex-1 min-w-[200px]">
        <Input label={nota} value={texto} onChange={(ev) => setTexto(ev.target.value)} />
      </div>
      <Button size="sm" variant={variante} loading={cargando} disabled={!fecha} onClick={() => onEnviar(fecha, texto.trim() || undefined)}>
        {boton}
      </Button>
    </div>
  );
};
