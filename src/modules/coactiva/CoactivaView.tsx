import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BandejaCoactiva, CasoCoactivoItem, CoactivaApi } from '../../api';
import { socket } from '../../lib/socket';
import { cn } from '../../lib/cn';
import { formatearFecha } from '../../lib/fechas';
import { Alert, Badge, Button, Card, EmptyState, Spinner } from '../../components/common/Common';
import { PagadoBadge } from '../../components/common/PagadoBadge';
import { CheckCircleIcon, EyeIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { CoactivaPanel } from './CoactivaPanel';
import { estadoCoactivo, montoSoles, siguientePasoCoactivo } from './coactivaUi';

type Pestana = keyof BandejaCoactiva;

const PESTANAS: { clave: Pestana; titulo: string; ayuda: string }[] = [
  { clave: 'porIniciar', titulo: 'Por iniciar', ayuda: 'Actos firmes derivados con la espera de 90 días cumplida: registrar el N° de expediente coactivo e iniciar.' },
  { clave: 'enEspera', titulo: 'En espera (90 días)', ayuda: 'Actos firmes derivados: se esperan 90 días desde la firmeza por si el administrado va a lo contencioso.' },
  { clave: 'enCurso', titulo: 'En curso', ayuda: 'Requerimiento de pago (REC 1), medidas cautelares y casos pagados con algo pendiente.' },
  { clave: 'suspendidos', titulo: 'Suspendidos', ayuda: 'Suspensión temporal (revisión o cautelar judicial) o definitiva (pago, no es el obligado, mala notificación, mandato judicial).' },
  { clave: 'devueltos', titulo: 'Devueltos a PAS', ayuda: 'Coactivo devolvió el expediente (p. ej. mala notificación de la resolución final): renotificar y retornar, o archivar si prescribió.' },
  { clave: 'concluidos', titulo: 'Concluidos', ayuda: 'Archivados por cumplimiento o por prescripción.' },
];

const VACIA: BandejaCoactiva = { enEspera: [], porIniciar: [], enCurso: [], suspendidos: [], devueltos: [], concluidos: [] };

/**
 * F4 — Ejecución coactiva, a continuación de Acto firme: espera de 90 días
 * → REC 1 (7 días hábiles) → medidas cautelares (embargo) → archivo, con
 * suspensiones y devolución a PAS en cualquier momento. Las REC dependen del
 * caso: se registran las que correspondan (N°, fechas y PDF firmado).
 */
export const CoactivaView: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [bandeja, setBandeja] = useState<BandejaCoactiva>(VACIA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('porIniciar');
  const abierto = params.get('actoFirme');

  const abrir = (actoFirmeId: string | null) => {
    const p = new URLSearchParams(params);
    if (actoFirmeId) p.set('actoFirme', actoFirmeId);
    else p.delete('actoFirme');
    setParams(p, { replace: true });
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBandeja({ ...VACIA, ...(await CoactivaApi.getBandeja()) });
    } catch (err: any) {
      setError(err.message || 'Error al cargar la bandeja de coactiva.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    socket.on('coactiva:cambio', cargar);
    return () => {
      socket.off('coactiva:cambio', cargar);
    };
  }, [cargar]);

  const filas = bandeja[pestana];
  const pagadosEnCurso = bandeja.enCurso.filter((c) => c.situacion.pagado && c.situacion.estado !== 'ARCHIVADO').length;
  const recVencidas = bandeja.enCurso.filter((c) => c.situacion.estado === 'REQUERIDO' && c.situacion.requerimientoVencido).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-[20px] gap-[12px] flex-wrap">
        <div>
          <h2 className="text-[18px] font-extrabold text-midnight-900">Ejecución Coactiva</h2>
          <p className="text-[13px] text-text-muted mt-[2px] max-w-[780px]">
            Un solo expediente coactivo por acto firme (multa y medida complementaria). Se espera <strong>90 días</strong> desde la firmeza; la
            REC 1 da <strong>7 días hábiles</strong> para pagar y luego van las medidas cautelares. El pago puede llegar en cualquier etapa.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargar}>
          Actualizar
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {pagadosEnCurso > 0 && (
        <Alert type="success">
          <strong>{pagadosEnCurso}</strong> expediente{pagadosEnCurso === 1 ? '' : 's'} en coactiva ya pagaron la multa: no embargar.
        </Alert>
      )}
      {recVencidas > 0 && (
        <Alert type="warning">
          {recVencidas} requerimiento{recVencidas === 1 ? '' : 's'} de pago vencido{recVencidas === 1 ? '' : 's'} sin medida cautelar.
        </Alert>
      )}

      <div className="flex gap-[4px] border-b border-b-border mb-0 flex-wrap">
        {PESTANAS.map((p) => {
          const activa = p.clave === pestana;
          return (
            <button
              key={p.clave}
              onClick={() => setPestana(p.clave)}
              className={cn(
                'py-[10px] px-[16px] text-[13px] font-bold border-0 bg-transparent cursor-pointer flex items-center gap-[8px] border-b-2',
                activa ? 'border-b-primary-600 text-primary-600' : 'border-b-transparent text-text-muted',
              )}
            >
              {p.titulo}
              <Badge variant={activa ? 'info' : 'neutral'}>{bandeja[p.clave].length}</Badge>
            </button>
          );
        })}
      </div>

      <Card className="rounded-tl-none! rounded-tr-none! border-t-0!">
        <p className="text-[12px] text-text-muted mb-[12px]">{PESTANAS.find((p) => p.clave === pestana)?.ayuda}</p>
        {loading && filas.length === 0 ? (
          <div className="p-[40px] text-center">
            <Spinner size={32} />
          </div>
        ) : filas.length === 0 ? (
          <EmptyState icon={<CheckCircleIcon size={40} color="var(--color-success)" />} title="Nada en esta pestaña" />
        ) : (
          <TablaCoactiva filas={filas} onVer={abrir} />
        )}
      </Card>

      {abierto && <CoactivaPanel actoFirmeId={abierto} onClose={() => abrir(null)} onCambio={cargar} />}
    </div>
  );
};

