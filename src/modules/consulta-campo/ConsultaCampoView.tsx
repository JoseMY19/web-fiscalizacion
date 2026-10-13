import React, { useEffect, useState } from 'react';
import { ConsultasApi, CierreCampoItem, abrirDocumento, descargarDocumentoWord } from '../../api';
import { Button, Alert, EmptyState, Spinner } from '../../components/common/Common';
import { EstadoPunto, PageHeader, PanelTabla, TABLA } from '../../components/common/PageKit';
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
      <PageHeader
        titulo="Exhortación y Consulta"
        descripcion="Solo consulta - estos caminos cierran en campo y no generan expediente ni pasan por validación."
        acciones={
          <Button variant="secondary" icon={<RefreshCwIcon size={14} />} onClick={cargar} disabled={loading}>
            Actualizar
          </Button>
        }
      />

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <PanelTabla>
        {loading ? (
          <div className="flex justify-center py-[56px]">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<EyeIcon size={32} />}
            title="Sin intervenciones"
            description="No hay intervenciones de Exhortación o Constatación sincronizadas."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLA.tabla}>
              <thead>
                <tr className={TABLA.encabezado}>
                  <th className={TABLA.th}>Fecha</th>
                  <th className={TABLA.th}>Fiscalizador</th>
                  <th className={TABLA.th}>Camino</th>
                  <th className={TABLA.th}>Resumen</th>
                  <th className={`${TABLA.th} text-right`}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={TABLA.fila}>
                    <td className={TABLA.td}>
                      <div className="text-[14px] font-bold text-midnight-900">{formatearFechaHora(item.fechaHoraInicio)}</div>
                      <div className="text-[12px] text-text-muted mt-[3px]">Correlativo {item.numeroCorrelativo ?? '—'}</div>
                    </td>
                    <td className={`${TABLA.td} text-[13.5px] text-text-main`}>{item.fiscalizadorNombre}</td>
                    <td className={TABLA.td}>
                      <EstadoPunto tono={item.tipoActuacion === 'EXHORTACION' ? 'info' : 'neutro'}>
                        {item.tipoActuacion === 'EXHORTACION' ? 'Exhortación' : 'Constatación'}
                      </EstadoPunto>
                    </td>
                    <td className={`${TABLA.td} max-w-[320px] text-[13px] text-text-secondary`}>{item.resumen ?? '—'}</td>
                    <td className={`${TABLA.td} text-right`}>
                      <div className="inline-flex items-center gap-[8px]">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!item.fotoActaId}
                          onClick={() => item.fotoActaId && abrirDocumento(item.fotoActaId)}
                        >
                          Ver foto
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<FileTextIcon size={14} />}
                          disabled={!item.numeroCorrelativo}
                          onClick={() =>
                            descargarDocumentoWord(item.id, item.tipoActuacion === 'EXHORTACION' ? 'EXHORTACION' : 'FISCALIZACION')
                          }
                        >
                          Descargar Word
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelTabla>
    </div>
  );
};
