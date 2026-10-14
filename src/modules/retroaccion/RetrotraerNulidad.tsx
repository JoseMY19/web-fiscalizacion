import React, { useState } from 'react';
import { EtapaRetroaccion, LABEL_ETAPA_RETROACCION, RetroaccionApi } from '../../api';
import { Alert, Button, Textarea } from '../../components/common/Common';
import { useConfirm } from '../../context/ConfirmContext';

const ETAPAS: EtapaRetroaccion[] = ['RESOLUCION', 'IFI', 'NOTIFICACION_CARGO'];

/**
 * GOP declaró la NULIDAD: el abogado elige hasta qué acto se retrotrae el
 * expediente. Todo lo anulado queda guardado (foto) y el expediente vuelve
 * a la bandeja de esa etapa (Resolución o IFI) con un aviso.
 */
export const RetrotraerNulidad: React.FC<{ apelacionId: string; motivoNulidad: string | null; onHecho: (mensaje: string) => void }> = ({
  apelacionId,
  motivoNulidad,
  onHecho,
}) => {
  const confirm = useConfirm();
  const [etapa, setEtapa] = useState<EtapaRetroaccion>('RESOLUCION');
  const [nota, setNota] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retrotraer = async () => {
    const ok = await confirm({
      title: 'Retrotraer el expediente',
      message: `Se anula hasta: ${LABEL_ETAPA_RETROACCION[etapa]}. Lo anulado queda guardado en el historial del expediente y este vuelve a la bandeja correspondiente. ¿Continuar?`,
      confirmLabel: 'Retrotraer',
      variant: 'danger',
    });
    if (!ok) return;
    setCargando(true);
    setError(null);
    try {
      await RetroaccionApi.retrotraer(apelacionId, etapa, nota.trim() || undefined);
      onHecho(
        etapa === 'RESOLUCION'
          ? 'Expediente retrotraído: vuelve a Resolución para emitir la nueva resolución.'
          : etapa === 'IFI'
            ? 'Expediente retrotraído: el IFI se reabrió en Instrucción e IFI.'
            : 'Expediente retrotraído: registra la nueva notificación de la NC (en IFI) y luego rehaz el IFI.',
      );
    } catch (err: any) {
      setError(err.message || 'No se pudo retrotraer el expediente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col gap-[8px]">
      <Alert type="warning" className="mb-0!">
        <strong>GOP declaró la nulidad</strong>
        {motivoNulidad ? ` (motivo: ${motivoNulidad})` : ''}. El expediente se retrotrae hasta antes del acto anulado.
      </Alert>
      {error && <Alert type="error" className="mb-0!">{error}</Alert>}
      <label className="text-[12px] font-bold">¿Hasta qué acto se retrotrae?</label>
      <select
        value={etapa}
        onChange={(e) => setEtapa(e.target.value as EtapaRetroaccion)}
        className="py-[8px] px-[10px] text-[13px] border border-border rounded-sm bg-[#ffffff]"
      >
        {ETAPAS.map((x) => (
          <option key={x} value={x}>
            {LABEL_ETAPA_RETROACCION[x]}
          </option>
        ))}
      </select>
      <Textarea label="Nota (opcional)" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
      <div>
        <Button size="sm" variant="danger" loading={cargando} onClick={retrotraer}>
          Retrotraer expediente
        </Button>
      </div>
    </div>
  );
};
