import React, { useState } from 'react';
import { CautelaresApi } from '../../api';
import { Card, Button, Input, Textarea, Alert } from '../../components/common/Common';
import { ShieldAlertIcon } from '../../components/icons/Icons';

export const CautelaresView: React.FC = () => {
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados Emitir
  const [intervencionId, setIntervencionId] = useState('');
  const [situacionGravedad, setSituacionGravedad] = useState('');
  const [resolucionCautelarTexto, setResolucionCautelarTexto] = useState('');

  // Estados Ejecución & Anexo
  const [medidaId, setMedidaId] = useState('');
  const [fechaEjecucion, setFechaEjecucion] = useState(new Date().toISOString().slice(0, 10));

  const handleEmitir = async () => {
    if (!intervencionId.trim() || !situacionGravedad.trim() || !resolucionCautelarTexto.trim()) {
      alert('Complete la intervención, la situación de gravedad y la resolución cautelar.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await CautelaresApi.emitir(intervencionId.trim(), situacionGravedad.trim(), resolucionCautelarTexto.trim());
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
      alert('Ingrese el ID de la medida cautelar.');
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
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-midnight-900)' }}>
          Medidas Cautelares Previas y de Urgencia (ES2)
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Adopción preventiva de medidas urgentes de paralización, clausura preventiva o decomiso para cautelar el interés público.
        </p>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div
        style={{
          backgroundColor: '#eff6ff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #bfdbfe',
          color: '#1e3a8a',
          fontSize: '13px',
          marginBottom: '20px',
        }}
      >
        💡 <strong>Diseño Jurídico del PAS:</strong> La medida cautelar cuelga directamente de la <strong>Intervención</strong>,
        no del Expediente, porque la ley permite dictarla de urgencia incluso antes de la emisión de la Notificación de Cargo.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Paso 1: Emitir */}
        <Card title="Paso 1: Emisión de la Resolución Cautelar">
          <Input
            label="ID de la Intervención de Fiscalización"
            placeholder="Ej. 4cb90102-1234-5678-9abc-def012345678"
            value={intervencionId}
            onChange={(e) => setIntervencionId(e.target.value)}
          />

          <Input
            label="Situación de Grave Riesgo / Urgencia"
            placeholder="Ej. Riesgo inminente a la vida o seguridad pública, desacato continuo..."
            value={situacionGravedad}
            onChange={(e) => setSituacionGravedad(e.target.value)}
          />

          <Textarea
            label="Texto de la Resolución Cautelar (Redactada por la Autoridad)"
            placeholder="Escriba la orden cautelar expresa (clausura preventiva, decomiso de bienes perecibles, paralización inmediata de obra sin licencia)..."
            value={resolucionCautelarTexto}
            onChange={(e) => setResolucionCautelarTexto(e.target.value)}
            rows={4}
          />

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

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <Input
                type="date"
                label="Fecha de la Diligencia de Ejecución Material"
                value={fechaEjecucion}
                onChange={(e) => setFechaEjecucion(e.target.value)}
              />
            </div>
            <Button variant="secondary" loading={actionLoading} onClick={handleEjecucion} style={{ marginBottom: '14px' }}>
              Registrar Ejecución
            </Button>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
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