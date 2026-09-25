import React, { useEffect, useState } from 'react';
import { CautelaresApi, ConsultasApi, IntervencionSelectorItem, descargarDocumentoMedidaCautelar } from '../../api';
import { Card, Button, Input, Textarea, Alert, Spinner } from '../../components/common/Common';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { ShieldAlertIcon, FileTextIcon } from '../../components/icons/Icons';

export const CautelaresView: React.FC = () => {
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selector de intervenciones disponibles
  const [intervenciones, setIntervenciones] = useState<IntervencionSelectorItem[]>([]);
  const [loadingIntervenciones, setLoadingIntervenciones] = useState(true);

  useEffect(() => {
    ConsultasApi.getIntervencionesSelector()
      .then((data) => setIntervenciones(Array.isArray(data) ? data : []))
      .catch(() => setIntervenciones([]))
      .finally(() => setLoadingIntervenciones(false));
  }, []);

  // Estados Emitir
  const [intervencionId, setIntervencionId] = useState('');
  const [situacionGravedad, setSituacionGravedad] = useState('');
  const [resolucionCautelarTexto, setResolucionCautelarTexto] = useState('');
  const [vistoAntecedentes, setVistoAntecedentes] = useState('');
  const [inicialesFirma, setInicialesFirma] = useState('');
  const [relatoHechos, setRelatoHechos] = useState('');
  const [tipoMedidaCautelar, setTipoMedidaCautelar] = useState('');
  const [modalidadEjecucion, setModalidadEjecucion] = useState('');
  const [direccionNotificacion, setDireccionNotificacion] = useState('');
  const [incluyeAdvertenciaUsurpacion, setIncluyeAdvertenciaUsurpacion] = useState(false);
  const [incluyeResguardoSerenazgo, setIncluyeResguardoSerenazgo] = useState(false);

  // Estados Ejecución & Anexo
  const [medidaId, setMedidaId] = useState('');
  const [fechaEjecucion, setFechaEjecucion] = useState(hoyLocal());

  const handleEmitir = async () => {
    if (!intervencionId.trim() || !situacionGravedad.trim() || !resolucionCautelarTexto.trim()) {
      setMessage({ type: 'error', text: 'Complete la intervención, la situación de gravedad y la resolución cautelar.' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await CautelaresApi.emitir(intervencionId.trim(), {
        situacionGravedad: situacionGravedad.trim(),
        resolucionCautelarTexto: resolucionCautelarTexto.trim(),
        vistoAntecedentes: vistoAntecedentes.trim() || undefined,
        inicialesFirma: inicialesFirma.trim() || undefined,
        relatoHechos: relatoHechos.trim() || undefined,
        tipoMedidaCautelar: tipoMedidaCautelar.trim() || undefined,
        modalidadEjecucion: modalidadEjecucion.trim() || undefined,
        direccionNotificacion: direccionNotificacion.trim() || undefined,
        incluyeAdvertenciaUsurpacion,
        incluyeResguardoSerenazgo,
      });
      setMessage({ type: 'success', text: `Medida Cautelar de Urgencia emitida con ID: ${res.id}` });
      if (res.id) setMedidaId(res.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al emitir medida cautelar.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEjecucion = async () => {
    if (!medidaId.trim()) {
      setMessage({ type: 'error', text: 'Ingrese el ID de la medida cautelar.' });
      return;
    }
    setActionLoading(true);
    try {
      await CautelaresApi.registrarEjecucion(medidaId.trim(), fechaEjecucion);
      setMessage({ type: 'success', text: 'Ejecución material de la medida cautelar registrada.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrar ejecución.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnexar = async () => {
    if (!medidaId.trim()) return;
    setActionLoading(true);
    try {
      await CautelaresApi.anexarAExpediente(medidaId.trim());
      setMessage({ type: 'success', text: 'Medida cautelar anexada formalmente al expediente del PAS.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al anexar al expediente.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-[20px]">
        <h2 className="text-[18px] font-extrabold text-midnight-900">
          Medidas Cautelares Previas y de Urgencia (ES2)
        </h2>
        <p className="text-[13px] text-text-muted mt-[2px]">
          Adopción preventiva de medidas urgentes de paralización, clausura preventiva o decomiso para cautelar el interés público.
        </p>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div
        className="bg-[#eff6ff] py-[12px] px-[16px] rounded-[8px] border border-[#bfdbfe] text-[#1e3a8a] text-[13px] mb-[20px]"
      >
        <div className="flex items-start gap-[8px]">
          <span className="mt-[2px] shrink-0"><ShieldAlertIcon size={16} /></span>
          <span>
            <strong>Marco Jurídico del PAS:</strong> La medida cautelar vincula directamente a la <strong>Intervención</strong>,
            no del Expediente, pues el marco legal faculta su adopción previa o simultánea a la Notificación de Cargo.
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[20px]">
        {/* Paso 1: Emitir */}
        <Card title="Paso 1: Emisión de la Resolución Cautelar">
          <div>
            <label>Intervención de Fiscalización</label>
            {loadingIntervenciones ? (
              <div className="py-[8px] px-0">
                <Spinner size={16} />
              </div>
            ) : (
              <select value={intervencionId} onChange={(e) => setIntervencionId(e.target.value)}>
                <option value="">— Seleccione una intervención —</option>
                {intervenciones.map((i) => (
                  <option key={i.id} value={i.id}>
                    {formatearFecha(i.fechaHoraInicio)} · {i.tipoActuacion} ·{' '}
                    {i.administradoNombre ?? 'Sin administrado identificado'}
                    {i.numeroExpediente ? ` · Exp. ${i.numeroExpediente}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Input
            label="Situación de Grave Riesgo / Urgencia"
            placeholder="Ej. Riesgo inminente a la vida o seguridad pública, desacato continuo..."
            value={situacionGravedad}
            onChange={(e) => setSituacionGravedad(e.target.value)}
          />

          <Textarea
            label="VISTO — Antecedentes (opcional, solo para el documento Word)"
            placeholder="Ej. El Acta de Constatación Nº..., Notificación Preventiva Nº..., el Informe N°..."
            value={vistoAntecedentes}
            onChange={(e) => setVistoAntecedentes(e.target.value)}
            rows={2}
          />

          <Textarea
            label="Relato de hechos del caso (opcional, solo para el documento Word)"
            placeholder="Ej. Que, dentro de ese contexto se tiene que el policía municipal, en razón a sus funciones..."
            value={relatoHechos}
            onChange={(e) => setRelatoHechos(e.target.value)}
            rows={3}
          />

          <Textarea
            label="Texto de la Resolución Cautelar (Redactada por la Autoridad)"
            placeholder="Escriba la orden cautelar expresa (clausura preventiva, decomiso de bienes perecibles, paralización inmediata de obra sin licencia)..."
            value={resolucionCautelarTexto}
            onChange={(e) => setResolucionCautelarTexto(e.target.value)}
            rows={4}
          />

          <div className="flex gap-[12px]">
            <div className="flex-1">
              <Input
                label="Tipo de Medida Cautelar (opcional, doc. Word)"
                placeholder="Ej. PARALIZACIÓN, CLAUSURA, DECOMISO"
                value={tipoMedidaCautelar}
                onChange={(e) => setTipoMedidaCautelar(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Dirección de notificación (opcional, doc. Word)"
                placeholder="Ej. MZ. C LOTE 3..."
                value={direccionNotificacion}
                onChange={(e) => setDireccionNotificacion(e.target.value)}
              />
            </div>
          </div>

          <Textarea
            label="Modalidad de ejecución (opcional, solo para el documento Word)"
            placeholder="Ej. Colocando tres (03) bloques de concreto para asegurar el bloqueo de los accesos..."
            value={modalidadEjecucion}
            onChange={(e) => setModalidadEjecucion(e.target.value)}
            rows={2}
          />

          <Input
            label="Iniciales de quien redacta (opcional, solo para el documento Word)"
            placeholder="Ej. ASAC/jlvn"
            value={inicialesFirma}
            onChange={(e) => setInicialesFirma(e.target.value)}
          />

          <div className="flex gap-[20px] mt-[4px] mx-0 mb-[16px]">
            <label className="flex items-center gap-[6px] text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={incluyeAdvertenciaUsurpacion}
                onChange={(e) => setIncluyeAdvertenciaUsurpacion(e.target.checked)}
              />
              Incluir advertencia penal por usurpación
            </label>
            <label className="flex items-center gap-[6px] text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={incluyeResguardoSerenazgo}
                onChange={(e) => setIncluyeResguardoSerenazgo(e.target.checked)}
              />
              Incluir resguardo de Serenazgo
            </label>
          </div>

          <Button variant="primary" icon={<ShieldAlertIcon size={16} />} loading={actionLoading} onClick={handleEmitir}>
            Emitir Medida Cautelar
          </Button>
        </Card>

        {/* Paso 2: Ejecución y Anexión */}
        <Card title="Paso 2: Registro de Ejecución Material y Anexión al Expediente">
          <Input
            label="ID de la Medida Cautelar"
            placeholder="ID autogenerado en el paso 1"
            value={medidaId}
            onChange={(e) => setMedidaId(e.target.value)}
          />

          <Button
            variant="outline"
            icon={<FileTextIcon size={16} />}
            disabled={!medidaId.trim()}
            onClick={() => descargarDocumentoMedidaCautelar(medidaId.trim())}
            className="mb-[16px]!"
          >
            Descargar Word de la Resolución
          </Button>

          <div className="flex gap-[12px] items-end mb-[16px]">
            <div className="flex-1">
              <Input
                type="date"
                label="Fecha de la Diligencia de Ejecución Material"
                value={fechaEjecucion}
                onChange={(e) => setFechaEjecucion(e.target.value)}
              />
            </div>
            <Button variant="secondary" loading={actionLoading} onClick={handleEjecucion} className="mb-[14px]!">
              Registrar Ejecución
            </Button>
          </div>

          <div className="border-t border-t-border pt-[16px]">
            <p className="text-[13px] text-text-secondary mb-[12px]">
              Una vez generado el Expediente administrativo del PAS, anexe formalmente el cuaderno cautelar:
            </p>
            <Button variant="outline" loading={actionLoading} onClick={handleAnexar}>
              Anexar Cautelar al Expediente
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};