import React, { useEffect, useState } from 'react';
import { PrescripcionApi, ResolucionCandidataPrescripcion } from '../../api';
import { Alert, Badge, Button, Input, Modal, Textarea } from '../../components/common/Common';
import { ComboboxExpediente } from '../../components/common/ComboboxExpediente';
import { claseFilaTramite } from '../../components/common/PasoTramite';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { ETIQUETA_ORIGEN_FIRMEZA, MONEDA } from './prescripcionUi';

interface Props {
  solicitudId: string;
  modo: 'sistema' | 'manual';
  /** Resoluciones del sistema ya incluidas (para no repetirlas). */
  yaIncluidas: string[];
  onClose: () => void;
  onAgregada: () => void;
}

/**
 * Agregar una multa a la solicitud: (a) una RSGSA notificada de este sistema
 * (buscador por N° de expediente; datos y firmeza salen del sistema), o (b)
 * una multa antigua que no está en el sistema (todo se ingresa a mano).
 */
export const AgregarMultaModal: React.FC<Props> = ({ solicitudId, modo, yaIncluidas, onClose, onAgregada }) => {
  const hoy = hoyLocal();
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [coaDc, setCoaDc] = useState(false);
  const [contencioso, setContencioso] = useState('');

  const [opciones, setOpciones] = useState<ResolucionCandidataPrescripcion[] | null>(null);
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null);
  const [elegida, setElegida] = useState<ResolucionCandidataPrescripcion | null>(null);

  const [codigoCuis, setCodigoCuis] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [numeroResolucion, setNumeroResolucion] = useState('');
  const [fechaResolucion, setFechaResolucion] = useState('');
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [monto, setMonto] = useState('');
  const [ordenanza, setOrdenanza] = useState('');
  const [fechaFirmeza, setFechaFirmeza] = useState('');

  useEffect(() => {
    if (modo !== 'sistema') return;
    PrescripcionApi.buscarResoluciones()
      .then((d) => setOpciones((Array.isArray(d) ? d : []).filter((r) => !yaIncluidas.includes(r.resolucionId))))
      .catch((err: any) => setErrorOpciones(err.message || 'No se pudieron cargar las resoluciones.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, yaIncluidas.join(',')]);

  const guardar = async () => {
    setError(null);
    if (contencioso && contencioso > hoy) return setError('La fecha del contencioso no puede ser futura.');
    if (modo === 'sistema') {
      if (!elegida) return setError('Elige la resolución del sistema.');
      if (!elegida.firmeza) return setError('Esa resolución todavía no está firme: no se puede incluir.');
    } else {
      if (!numeroResolucion.trim()) return setError('Ingresa el N° de la resolución de sanción tal como figura.');
      if (!fechaFirmeza) return setError('Ingresa la fecha en que el acto quedó firme.');
      if ([fechaResolucion, fechaNotificacion, fechaFirmeza].some((f) => f && f > hoy)) return setError('Ninguna fecha puede ser futura.');
      if (monto && (Number.isNaN(Number(monto)) || Number(monto) < 0)) return setError('El monto no es válido.');
    }
    setGuardando(true);
    try {
      if (modo === 'sistema') {
        await PrescripcionApi.agregarMultaSistema(solicitudId, {
          resolucionId: elegida!.resolucionId,
          figuraCoaDc: coaDc,
          fechaContenciosoDesfavorable: contencioso || undefined,
        });
      } else {
        await PrescripcionApi.agregarMultaManual(solicitudId, {
          codigoCuis: codigoCuis.trim() || undefined,
          descripcionInfraccion: descripcion.trim() || undefined,
          numeroResolucionSancion: numeroResolucion.trim(),
          fechaResolucion: fechaResolucion || undefined,
          fechaNotificacion: fechaNotificacion || undefined,
          monto: monto ? Number(monto) : undefined,
          ordenanza: ordenanza.trim() || undefined,
          fechaFirmeza,
          fechaContenciosoDesfavorable: contencioso || undefined,
          figuraCoaDc: coaDc,
        });
      }
      onAgregada();
    } catch (err: any) {
      setError(err.message || 'No se pudo agregar la multa.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={modo === 'sistema' ? 'Agregar multa del sistema' : 'Agregar multa antigua (manual)'}
      maxWidth="720px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={guardar}>
            Agregar multa
          </Button>
        </>
      }
    >
      {error && <Alert type="error">{error}</Alert>}
      {modo === 'sistema' ? (
        <>
          <ComboboxExpediente
            label="Resolución de sanción (RSGSA notificada) por N° de expediente"
            opciones={opciones}
            cargando={opciones === null && !errorOpciones}
            error={errorOpciones}
            seleccionada={elegida}
            onSeleccionar={setElegida}
            obtenerClave={(r) => r.resolucionId}
            obtenerNumeroExpediente={(r) => r.numeroExpediente}
            renderDetalle={(r) => (
              <>
                {r.numeroResolucion && <span className="text-text-muted">RSGSA N° {r.numeroResolucion}</span>}
                {r.firmeza ? <Badge variant="success">Firme {formatearFecha(r.firmeza.fecha)}</Badge> : <Badge variant="warning">Aún no firme</Badge>}
              </>
            )}
            mensajeVacio="No hay RSGSA notificadas en el sistema."
          />
          {elegida && (
            <div className="text-[13px] mb-[12px]">
              <div>
                {elegida.administradoNombre ?? 'Administrado no identificado'} · CUIS {elegida.codigosCuis.join(', ') || '—'} ·{' '}
                {elegida.monto !== null ? MONEDA.format(elegida.monto) : 'monto no registrado'} · notificada {formatearFecha(elegida.fechaNotificacion)}
              </div>
              {elegida.firmeza ? (
                <div className="text-[#047857]">
                  Quedó firme el {formatearFecha(elegida.firmeza.fecha)} ({ETIQUETA_ORIGEN_FIRMEZA[elegida.firmeza.origen]}).
                </div>
              ) : (
                <div className="text-[#be123c]">Todavía no está firme (recurso en trámite o plazo abierto): declara el acto firme primero.</div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className={claseFilaTramite}>
            <div className="w-[160px]">
              <Input label="Código CUIS" value={codigoCuis} onChange={(e) => setCodigoCuis(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[220px]">
              <Input label="N° resolución de sanción" placeholder="ej. RM-CO-002548-2015" value={numeroResolucion} onChange={(e) => setNumeroResolucion(e.target.value)} />
            </div>
          </div>
          <Textarea label="Infracción (descripción tal como figura)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="min-h-[60px]!" />
          <div className={claseFilaTramite}>
            <div className="w-[180px]">
              <Input type="date" label="Fecha de la resolución" value={fechaResolucion} max={hoy} onChange={(e) => setFechaResolucion(e.target.value)} />
            </div>
            <div className="w-[180px]">
              <Input type="date" label="Fecha de notificación" value={fechaNotificacion} max={hoy} onChange={(e) => setFechaNotificacion(e.target.value)} />
            </div>
            <div className="w-[150px]">
              <Input type="number" min="0" step="0.01" label="Monto (S/)" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
          </div>
          <Input label="Ordenanza vigente en ese momento" placeholder="ej. Ordenanza Municipal N° 032-2004-MDSJL" value={ordenanza} onChange={(e) => setOrdenanza(e.target.value)} />
          <div className="w-[220px]">
            <Input type="date" label="Fecha en que quedó firme" value={fechaFirmeza} max={hoy} onChange={(e) => setFechaFirmeza(e.target.value)} />
          </div>
        </>
      )}
      <div className={claseFilaTramite}>
        <div className="w-[260px]">
          <Input type="date" label="Contencioso concluido desfavorable (opcional)" value={contencioso} max={hoy} onChange={(e) => setContencioso(e.target.value)} />
        </div>
        <label className="flex items-center gap-[6px] text-[13px] mb-[16px] cursor-pointer">
          <input type="checkbox" checked={coaDc} onChange={(e) => setCoaDc(e.target.checked)} />
          Figura con siglas COA o DC en el estado de cuenta
        </label>
      </div>
    </Modal>
  );
};
