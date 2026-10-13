import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActoFirmePendienteDerivacion,
  CandidatoActoFirme,
  CoactivaPagosApi,
} from '../../api';
import { Alert, Button, EmptyState, Input, Modal, Select, Spinner } from '../../components/common/Common';
import { Buscador, EstadoPunto, PageHeader, PanelDetalle, PanelTabla, SegmentedTabs, TABLA } from '../../components/common/PageKit';
import { PagadoBadge } from '../../components/common/PagadoBadge';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { CheckCircleIcon, FileTextIcon, RefreshCwIcon } from '../../components/icons/Icons';

type MotivoFirmeza = CandidatoActoFirme['motivo'];
type Pestana = 'declarar' | 'derivar';

const MOTIVO_CORTO: Record<MotivoFirmeza, string> = {
  VENCIMIENTO_PLAZO_RECURSOS: 'Plazo de recursos vencido',
  APELACION_INFUNDADA: 'Apelación infundada (GOP)',
};

/** Lista cargada desde la API con su estado de carga/error. */
function useLista<T>(cargarFn: () => Promise<T[]>) {
  const [datos, setDatos] = useState<T[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await cargarFn();
      setDatos(Array.isArray(d) ? d : []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la lista.');
    } finally {
      setCargando(false);
    }
  }, [cargarFn]);
  useEffect(() => {
    recargar();
  }, [recargar]);
  return { datos, cargando, error, recargar };
}

/**
 * Acto firme: dos bandejas, como el resto de los módulos.
 *  - "Por declarar firme": resoluciones que ya no admiten recursos. Un botón por fila abre la declaratoria.
 *  - "Por derivar a coactiva": con acto firme ya declarado; el panel lateral emite las constancias
 *    de exigibilidad y registra la derivación al Ejecutor Coactivo.
 */
