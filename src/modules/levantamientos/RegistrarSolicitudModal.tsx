import React, { useEffect, useState } from 'react';
import { CanalSolicitudLevantamiento, LevantamientosApi, MedidaLevantamientoItem } from '../../api';
import { Alert, Badge, Button, Input, Modal, Textarea } from '../../components/common/Common';
import { ComboboxExpediente } from '../../components/common/ComboboxExpediente';
import { formatearFecha, formatearFechaHora } from '../../lib/fechas';
import { ahoraInputLima, isoDesdeInputLima, previsualizarVencimiento, tipoMedidaTexto } from './levantamientoUi';

interface Props {
  onClose: () => void;
  /** Tras registrar: la vista recarga y abre la solicitud creada. */
  onRegistrada: (id: string) => void;
}

const etiquetaMedida = (m: MedidaLevantamientoItem) =>
  `${m.medida.numeroExpediente ?? 'Sin expediente'} · ${tipoMedidaTexto(m.medida.tipoMedida)} · Acta N° ${m.medida.numeroActa}`;

/**
 * Registrar la solicitud presentada por Mesa de Partes. La fecha y hora de
 * presentación nacen VACÍAS: las escribe el usuario tal como figuran en el
 * cargo de recepción (de ahí corre el plazo), nunca "ahora" por defecto.
 */
