import React, { useState } from 'react';
import { CoactivaPagosApi } from '../../api';
import { Card, Button, Input, Alert } from '../../components/common/Common';
import { hoyLocal } from '../../lib/fechas';
import { CreditCardIcon, GavelIcon, FileTextIcon, ScaleIcon } from '../../components/icons/Icons';

export const CoactivaPagosView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'coactiva' | 'pagos'>('coactiva');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados Acto Firme
  const [expedienteId, setExpedienteId] = useState('');
  const [motivoFirmeza, setMotivoFirmeza] = useState<'VENCIMIENTO_PLAZO_RECURSOS' | 'APELACION_INFUNDADA'>('VENCIMIENTO_PLAZO_RECURSOS');
  const [fechaFirmeza, setFechaFirmeza] = useState(hoyLocal());
  const [fechaDerivacion, setFechaDerivacion] = useState(hoyLocal());
  const [requiereMedida, setRequiereMedida] = useState(false);

  // Estados Pagos
  const [resolucionIdPago, setResolucionIdPago] = useState('');
  const [montoPagado, setMontoPagado] = useState('');
  const [fechaPago, setFechaPago] = useState(hoyLocal());
  const [pagoResultado, setPagoResultado] = useState<any | null>(null);

  const handleDeclararFirme = async () => {
    if (!expedienteId.trim()) {
      setMessage({ type: 'error', text: 'Ingrese el ID del expediente.' });
      return;
    }
    setActionLoading(true);
    try {
      await CoactivaPagosApi.declararActoFirme(expedienteId.trim(), motivoFirmeza, fechaFirmeza);
      setMessage({ type: 'success', text: `Expediente declarado como ACTO FIRME por ${motivoFirmeza}.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al declarar acto firme.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConstanciaMulta = async () => {
    if (!expedienteId.trim()) return;
    setActionLoading(true);
    try {
      await CoactivaPagosApi.emitirConstanciaMulta(expedienteId.trim());
      setMessage({ type: 'success', text: 'Constancia de Exigibilidad de Multa emitida con éxito.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al emitir constancia de multa.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConstanciaMedida = async () => {
    if (!expedienteId.trim()) return;
    setActionLoading(true);
    try {
      await CoactivaPagosApi.emitirConstanciaMedida(expedienteId.trim());
      setMessage({ type: 'success', text: 'Constancia de Exigibilidad de Medida Complementaria emitida con éxito.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al emitir constancia de medida complementaria.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDerivacion = async () => {
    if (!expedienteId.trim()) return;
    setActionLoading(true);
    try {
      await CoactivaPagosApi.registrarDerivacionCoactiva(expedienteId.trim(), fechaDerivacion, requiereMedida);
      setMessage({ type: 'success', text: 'Derivación formal a la Oficina de Ejecución Coactiva registrada.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrar derivación coactiva.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegistrarPago = async () => {
    if (!resolucionIdPago.trim() || !montoPagado) {
      setMessage({ type: 'error', text: 'Complete la resolución y el monto cancelado según comprobante.' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await CoactivaPagosApi.registrarPago(resolucionIdPago.trim(), Number(montoPagado), fechaPago);
      setPagoResultado(res);
      setMessage({ type: 'success', text: `Pago de S/ ${montoPagado} registrado con éxito en Tesorería/Recaudación.` });
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
          <Card title="Etapa 1: Declaratoria de Acto Firme">
            <div className="grid grid-cols-[2fr_1fr] gap-[16px]">
              <Input
                label="ID del Expediente Sancionador"
                placeholder="Ej. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                value={expedienteId}
                onChange={(e) => setExpedienteId(e.target.value)}
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
                onChange={(e) => setMotivoFirmeza(e.target.value as any)}
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

          <Card title="Etapa 2: Emisión de Títulos de Ejecución y Derivación Coactiva">
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
        <Card title="Registro Manual de Comprobantes de Pago de Multas">
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

          <Input
            label="ID de la Resolución Sancionadora (RSGSA)"
            placeholder="Ej. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
            value={resolucionIdPago}
            onChange={(e) => setResolucionIdPago(e.target.value)}
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
            <div className="mt-[16px] bg-[#f8fafc] p-[12px] rounded-[8px] border border-border">
              <pre className="text-[12px]">{JSON.stringify(pagoResultado, null, 2)}</pre>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};