import React, { useCallback, useEffect, useState } from 'react';
import { PrescripcionApi, SolicitudPrescripcionItem } from '../../api';
import { socket } from '../../lib/socket';
import { cn } from '../../lib/cn';
import { formatearFecha } from '../../lib/fechas';
import { Alert, Badge, Button, Card, EmptyState, Spinner } from '../../components/common/Common';
import { CheckCircleIcon, EyeIcon, PlusIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { RegistrarSolicitudPrescripcionModal } from './RegistrarSolicitudPrescripcionModal';
import { PrescripcionPanel } from './PrescripcionPanel';
import { ETIQUETA_PASO_PRESCRIPCION, resumenMultas } from './prescripcionUi';

type Pestana = 'enEvaluacion' | 'resueltas';

/**
 * F3 — Prescripción de la exigibilidad de multas (art. 233-A Ley 27444).
 * Solo a pedido de parte: solicitud → multas (del sistema o antiguas) →
 * cómputo de 2 años + suspensiones → decisión por multa → RSG → firma →
 * notificación → el analista actualiza el estado de cuenta.
 */
export const PrescripcionView: React.FC = () => {
  const [bandeja, setBandeja] = useState<Record<Pestana, SolicitudPrescripcionItem[]>>({ enEvaluacion: [], resueltas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('enEvaluacion');
  const [registrando, setRegistrando] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await PrescripcionApi.getBandeja();
      setBandeja({ enEvaluacion: d?.enEvaluacion ?? [], resueltas: d?.resueltas ?? [] });
    } catch (err: any) {
      setError(err.message || 'Error al cargar las solicitudes de prescripción.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    socket.on('prescripcion:cambio', cargar);
    return () => {
      socket.off('prescripcion:cambio', cargar);
    };
  }, [cargar]);

  const filas = bandeja[pestana];
  const pendientesEstadoCuenta = bandeja.resueltas.filter((s) => s.siguientePaso === 'ACTUALIZAR_ESTADO_CUENTA').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-[20px] gap-[12px] flex-wrap">
        <div>
          <h2 className="text-[18px] font-extrabold text-midnight-900">Prescripción de la exigibilidad de multas</h2>
          <p className="text-[13px] text-text-muted mt-[2px] max-w-[760px]">
            Art. 233-A Ley 27444 — <strong>solo a pedido de parte</strong>. La facultad de cobrar la multa por ejecución forzosa prescribe a los{' '}
            <strong>2 años</strong> desde que el acto quedó firme (o desde el contencioso desfavorable), más los periodos de suspensión (coactiva,
            revisión judicial). Una solicitud puede incluir varias multas, también antiguas que no están en este sistema.
          </p>
        </div>
        <div className="flex gap-[8px]">
          <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargar}>
            Actualizar
          </Button>
          <Button icon={<PlusIcon size={16} />} onClick={() => setRegistrando(true)}>
            Registrar solicitud
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {pendientesEstadoCuenta > 0 && (
        <Alert type="warning">
          {pendientesEstadoCuenta} RSG notificada{pendientesEstadoCuenta === 1 ? '' : 's'} con multas prescritas: falta que el analista actualice el estado de cuenta.
        </Alert>
      )}

      <div className="flex gap-[4px] border-b border-b-border mb-0">
        {(['enEvaluacion', 'resueltas'] as const).map((p) => {
          const activa = p === pestana;
          return (
            <button
              key={p}
              onClick={() => setPestana(p)}
              className={cn(
                'py-[10px] px-[16px] text-[13px] font-bold border-0 bg-transparent cursor-pointer flex items-center gap-[8px] border-b-2',
                activa ? 'border-b-primary-600 text-primary-600' : 'border-b-transparent text-text-muted',
              )}
            >
              {p === 'enEvaluacion' ? 'En evaluación' : 'Resueltas'}
              <Badge variant={activa ? 'info' : 'neutral'}>{bandeja[p].length}</Badge>
            </button>
          );
        })}
      </div>

      <Card className="rounded-tl-none! rounded-tr-none! border-t-0!">
        {loading && filas.length === 0 ? (
          <div className="p-[40px] text-center">
            <Spinner size={32} />
          </div>
        ) : filas.length === 0 ? (
          <EmptyState icon={<CheckCircleIcon size={40} color="var(--color-success)" />} title="Nada en esta pestaña" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] text-left">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-b-border">
                  <th className="py-[10px] px-[14px] font-bold">Administrado</th>
                  <th className="py-[10px] px-[14px] font-bold">Presentada</th>
                  <th className="py-[10px] px-[14px] font-bold">Multas</th>
                  <th className="py-[10px] px-[14px] font-bold">RSG</th>
                  <th className="py-[10px] px-[14px] font-bold">Siguiente paso</th>
                  <th className="py-[10px] px-[14px]"></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((s) => (
                  <tr key={s.id} className="border-b border-b-border">
                    <td className="py-[12px] px-[14px]">
                      <div className="font-bold text-midnight-900">{s.administradoNombre}</div>
                      {s.administradoNumeroDocumento && (
                        <div className="text-[11px] text-text-muted">
                          {s.administradoTipoDocumento ?? 'Doc.'} {s.administradoNumeroDocumento}
                        </div>
                      )}
                    </td>
                    <td className="py-[12px] px-[14px] whitespace-nowrap">
                      {formatearFecha(s.fechaPresentacion)}
                      {s.numeroSgd && <div className="text-[11px] text-text-muted">{s.numeroSgd}</div>}
                    </td>
                    <td className="py-[12px] px-[14px]">{resumenMultas(s)}</td>
                    <td className="py-[12px] px-[14px] whitespace-nowrap">
                      {s.numeroResolucion ? `N° ${s.numeroResolucion}` : <span className="text-text-muted">—</span>}
                      {s.fechaNotificacion && <div className="text-[11px] text-text-muted">notificada {formatearFecha(s.fechaNotificacion)}</div>}
                    </td>
                    <td className="py-[12px] px-[14px]">
                      <span className={s.siguientePaso === 'COMPLETO' ? 'text-text-muted' : 'font-semibold text-text-secondary'}>
                        {ETIQUETA_PASO_PRESCRIPCION[s.siguientePaso]}
                      </span>
                    </td>
                    <td className="py-[12px] px-[14px] text-right">
                      <Button size="sm" icon={<EyeIcon size={14} />} onClick={() => setAbierta(s.id)}>
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {registrando && (
        <RegistrarSolicitudPrescripcionModal
          onClose={() => setRegistrando(false)}
          onRegistrada={(id) => {
            setRegistrando(false);
            setPestana('enEvaluacion');
            cargar();
            setAbierta(id);
          }}
        />
      )}
      {abierta && <PrescripcionPanel solicitudId={abierta} onClose={() => setAbierta(null)} onCambio={cargar} />}
    </div>
  );
};
