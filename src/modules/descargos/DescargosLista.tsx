import React, { useCallback, useEffect, useState } from 'react';
import { abrirDocumentoDescargo, DescargoItem, DescargosApi, LABEL_ETAPA_DESCARGO, ListaDescargos } from '../../api/descargos';
import { Alert, Badge, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { formatearFecha, formatearFechaHora, hoyLocal } from '../../lib/fechas';
import { EyeIcon, FileTextIcon, PlusIcon } from '../../components/icons/Icons';

interface Props {
  expedienteId: string;
  /** Tras registrar un descargo (el panel refresca lo que dependa de él). */
  onCambio?: () => void;
}

const CLASE_INPUT_ARCHIVO =
  'block w-full text-[13px] text-text-secondary file:mr-[12px] file:py-[6px] file:px-[12px] file:rounded-sm file:border file:border-border file:bg-[#ffffff] file:text-[13px] file:font-semibold file:cursor-pointer';

/**
 * O3 — descargos del administrado (varios, hasta la resolución), con sus PDF
 * del SGD. La misma lista se ve en el IFI y en la Resolución, cada descargo
 * etiquetado con la etapa en que se presentó (antes / después del IFI).
 */
export const DescargosLista: React.FC<Props> = ({ expedienteId, onCambio }) => {
  const [lista, setLista] = useState<ListaDescargos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [adjuntandoId, setAdjuntandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLista(await DescargosApi.listar(expedienteId));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los descargos.');
    }
  }, [expedienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirPdf = (documentoId: string) => abrirDocumentoDescargo(documentoId).catch((err: any) => setError(err.message));

  const adjuntar = async (descargoId: string, archivos: File[]) => {
    if (archivos.length === 0) return;
    const noPdf = archivos.find((a) => !a.name.toLowerCase().endsWith('.pdf'));
    if (noPdf) return setError(`"${noPdf.name}" no es un PDF.`);
    setAdjuntandoId(descargoId);
    try {
      await DescargosApi.adjuntarDocumentos(descargoId, archivos);
      await cargar();
    } catch (err: any) {
      setError(err.message || 'No se pudo adjuntar el PDF.');
    } finally {
      setAdjuntandoId(null);
    }
  };

  if (!lista && !error) {
    return (
      <div className="flex items-center gap-[8px] text-[12px] text-text-muted">
        <Spinner size={14} /> Cargando descargos…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {error && (
        <Alert type="error" className="mb-0!">
          {error}
        </Alert>
      )}
      {lista && lista.descargos.length === 0 && <span className="text-[12px] text-text-muted">Sin descargos registrados.</span>}
      {lista?.descargos.map((d) => (
        <FilaDescargo
          key={d.id}
          d={d}
          expandido={expandido === d.id}
          onToggle={() => setExpandido((v) => (v === d.id ? null : d.id))}
          onAbrirPdf={abrirPdf}
          puedeAdjuntar={lista.puedeRegistrar}
          adjuntando={adjuntandoId === d.id}
          onAdjuntar={(archivos) => adjuntar(d.id, archivos)}
        />
      ))}
      {lista && (
        <div className="flex items-center gap-[8px] flex-wrap">
          <Button size="sm" variant="secondary" icon={<PlusIcon size={14} />} disabled={!lista.puedeRegistrar} onClick={() => setModalAbierto(true)}>
            Agregar descargo
          </Button>
          {!lista.puedeRegistrar && lista.motivoNoRegistrable && <span className="text-[11px] text-text-muted">{lista.motivoNoRegistrable}</span>}
        </div>
      )}
      {modalAbierto && (
        <AgregarDescargoModal
          expedienteId={expedienteId}
          onClose={() => setModalAbierto(false)}
          onRegistrado={async () => {
            setModalAbierto(false);
            await cargar();
            onCambio?.();
          }}
        />
      )}
    </div>
  );
};

const FilaDescargo: React.FC<{
  d: DescargoItem;
  expandido: boolean;
  onToggle: () => void;
  onAbrirPdf: (documentoId: string) => void;
  puedeAdjuntar: boolean;
  adjuntando: boolean;
  onAdjuntar: (archivos: File[]) => void;
}> = ({ d, expandido, onToggle, onAbrirPdf, puedeAdjuntar, adjuntando, onAdjuntar }) => (
  <div className="bg-[#f8fafc] border border-border rounded-[8px] py-[8px] px-[12px] text-[12px]">
    <div className="flex items-center justify-between gap-[8px] flex-wrap">
      <div className="flex items-center gap-[8px] flex-wrap">
        <span className="font-bold text-midnight-900">
          {d.fechaPresentacion ? `Presentado el ${formatearFecha(d.fechaPresentacion)}` : 'Fecha no registrada'}
        </span>
        <Badge variant={d.etapa === 'ANTES_IFI' ? 'info' : 'warning'}>{LABEL_ETAPA_DESCARGO[d.etapa]}</Badge>
        {d.numeroDocumentoSgd && <span className="text-text-muted">SGD N° {d.numeroDocumentoSgd}</span>}
      </div>
      <Button size="sm" variant="outline" icon={<EyeIcon size={12} />} onClick={onToggle}>
        {expandido ? 'Ocultar' : 'Ver'}
      </Button>
    </div>
    {expandido && (
      <div className="mt-[8px] flex flex-col gap-[6px]">
        <div className="whitespace-pre-wrap bg-[#ffffff] border border-border rounded-[6px] py-[8px] px-[10px] leading-[1.5]">
          {d.resumen?.trim() || 'Sin resumen registrado.'}
        </div>
        <div className="text-text-muted">
          Registrado {d.registradoPor ? `por ${d.registradoPor} ` : ''}el {formatearFechaHora(d.createdAt)}
        </div>
        {d.documentos.length === 0 ? (
          <span className="text-text-muted">Sin PDF adjunto.</span>
        ) : (
          <div className="flex flex-wrap gap-[6px]">
            {d.documentos.map((doc) => (
              <Button key={doc.id} size="sm" variant="outline" icon={<FileTextIcon size={12} />} onClick={() => onAbrirPdf(doc.id)}>
                {doc.nombreOriginal}
              </Button>
            ))}
          </div>
        )}
        {puedeAdjuntar && (
          <label className="text-[12px] text-text-secondary flex items-center gap-[8px] flex-wrap">
            <span className="font-semibold">{adjuntando ? 'Subiendo…' : 'Adjuntar PDF:'}</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              disabled={adjuntando}
              onChange={(e) => {
                onAdjuntar(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
              className={CLASE_INPUT_ARCHIVO}
            />
          </label>
        )}
      </div>
    )}
  </div>
);

/** Fecha, resumen y N° SGD nacen vacíos: se copian del escrito real (nunca "hoy" por defecto). */
const AgregarDescargoModal: React.FC<{ expedienteId: string; onClose: () => void; onRegistrado: () => void }> = ({
  expedienteId,
  onClose,
  onRegistrado,
}) => {
  const [fecha, setFecha] = useState('');
  const [resumen, setResumen] = useState('');
  const [numeroSgd, setNumeroSgd] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setError(null);
    if (!fecha) return setError('Ingresa la fecha real de presentación del descargo.');
    if (fecha > hoyLocal()) return setError('La fecha de presentación no puede ser futura.');
    if (!resumen.trim()) return setError('Escribe un resumen del descargo.');
    const noPdf = archivos.find((a) => !a.name.toLowerCase().endsWith('.pdf'));
    if (noPdf) return setError(`"${noPdf.name}" no es un PDF.`);
    setGuardando(true);
    try {
      await DescargosApi.registrar(expedienteId, {
        fechaPresentacion: fecha,
        resumen: resumen.trim(),
        numeroDocumentoSgd: numeroSgd.trim() || undefined,
        archivos,
      });
      onRegistrado();
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar el descargo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Agregar descargo del administrado"
      maxWidth="640px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={guardar}>
            Guardar descargo
          </Button>
        </>
      }
    >
      {error && <Alert type="error">{error}</Alert>}
      <div className="grid grid-cols-2 gap-x-[14px] max-md:grid-cols-1">
        <Input type="date" label="Fecha de presentación" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} />
        <Input label="N° de documento SGD (opcional)" value={numeroSgd} onChange={(e) => setNumeroSgd(e.target.value)} />
      </div>
      <Textarea
        label="Resumen del descargo"
        placeholder="Argumentos y medios probatorios que presenta el administrado"
        value={resumen}
        onChange={(e) => setResumen(e.target.value)}
        rows={5}
      />
      <div className="mb-[6px]">
        <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Escrito en PDF (opcional, uno o varios)</label>
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
          className={CLASE_INPUT_ARCHIVO}
        />
        {archivos.length > 0 && <p className="text-[12px] text-text-muted mt-[4px]">{archivos.map((a) => a.name).join(', ')}</p>}
      </div>
    </Modal>
  );
};
