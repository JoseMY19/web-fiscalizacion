import React, { useEffect, useState } from 'react';
import { ConsultasApi, CierreCampoItem, abrirDocumento, descargarDocumentoWord } from '../../api';
import { Card, Button, Badge, Alert, EmptyState, Spinner } from '../../components/common/Common';
import { formatearFechaHora } from '../../lib/fechas';
import { EyeIcon, RefreshCwIcon, FileTextIcon } from '../../components/icons/Icons';

/**
 * Solo consulta — sin bandeja de aprobar/observar. Las intervenciones de
 * "solo Exhortación" o "solo Constatación" nunca generan Expediente por
 * diseño de negocio (BPMN oficial, compuerta SP1-G03 → N1-E05): esta
 * pantalla es la única visibilidad que oficina tiene de ellas.
 */
export const ConsultaCampoView: React.FC = () => {
  const [items, setItems] = useState<CierreCampoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'error'; text: string } | null>(null);

  const cargar = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await ConsultasApi.getCierresCampo();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cargar las intervenciones.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Exhortación / Constatación</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)' }}>
            Solo consulta — estos caminos cierran en campo y no generan expediente ni pasan por validación.
          </p>
        </div>
        <Button variant="outline" icon={<RefreshCwIcon size={16} />} onClick={cargar} disabled={loading}>
          Actualizar
        </Button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <Card>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<EyeIcon size={32} />}
            title="Sin intervenciones"
            description="No hay intervenciones de Exhortación o Constatación sincronizadas."
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.5rem' }}>Fecha</th>
                <th style={{ padding: '0.5rem' }}>Fiscalizador</th>
                <th style={{ padding: '0.5rem' }}>Camino</th>
                <th style={{ padding: '0.5rem' }}>Correlativo</th>
                <th style={{ padding: '0.5rem' }}>Resumen</th>
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.5rem' }}>{formatearFechaHora(item.fechaHoraInicio)}</td>
                  <td style={{ padding: '0.5rem' }}>{item.fiscalizadorNombre}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <Badge variant={item.tipoActuacion === 'EXHORTACION' ? 'info' : 'neutral'}>
                      {item.tipoActuacion === 'EXHORTACION' ? 'Exhortación' : 'Constatación'}
                    </Badge>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{item.numeroCorrelativo ?? '—'}</td>
                  <td style={{ padding: '0.5rem', maxWidth: 320 }}>{item.resumen ?? '—'}</td>
                  <td style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!item.fotoActaId}
                      onClick={() => item.fotoActaId && abrirDocumento(item.fotoActaId)}
                    >
                      Ver foto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FileTextIcon size={14} />}
                      disabled={!item.numeroCorrelativo}
                      onClick={() =>
                        descargarDocumentoWord(item.id, item.tipoActuacion === 'EXHORTACION' ? 'EXHORTACION' : 'FISCALIZACION')
                      }
                    >
                      Descargar Word
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
