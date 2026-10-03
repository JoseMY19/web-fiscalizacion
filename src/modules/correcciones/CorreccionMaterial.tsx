import React, { useCallback, useEffect, useState } from 'react';
import {
  CampoCorreccionMaterial,
  CorreccionesApi,
  CorreccionMaterialItem,
  EstadoCorrecciones,
  LABEL_CAMPO_CORRECCION,
} from '../../api/correcciones';
import { Alert, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { formatearFechaHora } from '../../lib/fechas';
import { PenToolIcon } from '../../components/icons/Icons';

const CAMPOS = Object.keys(LABEL_CAMPO_CORRECCION) as CampoCorreccionMaterial[];

/** "Historial de correcciones" (fecha, autor, campo, antes → después, motivo). Solo lectura. */
export const HistorialCorrecciones: React.FC<{ historial: CorreccionMaterialItem[] }> = ({ historial }) =>
  historial.length === 0 ? (
    <p className="text-[12px] text-text-muted">Sin correcciones de error material.</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="text-left text-text-muted border-b border-b-border">
            <th className="py-[6px] pr-[10px]">Fecha</th>
            <th className="py-[6px] pr-[10px]">Autor</th>
            <th className="py-[6px] pr-[10px]">Campo</th>
            <th className="py-[6px] pr-[10px]">Antes → después</th>
            <th className="py-[6px]">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((h) => (
            <tr key={h.id} className="border-b border-b-border align-top">
              <td className="py-[6px] pr-[10px] whitespace-nowrap">{formatearFechaHora(h.createdAt)}</td>
              <td className="py-[6px] pr-[10px]">{h.autor}</td>
              <td className="py-[6px] pr-[10px]">{LABEL_CAMPO_CORRECCION[h.campo]}</td>
              <td className="py-[6px] pr-[10px]">
                <span className="line-through text-text-muted">{h.valorAnterior ?? '(vacío)'}</span> → <strong>{h.valorNuevo}</strong>
              </td>
              <td className="py-[6px]">{h.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

/** Carga el historial por sí mismo (p. ej. en el detalle del expediente). */
export const HistorialCorreccionesExpediente: React.FC<{ expedienteId: string }> = ({ expedienteId }) => {
  const [historial, setHistorial] = useState<CorreccionMaterialItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    CorreccionesApi.obtener(expedienteId)
      .then((e) => setHistorial(e.historial))
      .catch((err: any) => setError(err.message || 'No se pudo cargar el historial de correcciones.'));
  }, [expedienteId]);
  if (error) return <p className="text-[12px] text-text-muted">{error}</p>;
  if (!historial) return <Spinner size={14} />;
  return <HistorialCorrecciones historial={historial} />;
};

interface Props {
  expedienteId: string;
  /** Tras corregir: el panel recarga los datos del administrado que muestra. */
  onCorregido?: () => void;
}

/**
 * O2 — "Corregir error material" + historial, en el IFI y en la Resolución.
 * La corrección queda trazada (antes → después, autor, motivo); la identidad
 * del administrado y los vicios de imputación no se corrigen por esta vía.
 */
export const CorreccionMaterialSeccion: React.FC<Props> = ({ expedienteId, onCorregido }) => {
  const [estado, setEstado] = useState<EstadoCorrecciones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setEstado(await CorreccionesApi.obtener(expedienteId));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar las correcciones.');
    }
  }, [expedienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="border-t border-t-border pt-[14px] mt-[4px]">
      <div className="flex items-center justify-between gap-[8px] flex-wrap mb-[8px]">
        <div>
          <div className="text-[13px] font-bold text-midnight-900">Corrección de error material</div>
          <div className="text-[11px] text-text-muted">Datos del administrado mal escritos (nombre, documento, domicilio…). Queda registrado.</div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<PenToolIcon size={14} />}
          disabled={!estado?.puedeCorregir}
          onClick={() => {
            setAviso(null);
            setModal(true);
          }}
        >
          Corregir error material
        </Button>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {aviso && <Alert type="success">{aviso}</Alert>}
      {estado && !estado.puedeCorregir && estado.motivoNoCorregible && (
        <p className="text-[11px] text-text-muted mb-[8px]">{estado.motivoNoCorregible}</p>
      )}
      <div className="text-[12px] font-semibold text-text-secondary mb-[4px]">Historial de correcciones</div>
      {estado ? <HistorialCorrecciones historial={estado.historial} /> : !error && <Spinner size={14} />}

      {modal && estado?.administrado && (
        <CorregirModal
          expedienteId={expedienteId}
          valores={estado.administrado.valores}
          onClose={() => setModal(false)}
          onCorregido={async () => {
            setModal(false);
            setAviso('Corrección registrada. Si el IFI o la resolución ya tenían antecedentes generados, regenéralos para que tomen el dato corregido.');
            await cargar();
            onCorregido?.();
          }}
        />
      )}
    </div>
  );
};

const CorregirModal: React.FC<{
  expedienteId: string;
  valores: Record<CampoCorreccionMaterial, string | null>;
  onClose: () => void;
  onCorregido: () => void;
}> = ({ expedienteId, valores, onClose, onCorregido }) => {
  const [campo, setCampo] = useState<CampoCorreccionMaterial | ''>('');
  const [valorNuevo, setValorNuevo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setError(null);
    if (!campo) return setError('Elige el campo a corregir.');
    if (!valorNuevo.trim()) return setError('Escribe el valor corregido.');
    if ((valores[campo] ?? '').trim() === valorNuevo.trim()) return setError('El valor nuevo es igual al actual.');
    if (!motivo.trim()) return setError('El motivo es obligatorio.');
    setGuardando(true);
    try {
      await CorreccionesApi.corregir(expedienteId, { campo, valorNuevo: valorNuevo.trim(), motivo: motivo.trim() });
      onCorregido();
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar la corrección.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Corregir error material"
      maxWidth="560px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={guardar}>
            Registrar corrección
          </Button>
        </>
      }
    >
      {error && <Alert type="error">{error}</Alert>}
      <div className="mb-[14px] w-full">
        <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Campo</label>
        <select
          value={campo}
          onChange={(e) => {
            setCampo(e.target.value as CampoCorreccionMaterial | '');
            setValorNuevo('');
          }}
          className="w-full py-[10px] px-[14px] text-[14px] rounded-sm border border-border bg-[#ffffff] text-text-main outline-none"
        >
          <option value="">— Elegir —</option>
          {CAMPOS.map((c) => (
            <option key={c} value={c}>
              {LABEL_CAMPO_CORRECCION[c]}
            </option>
          ))}
        </select>
      </div>
      {campo && (
        <div className="bg-[#f8fafc] py-[8px] px-[12px] rounded-[6px] border border-border text-[13px] mb-[14px]">
          <span className="text-text-muted">Valor actual: </span>
          <strong>{valores[campo] ?? '(vacío)'}</strong>
        </div>
      )}
      <Input label="Valor corregido" value={valorNuevo} disabled={!campo} onChange={(e) => setValorNuevo(e.target.value)} />
      <Textarea
        label="Motivo (obligatorio)"
        placeholder="Ej. error de digitación en campo: el DNI del acta física dice 40123456"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={3}
      />
    </Modal>
  );
};
