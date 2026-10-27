import React, { useCallback, useEffect, useState } from 'react';
import { PrescripcionApi, SolicitudPrescripcionItem } from '../../api';
import { socket } from '../../lib/socket';
import { formatearFecha } from '../../lib/fechas';
import { Alert, Button, EmptyState, Spinner } from '../../components/common/Common';
import { PageHeader, PanelTabla, SegmentedTabs, TABLA } from '../../components/common/PageKit';
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
      <PageHeader
        etiqueta="Incidentes y plazos"
        titulo="Prescripción de Multas"
        descripcion={
          <>
            Art. 233-A Ley 27444 - <strong>solo a pedido de parte</strong>. La facultad de cobrar la multa por ejecución forzosa prescribe a los{' '}
            <strong>2 años</strong> desde que el acto quedó firme (o desde el contencioso desfavorable), más los periodos de suspensión (coactiva,
            revisión judicial). Una solicitud puede incluir varias multas, también antiguas que no están en este sistema.
          </>
        }
        acciones={
          <>
            <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargar}>
              Actualizar
            </Button>
            <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setRegistrando(true)}>
              Registrar solicitud
            </Button>
          </>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {pendientesEstadoCuenta > 0 && (
        <Alert type="warning">
          {pendientesEstadoCuenta} RSG notificada{pendientesEstadoCuenta === 1 ? '' : 's'} con multas prescritas: falta que el analista actualice el estado de cuenta.
        </Alert>
      )}

      <PanelTabla
        barra={
          <SegmentedTabs<Pestana>
            items={[
              { clave: 'enEvaluacion', etiqueta: 'En evaluación', contador: bandeja.enEvaluacion.length },
              { clave: 'resueltas', etiqueta: 'Resueltas', contador: bandeja.resueltas.length },
            ]}
            activa={pestana}
            onChange={setPestana}
          />
        }
      >
        {loading && filas.length === 0 ? (
          <div className="p-[40px] text-center">
            <Spinner size={32} />
          </div>
        ) : filas.length === 0 ? (
          <EmptyState llenarPantalla icon={<CheckCircleIcon size={40} color="var(--color-success)" />} title="Nada en esta pestaña" />
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLA.tabla}>
              <thead>
                <tr className={TABLA.encabezado}>
                  <th className={TABLA.th}>Administrado</th>
                  <th className={TABLA.th}>Multas</th>
                  <th className={TABLA.th}>RSG</th>
                  <th className={TABLA.th}>Siguiente paso</th>
                  <th className={`${TABLA.th} text-right`}></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((s) => (
                  <tr key={s.id} className={TABLA.fila}>
                    <td className={TABLA.td}>
                      <div className="text-[14px] font-bold text-midnight-900">{s.administradoNombre}</div>
                      {s.administradoNumeroDocumento && (
                        <div className="text-[12px] text-text-muted mt-[3px]">
                          {s.administradoTipoDocumento ?? 'Doc.'} {s.administradoNumeroDocumento}
                        </div>
                      )}
                      <div className="text-[12px] text-text-muted mt-[3px] whitespace-nowrap">
                        Presentada el {formatearFecha(s.fechaPresentacion)}
                        {s.numeroSgd && <> · {s.numeroSgd}</>}
                      </div>
                    </td>
                    <td className={TABLA.td}>{resumenMultas(s)}</td>
                    <td className={`${TABLA.td} whitespace-nowrap`}>
                      {s.numeroResolucion ? `N° ${s.numeroResolucion}` : <span className="text-text-muted">—</span>}
                      {s.fechaNotificacion && <div className="text-[12px] text-text-muted mt-[3px]">notificada {formatearFecha(s.fechaNotificacion)}</div>}
                    </td>
                    <td className={TABLA.td}>
                      <span className={s.siguientePaso === 'COMPLETO' ? 'text-text-muted' : 'font-semibold text-text-secondary'}>
                        {ETIQUETA_PASO_PRESCRIPCION[s.siguientePaso]}
                      </span>
                    </td>
                    <td className={`${TABLA.td} text-right`}>
                      <Button variant="primary" size="sm" icon={<EyeIcon size={14} />} onClick={() => setAbierta(s.id)}>
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelTabla>

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
