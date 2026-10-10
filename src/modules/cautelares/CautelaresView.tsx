import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ConsultasApi, IntervencionSelectorItem, descargarDocumentoMedidaCautelar } from '../../api';
import { ContenidoMedidaCautelar, MedidaCautelarItem, MedidasCautelaresApi } from '../../api/medidasCautelares';
import { Alert, Badge, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { PasoTramite, claseSelectTramite } from '../../components/common/PasoTramite';
import { FileTextIcon, PlusIcon } from '../../components/icons/Icons';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { cn } from '../../lib/cn';

/**
 * Medidas cautelares (ES2): resolución de URGENCIA de la Subgerencia que
 * ordena una medida (paralización, retiro, demolición…) ante un caso grave.
 * No es la medida provisional que el fiscalizador ejecuta en campo con acta:
 * esta se redacta en oficina, la firma el Subgerente y luego se ejecuta.
 * Cuelga de la intervención (puede ir antes de la NC); se anexa al
 * expediente cuando este existe.
 */

type Pestana = 'EMITIDA' | 'EJECUTADA' | 'ANEXADA' | 'TODAS';

const PESTANAS: Array<{ clave: Pestana; etiqueta: string }> = [
  { clave: 'EMITIDA', etiqueta: 'Por ejecutar' },
  { clave: 'EJECUTADA', etiqueta: 'Por anexar' },
  { clave: 'ANEXADA', etiqueta: 'Anexadas' },
  { clave: 'TODAS', etiqueta: 'Todas' },
];

const ESTADO: Record<MedidaCautelarItem['estado'], { texto: string; variante: 'warning' | 'info' | 'success' }> = {
  EMITIDA: { texto: 'Por ejecutar', variante: 'warning' },
  EJECUTADA: { texto: 'Ejecutada · por anexar', variante: 'info' },
  ANEXADA: { texto: 'Anexada al expediente', variante: 'success' },
};

const ACTUACION: Record<string, string> = { EXHORTACION: 'Exhortación', CONSTATACION: 'Constatación', INICIA_PAS: 'Inicia PAS' };

// Sugerencias (se puede escribir otra): las del RASA / CUIS más usadas en estas resoluciones.
const TIPOS_MEDIDA = ['PARALIZACIÓN DE OBRA', 'RETIRO', 'DEMOLICIÓN', 'CLAUSURA', 'DECOMISO', 'RETENCIÓN', 'TAPIADO'];
const MODALIDADES = ['RETIRO DE MATERIALES DE LA VÍA PÚBLICA', 'DEMOLICIÓN DE CONSTRUCCIÓN EN VÍA PÚBLICA', 'PARALIZACIÓN DE LABORES', 'CLAUSURA TEMPORAL'];

const VACIO: ContenidoMedidaCautelar = {
  situacionGravedad: '',
  relatoHechos: '',
  vistoAntecedentes: '',
  tipoMedidaCautelar: '',
  modalidadEjecucion: '',
  direccionNotificacion: '',
  inicialesFirma: '',
  incluyeAdvertenciaUsurpacion: false,
  incluyeResguardoSerenazgo: false,
};

export const CautelaresView: React.FC = () => {
  const [medidas, setMedidas] = useState<MedidaCautelarItem[] | null>(null);
  const [pestana, setPestana] = useState<Pestana>('EMITIDA');
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<{ medida: MedidaCautelarItem | null } | null>(null);

  const cargar = useCallback(() => {
    MedidasCautelaresApi.listar()
      .then(setMedidas)
      .catch((err) => {
        setMedidas([]);
        setMensaje({ type: 'error', text: err.message || 'No se pudo cargar las medidas cautelares.' });
      });
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const conteo = useMemo(() => {
    const c: Record<Pestana, number> = { EMITIDA: 0, EJECUTADA: 0, ANEXADA: 0, TODAS: medidas?.length ?? 0 };
    medidas?.forEach((m) => c[m.estado]++);
    return c;
  }, [medidas]);

  const visibles = (medidas ?? []).filter((m) => pestana === 'TODAS' || m.estado === pestana);
  const detalle = medidas?.find((m) => m.id === detalleId) ?? null;

  return (
    <div>
      <div className="flex items-start gap-[12px] flex-wrap mb-[16px]">
        <div className="mr-auto">
          <h2 className="text-[18px] font-extrabold text-midnight-900">Medidas cautelares</h2>
          <p className="text-[13px] text-text-muted mt-[2px]">Resoluciones de urgencia del Subgerente para casos graves.</p>
        </div>
        <Button icon={<PlusIcon size={16} />} onClick={() => setFormulario({ medida: null })}>
          Nueva medida cautelar
        </Button>
      </div>

      {mensaje && <Alert type={mensaje.type}>{mensaje.text}</Alert>}

      {/* Qué es y cuándo se usa (plegable): el módulo es excepcional y poco frecuente. */}
      <details className="group mb-[16px] text-[13px]">
        <summary className="cursor-pointer select-none text-primary-600 font-semibold w-fit list-none">
          <span className="group-open:hidden">¿Qué es y cuándo se usa?</span>
          <span className="hidden group-open:inline">Ocultar explicación</span>
        </summary>
        <dl className="mt-[10px] max-w-[760px] grid grid-cols-[150px_1fr] gap-x-[16px] gap-y-[8px] text-text-secondary">
          <dt className="font-semibold text-text-main">Para qué</dt>
          <dd>
            Para casos graves donde no se puede esperar al final del PAS: ocupación de vía pública o de zonas de riesgo, construcciones que ponen
            en peligro a la gente. La Subgerencia ordena por resolución paralizar, retirar o demoler de inmediato.
          </dd>
          <dt className="font-semibold text-text-main">Cómo se llega</dt>
          <dd>
            Desde una intervención ya registrada (acta de campo) y, por lo general, con informes de otras áreas (Gestión de Riesgo de Desastres,
            Planeamiento Urbano). No hace falta que exista la NC ni el expediente.
          </dd>
          <dt className="font-semibold text-text-main">Quién la hace</dt>
          <dd>El abogado de la Subgerencia redacta la resolución aquí (sale en Word con el modelo real) y la firma el Subgerente.</dd>
          <dt className="font-semibold text-text-main">Después</dt>
          <dd>
            Se ejecuta en un operativo (fiscalización, con resguardo de Serenazgo si se marca), se registra la fecha y, cuando la intervención tenga
            expediente, se anexa para que se vea en el PAS.
          </dd>
          <dt className="font-semibold text-text-main">No confundir con</dt>
          <dd>La medida provisional: esa la impone el fiscalizador en el momento, con el acta de campo, y no pasa por este módulo.</dd>
        </dl>
      </details>

      <section className="rounded-[10px] border border-border bg-bg-card overflow-hidden">
        <div className="flex gap-[2px] px-[10px] pt-[8px] border-b border-border">
          {PESTANAS.map((p) => (
            <button
              key={p.clave}
              type="button"
              onClick={() => setPestana(p.clave)}
              className={cn(
                'py-[8px] px-[12px] text-[13px] font-semibold border-b-[2px] -mb-px cursor-pointer',
                pestana === p.clave ? 'border-primary-600 text-text-main' : 'border-transparent text-text-muted hover:text-text-secondary',
              )}
            >
              {p.etiqueta}
              <span className="ml-[6px] text-[11px] text-text-light tabular-nums">{conteo[p.clave]}</span>
            </button>
          ))}
        </div>

        {!medidas ? (
          <div className="py-[32px] text-center">
            <Spinner size={20} />
          </div>
        ) : visibles.length === 0 ? (
          <div className="py-[32px] text-center text-[13px] text-text-muted">
            {medidas.length === 0 ? 'Todavía no hay medidas cautelares. Usa "Nueva medida cautelar" cuando un caso grave lo requiera.' : 'No hay medidas en esta etapa.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px] text-text-secondary">
              <thead className="bg-bg-subtle">
                <tr className="text-left text-[11px] text-text-muted">
                  <th className="py-[9px] px-[14px] font-semibold">Administrado</th>
                  <th className="py-[9px] px-[14px] font-semibold">Medida</th>
                  <th className="py-[9px] px-[14px] font-semibold">Intervención</th>
                  <th className="py-[9px] px-[14px] font-semibold">Expediente</th>
                  <th className="py-[9px] px-[14px] font-semibold">Emitida</th>
                  <th className="py-[9px] px-[14px] font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((m) => (
                  <tr key={m.id} onClick={() => setDetalleId(m.id)} className="border-t border-border-subtle hover:bg-bg-hover cursor-pointer">
                    <td className="py-[10px] px-[14px]">
                      <div className="font-semibold text-text-main">{m.administrado?.nombre ?? 'Sin identificar'}</div>
                      {m.administrado?.documento && <div className="text-text-muted tabular-nums">{m.administrado.documento}</div>}
                    </td>
                    <td className="py-[10px] px-[14px] max-w-[260px]">
                      <div className="text-text-main truncate">{m.tipoMedidaCautelar || '—'}</div>
                      {m.modalidadEjecucion && <div className="text-text-muted truncate">{m.modalidadEjecucion}</div>}
                    </td>
                    <td className="py-[10px] px-[14px] whitespace-nowrap">
                      {formatearFecha(m.fechaIntervencion)}
                      {m.tipoActuacion && <div className="text-text-muted">{ACTUACION[m.tipoActuacion] ?? m.tipoActuacion}</div>}
                    </td>
                    <td className="py-[10px] px-[14px] whitespace-nowrap">{m.numeroExpediente ?? <span className="text-text-light">Sin expediente aún</span>}</td>
                    <td className="py-[10px] px-[14px] whitespace-nowrap">{formatearFecha(m.createdAt)}</td>
                    <td className="py-[10px] px-[14px] whitespace-nowrap">
                      <Badge variant={ESTADO[m.estado].variante}>{ESTADO[m.estado].texto}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detalle && (
        <DetalleMedida
          medida={detalle}
          onClose={() => setDetalleId(null)}
          onEditar={() => setFormulario({ medida: detalle })}
          onCambio={(texto) => {
            setMensaje({ type: 'success', text: texto });
            cargar();
          }}
        />
      )}

      {formulario && (
        <FormularioMedida
          medida={formulario.medida}
          onClose={() => setFormulario(null)}
          onGuardado={(id, texto) => {
            setFormulario(null);
            setMensaje({ type: 'success', text: texto });
            setDetalleId(id);
            cargar();
          }}
        />
      )}
    </div>
  );
};

// ─── Detalle: los 3 pasos de la medida ───

const Dato: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="min-w-0">
    <div className="text-[11px] text-text-muted">{etiqueta}</div>
    <div className="text-[13px] text-text-main">{children || '—'}</div>
  </div>
);

const DetalleMedida: React.FC<{ medida: MedidaCautelarItem; onClose: () => void; onEditar: () => void; onCambio: (texto: string) => void }> = ({
  medida: m,
  onClose,
  onEditar,
  onCambio,
}) => {
  const [fechaEjecucion, setFechaEjecucion] = useState(hoyLocal());
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accion = async (clave: string, fn: () => Promise<unknown>, exito: string) => {
    setEnCurso(clave);
    setError(null);
    try {
      await fn();
      onCambio(exito);
    } catch (err: any) {
      setError(err.message || 'No se pudo completar la acción.');
    } finally {
      setEnCurso(null);
    }
  };

  return (
    <Modal isOpen onClose={onClose} maxWidth="760px" title={`Medida cautelar · ${m.administrado?.nombre ?? 'administrado sin identificar'}`}>
      <div className="flex items-center gap-[8px] flex-wrap mb-[14px]">
        <Badge variant={ESTADO[m.estado].variante}>{ESTADO[m.estado].texto}</Badge>
        <span className="text-[12px] text-text-muted">
          Emitida el {formatearFecha(m.createdAt)} por {m.emitidoPor}
        </span>
      </div>
      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] mb-[16px]">
        <Dato etiqueta="Administrado">
          {m.administrado?.nombre}
          {m.administrado?.documento ? ` · ${m.administrado.documento}` : ''}
        </Dato>
        <Dato etiqueta="Intervención">
          {formatearFecha(m.fechaIntervencion)}
          {m.tipoActuacion ? ` · ${ACTUACION[m.tipoActuacion] ?? m.tipoActuacion}` : ''}
        </Dato>
        <Dato etiqueta="Expediente">{m.numeroExpediente ?? 'Sin expediente aún'}</Dato>
      </div>

      <PasoTramite n={1} titulo="Resolución cautelar" hecho>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px] mb-[10px]">
          <Dato etiqueta="Medida">{m.tipoMedidaCautelar}</Dato>
          <Dato etiqueta="Modalidad">{m.modalidadEjecucion}</Dato>
          <Dato etiqueta="Notificar en">{m.direccionNotificacion}</Dato>
          <Dato etiqueta="Párrafos opcionales">
            {[m.incluyeResguardoSerenazgo && 'Resguardo de Serenazgo', m.incluyeAdvertenciaUsurpacion && 'Advertencia por usurpación'].filter(Boolean).join(' · ') ||
              'Ninguno'}
          </Dato>
        </div>
        <Dato etiqueta="Situación de gravedad">{m.situacionGravedad}</Dato>
        {m.relatoHechos && (
          <div className="mt-[10px]">
            <div className="text-[11px] text-text-muted">Relato de los hechos (considerando)</div>
            <div className="text-[12px] text-text-secondary whitespace-pre-wrap max-h-[140px] overflow-y-auto mt-[2px]">{m.relatoHechos}</div>
          </div>
        )}
        <div className="flex gap-[8px] flex-wrap mt-[12px]">
          <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={() => descargarDocumentoMedidaCautelar(m.id)}>
            Descargar Word
          </Button>
          {m.estado === 'EMITIDA' && (
            <Button size="sm" variant="ghost" onClick={onEditar}>
              Editar contenido
            </Button>
          )}
        </div>
      </PasoTramite>

      <PasoTramite n={2} titulo="Ejecución (operativo)" hecho={m.estado !== 'EMITIDA'}>
        {m.estado === 'EMITIDA' ? (
          <div className="flex items-end gap-[10px] flex-wrap">
            <div className="w-[180px]">
              <Input label="Fecha de ejecución" type="date" value={fechaEjecucion} max={hoyLocal()} onChange={(e) => setFechaEjecucion(e.target.value)} />
            </div>
            <Button
              size="sm"
              className="mb-[14px]!"
              loading={enCurso === 'ejecucion'}
              onClick={() => accion('ejecucion', () => MedidasCautelaresApi.registrarEjecucion(m.id, fechaEjecucion), 'Ejecución registrada.')}
            >
              Registrar ejecución
            </Button>
          </div>
        ) : (
          <span>Ejecutada el {formatearFecha(m.fechaEjecucion)}.</span>
        )}
      </PasoTramite>

      <PasoTramite n={3} titulo="Anexar al expediente" hecho={m.estado === 'ANEXADA'}>
        {m.estado === 'ANEXADA' ? (
          <span>
            Anexada al expediente {m.numeroExpediente} el {formatearFecha(m.fechaAnexion)}.
          </span>
        ) : m.estado === 'EMITIDA' ? (
          <span className="text-text-muted">Primero se registra la ejecución.</span>
        ) : !m.numeroExpediente ? (
          <span className="text-text-muted">
            La intervención todavía no tiene expediente (aún no se aprobó en Validación). Se podrá anexar cuando exista.
          </span>
        ) : (
          <Button
            size="sm"
            loading={enCurso === 'anexar'}
            onClick={() => accion('anexar', () => MedidasCautelaresApi.anexar(m.id), `Medida anexada al expediente ${m.numeroExpediente}.`)}
          >
            Anexar al expediente {m.numeroExpediente}
          </Button>
        )}
      </PasoTramite>
    </Modal>
  );
};

// ─── Alta / edición ───

const Seccion: React.FC<{ titulo: string; ayuda?: string; children: React.ReactNode }> = ({ titulo, ayuda, children }) => (
  <fieldset className="border-t border-border-subtle pt-[12px] mt-[4px]">
    <legend className="text-[12px] font-bold text-text-main pr-[8px]">{titulo}</legend>
    {ayuda && <p className="text-[11px] text-text-muted -mt-[2px] mb-[8px]">{ayuda}</p>}
    {children}
  </fieldset>
);

const FormularioMedida: React.FC<{ medida: MedidaCautelarItem | null; onClose: () => void; onGuardado: (id: string, texto: string) => void }> = ({
  medida,
  onClose,
  onGuardado,
}) => {
  const [intervenciones, setIntervenciones] = useState<IntervencionSelectorItem[] | null>(medida ? [] : null);
  const [intervencionId, setIntervencionId] = useState(medida?.intervencionId ?? '');
  const [d, setD] = useState<ContenidoMedidaCautelar>(
    medida
      ? {
          situacionGravedad: medida.situacionGravedad,
          relatoHechos: medida.relatoHechos ?? '',
          vistoAntecedentes: medida.vistoAntecedentes ?? '',
          tipoMedidaCautelar: medida.tipoMedidaCautelar ?? '',
          modalidadEjecucion: medida.modalidadEjecucion ?? '',
          direccionNotificacion: medida.direccionNotificacion ?? '',
          inicialesFirma: medida.inicialesFirma ?? '',
          incluyeAdvertenciaUsurpacion: medida.incluyeAdvertenciaUsurpacion,
          incluyeResguardoSerenazgo: medida.incluyeResguardoSerenazgo,
        }
      : VACIO,
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (medida) return;
    ConsultasApi.getIntervencionesSelector()
      .then((x) => setIntervenciones(Array.isArray(x) ? x : []))
      .catch(() => setIntervenciones([]));
  }, [medida]);

  const set = <K extends keyof ContenidoMedidaCautelar>(k: K, v: ContenidoMedidaCautelar[K]) => setD((x) => ({ ...x, [k]: v }));

  const guardar = async () => {
    if (!intervencionId) return setError('Elige la intervención.');
    if (!d.situacionGravedad.trim()) return setError('Describe la situación de gravedad que justifica la urgencia.');
    if (!d.tipoMedidaCautelar?.trim()) return setError('Indica qué medida se dispone.');
    setGuardando(true);
    setError(null);
    const limpio: ContenidoMedidaCautelar = Object.fromEntries(
      Object.entries(d).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || undefined : v]),
    ) as unknown as ContenidoMedidaCautelar;
    try {
      if (medida) {
        await MedidasCautelaresApi.actualizar(medida.id, limpio);
        onGuardado(medida.id, 'Resolución cautelar actualizada.');
      } else {
        const r = await MedidasCautelaresApi.emitir(intervencionId, limpio);
        onGuardado(r.id, 'Medida cautelar registrada. Descarga el Word para la firma del Subgerente.');
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="760px"
      title={medida ? 'Editar resolución cautelar' : 'Nueva medida cautelar'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={guardar}>
            {medida ? 'Guardar cambios' : 'Registrar medida'}
          </Button>
        </>
      }
    >
      {error && <Alert type="error">{error}</Alert>}

      <Seccion titulo="1. Intervención" ayuda="La medida cuelga de la intervención: puede dictarse antes de la NC o durante el PAS.">
        {medida ? (
          <p className="text-[13px] text-text-main mb-[12px]">
            {formatearFecha(medida.fechaIntervencion)} · {medida.administrado?.nombre ?? 'Sin administrado identificado'}
            {medida.numeroExpediente ? ` · Exp. ${medida.numeroExpediente}` : ''}
          </p>
        ) : intervenciones === null ? (
          <Spinner size={16} />
        ) : (
          <select value={intervencionId} onChange={(e) => setIntervencionId(e.target.value)} className={cn(claseSelectTramite, 'mb-[14px]')}>
            <option value="">— Elige la intervención —</option>
            {intervenciones.map((i) => (
              <option key={i.id} value={i.id}>
                {formatearFecha(i.fechaHoraInicio)} · {i.administradoNombre ?? 'Sin administrado identificado'}
                {i.numeroExpediente ? ` · Exp. ${i.numeroExpediente}` : ''} · {ACTUACION[i.tipoActuacion] ?? i.tipoActuacion}
              </option>
            ))}
          </select>
        )}
      </Seccion>

      <Seccion titulo="2. Por qué es urgente" ayuda="Evaluación de la gravedad (riesgo a la vida, seguridad pública, ocupación de vía pública…). Queda en el registro.">
        <Textarea value={d.situacionGravedad} onChange={(e) => set('situacionGravedad', e.target.value)} rows={2} placeholder="Ej. Construcción sobre la vereda que obstruye el paso peatonal y vehicular…" />
      </Seccion>

      <Seccion titulo="3. Qué se dispone" ayuda="Sale en el ARTÍCULO PRIMERO: «DISPONER la MEDIDA CAUTELAR de [medida] en la modalidad de [modalidad]».">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[14px]">
          <Input label="Medida *" list="mc-tipos" value={d.tipoMedidaCautelar} onChange={(e) => set('tipoMedidaCautelar', e.target.value)} placeholder="Ej. RETIRO" />
          <Input label="Modalidad" list="mc-modalidades" value={d.modalidadEjecucion} onChange={(e) => set('modalidadEjecucion', e.target.value)} />
        </div>
        <datalist id="mc-tipos">
          {TIPOS_MEDIDA.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <datalist id="mc-modalidades">
          {MODALIDADES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Seccion>

      <Seccion titulo="4. Texto de la resolución" ayuda="Lo que varía en el Word; los párrafos legales fijos ya están en la plantilla.">
        <Textarea
          label="VISTO (antecedentes)"
          value={d.vistoAntecedentes}
          onChange={(e) => set('vistoAntecedentes', e.target.value)}
          rows={2}
          placeholder="Ej. El Informe N° …-2026-MDSJL/GOP-SFSA y el Acta de Fiscalización N° …, "
        />
        <Textarea
          label="Hechos del caso (CONSIDERANDO)"
          value={d.relatoHechos}
          onChange={(e) => set('relatoHechos', e.target.value)}
          rows={6}
          placeholder="Que, dentro de ese contexto, con fecha … el personal de fiscalización constató …"
        />
      </Seccion>

      <Seccion titulo="5. Notificación y párrafos opcionales">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-x-[14px]">
          <Input
            label="Dirección de notificación"
            value={d.direccionNotificacion}
            onChange={(e) => set('direccionNotificacion', e.target.value)}
            helperText={!medida ? undefined : medida.administrado?.domicilio ? `Domicilio del administrado: ${medida.administrado.domicilio}` : undefined}
          />
          <Input label="Iniciales de quien redacta" value={d.inicialesFirma} onChange={(e) => set('inicialesFirma', e.target.value)} placeholder="Ej. JLVN/jmy" />
        </div>
        <div className="flex flex-col gap-[8px] text-[13px] text-text-secondary">
          <label className="flex items-start gap-[8px] cursor-pointer">
            <input type="checkbox" className="mt-[3px]" checked={!!d.incluyeResguardoSerenazgo} onChange={(e) => set('incluyeResguardoSerenazgo', e.target.checked)} />
            <span>
              <strong className="text-text-main">Resguardo de Serenazgo</strong> — artículo que encarga a Serenazgo el resguardo durante la ejecución.
            </span>
          </label>
          <label className="flex items-start gap-[8px] cursor-pointer">
            <input type="checkbox" className="mt-[3px]" checked={!!d.incluyeAdvertenciaUsurpacion} onChange={(e) => set('incluyeAdvertenciaUsurpacion', e.target.checked)} />
            <span>
              <strong className="text-text-main">Advertencia por usurpación</strong> — párrafo de la consecuencia penal por ocupar un bien de dominio público.
            </span>
          </label>
        </div>
      </Seccion>
    </Modal>
  );
};
