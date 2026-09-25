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
      <div className="flex justify-between items-center mb-[1.5rem]">
        <div>
          <h1 className="m-0 text-[1.5rem] font-bold">Exhortación / Constatación</h1>
          <p className="mt-[0.25rem] mx-0 mb-0 text-text-muted">
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
          <div className="flex justify-center p-[2rem]">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<EyeIcon size={32} />}
            title="Sin intervenciones"
            description="No hay intervenciones de Exhortación o Constatación sincronizadas."
          />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-b-border">
                <th className="p-[0.5rem]">Fecha</th>
                <th className="p-[0.5rem]">Fiscalizador</th>
                <th className="p-[0.5rem]">Camino</th>
                <th className="p-[0.5rem]">Correlativo</th>
                <th className="p-[0.5rem]">Resumen</th>
                <th className="p-[0.5rem]"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-b-border">
                  <td className="p-[0.5rem]">{formatearFechaHora(item.fechaHoraInicio)}</td>
                  <td className="p-[0.5rem]">{item.fiscalizadorNombre}</td>
                  <td className="p-[0.5rem]">
                    <Badge variant={item.tipoActuacion === 'EXHORTACION' ? 'info' : 'neutral'}>
                      {item.tipoActuacion === 'EXHORTACION' ? 'Exhortación' : 'Constatación'}
                    </Badge>
                  </td>
                  <td className="p-[0.5rem]">{item.numeroCorrelativo ?? '—'}</td>
                  <td className="p-[0.5rem] max-w-[320px]">{item.resumen ?? '—'}</td>
                  <td className="p-[0.5rem] flex gap-[0.5rem]">
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
