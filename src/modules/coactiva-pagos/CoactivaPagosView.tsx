import React, { useCallback, useEffect, useState } from 'react';
import {
  ActoFirmePendienteDerivacion,
  CandidatoActoFirme,
  CoactivaPagosApi,
  PagoRegistrado,
  ResolucionPendientePago,
} from '../../api';
import { Card, Button, Input, Alert, Badge } from '../../components/common/Common';
import { ComboboxExpediente } from '../../components/common/ComboboxExpediente';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { CreditCardIcon, GavelIcon, FileTextIcon, ScaleIcon } from '../../components/icons/Icons';

type MotivoFirmeza = CandidatoActoFirme['motivo'];

const MOTIVO_CORTO: Record<MotivoFirmeza, string> = {
  VENCIMIENTO_PLAZO_RECURSOS: 'Plazo de recursos vencido',
  APELACION_INFUNDADA: 'Apelación infundada (GOP)',
};

const soles = (n: number | null) =>
  n === null || Number.isNaN(n) ? '—' : `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

type PagoResumen = PagoRegistrado & { numeroExpediente: string; numeroResolucion: string | null };

export const CoactivaPagosView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'coactiva' | 'pagos'>('coactiva');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const candidatos = useLista(CoactivaPagosApi.listarCandidatosActoFirme);
  const pendientesDerivacion = useLista(CoactivaPagosApi.listarPendientesDerivacion);
  const pendientesPago = useLista(CoactivaPagosApi.listarResolucionesPendientesPago);

  // Estados Acto Firme
  const [candidato, setCandidato] = useState<CandidatoActoFirme | null>(null);
  const [actoFirme, setActoFirme] = useState<ActoFirmePendienteDerivacion | null>(null);
  const [motivoFirmeza, setMotivoFirmeza] = useState<MotivoFirmeza>('VENCIMIENTO_PLAZO_RECURSOS');
  const [fechaFirmeza, setFechaFirmeza] = useState(hoyLocal());
  const [fechaDerivacion, setFechaDerivacion] = useState(hoyLocal());
  const [requiereMedida, setRequiereMedida] = useState(false);

  // Estados Pagos
  const [resolucionPago, setResolucionPago] = useState<ResolucionPendientePago | null>(null);
  const [montoPagado, setMontoPagado] = useState('');
  const [fechaPago, setFechaPago] = useState(hoyLocal());
  const [pagoResultado, setPagoResultado] = useState<PagoResumen | null>(null);

  const elegirCandidato = (c: CandidatoActoFirme | null) => {
    setCandidato(c);
    if (c) setMotivoFirmeza(c.motivo);
  };

  const handleDeclararFirme = async () => {
    if (!candidato) {
      setMessage({ type: 'error', text: 'Seleccione el expediente a declarar firme.' });
      return;
    }
    setActionLoading(true);
    try {
      await CoactivaPagosApi.declararActoFirme(candidato.expedienteId, motivoFirmeza, fechaFirmeza);
      setMessage({ type: 'success', text: `Expediente ${candidato.numeroExpediente} declarado como ACTO FIRME (${MOTIVO_CORTO[motivoFirmeza]}).` });
      setCandidato(null);
      candidatos.recargar();
      pendientesDerivacion.recargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al declarar acto firme.' });
    } finally {
      setActionLoading(false);
    }
  };

  const exigirActoFirme = (): ActoFirmePendienteDerivacion | null => {
    if (!actoFirme) setMessage({ type: 'error', text: 'Seleccione el expediente con acto firme.' });
    return actoFirme;
  };

  const handleConstanciaMulta = async () => {
    const af = exigirActoFirme();
    if (!af) return;
    setActionLoading(true);
    try {
      await CoactivaPagosApi.emitirConstanciaMulta(af.expedienteId);
      setMessage({ type: 'success', text: 'Constancia de Exigibilidad de Multa emitida con éxito.' });
      setActoFirme({ ...af, constanciaMultaEmitida: true });
      pendientesDerivacion.recargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al emitir constancia de multa.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConstanciaMedida = async () => {
    const af = exigirActoFirme();
    if (!af) return;
    setActionLoading(true);
    try {
      await CoactivaPagosApi.emitirConstanciaMedida(af.expedienteId);
      setMessage({ type: 'success', text: 'Constancia de Exigibilidad de Medida Complementaria emitida con éxito.' });
      setActoFirme({ ...af, constanciaMedidaComplementariaEmitida: true });
      pendientesDerivacion.recargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al emitir constancia de medida complementaria.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDerivacion = async () => {
    const af = exigirActoFirme();
    if (!af) return;
    setActionLoading(true);
    try {
      await CoactivaPagosApi.registrarDerivacionCoactiva(af.expedienteId, fechaDerivacion, requiereMedida);
      setMessage({ type: 'success', text: `Derivación del expediente ${af.numeroExpediente} a la Oficina de Ejecución Coactiva registrada.` });
      setActoFirme(null);
      pendientesDerivacion.recargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrar derivación coactiva.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegistrarPago = async () => {
    if (!resolucionPago || !montoPagado) {
      setMessage({ type: 'error', text: 'Complete la resolución y el monto cancelado según comprobante.' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await CoactivaPagosApi.registrarPago(resolucionPago.resolucionId, Number(montoPagado), fechaPago);
      setPagoResultado({ ...res, numeroExpediente: resolucionPago.numeroExpediente, numeroResolucion: resolucionPago.numeroResolucion });
      setMessage({ type: 'success', text: `Pago de S/ ${montoPagado} registrado con éxito en Tesorería/Recaudación.` });
      setResolucionPago(null);
      pendientesPago.recargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrar pago.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-[20px]">
        <h2 className="text-[18px] font-extrabold text-midnight-900">
          Acto Firme, Ejecución Coactiva & Control de Pagos (SP8 / ES1)
        </h2>
        <p className="text-[13px] text-text-muted mt-[2px]">
          Declaratoria de firmeza para cobro coactivo forzoso y control administrativo de recaudación de multas.
        </p>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="flex gap-[8px] mb-[16px]">
        <button
          onClick={() => setActiveTab('coactiva')}
          className={`py-[10px] px-[20px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'coactiva' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'coactiva' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'coactiva' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <GavelIcon size={16} />
          1. Acto Firme & Derivación Coactiva (SP8)
        </button>
        <button
          onClick={() => setActiveTab('pagos')}
          className={`py-[10px] px-[20px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'pagos' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'pagos' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'pagos' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <CreditCardIcon size={16} />
          2. Registro de Pagos de Multas (ES1)
        </button>
      </div>

      {activeTab === 'coactiva' ? (
        <div className="flex flex-col gap-[20px]">
          <Card title="Etapa 1: Declaratoria de Acto Firme" className="overflow-visible! relative! z-[30]!">
            <div className="grid grid-cols-[2fr_1fr] gap-[16px]">
              <ComboboxExpediente<CandidatoActoFirme>
                label="Expediente Sancionador"
                opciones={candidatos.datos}
                cargando={candidatos.cargando}
                error={candidatos.error}
                seleccionada={candidato}
                onSeleccionar={elegirCandidato}
                obtenerClave={(c) => c.expedienteId}
                obtenerNumeroExpediente={(c) => c.numeroExpediente}
                renderDetalle={(c) => (
                  <>
                    <Badge variant={c.motivo === 'APELACION_INFUNDADA' ? 'danger' : 'warning'}>{MOTIVO_CORTO[c.motivo]}</Badge>
                    {c.fechaVencimientoPlazo && (
                      <span className="text-[11px] text-text-muted">Plazo venció {formatearFecha(c.fechaVencimientoPlazo)}</span>
                    )}
                  </>
                )}
                mensajeVacio="No hay expedientes que hoy puedan declararse firmes (resolución notificada con plazo de recursos vencido, o apelación declarada infundada)."
              />
              <Input
                type="date"
                label="Fecha de Firmeza"
                value={fechaFirmeza}
                onChange={(e) => setFechaFirmeza(e.target.value)}
              />
            </div>

            <div className="mb-[14px]">
              <label className="block text-[13px] font-semibold mb-[6px]">
                Causal de Firmeza Administrativa:
              </label>
              <select
                value={motivoFirmeza}
                onChange={(e) => setMotivoFirmeza(e.target.value as MotivoFirmeza)}
                className="w-full p-[10px] rounded-[6px] border border-border text-[13px]"
              >
                <option value="VENCIMIENTO_PLAZO_RECURSOS">Vencimiento del Plazo Legal de Recursos (Sin Impugnación)</option>
                <option value="APELACION_INFUNDADA">Apelación Declarada Infundada por GOP (Fin de Vía Administrativa)</option>
              </select>
            </div>

            <Button variant="danger" loading={actionLoading} onClick={handleDeclararFirme}>
              Declarar Acto Firme
            </Button>
          </Card>

          <Card title="Etapa 2: Emisión de Títulos de Ejecución y Derivación Coactiva" className="overflow-visible! relative! z-[20]!">
            <ComboboxExpediente<ActoFirmePendienteDerivacion>
              label="Expediente con Acto Firme (pendiente de derivación)"
              opciones={pendientesDerivacion.datos}
              cargando={pendientesDerivacion.cargando}
              error={pendientesDerivacion.error}
              seleccionada={actoFirme}
              onSeleccionar={setActoFirme}
              obtenerClave={(a) => a.expedienteId}
              obtenerNumeroExpediente={(a) => a.numeroExpediente}
              renderDetalle={(a) => (
                <>
                  <span className="text-[11px] text-text-muted">Firme desde {formatearFecha(a.fechaFirmeza)}</span>
                  <Badge variant={a.constanciaMultaEmitida ? 'success' : 'neutral'}>
                    {a.constanciaMultaEmitida ? 'Constancia multa emitida' : 'Sin constancia de multa'}
                  </Badge>
                  {a.constanciaMedidaComplementariaEmitida && <Badge variant="success">Constancia medida emitida</Badge>}
                </>
              )}
              mensajeVacio="No hay expedientes con acto firme pendientes de derivar a coactiva."
            />

            <div className="flex gap-[12px] mb-[20px]">
              <Button variant="secondary" icon={<FileTextIcon size={16} />} loading={actionLoading} onClick={handleConstanciaMulta}>
                Emitir Constancia de Multa Exigible
              </Button>
              <Button variant="secondary" icon={<FileTextIcon size={16} />} loading={actionLoading} onClick={handleConstanciaMedida}>
                Emitir Constancia de Medida Complementaria
              </Button>
            </div>

            <div className="border-t border-t-border pt-[16px]">
              <h4 className="text-[14px] font-bold mb-[12px]">
                Remisión Formal al Ejecutor Coactivo Municipal:
              </h4>
              <Input
                type="date"
                label="Fecha de Derivación a Coactiva"
                value={fechaDerivacion}
                onChange={(e) => setFechaDerivacion(e.target.value)}
              />
              <div className="mb-[14px]">
                <label className="flex items-center gap-[8px] text-[13px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiereMedida}
                    onChange={(e) => setRequiereMedida(e.target.checked)}
                  />
                  Requiere apoyo de fuerza pública / ejecución coactiva de medida complementaria (clausura / descerraje)
                </label>
              </div>

              <Button variant="primary" loading={actionLoading} onClick={handleDerivacion}>
                Registrar Derivación a Coactiva
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        /* Tab 2: Pagos */
        <Card title="Registro Manual de Comprobantes de Pago de Multas" className="overflow-visible! relative! z-[20]!">
          <div
            className="bg-[#eff6ff] py-[12px] px-[16px] rounded-[8px] border border-[#bfdbfe] text-[#1e3a8a] text-[13px] mb-[16px]"
          >
            <div className="flex items-start gap-[8px]">
              <span className="mt-[2px] shrink-0"><ScaleIcon size={16} /></span>
              <span>
                <strong>Regla Legal No Negociable (§2.19):</strong> El pago del administrado extingue la sanción pecuniaria
                (multa), pero <strong>NUNCA</strong> extingue ni revoca de pleno derecho las medidas complementarias de clausura o paralización.
              </span>
            </div>
          </div>

          <ComboboxExpediente<ResolucionPendientePago>
            label="Resolución Sancionadora (RSGSA) notificada"
            opciones={pendientesPago.datos}
            cargando={pendientesPago.cargando}
            error={pendientesPago.error}
            seleccionada={resolucionPago}
            onSeleccionar={setResolucionPago}
            obtenerClave={(r) => r.resolucionId}
            obtenerNumeroExpediente={(r) => r.numeroExpediente}
            renderDetalle={(r) => (
              <>
                <Badge variant="danger">{r.tipo}</Badge>
                {r.numeroResolucion && <span className="text-[11px] text-text-muted">N° {r.numeroResolucion}</span>}
                <span className="text-[11px] font-semibold text-text-secondary">
                  Multa {soles(r.montoSinDescuento)}
                  {r.montoConDescuento !== null && ` (c/desc. ${soles(r.montoConDescuento)})`}
                </span>
              </>
            )}
            mensajeVacio="No hay resoluciones sancionadoras notificadas pendientes de pago."
          />

          <div className="grid grid-cols-[1fr_1fr] gap-[16px]">
            <Input
              label="Monto Pagado (S/)"
              placeholder="Ej. 1375.00"
              type="number"
              step="0.01"
              value={montoPagado}
              onChange={(e) => setMontoPagado(e.target.value)}
            />
            <Input
              type="date"
              label="Fecha de Pago en Recibo/Voucher"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
            />
          </div>

          <Button variant="success" loading={actionLoading} onClick={handleRegistrarPago}>
            Registrar Pago en Sistema
          </Button>

          {pagoResultado && (
            <div className="mt-[16px] bg-[#f8fafc] p-[12px] rounded-[8px] border border-border text-[13px]">
              <p className="font-bold text-midnight-900 mb-[8px]">Pago registrado</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-[16px] gap-y-[4px]">
                <dt className="text-text-muted">Expediente</dt>
                <dd className="font-semibold">{pagoResultado.numeroExpediente}</dd>
                {pagoResultado.numeroResolucion && (
                  <>
                    <dt className="text-text-muted">Resolución N°</dt>
                    <dd className="font-semibold">{pagoResultado.numeroResolucion}</dd>
                  </>
                )}
                <dt className="text-text-muted">Monto pagado</dt>
                <dd className="font-semibold">{soles(Number(pagoResultado.montoPagado))}</dd>
                <dt className="text-text-muted">Fecha de pago</dt>
                <dd className="font-semibold">{formatearFecha(pagoResultado.fechaPago)}</dd>
              </dl>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