export const RegistrarSolicitudModal: React.FC<Props> = ({ onClose, onRegistrada }) => {
  const [medidas, setMedidas] = useState<MedidaLevantamientoItem[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorMedidas, setErrorMedidas] = useState<string | null>(null);
  const [medida, setMedida] = useState<MedidaLevantamientoItem | null>(null);

  const [fechaHora, setFechaHora] = useState('');
  const [canal, setCanal] = useState<CanalSolicitudLevantamiento | ''>('');
  const [numeroRegistro, setNumeroRegistro] = useState('');
  const [correo, setCorreo] = useState('');
  const [resumen, setResumen] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    LevantamientosApi.buscarMedidas('')
      .then((data) => setMedidas(Array.isArray(data) ? data : []))
      .catch((err: any) => setErrorMedidas(err.message || 'No se pudieron cargar las medidas provisionales.'))
      .finally(() => setCargando(false));
  }, []);

  const venceEn = medida && fechaHora ? previsualizarVencimiento(medida.medida.tipoMedida, isoDesdeInputLima(fechaHora)) : null;
  const esClausura = !!medida && medida.medida.tipoMedida.toUpperCase().startsWith('CLAUSURA');

  const guardar = async () => {
    setError(null);
    if (!medida) return setError('Elige la medida provisional.');
    if (!medida.puedeRegistrarSolicitud) {
      return setError(
        medida.estado === 'LEVANTADA'
          ? 'Esa medida ya está levantada.'
          : 'Esa medida ya tiene una solicitud en evaluación: resuélvela antes de registrar otra.',
      );
    }
    if (!fechaHora) return setError('Ingresa la fecha y hora de presentación (tal como figura en el cargo de Mesa de Partes).');
    if (fechaHora > ahoraInputLima()) return setError('La fecha y hora de presentación no pueden ser futuras.');
    if (!canal) return setError('Elige el canal de presentación.');
    if (!resumen.trim()) return setError('Escribe un resumen de lo que solicita el administrado.');
    const noPdf = archivos.find((a) => !a.name.toLowerCase().endsWith('.pdf'));
    if (noPdf) return setError(`"${noPdf.name}" no es un PDF.`);

    setGuardando(true);
    try {
      const { id } = await LevantamientosApi.registrar({
        actaMedidaProvisionalId: medida.medida.actaMedidaProvisionalId,
        fechaHoraPresentacion: isoDesdeInputLima(fechaHora),
        canal,
        numeroRegistro: numeroRegistro.trim() || undefined,
        correoNotificacion: correo.trim() || undefined,
        resumen: resumen.trim(),
        archivos,
      });
      onRegistrada(id);
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar la solicitud.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Registrar solicitud de levantamiento"
      maxWidth="720px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={guardar}>
            Registrar solicitud
          </Button>
        </>
      }
    >
      {error && <Alert type="error">{error}</Alert>}

      <ComboboxExpediente<MedidaLevantamientoItem>
        label="Medida provisional (N° de expediente, tipo y N° de acta)"
        placeholder="Haz clic para ver las medidas, o escribe el N° de expediente o de acta"
        opciones={medidas}
        cargando={cargando}
        error={errorMedidas}
        seleccionada={medida}
        onSeleccionar={setMedida}
        obtenerClave={(m) => m.medida.actaMedidaProvisionalId}
        obtenerNumeroExpediente={etiquetaMedida}
        renderDetalle={(m) =>
          m.estado === 'LEVANTADA' ? (
            <Badge variant="success">Levantada</Badge>
          ) : m.solicitudAbierta ? (
            <Badge variant="warning">Solicitud en evaluación</Badge>
          ) : (
            <Badge variant="neutral">Vigente</Badge>
          )
        }
        mensajeVacio="No hay medidas provisionales registradas."
      />

      {medida && (
        <div className="bg-[#f8fafc] py-[12px] px-[14px] rounded-[8px] border border-border text-[13px] mb-[14px]">
          <div className="font-bold text-midnight-900 mb-[4px]">
            {tipoMedidaTexto(medida.medida.tipoMedida)} — Acta N° {medida.medida.numeroActa} ({formatearFecha(medida.medida.fechaIntervencion)})
          </div>
          <div className="text-text-secondary">
            Administrado: {medida.medida.administradoNombre ?? 'no identificado'}
            {medida.medida.administradoDocumento ? ` (${medida.medida.administradoDocumento})` : ''}
            {medida.medida.numeroNotificacionCargo ? ` · NC N° ${medida.medida.numeroNotificacionCargo}` : ''}
          </div>
          {medida.medida.lugarEjecucion && <div className="text-text-secondary">Lugar: {medida.medida.lugarEjecucion}</div>}
          {!medida.puedeRegistrarSolicitud && (
            <div className="text-[#be123c] font-semibold mt-[6px]">
              {medida.estado === 'LEVANTADA' ? 'La medida ya está levantada.' : 'Ya tiene una solicitud en evaluación.'}
            </div>
          )}
          {medida.totalSolicitudes > 0 && (
            <div className="text-text-muted text-[12px] mt-[4px]">Solicitudes anteriores: {medida.totalSolicitudes}.</div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-[14px] max-md:grid-cols-1">
        <Input
          type="datetime-local"
          label="Fecha y hora de presentación"
          value={fechaHora}
          max={ahoraInputLima()}
          onChange={(e) => setFechaHora(e.target.value)}
          helperText="Tal como figura en el cargo de Mesa de Partes (hora de Lima)."
        />
        <div className="mb-[14px] w-full">
          <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Canal</label>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as CanalSolicitudLevantamiento | '')}
            className="w-full py-[10px] px-[14px] text-[14px] rounded-sm border border-border bg-[#ffffff] text-text-main outline-none"
          >
            <option value="">— Elegir —</option>
            <option value="PRESENCIAL">Mesa de Partes presencial</option>
            <option value="VIRTUAL">Mesa de Partes virtual</option>
          </select>
        </div>
        <Input label="N° de registro (opcional)" placeholder="Tal como figura en el SGD" value={numeroRegistro} onChange={(e) => setNumeroRegistro(e.target.value)} />
        <Input
          type="email"
          label="Correo declarado (opcional)"
          placeholder="Solo si lo declaró para notificaciones"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
      </div>

      {venceEn && (
        <Alert type={esClausura ? 'warning' : 'info'}>
          Plazo para pronunciarse: <strong>{esClausura ? '48 horas corridas' : '30 días calendario'}</strong> (
          {esClausura ? 'Ley 28976, art. 21.6 — cuentan sábados, domingos y feriados' : 'Ord. 464-MDSJL, art. 63.2'}). Vence el{' '}
          <strong>{formatearFechaHora(venceEn.toISOString())}</strong>. Si vence sin carta firmada, la medida queda levantada por ley.
        </Alert>
      )}

      <Textarea label="Resumen de la solicitud" value={resumen} onChange={(e) => setResumen(e.target.value)} placeholder="Qué pide y qué adjunta el administrado" />

      <div className="mb-[6px]">
        <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Solicitud en PDF (opcional, uno o varios)</label>
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
          className="block w-full text-[13px] text-text-secondary file:mr-[12px] file:py-[6px] file:px-[12px] file:rounded-sm file:border file:border-border file:bg-[#ffffff] file:text-[13px] file:font-semibold file:cursor-pointer"
        />
        {archivos.length > 0 && (
          <p className="text-[12px] text-text-muted mt-[4px]">{archivos.map((a) => a.name).join(', ')}</p>
        )}
      </div>
    </Modal>
  );
};