export const CoactivaPagosView: React.FC = () => {
  const navigate = useNavigate();
  const [pestana, setPestana] = useState<Pestana>('declarar');
  const [busqueda, setBusqueda] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const candidatos = useLista(CoactivaPagosApi.listarCandidatosActoFirme);
  const pendientesDerivacion = useLista(CoactivaPagosApi.listarPendientesDerivacion);

  // Declaratoria de acto firme (ventana)
  const [candidato, setCandidato] = useState<CandidatoActoFirme | null>(null);
  const [motivoFirmeza, setMotivoFirmeza] = useState<MotivoFirmeza>('VENCIMIENTO_PLAZO_RECURSOS');
  const [fechaFirmeza, setFechaFirmeza] = useState(hoyLocal());
  const [errorDeclarar, setErrorDeclarar] = useState<string | null>(null);

  // Constancias y derivación (panel lateral)
  const [actoFirme, setActoFirme] = useState<ActoFirmePendienteDerivacion | null>(null);
  const [fechaDerivacion, setFechaDerivacion] = useState(hoyLocal());
  const [requiereMedida, setRequiereMedida] = useState(false);
  const [mensajePanel, setMensajePanel] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const abrirDeclaratoria = (c: CandidatoActoFirme) => {
    setCandidato(c);
    setMotivoFirmeza(c.motivo);
    setFechaFirmeza(hoyLocal());
    setErrorDeclarar(null);
  };

  const handleDeclararFirme = async () => {
    if (!candidato) return;
    setActionLoading(true);
    setErrorDeclarar(null);
    try {
      await CoactivaPagosApi.declararActoFirme(candidato.expedienteId, motivoFirmeza, fechaFirmeza);
      setMessage({ type: 'success', text: `Expediente ${candidato.numeroExpediente} declarado como ACTO FIRME (${MOTIVO_CORTO[motivoFirmeza]}).` });
      setCandidato(null);
      candidatos.recargar();
      pendientesDerivacion.recargar();
    } catch (err: any) {
      setErrorDeclarar(err.message || 'Error al declarar acto firme.');
    } finally {
      setActionLoading(false);
    }
  };

  const abrirGestion = (a: ActoFirmePendienteDerivacion) => {
    setActoFirme(a);
    setMensajePanel(null);
    setFechaDerivacion(hoyLocal());
    setRequiereMedida(false);
  };

  const handleConstanciaMulta = async () => {
    if (!actoFirme) return;
    setActionLoading(true);
    try {
      await CoactivaPagosApi.emitirConstanciaMulta(actoFirme.expedienteId);
      setMensajePanel({ type: 'success', text: 'Constancia de Exigibilidad de Multa emitida con éxito.' });
      setActoFirme({ ...actoFirme, constanciaMultaEmitida: true });
      pendientesDerivacion.recargar();
    } catch (err: any) {
      setMensajePanel({ type: 'error', text: err.message || 'Error al emitir constancia de multa.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConstanciaMedida = async () => {
    if (!actoFirme) return;
    setActionLoading(true);
    try {
      await CoactivaPagosApi.emitirConstanciaMedida(actoFirme.expedienteId);
      setMensajePanel({ type: 'success', text: 'Constancia de Exigibilidad de Medida Complementaria emitida con éxito.' });
      setActoFirme({ ...actoFirme, constanciaMedidaComplementariaEmitida: true });
      pendientesDerivacion.recargar();
    } catch (err: any) {
      setMensajePanel({ type: 'error', text: err.message || 'Error al emitir constancia de medida complementaria.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDerivacion = async () => {
    if (!actoFirme) return;
    setActionLoading(true);
    try {
      await CoactivaPagosApi.registrarDerivacionCoactiva(actoFirme.expedienteId, fechaDerivacion, requiereMedida);
      setMessage({ type: 'success', text: `Derivación del expediente ${actoFirme.numeroExpediente} a la Oficina de Ejecución Coactiva registrada.` });
      setActoFirme(null);
      pendientesDerivacion.recargar();
    } catch (err: any) {
      setMensajePanel({ type: 'error', text: err.message || 'Error al registrar derivación coactiva.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Qué falta antes de derivar (el backend exige las constancias; aquí se ve antes de intentarlo).
  const multaEmitida = !!actoFirme?.constanciaMultaEmitida;
  const medidaEmitida = !!actoFirme?.constanciaMedidaComplementariaEmitida;
  const puedeDerivar = !!actoFirme && multaEmitida && (!requiereMedida || medidaEmitida);
  const pasoSiguiente = !multaEmitida
    ? 'Siguiente paso: emite la constancia de multa exigible.'
    : requiereMedida && !medidaEmitida
      ? 'Siguiente paso: emite la constancia de la medida complementaria.'
      : 'Todo listo: registra la derivación a coactiva.';

  const termino = busqueda.trim().toLowerCase();
  const coincide = (numero: string) => !termino || numero.toLowerCase().includes(termino);
  const filasDeclarar = (candidatos.datos ?? []).filter((c) => coincide(c.numeroExpediente));
  const filasDerivar = (pendientesDerivacion.datos ?? []).filter((a) => coincide(a.numeroExpediente));
  const lista = pestana === 'declarar' ? candidatos : pendientesDerivacion;
  const sinCargar = lista.datos === null && lista.cargando;

  return (
    <div>
      <PageHeader
        titulo="Acto Firme"
        descripcion="Declara la firmeza de las resoluciones que ya no admiten recursos y deriva el expediente a Ejecución Coactiva."
        acciones={
          <Button
            variant="secondary"
            icon={<RefreshCwIcon size={14} />}
            loading={candidatos.cargando || pendientesDerivacion.cargando}
            onClick={() => {
              candidatos.recargar();
              pendientesDerivacion.recargar();
            }}
          >
            Actualizar
          </Button>
        }
      />

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <Alert type="info">
        ¿El administrado ya pagó la multa? Registra el pago en{' '}
        <button
          type="button"
          onClick={() => navigate('/pagos')}
          className="bg-transparent border-0 p-0 font-bold text-primary-700 underline cursor-pointer"
        >
          Registro de Pagos
        </button>
        . Aquí verás la etiqueta de pagado en cada expediente.
      </Alert>

      <PanelTabla
        barra={
          <>
            <SegmentedTabs<Pestana>
              items={[
                { clave: 'declarar', etiqueta: 'Por declarar firme', contador: candidatos.datos?.length },
                { clave: 'derivar', etiqueta: 'Por derivar a coactiva', contador: pendientesDerivacion.datos?.length },
              ]}
              activa={pestana}
              onChange={setPestana}
            />
            <div className="flex items-center gap-[10px] flex-wrap">
              <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por N° de expediente" />
            </div>
          </>
        }
      >
        {lista.error && (
          <div className="px-[24px] pt-[16px]">
            <Alert type="error">{lista.error}</Alert>
          </div>
        )}

        {sinCargar ? (
          <div className="py-[56px] text-center">
            <Spinner size={32} />
          </div>
        ) : pestana === 'declarar' ? (
          filasDeclarar.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
              title="Nada por declarar"
              description="No hay expedientes que hoy puedan declararse firmes (resolución notificada con plazo de recursos vencido, o apelación declarada infundada)."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className={TABLA.tabla}>
                <thead>
                  <tr className={TABLA.encabezado}>
                    <th className={TABLA.th}>Expediente</th>
                    <th className={TABLA.th}>Causal de firmeza</th>
                    <th className={TABLA.th}>Plazo de recursos</th>
                    <th className={`${TABLA.th} text-right`}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filasDeclarar.map((c) => (
                    <tr key={c.expedienteId} className={TABLA.fila}>
                      <td className={TABLA.td}>
                        <div className="text-[14px] font-bold text-midnight-900">{c.numeroExpediente}</div>
                        {c.tienePago && (
                          <div className="mt-[6px]">
                            <PagadoBadge tienePago={c.tienePago} montoPagado={c.montoPagado} fechaPago={c.fechaPago} />
                          </div>
                        )}
                      </td>
                      <td className={`${TABLA.td} text-[13px] text-text-secondary`}>{MOTIVO_CORTO[c.motivo]}</td>
                      <td className={`${TABLA.td} text-[13px] text-text-secondary`}>
                        {c.fechaVencimientoPlazo ? `Venció el ${formatearFecha(c.fechaVencimientoPlazo)}` : '—'}
                      </td>
                      <td className={`${TABLA.td} text-right`}>
                        <Button variant="primary" size="sm" onClick={() => abrirDeclaratoria(c)}>
                          Declarar firme
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filasDerivar.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
            title="Nada por derivar"
            description="No hay expedientes con acto firme pendientes de derivar a coactiva."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLA.tabla}>
              <thead>
                <tr className={TABLA.encabezado}>
                  <th className={TABLA.th}>Expediente</th>
                  <th className={TABLA.th}>Firme desde</th>
                  <th className={TABLA.th}>Constancias</th>
                  <th className={`${TABLA.th} text-right`}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filasDerivar.map((a) => (
                  <tr key={a.expedienteId} className={TABLA.fila}>
                    <td className={TABLA.td}>
                      <div className="text-[14px] font-bold text-midnight-900">{a.numeroExpediente}</div>
                      {a.tienePago && (
                        <div className="mt-[6px]">
                          <PagadoBadge tienePago={a.tienePago} montoPagado={a.montoPagado} fechaPago={a.fechaPago} />
                        </div>
                      )}
                    </td>
                    <td className={TABLA.td}>
                      <div className="text-[13px] text-text-main">{formatearFecha(a.fechaFirmeza)}</div>
                      <div className="text-[12px] text-text-muted mt-[3px]">{MOTIVO_CORTO[a.motivo]}</div>
                    </td>
                    <td className={TABLA.td}>
                      <div className="flex flex-col gap-[6px]">
                        <EstadoPunto tono={a.constanciaMultaEmitida ? 'ok' : 'aviso'}>
                          Multa: {a.constanciaMultaEmitida ? 'emitida' : 'pendiente'}
                        </EstadoPunto>
                        <EstadoPunto tono={a.constanciaMedidaComplementariaEmitida ? 'ok' : 'neutro'}>
                          Medida: {a.constanciaMedidaComplementariaEmitida ? 'emitida' : 'sin emitir'}
                        </EstadoPunto>
                      </div>
                    </td>
                    <td className={`${TABLA.td} text-right`}>
                      <Button variant="primary" size="sm" onClick={() => abrirGestion(a)}>
                        Gestionar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelTabla>

      {/* Declaratoria de acto firme */}
      <Modal
        isOpen={candidato !== null}
        onClose={() => setCandidato(null)}
        title={`Declarar acto firme: ${candidato?.numeroExpediente ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCandidato(null)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleDeclararFirme}>
              Declarar acto firme
            </Button>
          </>
        }
      >
        {candidato?.tienePago && (
          <Alert type="success">
            <span className="inline-flex items-center gap-[8px] flex-wrap">
              <PagadoBadge tienePago montoPagado={candidato.montoPagado} fechaPago={candidato.fechaPago} size="md" />
              El administrado ya registró un pago.
            </span>
          </Alert>
        )}
        {errorDeclarar && <Alert type="error">{errorDeclarar}</Alert>}
        <Input type="date" label="Fecha de firmeza" value={fechaFirmeza} onChange={(e) => setFechaFirmeza(e.target.value)} />
        <Select label="Causal de firmeza administrativa" value={motivoFirmeza} onChange={(e) => setMotivoFirmeza(e.target.value as MotivoFirmeza)}>
          <option value="VENCIMIENTO_PLAZO_RECURSOS">Vencimiento del plazo legal de recursos (sin impugnación)</option>
          <option value="APELACION_INFUNDADA">Apelación declarada infundada por GOP (fin de la vía administrativa)</option>
        </Select>
      </Modal>

      {/* Constancias de exigibilidad y derivación a coactiva */}
      <PanelDetalle
        abierto={actoFirme !== null}
        onClose={() => setActoFirme(null)}
        titulo={`Expediente ${actoFirme?.numeroExpediente ?? ''}`}
        subtitulo={actoFirme ? `Acto firme desde ${formatearFecha(actoFirme.fechaFirmeza)} · ${MOTIVO_CORTO[actoFirme.motivo]}` : undefined}
        pie={
          <>
            <Button variant="secondary" onClick={() => setActoFirme(null)}>
              Cerrar
            </Button>
            <Button variant="primary" loading={actionLoading} disabled={!puedeDerivar} onClick={handleDerivacion}>
              Registrar derivación a coactiva
            </Button>
          </>
        }
      >
        {actoFirme?.tienePago && (
          <Alert type="success">
            <span className="inline-flex items-center gap-[8px] flex-wrap">
              <PagadoBadge tienePago montoPagado={actoFirme.montoPagado} fechaPago={actoFirme.fechaPago} size="md" />
              Verifica el pago antes de derivar a Ejecución Coactiva.
            </span>
          </Alert>
        )}

        <h4 className="text-[13px] font-bold uppercase tracking-[0.5px] text-text-muted mb-[6px] mt-0">Constancias de exigibilidad</h4>
        <ul className="m-0 mb-[20px] p-0 list-none">
          <li className="flex items-center justify-between gap-[16px] py-[14px] border-b border-border-subtle">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-text-main">Constancia de multa exigible</div>
              <div className="mt-[4px]">
                <EstadoPunto tono={multaEmitida ? 'ok' : 'aviso'}>{multaEmitida ? 'Emitida' : 'Pendiente (obligatoria)'}</EstadoPunto>
              </div>
            </div>
            <Button variant="secondary" size="sm" icon={<FileTextIcon size={14} />} loading={actionLoading} disabled={multaEmitida} onClick={handleConstanciaMulta}>
              Emitir
            </Button>
          </li>
          <li className="flex items-center justify-between gap-[16px] py-[14px] border-b border-border-subtle">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-text-main">Constancia de medida complementaria</div>
              <div className="text-[12px] text-text-muted mt-[2px]">Solo si hay una medida que ejecutar.</div>
              <div className="mt-[4px]">
                <EstadoPunto tono={medidaEmitida ? 'ok' : requiereMedida ? 'aviso' : 'neutro'}>
                  {medidaEmitida ? 'Emitida' : requiereMedida ? 'Pendiente' : 'No requerida'}
                </EstadoPunto>
              </div>
            </div>
            <Button variant="secondary" size="sm" icon={<FileTextIcon size={14} />} loading={actionLoading} disabled={medidaEmitida} onClick={handleConstanciaMedida}>
              Emitir
            </Button>
          </li>
        </ul>

        {mensajePanel && <Alert type={mensajePanel.type}>{mensajePanel.text}</Alert>}

        <h4 className="text-[13px] font-bold uppercase tracking-[0.5px] text-text-muted mb-[12px] mt-[8px]">Derivación al Ejecutor Coactivo</h4>
        <div className="max-w-[320px]">
          <Input type="date" label="Fecha de derivación a coactiva" value={fechaDerivacion} onChange={(e) => setFechaDerivacion(e.target.value)} />
        </div>
        <label className="flex items-start gap-[8px] text-[13px] text-text-secondary cursor-pointer mb-[16px]">
          <input type="checkbox" className="mt-[3px]" checked={requiereMedida} onChange={(e) => setRequiereMedida(e.target.checked)} />
          Requiere apoyo de fuerza pública / ejecución coactiva de medida complementaria (clausura / descerraje)
        </label>
        <p className="m-0 text-[13px] font-semibold text-primary-700">{pasoSiguiente}</p>
      </PanelDetalle>
    </div>
  );
};
