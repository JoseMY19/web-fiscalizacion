import React, { useEffect, useMemo, useState } from 'react';
import {
  IfiApi,
  ExpedienteIfiItem,
  PlanchazoData,
  IfiDocumentoAdjuntoItem,
  EvidenciaImputacion,
  IntervencionesApi,
  abrirDocumentoIfi,
  descargarDocumentoIfi,
  abrirDocumento,
  descargarDocumentoWord,
} from '../../api';
import { socket } from '../../lib/socket';
import { Card, Button, Badge, Modal, Input, Textarea, Alert, EmptyState, Spinner } from '../../components/common/Common';
import { useConfirm } from '../../context/ConfirmContext';
import { formatearFechaHora, hoyLocal } from '../../lib/fechas';
import { FileTextIcon, RefreshCwIcon, CheckCircleIcon, EyeIcon, PenToolIcon, CheckIcon, PrinterIcon } from '../../components/icons/Icons';

/**
 * Secuencia real de pasos SP4, derivada de leer los use-cases del backend
 * (no inventada): ver comentarios en cada paso más abajo para el porqué de
 * cada gate. El paso "Hechos y Base Legal" es el label de usuario para lo
 * que el código sigue llamando "planchazo" (PlanchazoData/generarPlanchazo)
 * — no se tocó el vocabulario interno, solo el texto visible.
 */
type PasoEstado = 'completado' | 'actual' | 'pendiente' | 'no-aplica';

function labelEstadoIfi(e: ExpedienteIfiItem): string {
  if (!e.ifiEstado) return 'Sin iniciar';
  if (e.ifiEstado === 'EN_ELABORACION') return 'En elaboración';
  if (e.ifiEstado === 'EMITIDO') return 'Emitido';
  return 'Notificado';
}

/**
 * Calcula en qué paso está el expediente, para el indicador compacto de la
 * tabla y para decidir qué paso queda habilitado en el panel de detalle.
 * Ramas:
 *  - imputacionCorrecta === false (vicio trascendente insubsanable): la
 *    recomendación ya quedó fijada en ARCHIVAR desde SanearImputacionUseCase.
 *    No hay "Hechos y Base Legal" que generar (no hay hechos válidos que
 *    redactar), así que este camino salta directo a Análisis (la
 *    fundamentación del archivo) → Firmar → Notificar, 5 pasos en vez de 7.
 */
function calcularPaso(e: ExpedienteIfiItem): { pasoActualLabel: string; totalPasos: number; pasoNumero: number } {
  if (e.imputacionCorrecta === false) {
    if (!e.tieneAnalisis) return { pasoActualLabel: 'Análisis (fundamentar archivo)', totalPasos: 5, pasoNumero: 3 };
    if (e.ifiEstado === 'EN_ELABORACION') return { pasoActualLabel: 'Firmar', totalPasos: 5, pasoNumero: 4 };
    if (e.ifiEstado === 'EMITIDO') return { pasoActualLabel: 'Notificar', totalPasos: 5, pasoNumero: 5 };
    return { pasoActualLabel: 'Completado (archivado por vicio)', totalPasos: 5, pasoNumero: 5 };
  }
  if (!e.ifiEstado) return { pasoActualLabel: 'Descargo / Sanear Imputación', totalPasos: 7, pasoNumero: 1 };
  if (e.imputacionCorrecta !== true) return { pasoActualLabel: 'Sanear Imputación', totalPasos: 7, pasoNumero: 2 };
  if (!e.tieneSeccionAutomatica) return { pasoActualLabel: 'Hechos y Base Legal', totalPasos: 7, pasoNumero: 3 };
  if (!e.tieneAnalisis) return { pasoActualLabel: 'Análisis', totalPasos: 7, pasoNumero: 4 };
  if (!e.recomendacion) return { pasoActualLabel: 'Recomendación', totalPasos: 7, pasoNumero: 5 };
  if (e.ifiEstado === 'EN_ELABORACION') return { pasoActualLabel: 'Firmar', totalPasos: 7, pasoNumero: 6 };
  if (e.ifiEstado === 'EMITIDO') return { pasoActualLabel: 'Notificar', totalPasos: 7, pasoNumero: 7 };
  return { pasoActualLabel: 'Completado', totalPasos: 7, pasoNumero: 7 };
}

/** Puntos de progreso compactos para la fila de la tabla — sin abrir el panel. */
const StepDots: React.FC<{ pasoNumero: number; totalPasos: number; truncado?: boolean }> = ({ pasoNumero, totalPasos, truncado }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
    {Array.from({ length: totalPasos }).map((_, i) => (
      <span
        key={i}
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: truncado
            ? '#be123c'
            : i < pasoNumero
            ? 'var(--color-primary-600)'
            : '#e2e8f0',
        }}
      />
    ))}
  </div>
);

// ============================================================================
// Sanear Imputación (SP4-T01) — evidencia + checklist de apoyo
// ============================================================================

/**
 * Las 3 preguntas reales que se hace el instructor al sanear la imputación
 * (BPMN SP4-T01 "propietario vs. conductor"). Solo estado de frontend, no se
 * persiste: el checklist SUGIERE la decisión, la decisión la toma el
 * instructor en el radio de abajo.
 */
type RespuestaChecklist = 'SI' | 'NO' | null;
type ClaveChecklist = 'persona' | 'codigo' | 'hechos';
type ChecklistImputacion = Record<ClaveChecklist, RespuestaChecklist>;

const CHECKLIST_VACIO: ChecklistImputacion = { persona: null, codigo: null, hechos: null };

const PREGUNTAS_CHECKLIST: { clave: ClaveChecklist; pregunta: string; ayuda: string }[] = [
  {
    clave: 'persona',
    pregunta: '¿Se acusó a la persona correcta?',
    ayuda: 'El propietario o responsable del predio/negocio, no solo quien estaba presente (conductor, encargado, trabajador).',
  },
  {
    clave: 'codigo',
    pregunta: '¿El código de infracción (CUIS) corresponde a los hechos constatados?',
    ayuda: 'Compara la descripción del código con lo que el fiscalizador vio y escribió en el acta.',
  },
  {
    clave: 'hechos',
    pregunta: '¿Los hechos están descritos de forma clara y suficiente en el acta?',
    ayuda: 'Que se entienda qué se constató, dónde y cuándo, sin tener que suponer nada.',
  },
];

const LABEL_MODO_NOTIFICACION: Record<string, string> = {
  PERSONAL_FIRMA: 'Personal — firmó la recepción',
  PERSONAL_NEGATIVA: 'Personal — se negó a firmar/recibir',
  DOMICILIARIA_PENDIENTE: 'Domiciliaria — pendiente',
  DOMICILIARIA_EFECTIVA: 'Domiciliaria — efectiva',
};

const LABEL_FOTO_ACTA: Record<string, string> = {
  ACTA_FISCALIZACION: 'Foto del Acta de Fiscalización',
  NOTIFICACION_CARGO: 'Foto de la Notificación de Cargo',
  ACTA_EXHORTACION: 'Foto del Acta de Exhortación',
  MEDIDA_PROVISIONAL: 'Foto del Acta de Medida Provisional',
};

const estiloTarjetaEvidencia: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
};

const estiloTituloEvidencia: React.CSSProperties = {
  fontWeight: 700,
  color: 'var(--color-midnight-900)',
  marginBottom: '8px',
  fontSize: '13px',
};

