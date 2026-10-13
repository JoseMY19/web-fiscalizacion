import React, { useState } from 'react';
import { ControlDocumentarioApi, DocumentoFoliado, ExpedienteFoliado } from '../../api/controlDocumentario';
import { Alert, Button, EmptyState, Spinner } from '../../components/common/Common';
import { Buscador, EstadoPunto, TABLA, type TonoEstado } from '../../components/common/PageKit';
import { FileTextIcon, SearchIcon } from '../../components/icons/Icons';
import { formatearFechaHora } from '../../lib/fechas';

const ORIGEN: Record<DocumentoFoliado['direccion'], { etiqueta: string; tono: TonoEstado }> = {
  CAMPO: { etiqueta: 'Campo', tono: 'neutro' },
  ENTRADA: { etiqueta: 'Entrada', tono: 'info' },
  SALIDA: { etiqueta: 'Salida', tono: 'ok' },
};

/**
 * Expediente electrónico: todo lo del expediente en orden cronológico, con un
 * folio por documento. Se arma con los datos reales del sistema (actas y NC de
 * campo, lo que entró y lo que salió); el folio es el N° de orden, no el de hojas.
 */
export const ExpedienteFoliadoTab: React.FC = () => {
  const [numero, setNumero] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ExpedienteFoliado | null>(null);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = numero.trim();
    if (!q) return;
    setCargando(true);
    setError(null);
    try {
      setResultado(await ControlDocumentarioApi.expediente(q));
    } catch (err: any) {
      setResultado(null);
      setError(err.message || 'No se pudo cargar el expediente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <form onSubmit={buscar} className="py-[16px] px-[24px] border-b border-border flex items-center gap-[10px] flex-wrap">
        <Buscador value={numero} onChange={setNumero} placeholder="N° de expediente (ej. EXP-2026-000007)" />
        <Button type="submit" variant="primary" icon={<SearchIcon size={14} />} loading={cargando} disabled={!numero.trim()}>
          Ver expediente
        </Button>
      </form>

      {error && (
        <div className="px-[24px] pt-[16px]">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {cargando && !resultado ? (
        <div className="py-[56px] text-center">
          <Spinner size={32} />
        </div>
      ) : !resultado ? (
        <EmptyState
          icon={<FileTextIcon size={40} />}
          title="Busca un expediente"
          description="Escribe el N° de expediente para ver todos sus documentos en orden, con su folio."
        />
      ) : (
        <>
          <div className="py-[18px] px-[24px] flex items-baseline justify-between gap-[12px] flex-wrap border-b border-border">
            <div>
              <div className="text-[16px] font-extrabold text-midnight-900">{resultado.expediente.numeroExpediente}</div>
              <div className="text-[13px] text-text-muted mt-[2px]">{resultado.expediente.administrado ?? 'Administrado no identificado'}</div>
            </div>
            <div className="text-[13px] text-text-muted">
              <strong className="text-text-main tabular-nums">{resultado.totalDocumentos}</strong> documento{resultado.totalDocumentos === 1 ? '' : 's'} foliado
              {resultado.totalDocumentos === 1 ? '' : 's'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={TABLA.tabla}>
              <thead>
                <tr className={TABLA.encabezado}>
                  <th className={TABLA.th}>Folio</th>
                  <th className={TABLA.th}>Documento</th>
                  <th className={TABLA.th}>Fecha</th>
                  <th className={TABLA.th}>Origen</th>
                  <th className={TABLA.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {resultado.documentos.map((d) => (
                  <tr key={d.clave} className={TABLA.fila}>
                    <td className={`${TABLA.td} text-[14px] font-bold text-midnight-900 tabular-nums`}>{d.folio}</td>
                    <td className={TABLA.td}>
                      <div className="text-[14px] font-semibold text-text-main">{d.tipo}</div>
                      {(d.numero || d.numeroSgd) && (
                        <div className="text-[12px] text-text-muted mt-[3px]">
                          {d.numero}
                          {d.numero && d.numeroSgd ? ' · ' : ''}
                          {d.numeroSgd ? `SGD ${d.numeroSgd}` : ''}
                        </div>
                      )}
                      {d.asunto && <div className="text-[12px] text-text-muted mt-[2px] line-clamp-2">{d.asunto}</div>}
                    </td>
                    <td className={`${TABLA.td} text-[13px] text-text-secondary whitespace-nowrap`}>{formatearFechaHora(d.fecha)}</td>
                    <td className={TABLA.td}>
                      <EstadoPunto tono={ORIGEN[d.direccion].tono}>{ORIGEN[d.direccion].etiqueta}</EstadoPunto>
                    </td>
                    <td className={`${TABLA.td} text-[13px] text-text-secondary`}>{d.estado ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
