import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AuthApi,
  IfiApi,
  IfiDocumentoAdjuntoItem,
  IntervencionesApi,
  ResolucionDetalle,
  ResolucionesApi,
  TipoInfraccion,
  TipoResolucion,
  abrirDocumento,
  abrirDocumentoIfi,
  descargarDocumentoAmpliacion,
  descargarDocumentoIfi,
  descargarDocumentoResolucion,
  descargarDocumentoWord,
} from '../../api';
import { Alert, Badge, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { useConfirm } from '../../context/ConfirmContext';
import { CheckIcon, EyeIcon, FileTextIcon, PenToolIcon, ZapIcon } from '../../components/icons/Icons';
import {
  EXPLICACION_TIPO,
  LABEL_FOTO_ACTA,
  NOMBRE_TIPO,
  fechaCorta,
  hoyLocal,
  labelEtapa,
  soloFechaIso,
  textoCaducidad,
  varianteEtapa,
} from './resolucionUi';

/** Mismo modelo de pasos que IfiView (StepDef/stepper), más un estado para los pasos opcionales. */
type PasoEstado = 'completado' | 'actual' | 'pendiente' | 'opcional';

interface StepDef {
  clave: string;
  titulo: string;
  estado: PasoEstado;
  descripcion: React.ReactNode;
  /** Formulario o contenido en línea del paso (sin abrir otro modal encima). */
  contenido?: React.ReactNode;
}

interface Props {
  expedienteId: string;
  numeroExpediente: string;
  onClose: () => void;
  /** Avisa a la bandeja que algo cambió (para refrescar las pestañas). */
  onCambio: () => void;
}

interface UsuarioOpcion {
  id: string;
  dni: string;
  nombres: string;
}

const estiloBloque = 'bg-[#f8fafc] py-[12px] px-[14px] rounded-[8px] border border-border text-[13px]';

const estiloTituloSeccion = 'text-[13px] font-extrabold text-midnight-900 mb-[10px] uppercase tracking-[0.4px]';

const estiloTextoLargo = 'whitespace-pre-wrap bg-[#ffffff] border border-border rounded-[6px] py-[10px] px-[12px] text-[12px] leading-[1.5] max-h-[260px] overflow-y-auto';

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="text-text-muted">{children}</span>;

const Hecho: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-[4px] text-[#047857] font-semibold">
    <CheckIcon size={12} /> {children}
  </span>
);

function parsearAntecedentes(json: string | null | undefined): { heredadoDelIfi: any | null } | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function montoTexto(n: number | null): string {
  return n === null ? '—' : `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** '' → null; número válido ≥ 0 → número; otro → undefined (inválido). */
function parsearMonto(valor: string): number | null | undefined {
  const t = valor.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Decisión del abogado (paso 1). EN_PARTE = RSGSA sin medida complementaria. */
type Decision = 'SANCIONAR' | 'EN_PARTE' | 'ARCHIVAR';

const TIPO_DE_DECISION: Record<Decision, TipoResolucion> = { SANCIONAR: 'RSGSA', EN_PARTE: 'RSGSA', ARCHIVAR: 'RSG' };

const LABEL_DECISION: Record<Decision, string> = {
  SANCIONAR: 'Sancionar (RSGSA)',
  EN_PARTE: 'Sancionar en parte (RSGSA: se mantiene la multa, sin medida complementaria)',
  ARCHIVAR: 'Archivar a favor del administrado (RSG)',
};

function decisionDe(r: { tipo: TipoResolucion; enParte: boolean }): Decision {
  return r.tipo === 'RSG' ? 'ARCHIVAR' : r.enParte ? 'EN_PARTE' : 'SANCIONAR';
}

function decisionSugerida(d: ResolucionDetalle): Decision | '' {
  if (d.ifi?.archivoPorVicio || d.tipoCorrespondiente === 'RSG') return 'ARCHIVAR';
  return d.tipoCorrespondiente === 'RSGSA' ? 'SANCIONAR' : '';
}

/** Art. 43 Ordenanza 464 — solo para la vista previa; el monto guardado lo calcula el backend. */
const PCT_DESCUENTO: Record<TipoInfraccion, number> = { LEVE: 50, GRAVE: 40, MUY_GRAVE: 30 };
const LABEL_INFRACCION: Record<TipoInfraccion, string> = { LEVE: 'Leve', GRAVE: 'Grave', MUY_GRAVE: 'Muy grave' };

export const ResolucionPanel: React.FC<Props> = ({ expedienteId, numeroExpediente, onClose, onCambio }) => {
  const confirm = useConfirm();
  const [detalle, setDetalle] = useState<ResolucionDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);

  // Documentos del expediente
  const [fotos, setFotos] = useState<{ id: string; actaTipo: string | null }[]>([]);
  const [docsIfi, setDocsIfi] = useState<IfiDocumentoAdjuntoItem[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);
  const [verDescargo, setVerDescargo] = useState(false);
  const [verTextoResolucion, setVerTextoResolucion] = useState(false);
  const [verAntecedentes, setVerAntecedentes] = useState(false);

  // Formularios (se cargan con lo guardado)
  const [analisis, setAnalisis] = useState('');
  const [montoSin, setMontoSin] = useState('');
  const [medida, setMedida] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [retiroConfirmado, setRetiroConfirmado] = useState(false);
  // Fechas: hechos reales que ingresa el abogado — nacen vacías, nunca "hoy" por defecto.
  const [fechaEnvio, setFechaEnvio] = useState('');
  const [fechaFirma, setFechaFirma] = useState('');
  const [numeroResolucion, setNumeroResolucion] = useState('');
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [decisionSel, setDecisionSel] = useState<Decision | ''>('');
  const [motivoDiscrepancia, setMotivoDiscrepancia] = useState('');
  const [tipoInfraccion, setTipoInfraccion] = useState<TipoInfraccion | ''>('');
  const [porcentajeUit, setPorcentajeUit] = useState('');
  const [descargoPostTexto, setDescargoPostTexto] = useState('');
  const [descargoPostFecha, setDescargoPostFecha] = useState('');
  // RSG de ampliación: fechas reales, nacen vacías.
  const [ampFechaEnvio, setAmpFechaEnvio] = useState('');
  const [ampFechaFirma, setAmpFechaFirma] = useState('');
  const [ampNumero, setAmpNumero] = useState('');
  const [ampFechaNotificacion, setAmpFechaNotificacion] = useState('');
  /** Pasos completados que el abogado abrió con "Editar" (el resto se muestra en solo lectura). */
  const [editando, setEditando] = useState<Set<string>>(new Set());
  const abrirEdicion = (clave: string) => setEditando((prev) => new Set(prev).add(clave));
  const cerrarEdicion = (clave: string) =>
    setEditando((prev) => {
      const n = new Set(prev);
      n.delete(clave);
      return n;
    });

  const sincronizarFormularios = (d: ResolucionDetalle) => {
    const r = d.resolucion;
    setAnalisis(r?.analisisTexto ?? '');
    setMontoSin(r?.montoSinDescuento != null ? String(r.montoSinDescuento) : '');
    setTipoInfraccion(r?.tipoInfraccion ?? '');
    setPorcentajeUit(r?.porcentajeUit != null ? String(r.porcentajeUit) : '');
    setDecisionSel(r ? decisionDe(r) : decisionSugerida(d));
    setMotivoDiscrepancia(r?.motivoDiscrepanciaIfi ?? '');
    setDescargoPostTexto(r?.descargoPosteriorTexto ?? '');
    setDescargoPostFecha(soloFechaIso(r?.descargoPosteriorFecha) ?? '');
    setMedida(r?.medidaComplementaria ?? '');
    setResponsableId(r?.tareaRetiroEstadoCuenta.responsableId ?? '');
    setRetiroConfirmado(!!r?.tareaRetiroEstadoCuenta.confirmada);
  };

  /**
   * Recarga el detalle. Los formularios solo se re-sincronizan cuando se
   * pide (carga inicial, iniciar/corregir tipo): así guardar un paso no
   * borra lo que se está escribiendo en otro.
   */
  const recargar = useCallback(
    async (resincronizar: boolean) => {
      try {
        const d = await ResolucionesApi.getDetalle(expedienteId);
        setDetalle(d);
        setErrorCarga(null);
        if (resincronizar) sincronizarFormularios(d);
        return d;
      } catch (err: any) {
        setErrorCarga(err.message || 'No se pudo cargar el expediente.');
        return null;
      }
    },
    [expedienteId],
  );

  /**
   * Cada vez que llega el detalle, los pasos COMPLETADOS que no se están
   * editando toman el valor guardado (así el form de "Editar" arranca lleno y
   * "Cancelar" descarta lo no guardado). Los pasos abiertos no se tocan.
   */
  useEffect(() => {
    const res = detalle?.resolucion;
    if (!res) return;
    if (res.analisisTexto && !editando.has('analisis')) setAnalisis(res.analisisTexto);
    if ((res.montoSinDescuento != null || res.tipoInfraccion || res.porcentajeUit != null) && !editando.has('montos')) {
      setMontoSin(res.montoSinDescuento != null ? String(res.montoSinDescuento) : '');
      setTipoInfraccion(res.tipoInfraccion ?? '');
      setPorcentajeUit(res.porcentajeUit != null ? String(res.porcentajeUit) : '');
    }
    if (!editando.has('decision')) {
      setDecisionSel(decisionDe(res));
      setMotivoDiscrepancia(res.motivoDiscrepanciaIfi ?? '');
    }
    if (res.descargoPosteriorTexto && !editando.has('descargoPost')) {
      setDescargoPostTexto(res.descargoPosteriorTexto);
      setDescargoPostFecha(soloFechaIso(res.descargoPosteriorFecha) ?? '');
    }
    if (res.medidaComplementaria && !editando.has('medida')) setMedida(res.medidaComplementaria);
    if (res.tareaRetiroEstadoCuenta.confirmada && !editando.has('retiro')) {
      setResponsableId(res.tareaRetiroEstadoCuenta.responsableId ?? '');
      setRetiroConfirmado(true);
    }
  }, [detalle, editando]);

  useEffect(() => {
    let vigente = true;
    (async () => {
      setCargando(true);
      const d = await recargar(true);
      if (vigente) setCargando(false);
      if (!d || !vigente) return;
      // Documentos y usuarios: no bloquean el panel si fallan.
      IntervencionesApi.getDetalle(d.intervencionId)
        .then((b) => vigente && setFotos(b.fotos ?? []))
        .catch(() => undefined);
      IfiApi.getDocumentos(expedienteId)
        .then((docs) => vigente && setDocsIfi(Array.isArray(docs) ? docs : []))
        .catch(() => undefined);
      AuthApi.getUsuariosPorRol('ADMIN')
        .then((u) => vigente && setUsuarios(Array.isArray(u) ? u : []))
        .catch(() => undefined);
    })();
    return () => {
      vigente = false;
    };
  }, [expedienteId, recargar]);

  const ejecutar = async (clave: string, fn: () => Promise<unknown>, exito: string, resincronizar = false) => {
    setAccionEnCurso(clave);
    setMensaje(null);
    try {
      await fn();
      setMensaje({ type: 'success', text: exito });
      cerrarEdicion(clave);
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo completar la acción.' });
    } finally {
      await recargar(resincronizar);
      setAccionEnCurso(null);
      onCambio();
    }
  };

  const error = (text: string) => setMensaje({ type: 'error', text });

  const r = detalle?.resolucion ?? null;
  const antecedentes = useMemo(() => parsearAntecedentes(r?.seccionAutomatica), [r?.seccionAutomatica]);

  if (cargando || !detalle) {
    return (
      <Modal isOpen onClose={onClose} title={`Expediente ${numeroExpediente} — Resolución`} maxWidth="860px">
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

  const d = detalle;
  const plazos = d.plazos;
  const tipo: TipoResolucion | null = r?.tipo ?? d.tipoCorrespondiente;
  const esRsg = tipo === 'RSG';
  const editable = !!r && r.estado === 'EN_ELABORACION' && !r.fechaEnvioFirma;
  const enFirma = !!r && r.estado === 'EN_ELABORACION' && !!r.fechaEnvioFirma;
  const firmada = r?.estado === 'EMITIDA' || r?.estado === 'NOTIFICADA';
  const ifiNotificado = d.ifi?.estado === 'NOTIFICADO';
  const caducidad = textoCaducidad(plazos.diasParaCaducidad);
  const hoy = hoyLocal();

  /** Botón "Editar" de un paso completado (solo si la resolución sigue editable). */
  const botonEditar = (clave: string) =>
    editable ? (
      <div className="mt-[8px]">
        <Button size="sm" variant="outline" onClick={() => abrirEdicion(clave)}>
          Editar
        </Button>
      </div>
    ) : null;
  const botonCancelar = (clave: string, completado: boolean) =>
    completado && editando.has(clave) ? (
      <Button size="sm" variant="secondary" onClick={() => cerrarEdicion(clave)} className="ml-[8px]!">
        Cancelar
      </Button>
    ) : null;
  /** El form se muestra si el paso no está completado, o si se abrió con "Editar". */
  const conForm = (clave: string, completado: boolean) => editable && (!completado || editando.has(clave));

  const faltantesParaFirma: string[] = [];
  if (r) {
    if (d.tipoNoCoincideConIfi && !r.motivoDiscrepanciaIfi) faltantesParaFirma.push('escribir el motivo de la decisión distinta al IFI');
    if (!r.seccionAutomatica) faltantesParaFirma.push('generar los antecedentes');
    if (!r.analisisTexto) faltantesParaFirma.push(esRsg ? 'redactar el desarrollo de la RSG' : 'redactar el análisis');
    if (esRsg && !r.tareaRetiroEstadoCuenta.confirmada) faltantesParaFirma.push('confirmar el retiro de la multa del estado de cuenta');
  }

  // ------------------------------------------------------------------
  // Acciones
  // ------------------------------------------------------------------
  const guardarDecision = async () => {
    if (!decisionSel) return error('Elige la decisión.');
    const tipoNuevo = TIPO_DE_DECISION[decisionSel];
    const difiere = !!d.tipoCorrespondiente && tipoNuevo !== d.tipoCorrespondiente;
    const motivo = motivoDiscrepancia.trim();
    if (difiere && !motivo) return error('La decisión es distinta a la recomendación del IFI: escribe el motivo (va en el análisis del Word).');
    const datos = { tipo: tipoNuevo, enParte: decisionSel === 'EN_PARTE', ...(difiere ? { motivoDiscrepanciaIfi: motivo } : {}) };
    if (!r) {
      return ejecutar(
        'decision',
        async () => {
          await ResolucionesApi.definirTipo(expedienteId, datos);
          await ResolucionesApi.generarSeccionAutomatica(expedienteId);
        },
        `Resolución ${tipoNuevo} iniciada y antecedentes generados desde el IFI.`,
        true,
      );
    }
    const cambiaTipo = r.tipo !== tipoNuevo;
    if (cambiaTipo || (decisionSel === 'EN_PARTE' && r.medidaComplementaria)) {
      const ok = await confirm({
        title: 'Cambiar la decisión',
        message: cambiaTipo
          ? tipoNuevo === 'RSG'
            ? 'La resolución pasará a RSG (archivo a favor). Se borran la multa y la medida complementaria y se regeneran los antecedentes. El análisis ya redactado se conserva.'
            : 'La resolución pasará a RSGSA (sanción). Se borra el responsable del retiro del estado de cuenta y se regeneran los antecedentes. El análisis ya redactado se conserva.'
          : 'Sancionar en parte no lleva medida complementaria: se borra la que estaba registrada.',
        confirmLabel: 'Cambiar decisión',
      });
      if (!ok) return;
    }
    await ejecutar(
      'decision',
      async () => {
        await ResolucionesApi.definirTipo(expedienteId, datos);
        if (cambiaTipo) await ResolucionesApi.generarSeccionAutomatica(expedienteId);
      },
      'Decisión guardada.',
      true,
    );
  };

  const guardarDescargoPosterior = (quitar = false) => {
    const texto = quitar ? '' : descargoPostTexto.trim();
    if (texto && !descargoPostFecha) return error('Ingresa la fecha real en que se presentó el descargo.');
    if (texto && descargoPostFecha > hoy) return error('La fecha del descargo no puede ser futura.');
    return ejecutar(
      'descargoPost',
      () => ResolucionesApi.registrarDescargoPosterior(expedienteId, texto, texto ? descargoPostFecha : null),
      texto ? 'Descargo posterior registrado: el Word usará la plantilla "con descargo".' : 'Descargo posterior quitado.',
      true,
    );
  };

  const descargarResolucion = () =>
    descargarDocumentoResolucion(expedienteId, d.numeroExpediente).catch((err: any) => error(err.message || 'No se pudo generar la resolución.'));

  const descargarAmpliacion = () =>
    descargarDocumentoAmpliacion(expedienteId, d.numeroExpediente).catch((err: any) => error(err.message || 'No se pudo generar la RSG de ampliación.'));

  const emitirAmpliacion = async () => {
    const ok = await confirm({
      title: 'Emitir RSG de ampliación',
      message: `Se inicia la RSG de ampliación de plazo: 3 meses más contados desde el fin de los 9 meses (${fechaCorta(plazos.fechaCaducidadOriginal)}), nuevo límite ${fechaCorta(plazos.fechaCaducidadConAmpliacion)}. Solo cuenta cuando se registre la firma, y tiene que firmarse antes del ${fechaCorta(plazos.fechaCaducidadOriginal)}.`,
      confirmLabel: 'Emitir',
    });
    if (!ok) return;
    await ejecutar('ampEmitir', () => ResolucionesApi.emitirAmpliacion(expedienteId), 'RSG de ampliación iniciada. Descarga el Word y llévalo a firma.');
  };

  const enviarAmpliacion = () => {
    if (!ampFechaEnvio) return error('Ingresa la fecha real en que se entregó la RSG de ampliación al Subgerente.');
    if (ampFechaEnvio > hoy) return error('La fecha de envío no puede ser futura.');
    return ejecutar('ampEnviar', () => ResolucionesApi.enviarAmpliacionAFirma(expedienteId, ampFechaEnvio), 'Envío a firma de la ampliación registrado.');
  };

  const firmarAmpliacion = async () => {
    if (!ampFechaFirma) return error('Ingresa la fecha real en que firmó el Subgerente la ampliación.');
    if (ampFechaFirma > hoy) return error('La fecha de firma no puede ser futura.');
    const numero = ampNumero.trim();
    const ok = await confirm({
      title: 'Registrar firma de la ampliación',
      message: `Se registrará la firma del ${fechaCorta(ampFechaFirma)}${numero ? ` — Resolución N° ${numero}` : ' (sin N°)'}. Desde ahí el plazo de caducidad pasa al ${fechaCorta(plazos.fechaCaducidadConAmpliacion)}.`,
      confirmLabel: 'Registrar firma',
    });
    if (!ok) return;
    await ejecutar('ampFirmar', () => ResolucionesApi.firmarAmpliacion(expedienteId, ampFechaFirma, numero || undefined), 'Firma de la ampliación registrada.');
  };

  const notificarAmpliacion = () => {
    if (!ampFechaNotificacion) return error('Ingresa la fecha real de notificación de la ampliación.');
    if (ampFechaNotificacion > hoy) return error('La fecha de notificación no puede ser futura.');
    return ejecutar('ampNotificar', () => ResolucionesApi.notificarAmpliacion(expedienteId, ampFechaNotificacion), 'Notificación de la ampliación registrada.');
  };

  const generarAntecedentes = () =>
    ejecutar('antecedentes', () => ResolucionesApi.generarSeccionAutomatica(expedienteId), 'Antecedentes generados desde el IFI.');

  const guardarAnalisis = () => {
    if (!analisis.trim()) return error(esRsg ? 'Redacta el desarrollo de la RSG antes de guardar.' : 'Redacta el análisis antes de guardar.');
    return ejecutar('analisis', () => ResolucionesApi.registrarAnalisis(expedienteId, analisis.trim()), esRsg ? 'Desarrollo guardado.' : 'Análisis guardado.');
  };

  const guardarMontos = () => {
    const sin = parsearMonto(montoSin);
    const pct = parsearMonto(porcentajeUit);
    if (sin === undefined || pct === undefined) return error('El % UIT y la multa tienen que ser números mayores o iguales a 0 (o quedar vacíos).');
    // Se mandan SIEMPRE los tres valores cargados: el endpoint los reemplaza; el descuento lo calcula el backend.
    return ejecutar(
      'montos',
      () => ResolucionesApi.guardarMontos(expedienteId, { tipoInfraccion: tipoInfraccion || null, porcentajeUit: pct, montoSinDescuento: sin }),
      'Monto guardado.',
    );
  };

  const guardarMedida = () =>
    ejecutar(
      'medida',
      () => ResolucionesApi.guardarMedidaComplementaria(expedienteId, medida.trim()),
      medida.trim() ? 'Medida complementaria guardada.' : 'Medida complementaria quitada.',
    );

  const guardarRetiro = () => {
    if (!responsableId) return error('Elige al responsable del retiro de la lista de usuarios.');
    return ejecutar(
      'retiro',
      () => ResolucionesApi.tareaRetiroEstadoCuenta(expedienteId, responsableId, retiroConfirmado),
      retiroConfirmado ? 'Retiro del estado de cuenta confirmado.' : 'Responsable del retiro guardado (falta confirmar el retiro).',
    );
  };

  const enviarAFirma = async () => {
    if (!fechaEnvio) return error('Ingresa la fecha real en que se entregó el documento al Subgerente.');
    if (fechaEnvio > hoy) return error('La fecha de envío no puede ser futura.');
    const ok = await confirm({
      title: 'Enviar a firma',
      message: `Se registrará que el ${fechaCorta(fechaEnvio)} se entregó la resolución al Subgerente para su firma. Desde ahí el contenido queda bloqueado; si pide correcciones, usa "Volver a elaboración".`,
      confirmLabel: 'Registrar envío',
    });
    if (!ok) return;
    await ejecutar('enviar', () => ResolucionesApi.enviarAFirma(expedienteId, fechaEnvio), 'Envío a firma registrado.');
  };

  const retirarDeFirma = async () => {
    const ok = await confirm({
      title: 'Volver a elaboración',
      message:
        'La resolución vuelve a elaboración para corregirla (se borra la fecha de envío a firma). Cuando esté lista, se vuelve a enviar con una fecha nueva.',
      confirmLabel: 'Volver a elaboración',
      variant: 'danger',
    });
    if (!ok) return;
    await ejecutar('retirar', () => ResolucionesApi.retirarDeFirma(expedienteId), 'La resolución volvió a elaboración.');
  };

  const registrarFirma = async () => {
    if (!fechaFirma) return error('Ingresa la fecha real en que firmó el Subgerente.');
    if (fechaFirma > hoy) return error('La fecha de firma no puede ser futura.');
    const envio = soloFechaIso(r?.fechaEnvioFirma);
    if (envio && fechaFirma < envio) return error(`La fecha de firma no puede ser anterior al envío a firma (${fechaCorta(envio)}).`);
    const numero = numeroResolucion.trim();
    const ok = await confirm({
      title: 'Registrar firma',
      message: `Se registrará la firma del Subgerente del ${fechaCorta(fechaFirma)}${numero ? ` — Resolución N° ${numero}` : ' (sin N° de resolución)'}. Después ya no se puede editar la resolución.`,
      confirmLabel: 'Registrar firma',
    });
    if (!ok) return;
    await ejecutar('firmar', () => ResolucionesApi.firmar(expedienteId, fechaFirma, numero || undefined), 'Firma registrada.');
  };

  const notificar = async () => {
    if (!fechaNotificacion) return error('Ingresa la fecha real en que se notificó al administrado.');
    if (fechaNotificacion > hoy) return error('La fecha de notificación no puede ser futura.');
    const emision = soloFechaIso(r?.fechaEmision);
    if (emision && fechaNotificacion < emision) return error(`La fecha de notificación no puede ser anterior a la firma (${fechaCorta(emision)}).`);
    const ok = await confirm({
      title: 'Notificar al administrado',
      message: `Se registrará la notificación del ${fechaCorta(fechaNotificacion)}. Esto detiene el plazo de caducidad y abre el plazo para recursos.`,
      confirmLabel: 'Registrar notificación',
    });
    if (!ok) return;
    await ejecutar('notificar', () => ResolucionesApi.notificar(expedienteId, fechaNotificacion), 'Notificación registrada.');
  };

  const descargarIfi = () =>
    descargarDocumentoIfi(expedienteId, d.numeroExpediente).catch((err: any) => error(err.message || 'No se pudo generar el IFI.'));

  // ------------------------------------------------------------------
  // Pasos
  // ------------------------------------------------------------------
  const pasos: StepDef[] = [];

  // 1. Decisión del abogado (sugerida por el IFI; distinta solo con motivo)
  const opcionesDecision: Decision[] = d.ifi?.archivoPorVicio ? ['ARCHIVAR'] : ['SANCIONAR', 'EN_PARTE', 'ARCHIVAR'];
  const sugerida = decisionSugerida(d);
  const difiereSel = !!decisionSel && !!d.tipoCorrespondiente && TIPO_DE_DECISION[decisionSel] !== d.tipoCorrespondiente;
  const puedeDecidir = ifiNotificado && !!d.tipoCorrespondiente && (!r || editable);
  pasos.push({
    clave: 'decision',
    titulo: 'Decisión',
    estado: r ? 'completado' : puedeDecidir ? 'actual' : 'pendiente',
    descripcion: !ifiNotificado ? (
      <Muted>El IFI todavía no está notificado: la resolución se inicia después.</Muted>
    ) : !d.tipoCorrespondiente ? (
      <Muted>El IFI no tiene recomendación registrada: no se puede sugerir la decisión.</Muted>
    ) : r ? (
      <Hecho>
        {LABEL_DECISION[decisionDe(r)]}
        {r.motivoDiscrepanciaIfi ? ' — distinta al IFI' : ''}
      </Hecho>
    ) : (
      <Muted>
        El IFI recomendó <strong>{d.ifi?.recomendacion === 'ARCHIVAR' ? 'archivar' : 'sancionar'}</strong>: viene preseleccionado. Se
        puede decidir distinto escribiendo el motivo.
        {d.ifi?.archivoPorVicio ? ' El IFI archivó por vicio trascendente: solo cabe archivar (el vicio no se corrige).' : ''}
      </Muted>
    ),
    contenido:
      puedeDecidir && (!r || editando.has('decision')) ? (
        <div className="flex flex-col gap-[8px]">
          {opcionesDecision.map((o) => (
            <label key={o} className="flex items-center gap-[8px] text-[13px]">
              <input type="radio" name="decision-resolucion" checked={decisionSel === o} onChange={() => setDecisionSel(o)} />
              {LABEL_DECISION[o]}
              {sugerida === o && <Badge variant="info">sugerida por el IFI</Badge>}
            </label>
          ))}
          {difiereSel && (
            <Textarea
              label="Motivo para apartarse del IFI (obligatorio, va en el análisis del Word)"
              value={motivoDiscrepancia}
              onChange={(e) => setMotivoDiscrepancia(e.target.value)}
              rows={4}
            />
          )}
          <div>
            <Button size="sm" icon={r ? undefined : <ZapIcon size={14} />} loading={accionEnCurso === 'decision'} onClick={guardarDecision}>
              {r ? 'Guardar decisión' : 'Iniciar resolución'}
            </Button>
            {botonCancelar('decision', !!r)}
          </div>
        </div>
      ) : r ? (
        <div>
          {r.motivoDiscrepanciaIfi && <div className={estiloBloque}>Motivo para apartarse del IFI: {r.motivoDiscrepanciaIfi}</div>}
          {botonEditar('decision')}
        </div>
      ) : undefined,
  });

  // 2. Antecedentes (sección automática, heredada del IFI)
  if (!r) {
    pasos.push({
      clave: 'antecedentes',
      titulo: 'Antecedentes',
      estado: 'pendiente',
      descripcion: <Muted>Se generan desde el IFI al iniciar la resolución (paso Decisión).</Muted>,
    });
  } else {
    const heredado = antecedentes?.heredadoDelIfi ?? null;
    pasos.push({
      clave: 'antecedentes',
      titulo: 'Antecedentes',
      estado: r.seccionAutomatica ? 'completado' : editable ? 'actual' : 'pendiente',
      descripcion: r.seccionAutomatica ? (
        <Hecho>Generados desde el IFI.{editable ? ' Se pueden regenerar si cambió algo.' : ''}</Hecho>
      ) : (
        <Muted>Se heredan del IFI: antecedentes, marco normativo y transcripción del acta.</Muted>
      ),
      contenido: (
        <div className="flex flex-col gap-[8px]">
          <div className="flex gap-[8px] flex-wrap">
            {editable && (
              <Button
                size="sm"
                variant={r.seccionAutomatica ? 'outline' : 'primary'}
                icon={<ZapIcon size={14} />}
                loading={accionEnCurso === 'antecedentes'}
                onClick={generarAntecedentes}
              >
                {r.seccionAutomatica ? 'Regenerar' : 'Generar antecedentes'}
              </Button>
            )}
            {r.seccionAutomatica && (
              <Button size="sm" variant="secondary" icon={<EyeIcon size={14} />} onClick={() => setVerAntecedentes((v) => !v)}>
                {verAntecedentes ? 'Ocultar antecedentes' : 'Ver antecedentes'}
              </Button>
            )}
          </div>
          {verAntecedentes && r.seccionAutomatica && <BloqueAntecedentes heredado={heredado} archivoPorVicio={!!d.ifi?.archivoPorVicio} />}
        </div>
      ),
    });
  }

  // Descargo presentado después del IFI (opcional)
  pasos.push({
    clave: 'descargoPost',
    titulo: 'Descargo recibido después del IFI (opcional)',
    estado: r?.descargoPosteriorTexto ? 'completado' : editable ? 'opcional' : 'pendiente',
    descripcion: !r ? (
      <Muted>Disponible después de iniciar la resolución.</Muted>
    ) : r.descargoPosteriorTexto ? (
      <Hecho>Presentado el {fechaCorta(r.descargoPosteriorFecha)}. El Word usa la plantilla "con descargo": rebátelo en el análisis.</Hecho>
    ) : (
      <Muted>
        El administrado puede presentar descargo hasta antes de la resolución; se evalúa en ella. Si llegó, regístralo (fecha real +
        resumen) y el Word usará la plantilla "con descargo". El escrito se puede subir como adjunto en el IFI.
      </Muted>
    ),
    contenido: !r ? undefined : conForm('descargoPost', !!r.descargoPosteriorTexto) ? (
      <div>
        <div className="w-[220px]">
          <Input type="date" label="Fecha de presentación" value={descargoPostFecha} max={hoy} onChange={(e) => setDescargoPostFecha(e.target.value)} />
        </div>
        <Textarea label="Resumen del descargo" value={descargoPostTexto} onChange={(e) => setDescargoPostTexto(e.target.value)} rows={5} />
        <Button size="sm" variant="outline" loading={accionEnCurso === 'descargoPost'} onClick={() => guardarDescargoPosterior()}>
          Guardar descargo
        </Button>
        {r.descargoPosteriorTexto && (
          <Button size="sm" variant="secondary" className="ml-[8px]!" onClick={() => guardarDescargoPosterior(true)}>
            Quitar
          </Button>
        )}
        {botonCancelar('descargoPost', !!r.descargoPosteriorTexto)}
      </div>
    ) : r.descargoPosteriorTexto ? (
      <div>
        <div className={estiloTextoLargo}>{r.descargoPosteriorTexto}</div>
        {botonEditar('descargoPost')}
      </div>
    ) : undefined,
  });

  // Análisis (RSGSA) / Desarrollo extenso (RSG)
  pasos.push({
    clave: 'analisis',
    titulo: esRsg ? 'Desarrollo de la RSG (extenso)' : 'Análisis',
    estado: r?.analisisTexto ? 'completado' : editable ? 'actual' : 'pendiente',
    descripcion: !r ? (
      <Muted>Disponible después de iniciar la resolución.</Muted>
    ) : r.analisisTexto && !editable ? (
      <Hecho>Redactado.</Hecho>
    ) : esRsg ? (
      <Muted>
        Es dinero que la administración deja de cobrar: el desarrollo tiene que ser extenso y fundamentado. Texto del abogado,
        nunca generado por el sistema.
      </Muted>
    ) : (
      <Muted>Fundamentación jurídica de la sanción. Texto del abogado, nunca generado por el sistema.</Muted>
    ),
    contenido: !r ? undefined : conForm('analisis', !!r.analisisTexto) ? (
      <div>
        {d.ifi?.archivoPorVicio && d.ifi.motivoVicioTrascendente && (
          <Alert type="info" className="mb-[8px]!">
            Motivo del vicio registrado en el IFI: {d.ifi.motivoVicioTrascendente}
          </Alert>
        )}
        <Textarea
          value={analisis}
          onChange={(e) => setAnalisis(e.target.value)}
          rows={esRsg ? 12 : 8}
          placeholder={esRsg ? 'Desarrollo de la RSG a favor del administrado…' : 'Análisis y fundamentación de la sanción…'}
        />
        <Button
          size="sm"
          variant={r.analisisTexto ? 'outline' : 'primary'}
          loading={accionEnCurso === 'analisis'}
          disabled={analisis.trim() === (r.analisisTexto ?? '').trim()}
          onClick={guardarAnalisis}
        >
          {esRsg ? 'Guardar desarrollo' : 'Guardar análisis'}
        </Button>
        {botonCancelar('analisis', !!r.analisisTexto)}
      </div>
    ) : r.analisisTexto ? (
      <div>
        <div className={estiloTextoLargo}>{r.analisisTexto}</div>
        {botonEditar('analisis')}
      </div>
    ) : undefined,
  });

  if (!esRsg) {
    // 3. Monto de la multa (opcional)
    const tieneMonto = r?.montoSinDescuento != null || !!r?.tipoInfraccion || r?.porcentajeUit != null;
    const sinPrevio = parsearMonto(montoSin);
    const vistaPrevia =
      tipoInfraccion && typeof sinPrevio === 'number'
        ? `${montoTexto(sinPrevio)} × (1 − ${PCT_DESCUENTO[tipoInfraccion]}%) = ${montoTexto(Math.round(sinPrevio * (1 - PCT_DESCUENTO[tipoInfraccion] / 100) * 100) / 100)}`
        : null;
    const calculoGuardado =
      r?.montoSinDescuento != null && r.porcentajeDescuento != null && r.montoConDescuento != null
        ? `${montoTexto(r.montoSinDescuento)} × (1 − ${r.porcentajeDescuento}%) = ${montoTexto(r.montoConDescuento)}`
        : null;
    pasos.push({
      clave: 'montos',
      titulo: 'Monto de la multa (opcional)',
      estado: tieneMonto ? 'completado' : editable ? 'opcional' : 'pendiente',
      descripcion: !r ? (
        <Muted>Disponible después de iniciar la resolución.</Muted>
      ) : tieneMonto ? (
        <Hecho>
          Multa {montoTexto(r.montoSinDescuento)} · con descuento {montoTexto(r.montoConDescuento)}
        </Hecho>
      ) : (
        <Muted>
          Opcional: hay sanciones que son solo medida complementaria. Elige el tipo de infracción y el sistema calcula el monto con
          descuento del art. 43 de la Ordenanza 464 (leve 50%, grave 40%, muy grave 30%; si reconoce por escrito y paga en 15 días
          hábiles).
        </Muted>
      ),
      contenido: conForm('montos', tieneMonto) ? (
        <div>
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-[12px]">
            <div className="mb-[14px]">
              <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">
                Tipo de infracción
              </label>
              <select
                value={tipoInfraccion}
                onChange={(e) => setTipoInfraccion(e.target.value as TipoInfraccion | '')}
                className="w-full py-[9px] px-[12px] rounded-sm border border-border text-[13px]"
              >
                <option value="">— Elegir —</option>
                {(Object.keys(LABEL_INFRACCION) as TipoInfraccion[]).map((t) => (
                  <option key={t} value={t}>
                    {LABEL_INFRACCION[t]} ({PCT_DESCUENTO[t]}% de descuento)
                  </option>
                ))}
              </select>
            </div>
            <Input label="% UIT" type="number" min={0} step="0.01" placeholder="Ej. 200" value={porcentajeUit} onChange={(e) => setPorcentajeUit(e.target.value)} />
            <Input label="Multa sin descuento (S/)" type="number" min={0} step="0.01" placeholder="Ej. 11000.00" value={montoSin} onChange={(e) => setMontoSin(e.target.value)} />
          </div>
          <div className={`${estiloBloque} mb-[8px]`}>
            Monto con descuento:{' '}
            {vistaPrevia ? <strong>{vistaPrevia}</strong> : <Muted>elige el tipo de infracción e ingresa la multa para calcularlo.</Muted>}
            <div className="text-[11px] text-text-muted mt-[4px]">Lo calcula el sistema al guardar; no se escribe a mano.</div>
          </div>
          <Button size="sm" variant="outline" loading={accionEnCurso === 'montos'} onClick={guardarMontos}>
            Guardar monto
          </Button>
          {botonCancelar('montos', tieneMonto)}
        </div>
      ) : tieneMonto ? (
        <div>
          <div className={estiloBloque}>
            Infracción: <strong>{r?.tipoInfraccion ? LABEL_INFRACCION[r.tipoInfraccion] : '—'}</strong> · % UIT:{' '}
            <strong>{r?.porcentajeUit != null ? `${r.porcentajeUit}%` : '—'}</strong> · Multa: <strong>{montoTexto(r?.montoSinDescuento ?? null)}</strong>
            <div className="mt-[4px]">
              Con descuento (art. 43 Ord. 464):{' '}
              {calculoGuardado ? <strong>{calculoGuardado}</strong> : <Muted>falta el tipo de infracción o la multa.</Muted>}
            </div>
          </div>
          {botonEditar('montos')}
        </div>
      ) : undefined,
    });

    // 4. Medida complementaria (opcional; no aplica si es "en parte")
    if (r?.enParte)
      pasos.push({
        clave: 'medida',
        titulo: 'Medida complementaria',
        estado: 'completado',
        descripcion: <Muted>No aplica: la decisión es sancionar en parte (se mantiene la multa, sin medida complementaria).</Muted>,
      });
    else
      pasos.push({
      clave: 'medida',
      titulo: 'Medida complementaria (opcional)',
      estado: r?.medidaComplementaria ? 'completado' : editable ? 'opcional' : 'pendiente',
      descripcion: !r ? (
        <Muted>Disponible después de iniciar la resolución.</Muted>
      ) : r.medidaComplementaria ? (
        <Hecho>{r.medidaComplementaria}</Hecho>
      ) : (
        <Muted>Clausura, demolición, decomiso… si corresponde.</Muted>
      ),
      contenido: conForm('medida', !!r?.medidaComplementaria) ? (
        <div>
          <Input placeholder="Ej. CLAUSURA TEMPORAL POR 30 DÍAS" value={medida} onChange={(e) => setMedida(e.target.value)} />
          <Button
            size="sm"
            variant="outline"
            loading={accionEnCurso === 'medida'}
            disabled={medida.trim() === (r?.medidaComplementaria ?? '').trim()}
            onClick={guardarMedida}
          >
            Guardar medida
          </Button>
          {botonCancelar('medida', !!r?.medidaComplementaria)}
        </div>
      ) : r?.medidaComplementaria ? (
        <div>
          <div className={estiloBloque}>{r.medidaComplementaria}</div>
          {botonEditar('medida')}
        </div>
      ) : undefined,
    });
  } else {
    // 3. Retiro de la multa del estado de cuenta (solo RSG)
    const retiro = r?.tareaRetiroEstadoCuenta;
    const responsableEnLista = usuarios.some((u) => u.id === responsableId);
    pasos.push({
      clave: 'retiro',
      titulo: 'Retiro de la multa del estado de cuenta',
      estado: retiro?.confirmada ? 'completado' : editable ? 'actual' : 'pendiente',
      descripcion: !r ? (
        <Muted>Disponible después de iniciar la resolución.</Muted>
      ) : retiro?.confirmada ? (
        <Hecho>
          Retiro confirmado{retiro.responsableNombre ? ` — responsable: ${retiro.responsableNombre}` : ''}
          {retiro.fechaConfirmacion ? ` (${fechaCorta(retiro.fechaConfirmacion)})` : ''}.
        </Hecho>
      ) : (
        <Muted>
          Tarea manual (sin integración con el sistema de rentas): alguien de la oficina retira la multa del estado de cuenta y lo
          confirma aquí.{retiro?.responsableNombre ? ` Responsable asignado: ${retiro.responsableNombre}.` : ''}
        </Muted>
      ),
      contenido: conForm('retiro', !!retiro?.confirmada) ? (
        <div className="flex flex-col gap-[8px]">
          <label className="text-[13px] font-semibold text-text-secondary">Responsable</label>
          <select
            value={responsableId}
            onChange={(e) => setResponsableId(e.target.value)}
            className="py-[9px] px-[12px] rounded-sm border border-border text-[13px]"
          >
            <option value="">— Elegir usuario —</option>
            {responsableId && !responsableEnLista && (
              <option value={responsableId}>{retiro?.responsableNombre ?? 'Usuario asignado (inactivo)'}</option>
            )}
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombres} — DNI {u.dni}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-[8px] text-[13px]">
            <input type="checkbox" checked={retiroConfirmado} onChange={(e) => setRetiroConfirmado(e.target.checked)} />
            Confirmo que la multa ya fue retirada del estado de cuenta
          </label>
          <div>
            <Button size="sm" variant={retiroConfirmado ? 'primary' : 'outline'} loading={accionEnCurso === 'retiro'} onClick={guardarRetiro}>
              Guardar
            </Button>
            {botonCancelar('retiro', !!retiro?.confirmada)}
          </div>
        </div>
      ) : retiro?.confirmada ? (
        <div>
          <div className={estiloBloque}>
            Responsable: <strong>{retiro.responsableNombre ?? '—'}</strong>
            {retiro.fechaConfirmacion ? ` · Confirmado el ${fechaCorta(retiro.fechaConfirmacion)}` : ''}
          </div>
          {botonEditar('retiro')}
        </div>
      ) : undefined,
    });
  }

  // Enviar a firma
  const puedeEnviar = editable && plazos.esperaDescargoVencida && faltantesParaFirma.length === 0;
  pasos.push({
    clave: 'enviar',
    titulo: 'Enviar a firma',
    estado: enFirma || firmada ? 'completado' : puedeEnviar ? 'actual' : 'pendiente',
    descripcion: firmada ? (
      <Hecho>Entregada al Subgerente el {fechaCorta(r?.fechaEnvioFirma)}.</Hecho>
    ) : enFirma ? (
      <span>
        <Hecho>Entregada al Subgerente el {fechaCorta(r?.fechaEnvioFirma)}</Hecho>{' '}
        <Badge variant="purple">
          En firma hace {plazos.diasEnFirma ?? 0} día{plazos.diasEnFirma === 1 ? '' : 's'}
        </Badge>
      </span>
    ) : !plazos.esperaDescargoVencida ? (
      <span className="text-[#b45309]">
        Bloqueado: corre el plazo de 5 días hábiles para el descargo contra el IFI (IFI notificado el{' '}
        {fechaCorta(d.ifi?.fechaNotificacion)}; vence el {fechaCorta(plazos.finEsperaDescargoIfi)}
        {plazos.diasHabilesEsperaRestantes ? ` — faltan ${plazos.diasHabilesEsperaRestantes} días hábiles` : ' — hoy es el último día'}). Se
        podrá enviar desde el {fechaCorta(plazos.puedeEnviarAFirmaDesde)}. Mientras tanto se puede seguir redactando.
      </span>
    ) : faltantesParaFirma.length > 0 ? (
      <Muted>Antes de enviar falta: {faltantesParaFirma.join('; ')}.</Muted>
    ) : (
      <Muted>Registra la fecha real en que le entregaste el documento al Subgerente. Desde ahí el contenido queda bloqueado.</Muted>
    ),
    contenido: puedeEnviar ? (
      <div className="flex gap-[12px] items-end flex-wrap">
        <div className="w-[220px]">
          <Input
            type="date"
            label="Fecha de entrega al Subgerente"
            value={fechaEnvio}
            min={soloFechaIso(plazos.puedeEnviarAFirmaDesde)}
            max={hoy}
            onChange={(e) => setFechaEnvio(e.target.value)}
          />
        </div>
        <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={descargarResolucion} className="mb-[14px]!">
          Descargar resolución (Word)
        </Button>
        <Button size="sm" icon={<PenToolIcon size={14} />} loading={accionEnCurso === 'enviar'} onClick={enviarAFirma} className="mb-[14px]!">
          Registrar envío a firma
        </Button>
      </div>
    ) : enFirma ? (
      <div className="flex gap-[8px] flex-wrap">
        <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={descargarResolucion}>
          Descargar resolución (Word)
        </Button>
        <Button size="sm" variant="secondary" loading={accionEnCurso === 'retirar'} onClick={retirarDeFirma}>
          Volver a elaboración (corregir)
        </Button>
      </div>
    ) : r?.analisisTexto ? (
      <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={descargarResolucion}>
        Descargar resolución (Word)
      </Button>
    ) : undefined,
  });

  // Registrar firma del Subgerente
  pasos.push({
    clave: 'firma',
    titulo: 'Registrar firma del Subgerente',
    estado: firmada ? 'completado' : enFirma ? 'actual' : 'pendiente',
    descripcion: firmada ? (
      <Hecho>
        Firmada el {fechaCorta(r?.fechaEmision)}
        {r?.numeroResolucion ? ` — Resolución N° ${r.numeroResolucion}` : ' (sin N° registrado)'}.
      </Hecho>
    ) : enFirma ? (
      <Muted>
        Cuando el Subgerente devuelva el documento firmado, registra la fecha real de firma y el N° de resolución que figura en el
        papel (opcional; el sistema no lo genera).
      </Muted>
    ) : (
      <Muted>Disponible después de enviar a firma.</Muted>
    ),
    contenido: enFirma ? (
      <div className="flex gap-[12px] items-end flex-wrap">
        <div className="w-[200px]">
          <Input
            type="date"
            label="Fecha de firma"
            value={fechaFirma}
            min={soloFechaIso(r?.fechaEnvioFirma)}
            max={hoy}
            onChange={(e) => setFechaFirma(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[220px]">
          <Input
            label="N° de resolución (opcional)"
            placeholder="Tal como figura en el documento firmado"
            value={numeroResolucion}
            onChange={(e) => setNumeroResolucion(e.target.value)}
          />
        </div>
        <Button size="sm" variant="success" icon={<PenToolIcon size={14} />} loading={accionEnCurso === 'firmar'} onClick={registrarFirma} className="mb-[14px]!">
          Registrar firma
        </Button>
      </div>
    ) : undefined,
  });

  // Notificar al administrado
  pasos.push({
    clave: 'notificar',
    titulo: 'Notificar al administrado',
    estado: r?.estado === 'NOTIFICADA' ? 'completado' : r?.estado === 'EMITIDA' ? 'actual' : 'pendiente',
    descripcion:
      r?.estado === 'NOTIFICADA' ? (
        <Hecho>Notificada el {fechaCorta(r.fechaNotificacion)}.</Hecho>
      ) : r?.estado === 'EMITIDA' ? (
        <Muted>Registra la fecha real en que se entregó la resolución al administrado.</Muted>
      ) : (
        <Muted>Disponible después de registrar la firma.</Muted>
      ),
    contenido:
      r?.estado === 'EMITIDA' ? (
        <div className="flex gap-[12px] items-end flex-wrap">
          <div className="w-[220px]">
            <Input
              type="date"
              label="Fecha de notificación"
              value={fechaNotificacion}
              min={soloFechaIso(r.fechaEmision)}
              max={hoy}
              onChange={(e) => setFechaNotificacion(e.target.value)}
            />
          </div>
          <Button size="sm" variant="success" loading={accionEnCurso === 'notificar'} onClick={notificar} className="mb-[14px]!">
            Registrar notificación
          </Button>
        </div>
      ) : undefined,
  });

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Expediente ${d.numeroExpediente} — Resolución`}
      maxWidth="860px"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {/* Mensajes DENTRO del panel, fijos arriba mientras se hace scroll. */}
      {mensaje && (
        <div className="sticky top-0 z-[2] bg-[#ffffff] pb-[4px] mb-[8px]">
          <div onClick={() => setMensaje(null)} title="Clic para cerrar" className="cursor-pointer">
            <Alert type={mensaje.type} className="mb-0!">
              {mensaje.text}
            </Alert>
          </div>
        </div>
      )}
      {errorCarga && <Alert type="error">{errorCarga}</Alert>}

      {/* 1. RESUMEN */}
      <section className="mb-[20px]">
        <div className={estiloTituloSeccion}>Resumen</div>

        {tipo && (
          <div className={`${estiloBloque} mb-[10px] ${esRsg ? 'bg-[#f0f9ff]!' : 'bg-[#fff1f2]!'}`}>
            <div className="flex items-center gap-[8px] flex-wrap mb-[6px]">
              <Badge variant={esRsg ? 'info' : 'danger'} size="md">
                {NOMBRE_TIPO[tipo]}
              </Badge>
              <Badge variant={varianteEtapa(d)}>{labelEtapa({ ...d, resolucionId: r?.id ?? null })}</Badge>
              {d.ifi?.archivoPorVicio && <span className="text-[12px] text-[#be123c] font-semibold">Archivo por error de fondo (vicio trascendente)</span>}
            </div>
            <div className="text-[12px] text-text-secondary">
              {EXPLICACION_TIPO[tipo]} Sugerido por el IFI; el abogado puede decidir distinto escribiendo el motivo.
              {r?.enParte ? ' Decisión: sancionar en parte (sin medida complementaria).' : ''}
            </div>
          </div>
        )}

        {d.tipoNoCoincideConIfi && r && (
          <Alert type={r.motivoDiscrepanciaIfi ? 'info' : 'warning'}>
            Decisión distinta al IFI: {r.motivoDiscrepanciaIfi ?? 'falta escribir el motivo (paso Decisión → Editar).'}
          </Alert>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[10px]">
          <div className={estiloBloque}>
            <div className="font-bold mb-[4px]">Administrado</div>
            {d.administrado?.identificado && d.administrado.nombresRazonSocial ? (
              <>
                <div>{d.administrado.nombresRazonSocial}</div>
                <div className="text-[12px] text-text-muted">
                  {d.administrado.tipoDocumento ?? 'Doc.'} {d.administrado.numeroDocumento ?? '—'}
                  {d.administrado.domicilio ? ` · ${d.administrado.domicilio}` : ''}
                </div>
              </>
            ) : (
              <Muted>No identificado en campo</Muted>
            )}
          </div>
          <div className={estiloBloque}>
            <div className="font-bold mb-[4px]">Infracción</div>
            {d.infracciones.length === 0 ? (
              <Muted>No registrada</Muted>
            ) : (
              d.infracciones.map((i, idx) => (
                <div key={idx} className="text-[12px] mb-[2px]">
                  <strong>{i.codigoNormativo}</strong>
                  {i.descripcion ? ` — ${i.descripcion}` : ''}
                </div>
              ))
            )}
          </div>
          <div className={estiloBloque}>
            <div className="font-bold mb-[4px]">Plazos</div>
            <div className="text-[12px] flex flex-col gap-[3px]">
              <div>
                Descargo contra el IFI:{' '}
                {plazos.finEsperaDescargoIfi ? (
                  plazos.esperaDescargoVencida ? (
                    <span className="text-[#047857] font-semibold">venció el {fechaCorta(plazos.finEsperaDescargoIfi)}</span>
                  ) : (
                    <span className="text-[#b45309] font-semibold">
                      vence el {fechaCorta(plazos.finEsperaDescargoIfi)}
                      {plazos.diasHabilesEsperaRestantes ? ` (faltan ${plazos.diasHabilesEsperaRestantes} días hábiles)` : ' (hoy)'}
                    </span>
                  )
                ) : (
                  <Muted>sin fecha de notificación del IFI</Muted>
                )}
              </div>
              <div>
                Caducidad:{' '}
                {r?.estado === 'NOTIFICADA' ? (
                  <Muted>detenida (resolución notificada)</Muted>
                ) : caducidad ? (
                  <span className={`${caducidad.urgente ? 'text-[#be123c]' : 'text-inherit'} ${caducidad.urgente ? 'font-bold' : 'font-normal'}`}>
                    {caducidad.texto} ({fechaCorta(plazos.fechaCaducidad)}){plazos.ampliacionFirmada ? ' — ampliado +3 meses' : ''}
                  </span>
                ) : (
                  <Muted>la NC no tiene fecha de notificación</Muted>
                )}
              </div>
              {plazos.diasEnFirma !== null && (
                <div>
                  En firma hace <strong>{plazos.diasEnFirma}</strong> día{plazos.diasEnFirma === 1 ? '' : 's'} (desde el {fechaCorta(r?.fechaEnvioFirma)})
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AMPLIACIÓN DE PLAZO (RSG intermedia, opcional) */}
      {(d.ampliacion || (plazos.fechaCaducidadOriginal && r?.estado !== 'NOTIFICADA')) && (
        <TarjetaAmpliacion
          d={d}
          hoy={hoy}
          accionEnCurso={accionEnCurso}
          fechas={{ ampFechaEnvio, ampFechaFirma, ampNumero, ampFechaNotificacion }}
          setters={{ setAmpFechaEnvio, setAmpFechaFirma, setAmpNumero, setAmpFechaNotificacion }}
          acciones={{ emitirAmpliacion, enviarAmpliacion, firmarAmpliacion, notificarAmpliacion, descargarAmpliacion }}
        />
      )}

      {/* 2. DOCUMENTOS DEL EXPEDIENTE */}
      <section className="mb-[20px]">
        <div className={estiloTituloSeccion}>Documentos del expediente</div>
        <div className="border border-border rounded-[8px] overflow-hidden">
          {d.tieneActaFiscalizacion && (
            <FilaDocumento titulo="Acta de Fiscalización (Word)">
              <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={() => descargarDocumentoWord(d.intervencionId, 'FISCALIZACION')}>
                Descargar
              </Button>
            </FilaDocumento>
          )}
          {d.tieneNotificacionCargo && (
            <FilaDocumento titulo="Notificación de Cargo (Excel)">
              <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={() => descargarDocumentoWord(d.intervencionId, 'NOTIFICACION_CARGO')}>
                Descargar
              </Button>
            </FilaDocumento>
          )}
          {d.medidasProvisionales.map((m) => (
            <FilaDocumento key={m.numeroCorrelativo} titulo={`Acta de Medida Provisional N° ${m.numeroCorrelativo} — ${m.tipoMedida} (Word)`}>
              <Button
                size="sm"
                variant="outline"
                icon={<FileTextIcon size={14} />}
                onClick={() => descargarDocumentoWord(d.intervencionId, 'MEDIDA_PROVISIONAL', m.numeroCorrelativo)}
              >
                Descargar
              </Button>
            </FilaDocumento>
          ))}
          {fotos.map((f, i) => (
            <FilaDocumento key={f.id} titulo={f.actaTipo ? LABEL_FOTO_ACTA[f.actaTipo] ?? `Foto (${f.actaTipo})` : `Foto de la intervención ${i + 1}`}>
              <Button size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={() => abrirDocumento(f.id)}>
                Ver
              </Button>
            </FilaDocumento>
          ))}
          {d.ifi && d.ifi.estado !== 'EN_ELABORACION' && (
            <FilaDocumento titulo={`Informe Final de Instrucción — IFI${d.ifi.numeroInforme ? ` N° ${d.ifi.numeroInforme}` : ''} (Word)`}>
              <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={descargarIfi}>
                Descargar
              </Button>
            </FilaDocumento>
          )}
          {docsIfi.map((doc) => (
            <FilaDocumento key={doc.id} titulo={`Adjunto del IFI: ${doc.descripcion}`} detalle={doc.nombreOriginal}>
              <Button size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={() => abrirDocumentoIfi(doc.id)}>
                Ver
              </Button>
            </FilaDocumento>
          ))}
          {d.ifi?.recibioDescargo && (
            <FilaDocumento
              titulo="Descargo del administrado (texto)"
              detalle={d.ifi.fechaRecepcionDescargo ? `Recibido el ${fechaCorta(d.ifi.fechaRecepcionDescargo)}` : undefined}
              expandido={verDescargo ? <div className={estiloTextoLargo}>{d.ifi.descargoTexto?.trim() || 'Sin texto registrado.'}</div> : undefined}
            >
              <Button size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={() => setVerDescargo((v) => !v)}>
                {verDescargo ? 'Ocultar' : 'Ver'}
              </Button>
            </FilaDocumento>
          )}
          {r && (
            <FilaDocumento
              titulo="La resolución: antecedentes y análisis redactados (texto)"
              detalle={r.analisisTexto ? 'El Word se genera con la plantilla real (RSGSA / RSG).' : 'El Word se habilita cuando esté redactado el análisis.'}
              expandido={
                verTextoResolucion ? (
                  <div className="flex flex-col gap-[8px]">
                    {r.seccionAutomatica ? (
                      <BloqueAntecedentes heredado={antecedentes?.heredadoDelIfi ?? null} archivoPorVicio={!!d.ifi?.archivoPorVicio} />
                    ) : (
                      <Muted>Antecedentes todavía no generados.</Muted>
                    )}
                    <div>
                      <div className="font-bold text-[12px] mb-[4px]">{esRsg ? 'Desarrollo' : 'Análisis'}</div>
                      {r.analisisTexto ? <div className={estiloTextoLargo}>{r.analisisTexto}</div> : <Muted>Todavía no redactado.</Muted>}
                    </div>
                  </div>
                ) : undefined
              }
            >
              {r.analisisTexto && (
                <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={descargarResolucion} className="mr-[6px]!">
                  Word
                </Button>
              )}
              <Button size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={() => setVerTextoResolucion((v) => !v)}>
                {verTextoResolucion ? 'Ocultar' : 'Ver'}
              </Button>
            </FilaDocumento>
          )}
        </div>
      </section>

      {/* 3. PASOS DE LA RESOLUCIÓN */}
      <section>
        <div className={estiloTituloSeccion}>Pasos de la resolución</div>
        <Stepper pasos={pasos} />
      </section>
    </Modal>
  );
};

// ============================================================================
// Piezas
// ============================================================================

const TarjetaAmpliacion: React.FC<{
  d: ResolucionDetalle;
  hoy: string;
  accionEnCurso: string | null;
  fechas: { ampFechaEnvio: string; ampFechaFirma: string; ampNumero: string; ampFechaNotificacion: string };
  setters: {
    setAmpFechaEnvio: (v: string) => void;
    setAmpFechaFirma: (v: string) => void;
    setAmpNumero: (v: string) => void;
    setAmpFechaNotificacion: (v: string) => void;
  };
  acciones: {
    emitirAmpliacion: () => void;
    enviarAmpliacion: () => void;
    firmarAmpliacion: () => void;
    notificarAmpliacion: () => void;
    descargarAmpliacion: () => void;
  };
}> = ({ d, hoy, accionEnCurso, fechas, setters, acciones }) => {
  const p = d.plazos;
  const a = d.ampliacion;
  const finNueve = soloFechaIso(p.fechaCaducidadOriginal);
  const nueveVencidos = !!finNueve && hoy >= finNueve;
  const fila = 'flex gap-[12px] items-end flex-wrap mt-[8px]';
  return (
    <section className="mb-[20px]">
      <div className={estiloTituloSeccion}>Ampliación de plazo (RSG)</div>
      <div
        className={`${estiloBloque} ${p.alertaAmpliacion ? 'bg-[#fff1f2]! border-[#fda4af]!' : ''}`}
      >
        <div className="text-[12px] mb-[6px]">
          Da 3 meses más, contados desde que vencen los 9 meses ({fechaCorta(p.fechaCaducidadOriginal)}): nuevo límite{' '}
          <strong>{fechaCorta(p.fechaCaducidadConAmpliacion)}</strong>. Es opcional y solo se puede emitir y firmar antes del{' '}
          {fechaCorta(p.fechaCaducidadOriginal)}. Cuenta desde que se registra la firma.
        </div>
        {p.alertaAmpliacion && (
          <div className="text-[#be123c] font-bold text-[12px] mb-[6px]">
            Faltan {p.diasParaCaducidad} días para caducar y no hay resolución final firmada. El Subgerente tarda 12 a 15 días en firmar.
          </div>
        )}
        {!a ? (
          nueveVencidos ? (
            <Muted>Ya vencieron los 9 meses: no se puede ampliar.</Muted>
          ) : (
            <Button size="sm" variant={p.alertaAmpliacion ? 'danger' : 'outline'} loading={accionEnCurso === 'ampEmitir'} onClick={acciones.emitirAmpliacion}>
              Emitir RSG de ampliación
            </Button>
          )
        ) : (
          <div className="text-[12px]">
            <div className="flex gap-[8px] items-center flex-wrap">
              <Badge variant={a.estado === 'NOTIFICADA' ? 'neutral' : a.estado === 'EMITIDA' ? 'success' : a.fechaEnvioFirma ? 'purple' : 'info'}>
                {a.estado === 'NOTIFICADA' ? 'Notificada' : a.estado === 'EMITIDA' ? 'Firmada, falta notificar' : a.fechaEnvioFirma ? 'En firma' : 'En elaboración'}
              </Badge>
              <Button size="sm" variant="outline" icon={<FileTextIcon size={14} />} onClick={acciones.descargarAmpliacion}>
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

            {a.estado === 'EN_ELABORACION' && !a.fechaEnvioFirma && !nueveVencidos && (
              <div className={fila}>
                <div className="w-[220px]">
                  <Input type="date" label="Fecha de entrega al Subgerente" value={fechas.ampFechaEnvio} max={hoy} onChange={(e) => setters.setAmpFechaEnvio(e.target.value)} />
                </div>
                <Button size="sm" icon={<PenToolIcon size={14} />} loading={accionEnCurso === 'ampEnviar'} onClick={acciones.enviarAmpliacion} className="mb-[14px]!">
                  Registrar envío a firma
                </Button>
              </div>
            )}
            {a.estado === 'EN_ELABORACION' && a.fechaEnvioFirma && !nueveVencidos && (
              <div className={fila}>
                <div className="w-[200px]">
                  <Input
                    type="date"
                    label="Fecha de firma"
                    value={fechas.ampFechaFirma}
                    min={soloFechaIso(a.fechaEnvioFirma)}
                    max={hoy}
                    onChange={(e) => setters.setAmpFechaFirma(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Input label="N° de resolución (opcional)" placeholder="Tal como figura en el papel" value={fechas.ampNumero} onChange={(e) => setters.setAmpNumero(e.target.value)} />
                </div>
                <Button size="sm" variant="success" loading={accionEnCurso === 'ampFirmar'} onClick={acciones.firmarAmpliacion} className="mb-[14px]!">
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
                    value={fechas.ampFechaNotificacion}
                    min={soloFechaIso(a.fechaFirma)}
                    max={hoy}
                    onChange={(e) => setters.setAmpFechaNotificacion(e.target.value)}
                  />
                </div>
                <Button size="sm" variant="success" loading={accionEnCurso === 'ampNotificar'} onClick={acciones.notificarAmpliacion} className="mb-[14px]!">
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

const BloqueAntecedentes: React.FC<{ heredado: any | null; archivoPorVicio: boolean }> = ({ heredado, archivoPorVicio }) => {
  if (!heredado) {
    return (
      <div className={estiloTextoLargo}>
        {archivoPorVicio
          ? 'El IFI archivó por vicio trascendente: no hay hechos ni base legal que heredar. El desarrollo de la RSG cita el vicio directamente.'
          : 'El IFI no tenía antecedentes generados para heredar.'}
      </div>
    );
  }
  const partes: { titulo: string; texto: string | null | undefined }[] = [
    { titulo: 'Antecedentes', texto: heredado.antecedentes },
    { titulo: 'Marco normativo', texto: heredado.marcoNormativo },
    { titulo: 'Transcripción del acta', texto: heredado.transcripcionActa },
  ];
  return (
    <div className="flex flex-col gap-[8px]">
      {partes
        .filter((p) => p.texto && String(p.texto).trim())
        .map((p) => (
          <div key={p.titulo}>
            <div className="font-bold text-[12px] mb-[4px]">{p.titulo}</div>
            <div className={estiloTextoLargo}>{String(p.texto)}</div>
          </div>
        ))}
    </div>
  );
};

/** Mismo diseño visual que el stepper del panel de IFI (IfiView.tsx). */
const Stepper: React.FC<{ pasos: StepDef[] }> = ({ pasos }) => (
  <div className="flex flex-col">
    {pasos.map((paso, idx) => (
      <div key={paso.clave} className="flex gap-[14px]">
        <div className="flex flex-col items-center">
          <div
            className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
              paso.estado === 'completado'
                ? 'bg-[#047857]'
                : paso.estado === 'actual'
                ? 'bg-primary-600'
                : paso.estado === 'opcional'
                ? 'bg-[#fef3c7]'
                : 'bg-[#e2e8f0]'
            } ${paso.estado === 'pendiente' ? 'text-[#64748b]' : paso.estado === 'opcional' ? 'text-[#92400e]' : 'text-[#ffffff]'}`}
          >
            {paso.estado === 'completado' ? <CheckIcon size={13} /> : idx + 1}
          </div>
          {idx < pasos.length - 1 && (
            <div className={`w-[2px] flex-1 min-h-[24px] ${paso.estado === 'completado' ? 'bg-[#047857]' : 'bg-[#e2e8f0]'}`} />
          )}
        </div>
        <div className="pb-[20px] flex-1 min-w-0">
          <div className={`text-[13px] font-bold ${paso.estado === 'pendiente' ? 'text-[#94a3b8]' : 'text-midnight-900'}`}>
            {paso.titulo}
          </div>
          <div className={`text-[12px] mt-[4px] ${paso.contenido ? 'mb-[8px]' : 'mb-0'}`}>{paso.descripcion}</div>
          {paso.contenido}
        </div>
      </div>
    ))}
  </div>
);