const TablaCoactiva: React.FC<{ filas: CasoCoactivoItem[]; onVer: (id: string) => void }> = ({ filas, onVer }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[13px] text-left">
      <thead>
        <tr className="bg-[#f8fafc] border-b border-b-border">
          <th className="py-[10px] px-[14px] font-bold">Expediente / sanción</th>
          <th className="py-[10px] px-[14px] font-bold">Exp. coactivo</th>
          <th className="py-[10px] px-[14px] font-bold">Administrado</th>
          <th className="py-[10px] px-[14px] font-bold">Deuda</th>
          <th className="py-[10px] px-[14px] font-bold">Estado</th>
          <th className="py-[10px] px-[14px]"></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((c) => {
          const est = estadoCoactivo(c.situacion.estado);
          return (
            <tr key={c.actoFirmeId} className="border-b border-b-border align-top">
              <td className="py-[12px] px-[14px]">
                <div className="font-bold text-midnight-900">{c.numeroExpediente}</div>
                <div className="text-[11px] text-text-muted">Sanción N° {c.numeroSancion ?? '—'} · firme el {formatearFecha(c.fechaFirmeza)}</div>
              </td>
              <td className="py-[12px] px-[14px] font-semibold">{c.expedienteCoactivo?.numeroExpedienteCoactivo ?? <span className="text-text-muted font-normal">—</span>}</td>
              <td className="py-[12px] px-[14px]">{c.administradoNombre ?? <span className="text-text-muted">No identificado</span>}</td>
              <td className="py-[12px] px-[14px] whitespace-nowrap">{montoSoles(c.expedienteCoactivo?.montoDeuda ?? c.montoSancion)}</td>
              <td className="py-[12px] px-[14px]">
                <div className="flex flex-col gap-[4px] items-start">
                  <Badge variant={est.variante}>{est.texto}</Badge>
                  {c.pago && <PagadoBadge tienePago montoPagado={c.pago.montoPagado} fechaPago={c.pago.fechaPago} />}
                  {c.situacion.suspensionPendiente && <Badge variant="warning">Suspensión por resolver</Badge>}
                  <span className="text-[11px] text-text-muted max-w-[280px]">{siguientePasoCoactivo(c)}</span>
                </div>
              </td>
              <td className="py-[12px] px-[14px] text-right">
                <Button size="sm" icon={<EyeIcon size={14} />} onClick={() => onVer(c.actoFirmeId)}>
                  Ver
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