const NoRegistrado: React.FC = () => <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No registrado</span>;

/** Fila etiqueta/valor. Valor vacío → "No registrado", nunca texto inventado. */
const DatoEvidencia: React.FC<{ label: string; valor: string | null | undefined }> = ({ label, valor }) => (
  <div style={{ marginBottom: '4px' }}>
    <strong>{label}:</strong> {valor && valor.trim() ? valor : <NoRegistrado />}
  </div>
);

export const IfiView: React.FC = () => {
  const confirm = useConfirm();
  const [pendientes, setPendientes] = useState<ExpedienteIfiItem[]>([]);
  const [esperando, setEsperando] = useState<ExpedienteIfiItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'esperando'>('pendientes');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Panel de detalle (stepper) — un expediente a la vez
  const [detalleExp, setDetalleExp] = useState<ExpedienteIfiItem | null>(null);

  // Modales
  const [descargoModal, setDescargoModal] = useState<{ isOpen: boolean; expId: string; numero: string }>({
    isOpen: false,
    expId: '',
    numero: '',
  });
  const [descargoTexto, setDescargoTexto] = useState('');

  // `correcta: null` = el instructor todavía no decidió — nunca arranca
  // preseleccionado, para que no se guarde "correcta" sin revisar nada.
  const [imputacionModal, setImputacionModal] = useState<{ isOpen: boolean; expId: string; numero: string; correcta: boolean | null }>({
    isOpen: false,
    expId: '',
    numero: '',
    correcta: null,
  });
  const [motivoVicio, setMotivoVicio] = useState('');
  // Errores de este modal se muestran DENTRO del modal: el banner de la
  // página queda tapado por el overlay mientras está abierto.
  const [errorImputacion, setErrorImputacion] = useState<string | null>(null);
  // Evidencia que el instructor necesita ver para decidir (SP4-T01)
  const [evidencia, setEvidencia] = useState<EvidenciaImputacion | null>(null);
  const [cargandoEvidencia, setCargandoEvidencia] = useState(false);
  const [errorEvidencia, setErrorEvidencia] = useState<string | null>(null);
  const [fotosEvidencia, setFotosEvidencia] = useState<{ id: string; actaTipo: string | null }[]>([]);
  const [documentosEvidencia, setDocumentosEvidencia] = useState<IfiDocumentoAdjuntoItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistImputacion>(CHECKLIST_VACIO);

  const [analisisModal, setAnalisisModal] = useState<{ isOpen: boolean; expId: string; numero: string }>({
    isOpen: false,
    expId: '',
    numero: '',
  });
  const [analisisTexto, setAnalisisTexto] = useState('');
  const [basesLegalesTexto, setBasesLegalesTexto] = useState('');

  // Documentos adjuntos al IFI (memos externos, descargos con anexos, fotos adicionales)
  const [documentosModal, setDocumentosModal] = useState<{ isOpen: boolean; expId: string; numero: string }>({
    isOpen: false,
    expId: '',
    numero: '',
  });
  const [documentos, setDocumentos] = useState<IfiDocumentoAdjuntoItem[]>([]);
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false);
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevoArchivo, setNuevoArchivo] = useState<File | null>(null);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);

  const [planchazoModal, setPlanchazoModal] = useState<{ isOpen: boolean; data: PlanchazoData | null }>({
    isOpen: false,
    data: null,
  });

  const [notificarModal, setNotificarModal] = useState<{ isOpen: boolean; expId: string; numero: string }>({
    isOpen: false,
    expId: '',
    numero: '',
  });
  const [fechaNotificacion, setFechaNotificacion] = useState(hoyLocal());

  const [firmarModal, setFirmarModal] = useState<{ isOpen: boolean; expId: string; numero: string }>({
    isOpen: false,
    expId: '',
    numero: '',
  });
  const [numeroInforme, setNumeroInforme] = useState('');
  const [descargandoDocumentoId, setDescargandoDocumentoId] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await IfiApi.getPendientes();
      setPendientes(Array.isArray(data.pendientes) ? data.pendientes : []);
      setEsperando(Array.isArray(data.esperandoNotificacion) ? data.esperandoNotificacion : []);
      // Si el panel de detalle está abierto, refresca su expediente con los datos nuevos.
      setDetalleExp((prev) => {
        if (!prev) return prev;
        const actualizado = (Array.isArray(data.pendientes) ? data.pendientes : []).find((e) => e.expedienteId === prev.expedienteId);
        // Si ya no está en la bandeja (IFI notificado → pasó a Resolución),
        // se cierra el panel: antes quedaba abierto con datos viejos ("Emitido").
        return actualizado ?? null;
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cargar expedientes de instrucción.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    socket.on('ifi:pendiente', cargar);
    return () => {
      socket.off('ifi:pendiente', cargar);
    };
  }, []);

  const handleDescargoSubmit = async () => {
    if (!descargoTexto.trim()) {
      setMessage({ type: 'error', text: 'Debe ingresar el contenido o resumen del descargo presentado.' });
      return;
    }
    setActionLoading(true);
    try {
      await IfiApi.registrarDescargo(descargoModal.expId, descargoTexto.trim());
      setMessage({ type: 'success', text: `Descargo registrado para el expediente ${descargoModal.numero}.` });
      setDescargoModal({ isOpen: false, expId: '', numero: '' });
      setDescargoTexto('');
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrar descargo.' });
    } finally {
      setActionLoading(false);
    }
  };

  const cargarEvidenciaImputacion = async (expId: string) => {
    setCargandoEvidencia(true);
    setErrorEvidencia(null);
    setEvidencia(null);
    setFotosEvidencia([]);
    setDocumentosEvidencia([]);
    try {
      const ev = await IfiApi.getEvidenciaImputacion(expId);
      setEvidencia(ev);
      // Fotos: mismo origen que ExpedienteDetalleModal (bundle de la intervención).
      // Si falla, la evidencia principal igual se muestra — solo faltan los botones de foto.
      try {
        const bundle = await IntervencionesApi.getDetalle(ev.intervencionId);
        setFotosEvidencia(bundle.fotos ?? []);
      } catch {
        setFotosEvidencia([]);
      }
      // Documentos adjuntos del IFI: el endpoint responde 404 si el IFI todavía
      // no nació (ninguna acción de instrucción aún) — eso equivale a "sin adjuntos".
      try {
        const docs = await IfiApi.getDocumentos(expId);
        setDocumentosEvidencia(Array.isArray(docs) ? docs : []);
      } catch {
        setDocumentosEvidencia([]);
      }
    } catch (err: any) {
      const texto = err.message || 'No se pudo cargar la evidencia del expediente.';
      setErrorEvidencia(texto);
    } finally {
      setCargandoEvidencia(false);
    }
  };

  const abrirImputacion = (expId: string, numero: string) => {
    setImputacionModal({ isOpen: true, expId, numero, correcta: null });
    setMotivoVicio('');
    setErrorImputacion(null);
    setChecklist(CHECKLIST_VACIO);
    cargarEvidenciaImputacion(expId);
  };

  const cerrarImputacion = () => {
    setImputacionModal({ isOpen: false, expId: '', numero: '', correcta: null });
    setChecklist(CHECKLIST_VACIO);
    setErrorImputacion(null);
    setEvidencia(null);
    setErrorEvidencia(null);
  };

  /**
   * El checklist solo SUGIERE: todo "Sí" preselecciona "correcta", cualquier
   * "No" preselecciona "error de fondo". El instructor puede cambiar el radio
   * a mano después; el motivo nunca se autocompleta (criterio humano).
   */
  const responderChecklist = (clave: ClaveChecklist, valor: 'SI' | 'NO') => {
    const nuevo = { ...checklist, [clave]: valor };
    setChecklist(nuevo);
    const respuestas = Object.values(nuevo);
    if (respuestas.some((r) => r === 'NO')) {
      setImputacionModal((prev) => ({ ...prev, correcta: false }));
    } else if (respuestas.every((r) => r === 'SI')) {
      setImputacionModal((prev) => ({ ...prev, correcta: true }));
    }
  };

  const preguntasEnNo = PREGUNTAS_CHECKLIST.filter((p) => checklist[p.clave] === 'NO');
  const checklistCompletoEnSi = PREGUNTAS_CHECKLIST.every((p) => checklist[p.clave] === 'SI');

  const handleImputacionSubmit = async () => {
    const correcta = imputacionModal.correcta;
    if (correcta === null) {
      setErrorImputacion('Elige si la Notificación de Cargo es correcta o tiene un error de fondo antes de guardar.');
      return;
    }
    if (!correcta && !motivoVicio.trim()) {
      setErrorImputacion('Explica cuál es el error de fondo antes de guardar.');
      return;
    }
    if (!correcta) {
      // Decisión irreversible (CLAUDE.md: el vicio trascendente no se corrige nunca).
      const ok = await confirm({
        title: 'Archivar por error de fondo',
        message: `El expediente ${imputacionModal.numero} se archivará y se perderá la multa. Esta decisión no se puede deshacer. ¿Continuar?`,
        confirmLabel: 'Sí, archivar',
        variant: 'danger',
      });
      if (!ok) return;
    }
    setErrorImputacion(null);
    setActionLoading(true);
    try {
      await IfiApi.sanearImputacion(imputacionModal.expId, correcta, motivoVicio.trim());
      setMessage({
        type: 'success',
        text: `Imputación ${correcta ? 'saneada como correcta' : 'declarada con error de fondo (se archiva)'} para ${imputacionModal.numero}.`,
      });
      cerrarImputacion();
      setMotivoVicio('');
      cargar();
    } catch (err: any) {
      setErrorImputacion(err.message || 'Error al sanear imputación.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlanchazo = async (expId: string) => {
    setActionLoading(true);
    try {
      const data = await IfiApi.generarPlanchazo(expId);
      setPlanchazoModal({ isOpen: true, data });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al generar la sección de hechos y base legal.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnalisisSubmit = async () => {
    if (!analisisTexto.trim()) {
      setMessage({ type: 'error', text: 'Debe ingresar el texto del análisis del instructor.' });
      return;
    }
    setActionLoading(true);
    try {
      await IfiApi.registrarAnalisis(analisisModal.expId, analisisTexto.trim());
      if (basesLegalesTexto.trim()) {
        await IfiApi.registrarBasesLegalesAdicionales(analisisModal.expId, basesLegalesTexto.trim());
      }
      setMessage({ type: 'success', text: `Análisis del instructor guardado para ${analisisModal.numero}.` });
      setAnalisisModal({ isOpen: false, expId: '', numero: '' });
      setAnalisisTexto('');
      setBasesLegalesTexto('');
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar análisis.' });
    } finally {
      setActionLoading(false);
    }
  };

  const cargarDocumentos = async (expId: string) => {
    setCargandoDocumentos(true);
    try {
      const data = await IfiApi.getDocumentos(expId);
      setDocumentos(Array.isArray(data) ? data : []);
    } catch {
      setDocumentos([]);
    } finally {
      setCargandoDocumentos(false);
    }
  };

  const handleAbrirDocumentosModal = (expId: string, numero: string) => {
    setDocumentosModal({ isOpen: true, expId, numero });
    setNuevaDescripcion('');
    setNuevoArchivo(null);
    cargarDocumentos(expId);
  };

  const handleSubirDocumento = async () => {
    if (!nuevoArchivo) {
      setMessage({ type: 'error', text: 'Selecciona un archivo.' });
      return;
    }
    if (!nuevaDescripcion.trim()) {
      setMessage({ type: 'error', text: 'Indica de qué documento se trata (ej. "Memo N°142-2026-SGGRD").' });
      return;
    }
    setSubiendoDocumento(true);
    try {
      await IfiApi.subirDocumento(documentosModal.expId, nuevaDescripcion.trim(), nuevoArchivo);
      setNuevaDescripcion('');
      setNuevoArchivo(null);
      await cargarDocumentos(documentosModal.expId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al subir el documento.' });
    } finally {
      setSubiendoDocumento(false);
    }
  };

  const handleRecomendacion = async (expId: string, numero: string, rec: 'SANCIONAR' | 'ARCHIVAR') => {
    const ok = await confirm({ message: `¿Confirmas la recomendación de ${rec} para el expediente ${numero}?` });
    if (!ok) return;
    setActionLoading(true);
    try {
      await IfiApi.definirRecomendacion(expId, rec);
      setMessage({ type: 'success', text: `Recomendación ${rec} guardada para ${numero}.` });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar recomendación.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFirmarSubmit = async () => {
    setActionLoading(true);
    try {
      await IfiApi.firmarIfi(firmarModal.expId, numeroInforme);
      setMessage({ type: 'success', text: `IFI del expediente ${firmarModal.numero} firmado correctamente.` });
      setFirmarModal({ isOpen: false, expId: '', numero: '' });
      setNumeroInforme('');
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al firmar IFI.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDescargarDocumento = async (expId: string, numero: string) => {
    setDescargandoDocumentoId(expId);
    setMessage(null);
    try {
      await descargarDocumentoIfi(expId, numero);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al generar el documento del IFI.' });
    } finally {
      setDescargandoDocumentoId(null);
    }
  };

  const handleNotificarSubmit = async () => {
    if (!fechaNotificacion || fechaNotificacion > hoyLocal()) {
      setMessage({ type: 'error', text: 'La fecha de notificación no puede estar vacía ni ser una fecha futura.' });
      return;
    }
    setActionLoading(true);
    try {
      await IfiApi.notificarIfi(notificarModal.expId, fechaNotificacion);
      const numero = notificarModal.numero;
      setNotificarModal({ isOpen: false, expId: '', numero: '' });
      // cargar() limpia el mensaje al empezar: el aviso de éxito va después.
      await cargar();
      setMessage({
        type: 'success',
        text: `IFI de ${numero} notificado. La instrucción terminó: el expediente pasó a la bandeja de Resoluciones (SP5).`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al notificar IFI.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-midnight-900)' }}>
            Fase de Instrucción e Informe Final (IFI - SP4)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Control de descargos, hechos y base legal, análisis fáctico y propuesta instructora.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargar}>
          Actualizar
        </Button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('pendientes')}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'pendientes' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'pendientes' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'pendientes' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Expedientes en Instrucción ({pendientes.length})
        </button>
        <button
          onClick={() => setActiveTab('esperando')}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'esperando' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'esperando' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'esperando' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Esperando Notificación NC ({esperando.length})
        </button>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spinner size={32} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '12px' }}>
              Cargando expedientes de instrucción...
            </p>
          </div>
        ) : activeTab === 'esperando' ? (
          esperando.length === 0 ? (
            <EmptyState title="No hay expedientes en espera de notificación" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>N° Expediente</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>Condición Legal</th>
                  </tr>
                </thead>
                <tbody>
                  {esperando.map((e) => (
                    <tr key={e.expedienteId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{e.numeroExpediente}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        ⏳ Bloqueado por regla de negocio hasta que la Notificación de Cargo sea efectivamente diligenciada.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : pendientes.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
            title="Bandeja IFI despejada"
            description="No hay expedientes pendientes de instrucción en este momento."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>N° Expediente</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Estado IFI</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Avance</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}></th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((e) => {
                  const { pasoActualLabel, totalPasos, pasoNumero } = calcularPaso(e);
                  const esCaminoVicio = e.imputacionCorrecta === false;
                  return (
                    <tr key={e.expedienteId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileTextIcon size={16} color="var(--color-primary-600)" />
                          {e.numeroExpediente}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          ID: {e.expedienteId.slice(0, 8)}...
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <Badge variant={e.ifiEstado === 'NOTIFICADO' ? 'success' : e.ifiEstado === 'EMITIDO' ? 'info' : 'neutral'}>
                          {labelEstadoIfi(e)}
                        </Badge>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: esCaminoVicio ? '#be123c' : 'var(--color-text-secondary)' }}>
                            {`Paso ${pasoNumero} de ${totalPasos}: ${pasoActualLabel}`}
                          </span>
                          <StepDots pasoNumero={pasoNumero} totalPasos={totalPasos} truncado={false} />
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <Button variant="primary" size="sm" icon={<EyeIcon size={14} />} onClick={() => setDetalleExp(e)}>
                          Ver expediente
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ============================================================ */}
      {/* PANEL DE DETALLE EN PASOS                                     */}
      {/* ============================================================ */}
      {detalleExp && (
        <IfiDetallePanel
          expediente={detalleExp}
          onClose={() => setDetalleExp(null)}
          onAbrirDescargo={() => {
            setDescargoModal({ isOpen: true, expId: detalleExp.expedienteId, numero: detalleExp.numeroExpediente });
            setDescargoTexto('');
          }}
          onAbrirImputacion={() => abrirImputacion(detalleExp.expedienteId, detalleExp.numeroExpediente)}
          onGenerarHechosBaseLegal={() => handlePlanchazo(detalleExp.expedienteId)}
          onAbrirAnalisis={() => {
            setAnalisisModal({ isOpen: true, expId: detalleExp.expedienteId, numero: detalleExp.numeroExpediente });
            setAnalisisTexto('');
            setBasesLegalesTexto('');
          }}
          onRecomendar={(rec) => handleRecomendacion(detalleExp.expedienteId, detalleExp.numeroExpediente, rec)}
          onAbrirFirmar={() => {
            setFirmarModal({ isOpen: true, expId: detalleExp.expedienteId, numero: detalleExp.numeroExpediente });
            setNumeroInforme('');
          }}
          onDescargarDocumento={() => handleDescargarDocumento(detalleExp.expedienteId, detalleExp.numeroExpediente)}
          descargandoDocumento={descargandoDocumentoId === detalleExp.expedienteId}
          onAbrirNotificar={() => {
            setNotificarModal({ isOpen: true, expId: detalleExp.expedienteId, numero: detalleExp.numeroExpediente });
          }}
          onAbrirDocumentos={() => handleAbrirDocumentosModal(detalleExp.expedienteId, detalleExp.numeroExpediente)}
          actionLoading={actionLoading}
        />
      )}

      {/* Modal Registrar Descargo */}
      <Modal
        isOpen={descargoModal.isOpen}
        onClose={() => setDescargoModal({ isOpen: false, expId: '', numero: '' })}
        title={`Registrar Descargo del Administrado (${descargoModal.numero})`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDescargoModal({ isOpen: false, expId: '', numero: '' })}>
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleDescargoSubmit}>
              Guardar Descargo
            </Button>
          </>
        }
      >
        <Textarea
          label="Texto o Síntesis del Escrito de Descargos"
          placeholder="Transcriba o resuma los argumentos y medios probatorios presentados por el administrado dentro del plazo de 5 días hábiles..."
          value={descargoTexto}
          onChange={(e) => setDescargoTexto(e.target.value)}
          rows={5}
        />
      </Modal>

      {/* Modal Sanear Imputación */}
      <Modal
        isOpen={imputacionModal.isOpen}
        onClose={cerrarImputacion}
        title={`Sanear Imputación de Cargos (${imputacionModal.numero})`}
        maxWidth="860px"
        footer={
          <>
            <Button variant="secondary" onClick={cerrarImputacion}>
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleImputacionSubmit}>
              Guardar Evaluación
            </Button>
          </>
        }
      >
        {/* ---------- Evidencia ---------- */}
        {cargandoEvidencia ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Spinner size={28} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '10px' }}>Cargando evidencia del expediente...</p>
          </div>
        ) : errorEvidencia ? (
          <Alert type="error">{errorEvidencia}</Alert>
        ) : evidencia ? (
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {/* A quién se dirigió la NC — pregunta 1 */}
              <div style={estiloTarjetaEvidencia}>
                <h4 style={estiloTituloEvidencia}>A quién se dirigió la Notificación de Cargo</h4>
                {!evidencia.administrado ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>No hay datos del administrado registrados en la intervención.</p>
                ) : (
                  <>
                    {!evidencia.administrado.identificado && (
                      <div style={{ marginBottom: '6px' }}>
                        <Badge variant="warning">Administrado NO identificado en campo</Badge>
                      </div>
                    )}
                    <DatoEvidencia label="Nombre / Razón social" valor={evidencia.administrado.nombresRazonSocial} />
                    <DatoEvidencia label="Documento" valor={evidencia.administrado.numeroDocumento} />
                    <DatoEvidencia
                      label="Domicilio"
                      valor={
                        [evidencia.administrado.domicilio, evidencia.administrado.distrito].filter((v) => v && v.trim()).join(', ') || null
                      }
                    />
                    <DatoEvidencia label="Giro / uso" valor={evidencia.administrado.giroUso} />
                  </>
                )}
                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px' }}>
                  {!evidencia.notificacionCargo ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>La intervención no tiene Notificación de Cargo registrada.</p>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                        Quién recibió la NC N° {evidencia.notificacionCargo.numeroCorrelativo}
                      </div>
                      <DatoEvidencia label="Receptor" valor={evidencia.notificacionCargo.receptorNombre} />
                      <DatoEvidencia label="Documento del receptor" valor={evidencia.notificacionCargo.receptorDocumento} />
                      <DatoEvidencia label="Relación con el predio/negocio" valor={evidencia.notificacionCargo.receptorRelacion} />
                      <DatoEvidencia
                        label="Modo de notificación"
                        valor={
                          evidencia.notificacionCargo.modoNotificacion
                            ? LABEL_MODO_NOTIFICACION[evidencia.notificacionCargo.modoNotificacion] ?? evidencia.notificacionCargo.modoNotificacion
                            : null
                        }
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Infracción imputada — pregunta 2 */}
              <div style={estiloTarjetaEvidencia}>
                <h4 style={estiloTituloEvidencia}>Infracción imputada</h4>
                {evidencia.codigosCuis.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>No hay código de infracción registrado.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {evidencia.codigosCuis.map((c, i) => (
                      <div key={`${c.codigoNormativo}-${i}`}>
                        <Badge variant="info">{c.codigoNormativo}</Badge>
                        <div style={{ marginTop: '4px' }}>{c.descripcion?.trim() ? c.descripcion : <NoRegistrado />}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          Fuente normativa: {c.fuenteNormativa?.trim() ? c.fuenteNormativa : 'No registrada'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hechos verificados — pregunta 3 */}
            <div style={estiloTarjetaEvidencia}>
              <h4 style={estiloTituloEvidencia}>
                Hechos verificados
                {evidencia.actaFiscalizacion && (
                  <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>
                    {' '}
                    — Acta de Fiscalización N° {evidencia.actaFiscalizacion.numeroCorrelativo}
                  </span>
                )}
              </h4>
              {!evidencia.actaFiscalizacion ? (
                <p style={{ color: 'var(--color-text-muted)' }}>Esta intervención no tiene Acta de Fiscalización registrada.</p>
              ) : (
                <>
                  <p
                    style={{
                      backgroundColor: '#fdfdfd',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {evidencia.actaFiscalizacion.hechosVerificados?.trim() ? evidencia.actaFiscalizacion.hechosVerificados : <NoRegistrado />}
                  </p>
                  {evidencia.actaFiscalizacion.observacionesAdministrado?.trim() && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>Observaciones del administrado:</strong>
                      <p style={{ whiteSpace: 'pre-wrap', marginTop: '2px' }}>{evidencia.actaFiscalizacion.observacionesAdministrado}</p>
                    </div>
                  )}
                </>
              )}
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                Intervención del {formatearFechaHora(evidencia.intervencion.fechaHoraInicio)} · Dirección:{' '}
                {evidencia.intervencion.direccionAproximada?.trim() ? evidencia.intervencion.direccionAproximada : 'No registrada'}
              </div>
            </div>

            {/* Evidencia documental */}
            <div style={estiloTarjetaEvidencia}>
              <h4 style={estiloTituloEvidencia}>Evidencia</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {fotosEvidencia.map((f, i) => (
                  <Button key={f.id} variant="outline" size="sm" icon={<EyeIcon size={14} />} onClick={() => abrirDocumento(f.id)}>
                    {f.actaTipo ? LABEL_FOTO_ACTA[f.actaTipo] ?? `Foto (${f.actaTipo})` : `Foto de evidencia ${i + 1}`}
                  </Button>
                ))}
                {evidencia.actaFiscalizacion && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FileTextIcon size={14} />}
                    onClick={() => descargarDocumentoWord(evidencia.intervencionId, 'FISCALIZACION')}
                  >
                    Acta de Fiscalización (Word)
                  </Button>
                )}
                {evidencia.notificacionCargo && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FileTextIcon size={14} />}
                    onClick={() => descargarDocumentoWord(evidencia.intervencionId, 'NOTIFICACION_CARGO')}
                  >
                    Notificación de Cargo (Excel)
                  </Button>
                )}
              </div>
              {fotosEvidencia.length === 0 && (
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  No hay fotos registradas para esta intervención.
                </p>
              )}

              <div style={{ marginTop: '10px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Documentos adjuntos del IFI</div>
                {documentosEvidencia.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Todavía no hay documentos adjuntos.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {documentosEvidencia.map((d) => (
                      <Button key={d.id} variant="outline" size="sm" icon={<EyeIcon size={14} />} onClick={() => abrirDocumentoIfi(d.id)}>
                        {d.descripcion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                Los registros externos (DJ de Rentas, SUNARP, Licencias de Funcionamiento) por ahora se consultan fuera
                del sistema. Si te sirven como prueba, súbelos como documento adjunto del IFI (botón "Documentos
                adjuntos" en el detalle del expediente).
              </p>
            </div>
          </div>
        ) : null}

        {/* ---------- Checklist de apoyo (no se guarda) ---------- */}
        <div style={{ ...estiloTarjetaEvidencia, backgroundColor: '#ffffff', marginBottom: '16px' }}>
          <h4 style={estiloTituloEvidencia}>Revisión rápida</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PREGUNTAS_CHECKLIST.map((p) => (
              <div key={p.clave} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: 600 }}>{p.pregunta}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{p.ayuda}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`chk-${p.clave}`}
                      checked={checklist[p.clave] === 'SI'}
                      onChange={() => responderChecklist(p.clave, 'SI')}
                    />
                    Sí
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`chk-${p.clave}`}
                      checked={checklist[p.clave] === 'NO'}
                      onChange={() => responderChecklist(p.clave, 'NO')}
                    />
                    No
                  </label>
                </div>
              </div>
            ))}
          </div>
          {preguntasEnNo.length > 0 ? (
            <p style={{ fontSize: '12px', color: '#be123c', marginTop: '10px' }}>
              Sugerencia: marcamos "No" abajo porque respondiste "No" a:{' '}
              {preguntasEnNo.map((p) => p.pregunta).join(' / ')}
            </p>
          ) : checklistCompletoEnSi ? (
            <p style={{ fontSize: '12px', color: 'var(--color-success)', marginTop: '10px' }}>
              Sugerencia: todas las respuestas son "Sí", marcamos "Sí, es correcta" abajo.
            </p>
          ) : null}
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
            Esta revisión solo sugiere una respuesta, no se guarda. La decisión final es la de abajo.
          </p>
        </div>

        {/* ---------- Decisión ---------- */}
        {errorImputacion && <Alert type="error">{errorImputacion}</Alert>}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            ¿La Notificación de Cargo está bien dirigida y bien tipificada?
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="imputacion"
                checked={imputacionModal.correcta === true}
                onChange={() => {
                  setImputacionModal({ ...imputacionModal, correcta: true });
                  setErrorImputacion(null);
                }}
              />
              Sí, es correcta
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="imputacion"
                checked={imputacionModal.correcta === false}
                onChange={() => {
                  setImputacionModal({ ...imputacionModal, correcta: false });
                  setErrorImputacion(null);
                }}
              />
              No, tiene un error de fondo que no se puede corregir
            </label>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Si eliges "No", el caso se archiva y se pierde la multa (regla legal). Los errores menores de tipeo (un
            dígito del DNI, una fecha) no van aquí: se corrigen en la validación del expediente.
          </p>
        </div>

        {imputacionModal.correcta === false && (
          <Textarea
            label="¿Cuál es el error de fondo?"
            placeholder="Explica con tus palabras qué está mal y por qué impide seguir con la sanción..."
            value={motivoVicio}
            onChange={(e) => setMotivoVicio(e.target.value)}
            rows={4}
          />
        )}
      </Modal>

      {/* Modal Visor de Hechos y Base Legal (ex-Planchazo) */}
      <Modal
        isOpen={planchazoModal.isOpen}
        onClose={() => setPlanchazoModal({ isOpen: false, data: null })}
        title="Hechos y Base Legal del IFI"
        maxWidth="720px"
        footer={
          <Button variant="primary" onClick={() => setPlanchazoModal({ isOpen: false, data: null })}>
            Cerrar Visor
          </Button>
        }
      >
        {planchazoModal.data && (
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <strong>Administrado:</strong> {planchazoModal.data.datosHeredados.administrado?.nombresRazonSocial || '(no identificado)'}<br />
              <strong>N° Expediente:</strong> {planchazoModal.data.datosHeredados.numeroExpediente}<br />
              <strong>Código(s) infracción:</strong>{' '}
              {planchazoModal.data.datosHeredados.infracciones.length > 0
                ? planchazoModal.data.datosHeredados.infracciones
                    .map((i) => `${i.codigo}${i.escala ? ` (${i.escala}${i.porcentajeAplicado ? `, ${i.porcentajeAplicado}%` : ''})` : ''}`)
                    .join('; ')
                : '(sin código registrado)'}
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '4px' }}>Antecedentes:</h4>
              <p style={{ backgroundColor: '#fdfdfd', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', whiteSpace: 'pre-wrap' }}>
                {planchazoModal.data.antecedentes}
              </p>
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '4px' }}>Marco Normativo:</h4>
              <p style={{ backgroundColor: '#fdfdfd', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', whiteSpace: 'pre-wrap' }}>
                {planchazoModal.data.marcoNormativo}
              </p>
            </div>
            {planchazoModal.data.transcripcionActa && (
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '4px' }}>Transcripción del Acta:</h4>
                <p style={{ backgroundColor: '#fdfdfd', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', whiteSpace: 'pre-wrap' }}>
                  {planchazoModal.data.transcripcionActa}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Registrar Análisis */}
      <Modal
        isOpen={analisisModal.isOpen}
        onClose={() => setAnalisisModal({ isOpen: false, expId: '', numero: '' })}
        title={`Análisis Jurídico del Instructor (${analisisModal.numero})`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAnalisisModal({ isOpen: false, expId: '', numero: '' })}>
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleAnalisisSubmit}>
              Guardar Análisis
            </Button>
          </>
        }
      >
        <Textarea
          label="Fundamentación del Instructor"
          placeholder="Escriba la valoración de los medios probatorios, descargos y determinación de la responsabilidad administrativa..."
          value={analisisTexto}
          onChange={(e) => setAnalisisTexto(e.target.value)}
          rows={6}
        />
        <div style={{ marginTop: '12px' }}>
          <Textarea
            label="Base normativa adicional (opcional)"
            placeholder="Leyes o decretos que el marco normativo automático (catálogo CUIS) no cubre — ej. Ley de Canes, Ley General de Salud, normas del MTC, otra ordenanza específica..."
            value={basesLegalesTexto}
            onChange={(e) => setBasesLegalesTexto(e.target.value)}
            rows={3}
          />
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Se muestra aparte del marco normativo automático — nunca lo reemplaza.
          </p>
        </div>
      </Modal>

      {/* Modal Firmar IFI */}
      <Modal
        isOpen={firmarModal.isOpen}
        onClose={() => setFirmarModal({ isOpen: false, expId: '', numero: '' })}
        title={`Firmar IFI (${firmarModal.numero})`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFirmarModal({ isOpen: false, expId: '', numero: '' })}>
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleFirmarSubmit}>
              Firmar
            </Button>
          </>
        }
      >
        <Input
          label="N° del Informe Final de Instrucción"
          placeholder="Ej. 756-2026-MDSJL/GOP-SFSA-JLVN"
          value={numeroInforme}
          onChange={(e) => setNumeroInforme(e.target.value)}
        />
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
          Es el número que la oficina le asigna a este informe (ej. 756-2026-MDSJL/GOP-SFSA-JLVN). Lo escribe el instructor; el sistema no lo genera.
        </p>
      </Modal>

      {/* Modal Notificar IFI */}
      <Modal
        isOpen={notificarModal.isOpen}
        onClose={() => setNotificarModal({ isOpen: false, expId: '', numero: '' })}
        title={`Notificar IFI al Administrado (${notificarModal.numero})`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNotificarModal({ isOpen: false, expId: '', numero: '' })}>
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleNotificarSubmit}>
              Registrar Fecha Notificación
            </Button>
          </>
        }
      >
        <Input
          type="date"
          label="Fecha de Notificación Efectiva"
          value={fechaNotificacion}
          max={hoyLocal()}
          onChange={(e) => setFechaNotificacion(e.target.value)}
          helperText="La fecha real en que el administrado recibió el IFI. No puede ser una fecha futura."
        />
      </Modal>

      {/* Modal Documentos Adjuntos del IFI */}
      <Modal
        isOpen={documentosModal.isOpen}
        onClose={() => setDocumentosModal({ isOpen: false, expId: '', numero: '' })}
        title={`Documentos Adjuntos del IFI (${documentosModal.numero})`}
        maxWidth="640px"
        footer={
          <Button variant="secondary" onClick={() => setDocumentosModal({ isOpen: false, expId: '', numero: '' })}>
            Cerrar
          </Button>
        }
      >
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          Memos de otras áreas, descargos con anexos, fotos adicionales u otros documentos de terceros —
          más allá de lo que ya trae automáticamente el acta y la NC.
        </p>

        {cargandoDocumentos ? (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Spinner size={24} />
          </div>
        ) : documentos.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Todavía no hay documentos adjuntos.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {documentos.map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{d.descripcion}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {d.nombreOriginal} · {formatearFechaHora(d.subidoEn)}
                  </div>
                </div>
                <Button variant="outline" size="sm" icon={<EyeIcon size={14} />} onClick={() => abrirDocumentoIfi(d.id)}>
                  Ver
                </Button>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <Input
            label="¿Qué es este documento? (ej. Memo N°142-2026-SGGRD)"
            value={nuevaDescripcion}
            onChange={(e) => setNuevaDescripcion(e.target.value)}
          />
          <div className="form-group">
            <label className="form-label">Archivo</label>
            <input
              type="file"
              onChange={(e) => setNuevoArchivo(e.target.files?.[0] ?? null)}
              style={{ fontSize: '13px' }}
            />
          </div>
          <Button variant="primary" size="sm" loading={subiendoDocumento} onClick={handleSubirDocumento} style={{ marginTop: '8px' }}>
            Adjuntar documento
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// PANEL DE DETALLE EN PASOS
// ============================================================================
interface IfiDetallePanelProps {
  expediente: ExpedienteIfiItem;
  onClose: () => void;
  onAbrirDescargo: () => void;
  onAbrirImputacion: () => void;
  onGenerarHechosBaseLegal: () => void;
  onAbrirAnalisis: () => void;
  onRecomendar: (rec: 'SANCIONAR' | 'ARCHIVAR') => void;
  onAbrirFirmar: () => void;
  onDescargarDocumento: () => void;
  descargandoDocumento: boolean;
  onAbrirNotificar: () => void;
  onAbrirDocumentos: () => void;
  actionLoading: boolean;
}

interface StepDef {
  numero: number;
  titulo: string;
  estado: PasoEstado;
  descripcion: React.ReactNode;
  accion?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'outline'; icon?: React.ReactNode; loading?: boolean };
  accionSecundaria?: { label: string; onClick: () => void };
}

const IfiDetallePanel: React.FC<IfiDetallePanelProps> = ({
  expediente: e,
  onClose,
  onAbrirDescargo,
  onAbrirImputacion,
  onGenerarHechosBaseLegal,
  onAbrirAnalisis,
  onRecomendar,
  onAbrirFirmar,
  onDescargarDocumento,
  descargandoDocumento,
  onAbrirNotificar,
  onAbrirDocumentos,
  actionLoading,
}) => {
  const imputacionSaneada = e.imputacionCorrecta !== null;
  const esViciada = e.imputacionCorrecta === false;
  const esCorrecta = e.imputacionCorrecta === true;

  const steps: StepDef[] = useMemo(() => {
    const lista: StepDef[] = [];

    // Paso 1: Descargo — opcional, nunca bloquea nada.
    lista.push({
      numero: 1,
      titulo: 'Descargo del administrado',
      estado: e.recibioDescargo ? 'completado' : 'actual',
      descripcion: e.recibioDescargo ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
          <CheckIcon size={12} /> Descargo presentado y registrado.
        </span>
      ) : (
        <span style={{ color: '#b45309' }}>Sin descargo aún. Paso informativo — no bloquea el resto del flujo.</span>
      ),
      accion: e.recibioDescargo
        ? undefined
        : { label: '+ Registrar descargo', onClick: onAbrirDescargo, variant: 'secondary' },
    });

    // Paso 2: Sanear Imputación — obligatorio, una sola vez (vicio trascendente nunca se corrige).
    lista.push({
      numero: 2,
      titulo: 'Sanear imputación de cargos',
      estado: imputacionSaneada ? 'completado' : lista.every((s) => s.estado === 'completado') ? 'actual' : 'pendiente',
      descripcion: !imputacionSaneada ? (
        <span style={{ color: 'var(--color-text-muted)' }}>Define si la imputación de cargos es jurídicamente correcta.</span>
      ) : esCorrecta ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
          <CheckIcon size={12} /> Imputación saneada como correcta.
        </span>
      ) : (
        <span style={{ color: '#be123c', fontWeight: 600 }}>
          Imputación declarada VICIADA (vicio trascendente insubsanable) — recomendación fijada automáticamente en
          ARCHIVAR. Esta decisión no se puede corregir (regla legal, no un error a arreglar).
        </span>
      ),
      accion: imputacionSaneada
        ? undefined
        : { label: 'Sanear imputación', onClick: onAbrirImputacion, variant: 'primary' },
    });

    if (esViciada) {
      // Camino ARCHIVAR por vicio: no hay "Hechos y Base Legal" que generar
      // (la imputación misma es inválida, no hay hechos que redactar) ni
      // "Recomendación" que definir (ya quedó fijada en ARCHIVAR al sanear
      // la imputación). Salta directo a Análisis (la fundamentación del
      // cierre) → Firmar → Notificar, igual que el camino normal pero más
      // corto.
      const yaFirmadoVicio = e.ifiEstado === 'EMITIDO' || e.ifiEstado === 'NOTIFICADO';
      const puedeFirmarVicio = e.tieneAnalisis && e.ifiEstado === 'EN_ELABORACION';

      lista.push({
        numero: 3,
        titulo: 'Análisis — fundamentar el archivo',
        estado: e.tieneAnalisis ? 'completado' : 'actual',
        descripcion: e.tieneAnalisis ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
            <CheckIcon size={12} /> Fundamentación de archivo redactada.
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>
            Redacta la fundamentación del archivo (puede citar el motivo del vicio ya registrado) — texto libre
            del instructor, nunca generado por el sistema.
          </span>
        ),
        accion: { label: e.tieneAnalisis ? 'Editar análisis' : 'Redactar análisis', onClick: onAbrirAnalisis, variant: e.tieneAnalisis ? 'outline' : 'primary' },
      });

      lista.push({
        numero: 4,
        titulo: 'Firmar IFI',
        estado: yaFirmadoVicio ? 'completado' : puedeFirmarVicio ? 'actual' : 'pendiente',
        descripcion: yaFirmadoVicio ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
            <CheckIcon size={12} /> Firmado{e.numeroInforme ? ` — N° Informe ${e.numeroInforme}` : ''}.
          </span>
        ) : puedeFirmarVicio ? (
          <span style={{ color: 'var(--color-text-muted)' }}>Al firmar se pide el N° del Informe Final de Instrucción (el número que la oficina le asigna, ej. 756-2026-MDSJL/GOP-SFSA-JLVN).</span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>Disponible después de redactar el análisis.</span>
        ),
        accion: yaFirmadoVicio || !puedeFirmarVicio ? undefined : { label: 'Firmar', onClick: onAbrirFirmar, variant: 'primary', icon: <PenToolIcon size={14} /> },
      });

      lista.push({
        numero: 5,
        titulo: 'Descargar IFI (Word)',
        estado: yaFirmadoVicio ? 'actual' : 'pendiente',
        descripcion: yaFirmadoVicio ? (
          <span style={{ color: 'var(--color-text-muted)' }}>Genera el documento Word al vuelo con los datos actuales.</span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>Disponible después de firmar.</span>
        ),
        accion: yaFirmadoVicio
          ? { label: 'Descargar IFI (Word)', onClick: onDescargarDocumento, variant: 'outline', icon: <PrinterIcon size={14} />, loading: descargandoDocumento }
          : undefined,
      });

      lista.push({
        numero: 6,
        titulo: 'Notificar al administrado',
        estado: e.ifiEstado === 'NOTIFICADO' ? 'completado' : e.ifiEstado === 'EMITIDO' ? 'actual' : 'pendiente',
        descripcion:
          e.ifiEstado === 'NOTIFICADO' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
              <CheckIcon size={12} /> Notificado.
            </span>
          ) : e.ifiEstado === 'EMITIDO' ? (
            <span style={{ color: 'var(--color-text-muted)' }}>Registra la fecha en que se notificó el archivo al administrado.</span>
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>Disponible después de firmar.</span>
          ),
        accion: e.ifiEstado === 'EMITIDO' ? { label: 'Notificar', onClick: onAbrirNotificar, variant: 'primary' } : undefined,
      });

      return lista;
    }

    // Paso 3: Hechos y Base Legal (ex-Planchazo) — solo si imputación correcta. Puede regenerarse siempre.
    lista.push({
      numero: 3,
      titulo: 'Hechos y Base Legal',
      estado: !esCorrecta ? 'pendiente' : e.tieneSeccionAutomatica ? 'completado' : 'actual',
      descripcion: !esCorrecta ? (
        <span style={{ color: 'var(--color-text-muted)' }}>Disponible una vez saneada la imputación como correcta.</span>
      ) : e.tieneSeccionAutomatica ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
          <CheckIcon size={12} /> Generado. Se puede regenerar si cambiaron los datos fuente.
        </span>
      ) : (
        <span style={{ color: 'var(--color-text-muted)' }}>
          Antecedentes, marco normativo y transcripción del acta, generados automáticamente con los datos del
          expediente.
        </span>
      ),
      accion: !esCorrecta
        ? undefined
        : {
            label: e.tieneSeccionAutomatica ? 'Ver de nuevo / Regenerar' : 'Generar',
            onClick: onGenerarHechosBaseLegal,
            variant: e.tieneSeccionAutomatica ? 'outline' : 'primary',
            icon: <EyeIcon size={14} />,
            loading: actionLoading,
          },
    });

    // Paso 4: Análisis — requiere seccionAutomatica.
    lista.push({
      numero: 4,
      titulo: 'Análisis del instructor',
      estado: !e.tieneSeccionAutomatica ? 'pendiente' : e.tieneAnalisis ? 'completado' : 'actual',
      descripcion: !e.tieneSeccionAutomatica ? (
        <span style={{ color: 'var(--color-text-muted)' }}>Disponible después de generar Hechos y Base Legal.</span>
      ) : e.tieneAnalisis ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
          <CheckIcon size={12} /> Análisis redactado.
        </span>
      ) : (
        <span style={{ color: 'var(--color-text-muted)' }}>Criterio jurídico del instructor — texto libre, nunca generado por el sistema.</span>
      ),
      accion: !e.tieneSeccionAutomatica
        ? undefined
        : { label: e.tieneAnalisis ? 'Editar análisis' : 'Redactar análisis', onClick: onAbrirAnalisis, variant: e.tieneAnalisis ? 'outline' : 'primary' },
    });

    // Paso 5: Recomendación — requiere análisis + imputación correcta (ya garantizado en esta rama).
    lista.push({
      numero: 5,
      titulo: 'Recomendación',
      estado: !e.tieneAnalisis ? 'pendiente' : e.recomendacion ? 'completado' : 'actual',
      descripcion: !e.tieneAnalisis ? (
        <span style={{ color: 'var(--color-text-muted)' }}>Disponible después de redactar el análisis.</span>
      ) : e.recomendacion ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
          <CheckIcon size={12} /> {e.recomendacion}
        </span>
      ) : (
        <span style={{ color: 'var(--color-text-muted)' }}>Decide si se recomienda sancionar o archivar el expediente.</span>
      ),
      accion:
        !e.tieneAnalisis || e.recomendacion
          ? undefined
          : { label: 'Recomendar Sancionar', onClick: () => onRecomendar('SANCIONAR'), variant: 'primary' },
      accionSecundaria: !e.tieneAnalisis || e.recomendacion ? undefined : { label: 'Recomendar Archivar', onClick: () => onRecomendar('ARCHIVAR') },
    });

    // Paso 6: Firmar — requiere análisis + recomendación, solo EN_ELABORACION.
    const puedeFirmar = e.tieneAnalisis && !!e.recomendacion && e.ifiEstado === 'EN_ELABORACION';
    const yaFirmado = e.ifiEstado === 'EMITIDO' || e.ifiEstado === 'NOTIFICADO';
    lista.push({
      numero: 6,
      titulo: 'Firmar IFI',
      estado: yaFirmado ? 'completado' : puedeFirmar ? 'actual' : 'pendiente',
      descripcion: yaFirmado ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
          <CheckIcon size={12} /> Firmado{e.numeroInforme ? ` — N° Informe ${e.numeroInforme}` : ''}.
        </span>
      ) : puedeFirmar ? (
        <span style={{ color: 'var(--color-text-muted)' }}>Al firmar se pide el N° del Informe Final de Instrucción (el número que la oficina le asigna, ej. 756-2026-MDSJL/GOP-SFSA-JLVN).</span>
      ) : (
        <span style={{ color: 'var(--color-text-muted)' }}>Disponible después de tener análisis y recomendación.</span>
      ),
      accion: yaFirmado || !puedeFirmar ? undefined : { label: 'Firmar', onClick: onAbrirFirmar, variant: 'primary', icon: <PenToolIcon size={14} /> },
    });

    // Paso 7 (no numerado como bloqueante): Descargar Word — habilitado una vez firmado.
    lista.push({
      numero: 7,
      titulo: 'Descargar IFI (Word)',
      estado: yaFirmado ? 'actual' : 'pendiente',
      descripcion: yaFirmado ? (
        <span style={{ color: 'var(--color-text-muted)' }}>Genera el documento Word al vuelo con los datos actuales del IFI.</span>
      ) : (
        <span style={{ color: 'var(--color-text-muted)' }}>Disponible después de firmar.</span>
      ),
      accion: yaFirmado
        ? { label: 'Descargar IFI (Word)', onClick: onDescargarDocumento, variant: 'outline', icon: <PrinterIcon size={14} />, loading: descargandoDocumento }
        : undefined,
    });

    // Paso 8: Notificar — solo EMITIDO.
    lista.push({
      numero: 8,
      titulo: 'Notificar al administrado',
      estado: e.ifiEstado === 'NOTIFICADO' ? 'completado' : e.ifiEstado === 'EMITIDO' ? 'actual' : 'pendiente',
      descripcion:
        e.ifiEstado === 'NOTIFICADO' ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 600 }}>
            <CheckIcon size={12} /> Notificado.
          </span>
        ) : e.ifiEstado === 'EMITIDO' ? (
          <span style={{ color: 'var(--color-text-muted)' }}>Registra la fecha real de entrega al administrado.</span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>Disponible después de firmar el IFI.</span>
        ),
      accion:
        e.ifiEstado === 'EMITIDO' ? { label: 'Notificar', onClick: onAbrirNotificar, variant: 'primary' } : undefined,
    });

    return lista;
  }, [e, esViciada, esCorrecta, imputacionSaneada, actionLoading, descargandoDocumento]);

  return (
    <Modal isOpen onClose={onClose} title={`Expediente ${e.numeroExpediente} — Detalle de instrucción`} maxWidth="680px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {steps.map((step, idx) => (
          <div key={step.numero} style={{ display: 'flex', gap: '14px' }}>
            {/* Círculo + línea conectora */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  backgroundColor:
                    step.estado === 'completado'
                      ? '#047857'
                      : step.estado === 'actual'
                      ? 'var(--color-primary-600)'
                      : step.estado === 'no-aplica'
                      ? '#be123c'
                      : '#e2e8f0',
                  color: step.estado === 'pendiente' ? '#64748b' : '#ffffff',
                }}
              >
                {step.estado === 'completado' ? <CheckIcon size={13} /> : step.numero}
              </div>
              {idx < steps.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: '24px', backgroundColor: step.estado === 'completado' ? '#047857' : '#e2e8f0' }} />
              )}
            </div>

            {/* Contenido del paso */}
            <div style={{ paddingBottom: '20px', flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: step.estado === 'pendiente' ? '#94a3b8' : 'var(--color-midnight-900)' }}>
                {step.titulo}
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px', marginBottom: step.accion || step.accionSecundaria ? '8px' : 0 }}>
                {step.descripcion}
              </div>
              {(step.accion || step.accionSecundaria) && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {step.accion && (
                    <Button variant={step.accion.variant || 'primary'} size="sm" icon={step.accion.icon} loading={step.accion.loading} onClick={step.accion.onClick}>
                      {step.accion.label}
                    </Button>
                  )}
                  {step.accionSecundaria && (
                    <Button variant="secondary" size="sm" onClick={step.accionSecundaria.onClick}>
                      {step.accionSecundaria.label}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Documentos adjuntos — no es secuencial, disponible en paralelo siempre */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>Documentos Adjuntos</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Memos, evidencia adicional — se puede usar en cualquier momento.</div>
          </div>
          <Button variant="secondary" size="sm" icon={<FileTextIcon size={14} />} onClick={onAbrirDocumentos}>
            Ver documentos
          </Button>
        </div>
      </div>
    </Modal>
  );
};
