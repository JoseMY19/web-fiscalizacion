import React, { useCallback, useEffect, useState } from 'react';
import {
  ActoFirmePendienteDerivacion,
  CandidatoActoFirme,
  CoactivaPagosApi,
} from '../../api';
import { RegistroPagoCard } from '../pagos/RegistroPagoCard';
import { Card, Button, Input, Alert, Badge } from '../../components/common/Common';
import { ComboboxExpediente } from '../../components/common/ComboboxExpediente';
import { PagadoBadge } from '../../components/common/PagadoBadge';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { CreditCardIcon, GavelIcon, FileTextIcon } from '../../components/icons/Icons';

type MotivoFirmeza = CandidatoActoFirme['motivo'];

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

export const CoactivaPagosView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'coactiva' | 'pagos'>('coactiva');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const candidatos = useLista(CoactivaPagosApi.listarCandidatosActoFirme);
  const pendientesDerivacion = useLista(CoactivaPagosApi.listarPendientesDerivacion);

  // Estados Acto Firme
  const [candidato, setCandidato] = useState<CandidatoActoFirme | null>(null);
  const [actoFirme, setActoFirme] = useState<ActoFirmePendienteDerivacion | null>(null);
  const [motivoFirmeza, setMotivoFirmeza] = useState<MotivoFirmeza>('VENCIMIENTO_PLAZO_RECURSOS');
  const [fechaFirmeza, setFechaFirmeza] = useState(hoyLocal());
  const [fechaDerivacion, setFechaDerivacion] = useState(hoyLocal());
  const [requiereMedida, setRequiereMedida] = useState(false);

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
          2. Registro de Pagos de Multas (por N° de NC)
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
                    <PagadoBadge tienePago={c.tienePago} montoPagado={c.montoPagado} fechaPago={c.fechaPago} />
                    <Badge variant={c.motivo === 'APELACION_INFUNDADA' ? 'danger' : 'warning'}>{MOTIVO_CORTO[c.motivo]}</Badge>
                    {c.fechaVencimientoPlazo && (
                      <span className="text-[11px] text-text-muted">
                        Plazo venció {formatearFecha(c.fechaVencimientoPlazo)}
                      </span>
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

            {candidato?.tienePago && (
              <Alert type="success">
                <span className="inline-flex items-center gap-[8px] flex-wrap">
                  <PagadoBadge tienePago montoPagado={candidato.montoPagado} fechaPago={candidato.fechaPago} size="md" />
                  El administrado ya registró un pago.
                </span>
              </Alert>
            )}

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

            <div className="flex gap-[8px] flex-wrap">
              <Button variant="danger" loading={actionLoading} onClick={handleDeclararFirme}>
                Declarar Acto Firme
              </Button>
            </div>
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
                  <PagadoBadge tienePago={a.tienePago} montoPagado={a.montoPagado} fechaPago={a.fechaPago} />
                  <span className="text-[11px] text-text-muted">Firme desde {formatearFecha(a.fechaFirmeza)}</span>
                  <Badge variant={a.constanciaMultaEmitida ? 'success' : 'neutral'}>
                    {a.constanciaMultaEmitida ? 'Constancia multa emitida' : 'Sin constancia de multa'}
                  </Badge>
                  {a.constanciaMedidaComplementariaEmitida && <Badge variant="success">Constancia medida emitida</Badge>}
                </>
              )}
              mensajeVacio="No hay expedientes con acto firme pendientes de derivar a coactiva."
            />
            {actoFirme?.tienePago && (
              <Alert type="success">
                <span className="inline-flex items-center gap-[8px] flex-wrap">
                  <PagadoBadge tienePago montoPagado={actoFirme.montoPagado} fechaPago={actoFirme.fechaPago} size="md" />
                  Verifica el pago antes de derivar a Ejecución Coactiva.
                </span>
              </Alert>
            )}

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
        /* Tab 2: Pagos — F5: se registran por N° de NC (mismo formulario que "Registro de Pagos"). */
        <RegistroPagoCard
          onRegistrado={() => {
            candidatos.recargar();
            pendientesDerivacion.recargar();
          }}
        />
      )}
    </div>
  );
};
