import React, { useCallback, useEffect, useState } from 'react';
import { LABEL_RESULTADO_VISITA, ResultadoVisita, VisitaNotificacionItem, VisitasNotificacionApi, abrirFotoVisita } from '../../api';
import { Alert, Badge, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { EyeIcon } from '../../components/icons/Icons';
import { formatearFecha, formatearFechaHora, hoyLocal } from '../../lib/fechas';
import { ahoraInputLima, isoDesdeInputLima } from '../levantamientos/levantamientoUi';

const claseInputArchivo =
  'text-[12px] text-text-secondary file:mr-[8px] file:py-[4px] file:px-[10px] file:rounded-sm file:border file:border-border file:bg-[#ffffff] file:text-[12px] file:cursor-pointer';

/**
 * Visitas del notificador (reunión): 1ª visita sin éxito → acta de aviso con
 * la fecha de la 2ª visita; en la 2ª, si no se puede entregar en mano, se
 * deja BAJO PUERTA con fotografías y la NC queda notificada.
 */
export const VisitasNotificacionModal: React.FC<{ id: string; onClose: () => void; onCambio: () => void }> = ({ id, onClose, onCambio }) => {
  const [visitas, setVisitas] = useState<VisitaNotificacionItem[] | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [fechaHora, setFechaHora] = useState('');
  const [resultado, setResultado] = useState<ResultadoVisita>('NADIE_EN_DOMICILIO');
  const [proxima, setProxima] = useState('');
  const [observacion, setObservacion] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);

  const cargar = useCallback(() => {
    VisitasNotificacionApi.listar(id)
      .then(setVisitas)
      .catch((err: any) => {
        setVisitas([]);
        setMensaje({ type: 'error', text: err.message || 'No se pudieron cargar las visitas.' });
      });
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const huboSinExito = (visitas ?? []).some((v) => v.resultado !== 'BAJO_PUERTA');
  const esBajoPuerta = resultado === 'BAJO_PUERTA';

  const guardar = async () => {
    if (!fechaHora) return setMensaje({ type: 'error', text: 'Ingresa la fecha y hora real de la visita.' });
    if (!esBajoPuerta && !proxima) return setMensaje({ type: 'error', text: 'Indica la fecha de la 2ª visita anotada en el acta de aviso.' });
    if (esBajoPuerta && fotos.length === 0) return setMensaje({ type: 'error', text: 'Adjunta al menos una foto del bajo puerta.' });
    setGuardando(true);
    setMensaje(null);
    try {
      const r = await VisitasNotificacionApi.registrar(id, {
        fechaHora: isoDesdeInputLima(fechaHora),
        resultado,
        proximaVisitaFecha: esBajoPuerta ? undefined : proxima,
        observacion: observacion.trim() || undefined,
        fotos,
      });
      setMensaje({
        type: 'success',
        text: r.notificada ? 'Bajo puerta registrado: la Notificación de Cargo quedó notificada en esa fecha.' : 'Visita sin éxito registrada con su acta de aviso.',
      });
      setFechaHora('');
      setProxima('');
      setObservacion('');
      setFotos([]);
      cargar();
      onCambio();
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo registrar la visita.' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Visitas de notificación"
      maxWidth="720px"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {mensaje && <Alert type={mensaje.type}>{mensaje.text}</Alert>}
      <p className="text-[12px] text-text-muted mb-[10px]">
        1ª visita sin éxito: se deja un <strong>acta de aviso</strong> con la fecha de la 2ª visita. En la 2ª visita, si no se puede entregar en mano, se deja{' '}
        <strong>bajo puerta</strong> con fotografías (puerta, numeración, documento dejado). La entrega en mano se registra con "Registrar Entrega".
      </p>

      {visitas === null ? (
        <div className="p-[20px] text-center">
          <Spinner size={24} />
        </div>
      ) : visitas.length === 0 ? (
        <div className="text-text-muted text-[13px] mb-[12px]">Sin visitas registradas.</div>
      ) : (
        <div className="flex flex-col gap-[6px] mb-[14px]">
          {visitas.map((v) => (
            <div key={v.id} className="border border-border rounded-[6px] py-[8px] px-[10px] text-[13px]">
              <div className="flex items-center gap-[8px] flex-wrap">
                <Badge variant={v.resultado === 'BAJO_PUERTA' ? 'success' : 'warning'}>{v.numeroVisita}ª visita</Badge>
                <strong>{LABEL_RESULTADO_VISITA[v.resultado]}</strong>
                <span className="text-text-muted">{formatearFechaHora(v.fechaHora)}</span>
              </div>
              {v.proximaVisitaFecha && <div className="mt-[2px]">Acta de aviso: 2ª visita el {formatearFecha(v.proximaVisitaFecha)}.</div>}
              {v.observacion && <div className="mt-[2px] text-text-secondary">{v.observacion}</div>}
              {v.fotos.length > 0 && (
                <div className="flex gap-[6px] flex-wrap mt-[6px]">
                  {v.fotos.map((f) => (
                    <Button key={f.id} size="sm" variant="outline" icon={<EyeIcon size={14} />} onClick={() => abrirFotoVisita(f.id)}>
                      {f.nombreOriginal}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-t-border pt-[10px]">
        <div className="font-bold text-[13px] mb-[6px]">Registrar visita</div>
        <div className="flex gap-[12px] flex-wrap items-end">
          <div className="w-[230px]">
            <Input type="datetime-local" label="Fecha y hora de la visita" value={fechaHora} max={ahoraInputLima()} onChange={(e) => setFechaHora(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[220px] mb-[14px]">
            <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Resultado</label>
            <select
              value={resultado}
              onChange={(e) => setResultado(e.target.value as ResultadoVisita)}
              className="w-full py-[9px] px-[12px] rounded-sm border border-border text-[13px] bg-[#ffffff]"
            >
              <option value="NADIE_EN_DOMICILIO">{LABEL_RESULTADO_VISITA.NADIE_EN_DOMICILIO}</option>
              <option value="SE_NEGO_A_RECIBIR">{LABEL_RESULTADO_VISITA.SE_NEGO_A_RECIBIR}</option>
              <option value="BAJO_PUERTA" disabled={!huboSinExito}>
                {LABEL_RESULTADO_VISITA.BAJO_PUERTA}
                {!huboSinExito ? ' — solo en la 2ª visita' : ''}
              </option>
            </select>
          </div>
          {!esBajoPuerta && (
            <div className="w-[200px]">
              <Input type="date" label="2ª visita (acta de aviso)" value={proxima} min={hoyLocal()} onChange={(e) => setProxima(e.target.value)} />
            </div>
          )}
        </div>
        <Textarea label="Observación (opcional)" rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        <div className="flex gap-[12px] items-center flex-wrap mt-[6px]">
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
            className={claseInputArchivo}
          />
          <span className="text-[12px] text-text-muted">{esBajoPuerta ? 'Fotos obligatorias.' : 'Fotos opcionales (p. ej. del acta de aviso).'}</span>
          <Button size="sm" variant={esBajoPuerta ? 'success' : 'primary'} loading={guardando} onClick={guardar}>
            {esBajoPuerta ? 'Registrar bajo puerta' : 'Registrar visita sin éxito'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
