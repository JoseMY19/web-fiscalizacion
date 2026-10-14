import React, { useCallback, useEffect, useState } from 'react';
import { RetroaccionApi, RetroaccionItem } from '../../api';
import { Alert, Button, Input } from '../../components/common/Common';
import { formatearFecha, hoyLocal } from '../../lib/fechas';

/**
 * Aviso dentro del expediente (IFI / Resolución) cuando GOP declaró la
 * nulidad y se retrotrajo: qué se anuló y qué hay que rehacer. Si se
 * anuló la notificación de la NC, aquí se registra la nueva notificación.
 */
export const AvisoRetroaccion: React.FC<{ expedienteId: string; onCambio?: () => void }> = ({ expedienteId, onCambio }) => {
  const [items, setItems] = useState<RetroaccionItem[]>([]);
  const [fecha, setFecha] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    RetroaccionApi.porExpediente(expedienteId)
      .then((r) => setItems(Array.isArray(r) ? r : []))
      .catch(() => setItems([]));
  }, [expedienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (items.length === 0) return null;
  const ultima = items[0];
  const faltaRenotificar = ultima.etapa === 'NOTIFICACION_CARGO' && !ultima.ncRenotificadaEn;

  const renotificar = async () => {
    setCargando(true);
    setError(null);
    try {
      await RetroaccionApi.renotificarNc(ultima.id, fecha);
      setFecha('');
      cargar();
      onCambio?.();
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar la notificación.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Alert type="warning" className="mb-[12px]!">
      <div>
        <strong>Retrotraído por nulidad de GOP</strong> (decisión del {formatearFecha(ultima.fechaDecisionGop)}): {ultima.motivoNulidad}
      </div>
      {ultima.resumenAnulado.length > 0 && <div className="text-[12px] mt-[4px]">Anulado: {ultima.resumenAnulado.join(' · ')}.</div>}
      {ultima.nota && <div className="text-[12px] mt-[2px]">Nota: {ultima.nota}</div>}
      {ultima.etapa === 'NOTIFICACION_CARGO' &&
        (ultima.ncRenotificadaEn ? (
          <div className="text-[12px] mt-[4px]">NC renotificada el {formatearFecha(ultima.ncRenotificadaEn)}.</div>
        ) : null)}
      {faltaRenotificar && (
        <div className="flex gap-[8px] items-end flex-wrap mt-[8px]">
          <div className="w-[220px]">
            <Input type="date" label="Nueva notificación de la NC" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <Button size="sm" variant="secondary" loading={cargando} disabled={!fecha} onClick={renotificar}>
            Registrar notificación
          </Button>
          {error && <span className="text-[12px] text-[#b91c1c]">{error}</span>}
        </div>
      )}
    </Alert>
  );
};
