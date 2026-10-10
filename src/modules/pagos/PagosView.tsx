import React, { useCallback, useEffect, useState } from 'react';
import { LABEL_SISTEMA_ORIGEN, PagoRegistradoItem, PagosApi } from '../../api/pagos';
import { Alert, Button, Card, EmptyState, Input, Spinner } from '../../components/common/Common';
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
      <div className="mb-[20px]">
        <h2 className="text-[18px] font-extrabold text-midnight-900">Registro de Pagos</h2>
        <p className="text-[13px] text-text-muted mt-[2px]">
          Pagos de multas por N° de Notificación de Cargo (registrados en SIFAT o el sistema de internet). Se aceptan en cualquier momento del
          procedimiento.
        </p>
      </div>

      <div className="flex flex-col gap-[20px]">
        <RegistroPagoCard onRegistrado={() => cargar(busqueda)} />

        <Card
          title="Pagos registrados"
          action={
            <Button variant="secondary" size="sm" icon={<RefreshCwIcon size={14} />} onClick={() => cargar(busqueda)}>
              Actualizar
            </Button>
          }
        >
          <div className="max-w-[420px]">
            <Input placeholder="Buscar por N° de NC, expediente o recibo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          {error && <Alert type="error">{error}</Alert>}
          {cargando && pagos === null ? (
            <div className="flex items-center gap-[8px] text-[13px] text-text-muted">
              <Spinner size={16} /> Cargando…
            </div>
          ) : !pagos || pagos.length === 0 ? (
            <EmptyState icon={<CreditCardIcon size={32} />} title={busqueda.trim() ? 'Sin resultados' : 'Todavía no hay pagos registrados'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="text-left text-text-muted text-[12px] border-b border-b-border">
                    <th className="py-[8px] pr-[12px]">NC / Expediente</th>
                    <th className="py-[8px] pr-[12px]">Administrado</th>
                    <th className="py-[8px] pr-[12px]">Monto</th>
                    <th className="py-[8px] pr-[12px]">Fecha de pago</th>
                    <th className="py-[8px] pr-[12px]">Recibo / sistema</th>
                    <th className="py-[8px]">Registrado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-b border-b-border align-top">
                      <td className="py-[8px] pr-[12px]">
                        <div className="font-bold text-midnight-900">NC N° {p.notificacion.numeroNc}</div>
                        <div className="text-text-muted text-[12px]">Exp. {p.notificacion.numeroExpediente ?? '—'}</div>
                      </td>
                      <td className="py-[8px] pr-[12px]">{p.notificacion.administrado ?? '—'}</td>
                      <td className="py-[8px] pr-[12px] font-semibold">{montoSoles(p.montoPagado)}</td>
                      <td className="py-[8px] pr-[12px]">{formatearFecha(p.fechaPago)}</td>
                      <td className="py-[8px] pr-[12px]">
                        <div>{p.numeroRecibo ?? '—'}</div>
                        <div className="text-text-muted text-[12px]">{p.sistemaOrigen ? LABEL_SISTEMA_ORIGEN[p.sistemaOrigen] : 'Sistema no registrado'}</div>
                        {p.observacion && <div className="text-text-muted text-[12px] italic">{p.observacion}</div>}
                      </td>
                      <td className="py-[8px] text-[12px] text-text-muted">
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
        </Card>
      </div>
    </div>
  );
};
