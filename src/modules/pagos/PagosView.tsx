import React, { useCallback, useEffect, useState } from 'react';
import { LABEL_SISTEMA_ORIGEN, PagoRegistradoItem, PagosApi } from '../../api/pagos';
import { Alert, Button, EmptyState, Spinner } from '../../components/common/Common';
import { Buscador, PageHeader, PanelTabla, TABLA } from '../../components/common/PageKit';
import { montoSoles } from '../../components/common/PagadoBadge';
import { formatearFecha, formatearFechaHora } from '../../lib/fechas';
import { CreditCardIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { RegistroPagoCard } from './RegistroPagoCard';

/**
 * F5 — "Registro de Pagos" (usuario Caja/plataforma). Hoy los pagos se
 * registran en SIFAT o el sistema de internet (ambos alimentan al SATRIM);
 * sin integración todavía, plataforma los copia aquí por N° de NC para que el
 * estado "Pagado" se vea en IFI, Resolución, Recursos y Acto firme.
 */
export const PagosView: React.FC = () => {
  const [pagos, setPagos] = useState<PagoRegistradoItem[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async (q: string) => {
    setCargando(true);
    setError(null);
    try {
      const data = await PagosApi.listar(q.trim());
      setPagos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los pagos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  return (
    <div>
      <PageHeader
        titulo="Registro de Pagos"
        descripcion="Pagos de multas por N° de Notificación de Cargo (registrados en SIFAT o el sistema de internet). Se aceptan en cualquier momento del procedimiento."
        acciones={
          <Button variant="secondary" icon={<RefreshCwIcon size={14} />} onClick={() => cargar(busqueda)}>
            Actualizar
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-[380px_minmax(0,1fr)] gap-[24px] items-start max-xl:grid-cols-1">
        <RegistroPagoCard onRegistrado={() => cargar(busqueda)} />

        <PanelTabla
          barra={
            <>
              <h3 className="text-[15px] font-bold text-midnight-900 m-0">Pagos registrados</h3>
              <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por NC, expediente o recibo" />
            </>
          }
        >
          {cargando && pagos === null ? (
            <div className="py-[32px] px-[24px] flex items-center justify-center gap-[8px] text-[13px] text-text-muted">
              <Spinner size={16} /> Cargando…
            </div>
          ) : !pagos || pagos.length === 0 ? (
            <EmptyState icon={<CreditCardIcon size={32} />} title={busqueda.trim() ? 'Sin resultados' : 'Todavía no hay pagos registrados'} />
          ) : (
            <div className="overflow-x-auto">
              <table className={TABLA.tabla}>
                <thead>
                  <tr className={TABLA.encabezado}>
                    <th className={TABLA.th}>NC / Expediente</th>
                    <th className={TABLA.th}>Monto y fecha de pago</th>
                    <th className={TABLA.th}>Recibo / sistema</th>
                    <th className={TABLA.th}>Registrado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className={TABLA.fila}>
                      <td className={TABLA.td}>
                        <div className="text-[14px] font-bold text-midnight-900">NC N° {p.notificacion.numeroNc}</div>
                        <div className="text-[12px] text-text-muted mt-[3px]">Exp. {p.notificacion.numeroExpediente ?? '—'}</div>
                        <div className="text-[13px] text-text-secondary mt-[6px]">{p.notificacion.administrado ?? 'Administrado no identificado'}</div>
                      </td>
                      <td className={TABLA.td}>
                        <div className="text-[14px] font-bold text-text-main tabular-nums">{montoSoles(p.montoPagado)}</div>
                        <div className="text-[12px] text-text-muted mt-[3px]">{formatearFecha(p.fechaPago)}</div>
                      </td>
                      <td className={TABLA.td}>
                        <div className="text-[13.5px] text-text-main">{p.numeroRecibo ?? '—'}</div>
                        <div className="text-[12px] text-text-muted mt-[3px]">{p.sistemaOrigen ? LABEL_SISTEMA_ORIGEN[p.sistemaOrigen] : 'Sistema no registrado'}</div>
                        {p.observacion && <div className="text-[12px] text-text-muted italic mt-[3px]">{p.observacion}</div>}
                      </td>
                      <td className={`${TABLA.td} text-[12px] text-text-muted`}>
                        {p.registradoPor}
                        <br />
                        {formatearFechaHora(p.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelTabla>
      </div>
    </div>
  );
};
