import React, { useEffect, useState } from 'react';
import { DocumentoGuardado, DocumentosGuardadosApi, LABEL_TIPO_GUARDADO, descargarDocumentoGuardado } from '../../api/controlDocumentario';
import { Alert, Button, EmptyState, Spinner } from '../../components/common/Common';
import { Buscador, EstadoPunto, TABLA } from '../../components/common/PageKit';
import { FileTextIcon } from '../../components/icons/Icons';
import { formatearFechaHora } from '../../lib/fechas';

const SELECT = 'h-[38px] px-[12px] text-[13px] rounded-sm border border-border bg-white text-text-main outline-none focus:border-primary-500';

function tamano(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Pestaña "Generados": cada Word o Excel que el sistema armó al descargarlo queda
 * guardado como una versión. Aquí se vuelve a ver y a descargar tal como se
 * generó en ese momento, aunque después hayan cambiado los datos del expediente.
 */
export const GeneradosTab: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  const [items, setItems] = useState<DocumentoGuardado[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);

  // Busca 350 ms después de la última tecla.
  useEffect(() => {
    let vigente = true;
    const timer = setTimeout(async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await DocumentosGuardadosApi.listar(busqueda.trim(), tipo);
        if (vigente) setItems(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (vigente) setError(err.message || 'No se pudieron cargar los documentos generados.');
      } finally {
        if (vigente) setCargando(false);
      }
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [busqueda, tipo]);

  const descargar = async (d: DocumentoGuardado) => {
    setDescargando(d.id);
    setError(null);
    try {
      await descargarDocumentoGuardado(d.id, d.nombreArchivo);
    } catch (err: any) {
      setError(err.message || 'No se pudo descargar el documento.');
    } finally {
      setDescargando(null);
    }
  };

  return (
    <>
      <div className="py-[16px] px-[24px] border-b border-border flex items-center justify-between flex-wrap gap-[14px]">
        <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por expediente o nombre de archivo" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={SELECT}>
          <option value="">Todos los tipos</option>
          {Object.entries(LABEL_TIPO_GUARDADO).map(([clave, etiqueta]) => (
            <option key={clave} value={clave}>
              {etiqueta}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="px-[24px] pt-[16px]">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {items === null && cargando && (
        <div className="py-[56px] text-center">
          <Spinner size={32} />
        </div>
      )}

      {items !== null && items.length === 0 && (
        <EmptyState
          icon={<FileTextIcon size={40} />}
          title="Todavía no hay documentos generados"
          description="Cada vez que se descargue un acta, IFI, resolución, carta o RSG, el sistema guarda una copia aquí, con su versión."
        />
      )}

      {items !== null && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className={TABLA.tabla}>
            <thead>
              <tr className={TABLA.encabezado}>
                <th className={TABLA.th}>Documento</th>
                <th className={TABLA.th}>Expediente</th>
                <th className={TABLA.th}>Versión</th>
                <th className={TABLA.th}>Generado</th>
                <th className={`${TABLA.th} text-right`}>Archivo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className={TABLA.fila}>
                  <td className={TABLA.td}>
                    <div className="text-[14px] font-bold text-midnight-900">{LABEL_TIPO_GUARDADO[d.tipo] ?? d.tipo}</div>
                    <div className="text-[12px] text-text-muted mt-[3px] break-all">{d.nombreArchivo}</div>
                  </td>
                  <td className={`${TABLA.td} text-[13.5px] text-text-main`}>{d.numeroExpediente ?? '—'}</td>
                  <td className={TABLA.td}>
                    <EstadoPunto tono="neutro">v{d.version}</EstadoPunto>
                  </td>
                  <td className={TABLA.td}>
                    <div className="text-[13.5px] text-text-main whitespace-nowrap">{formatearFechaHora(d.fecha)}</div>
                    <div className="text-[12px] text-text-muted mt-[3px]">{d.generadoPor}</div>
                  </td>
                  <td className={`${TABLA.td} text-right`}>
                    <div className="inline-flex items-center gap-[12px]">
                      <span className="text-[12px] text-text-muted">{tamano(d.tamanoBytes)}</span>
                      <Button variant="secondary" size="sm" loading={descargando === d.id} onClick={() => descargar(d)}>
                        Descargar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
