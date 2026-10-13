import React, { useEffect, useState } from 'react';
import { ControlDocumentarioApi, DocumentoControl } from '../../api/controlDocumentario';
import { Alert, Button, EmptyState, Input, Modal, Spinner } from '../../components/common/Common';
import { Buscador, EstadoPunto, TABLA } from '../../components/common/PageKit';
import { FileTextIcon } from '../../components/icons/Icons';
import { formatearFecha, formatearFechaHora, hoyLocal } from '../../lib/fechas';

/** Pestaña "Salida": documentos que emite el sistema, con el N° de SGD con el que se subieron. */
export const SalidasTab: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [items, setItems] = useState<DocumentoControl[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  /** Documento al que se le anota el N° de SGD (null = modal cerrado). */
  const [editando, setEditando] = useState<DocumentoControl | null>(null);
  /** Sube cada vez que se guarda un SGD, para recargar la lista. */
  const [version, setVersion] = useState(0);

  // Campos del modal de SGD
  const [numeroSgdInput, setNumeroSgdInput] = useState('');
  const [fechaSubida, setFechaSubida] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Busca 350 ms después de la última tecla (y al cambiar `version`, tras guardar).
  useEffect(() => {
    let vigente = true;
    const timer = setTimeout(async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await ControlDocumentarioApi.salidas(busqueda.trim());
        if (vigente) setItems(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (vigente) setError(err.message || 'No se pudieron cargar los documentos de salida.');
      } finally {
        if (vigente) setCargando(false);
      }
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [busqueda, version]);

  // Al abrir el modal para un documento, precarga su SGD actual y la fecha de hoy.
  useEffect(() => {
    if (!editando) return;
    setNumeroSgdInput(editando.numeroSgd ?? '');
    setFechaSubida(hoyLocal());
    setErrorModal(null);
  }, [editando]);

  const cerrarModal = () => setEditando(null);

  const guardarSgd = async () => {
    if (!editando) return;
    const sgd = numeroSgdInput.trim();
    if (!sgd) {
      setErrorModal('Indica el N° de SGD.');
      return;
    }
    if (!fechaSubida) {
      setErrorModal('Indica la fecha en que se subió al SGD.');
      return;
    }
    // La clave es `${origen}:${id}`: el id del documento es lo que viene después del primer ':'.
    const documentoId = editando.clave.slice(editando.clave.indexOf(':') + 1);
    setGuardando(true);
    setErrorModal(null);
    try {
      await ControlDocumentarioApi.anotarSgd(editando.origen, documentoId, sgd, fechaSubida);
      setEditando(null);
      setMensaje({ type: 'success', text: 'N° de SGD guardado.' });
      setVersion((v) => v + 1);
    } catch (err: any) {
      setErrorModal(err.message || 'No se pudo guardar el N° de SGD.');
    } finally {
      setGuardando(false);
    }
  };

  const referencia = editando
    ? [editando.numeroExpediente && `Expediente ${editando.numeroExpediente}`, editando.numero && `N° ${editando.numero}`].filter(Boolean).join(' · ')
    : '';

  return (
    <>
      <div className="py-[16px] px-[24px] border-b border-border flex items-center justify-between flex-wrap gap-[14px]">
        <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por expediente, N° de documento o SGD" />
        <p className="text-[12px] text-text-muted m-0">Lo que emite el sistema. Anota el N° de SGD cuando lo subas.</p>
      </div>

      {mensaje && (
        <div className="px-[24px] pt-[16px]">
          <Alert type={mensaje.type}>{mensaje.text}</Alert>
        </div>
      )}
      {error && (
        <div className="px-[24px] pt-[16px]">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {items === null && cargando && (
        <div className="py-[56px] text-center">
          <Spinner size={32} />
          <p className="text-[13px] text-text-muted mt-[12px]">Cargando documentos de salida...</p>
        </div>
      )}

      {items !== null && items.length === 0 && (
        <EmptyState
          icon={<FileTextIcon size={40} />}
          title="Sin documentos de salida"
          description="Aquí aparecen los documentos que emite el sistema: IFI, resoluciones, cartas y constancias."
        />
      )}

      {items !== null && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className={TABLA.tabla}>
            <thead>
              <tr className={TABLA.encabezado}>
                <th className={TABLA.th}>Documento</th>
                <th className={TABLA.th}>Expediente</th>
                <th className={TABLA.th}>Emitido</th>
                <th className={TABLA.th}>Estado</th>
                <th className={`${TABLA.th} text-right`}>SGD</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.clave} className={TABLA.fila}>
                  <td className={TABLA.td}>
                    <div className="text-[14px] font-bold text-midnight-900">{d.tipo}</div>
                    {d.numero && <div className="text-[12px] text-text-muted mt-[3px]">{d.numero}</div>}
                  </td>
                  <td className={TABLA.td}>{d.numeroExpediente || '—'}</td>
                  <td className={TABLA.td}>
                    <div className="text-[13.5px] text-text-main">{formatearFechaHora(d.fecha)}</div>
                    {d.fechaNotificacion && <div className="text-[12px] text-text-muted mt-[3px]">{`Notificado el ${formatearFecha(d.fechaNotificacion)}`}</div>}
                  </td>
                  <td className={TABLA.td}>
                    <EstadoPunto tono={d.estado === 'Notificada' || d.estado === 'Notificado' ? 'ok' : 'info'}>{d.estado || '—'}</EstadoPunto>
                  </td>
                  <td className={`${TABLA.td} text-right`}>
                    {d.editableSgd ? (
                      <div className="inline-flex items-center gap-[12px]">
                        {d.numeroSgd ? (
                          <>
                            <div className="text-right">
                              <div className="text-[13.5px] text-text-main">{d.numeroSgd}</div>
                              <div className="text-[12px] text-text-muted mt-[3px]">N° de SGD</div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => setEditando(d)}>
                              Corregir
                            </Button>
                          </>
                        ) : (
                          <Button variant="primary" size="sm" onClick={() => setEditando(d)}>
                            Anotar N° SGD
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[13.5px] text-text-main">{d.numeroSgd || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={editando !== null}
        onClose={cerrarModal}
        title={editando ? `N° de SGD: ${editando.tipo}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button variant="primary" loading={guardando} onClick={guardarSgd}>
              Guardar
            </Button>
          </>
        }
      >
        {editando && (
          <>
            {referencia && <p className="text-[12px] text-text-muted mb-[16px]">{referencia}</p>}
            <Input label="N° de SGD *" value={numeroSgdInput} onChange={(e) => setNumeroSgdInput(e.target.value)} />
            <Input
              label="Fecha en que se subió al SGD *"
              type="date"
              max={hoyLocal()}
              value={fechaSubida}
              onChange={(e) => setFechaSubida(e.target.value)}
            />
            {errorModal && <Alert type="error">{errorModal}</Alert>}
          </>
        )}
      </Modal>
    </>
  );
};
