import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BandejaCoactiva, CasoCoactivoItem, CoactivaApi } from '../../api';
import { socket } from '../../lib/socket';
import { formatearFecha } from '../../lib/fechas';
import { Alert, Badge, Button, EmptyState, Spinner } from '../../components/common/Common';
import { PagadoBadge } from '../../components/common/PagadoBadge';
import { EstadoPunto, PageHeader, PanelTabla, SegmentedTabs, TABLA, type PestanaItem, type TonoEstado } from '../../components/common/PageKit';
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
      <PageHeader
        titulo="Ejecución Coactiva"
        descripcion={
          <>
            Un solo expediente coactivo por acto firme (multa y medida complementaria). Se espera <strong>90 días</strong> desde la firmeza; la
            REC 1 da <strong>7 días hábiles</strong> para pagar y luego van las medidas cautelares. El pago puede llegar en cualquier etapa.
          </>
        }
        acciones={
          <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargar}>
            Actualizar
          </Button>
        }
      />

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

      <PanelTabla
        barra={
          <SegmentedTabs<Pestana>
            items={PESTANAS.map((p): PestanaItem<Pestana> => ({ clave: p.clave, etiqueta: p.titulo, contador: bandeja[p.clave].length }))}
            activa={pestana}
            onChange={setPestana}
          />
        }
      >
        <p className="text-[13px] text-text-muted py-[14px] px-[24px] m-0 border-b border-border">{PESTANAS.find((p) => p.clave === pestana)?.ayuda}</p>
        {loading && filas.length === 0 ? (
          <div className="p-[40px] text-center">
            <Spinner size={32} />
          </div>
        ) : filas.length === 0 ? (
          <EmptyState icon={<CheckCircleIcon size={40} color="var(--color-success)" />} title="Nada en esta pestaña" />
        ) : (
          <TablaCoactiva filas={filas} onVer={abrir} />
        )}
      </PanelTabla>

      {abierto && <CoactivaPanel actoFirmeId={abierto} onClose={() => abrir(null)} onCambio={cargar} />}
    </div>
  );
};

type Variante = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' | 'midnight';

const TONO_ESTADO: Partial<Record<Variante, TonoEstado>> = { success: 'ok', warning: 'aviso', danger: 'peligro', info: 'info', neutral: 'neutro' };

/** Estado en celda: punto de color si hay equivalente; purple y midnight no tienen punto y se quedan como etiqueta. */
const EstadoCelda: React.FC<{ variante: Variante; children: React.ReactNode }> = ({ variante, children }) => {
  const tono = TONO_ESTADO[variante];
  return tono ? <EstadoPunto tono={tono}>{children}</EstadoPunto> : <Badge variant={variante}>{children}</Badge>;
};

const TablaCoactiva: React.FC<{ filas: CasoCoactivoItem[]; onVer: (id: string) => void }> = ({ filas, onVer }) => (
  <div className="overflow-x-auto">
    <table className={TABLA.tabla}>
      <thead>
        <tr className={TABLA.encabezado}>
          <th className={TABLA.th}>Expediente / sanción</th>
          <th className={TABLA.th}>Administrado</th>
          <th className={TABLA.th}>Deuda</th>
          <th className={TABLA.th}>Estado</th>
          <th className={`${TABLA.th} text-right`}></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((c) => {
          const est = estadoCoactivo(c.situacion.estado);
          return (
            <tr key={c.actoFirmeId} className={TABLA.fila}>
              <td className={TABLA.td}>
                <div className="text-[14px] font-bold text-midnight-900">{c.numeroExpediente}</div>
                <div className="text-[12px] text-text-muted mt-[3px]">Sanción N° {c.numeroSancion ?? '—'} · firme el {formatearFecha(c.fechaFirmeza)}</div>
                <div className="text-[12px] text-text-muted mt-[3px]">Exp. coactivo: {c.expedienteCoactivo?.numeroExpedienteCoactivo ?? '—'}</div>
              </td>
              <td className={TABLA.td}>{c.administradoNombre ?? <span className="text-text-muted">No identificado</span>}</td>
              <td className={`${TABLA.td} whitespace-nowrap`}>{montoSoles(c.expedienteCoactivo?.montoDeuda ?? c.montoSancion)}</td>
              <td className={TABLA.td}>
                <div className="flex flex-col gap-[6px] items-start">
                  <EstadoCelda variante={est.variante}>{est.texto}</EstadoCelda>
                  {c.pago && <PagadoBadge tienePago montoPagado={c.pago.montoPagado} fechaPago={c.pago.fechaPago} />}
                  {c.situacion.suspensionPendiente && <EstadoPunto tono="aviso">Suspensión por resolver</EstadoPunto>}
                  <span className="text-[12px] text-text-muted max-w-[280px]">{siguientePasoCoactivo(c)}</span>
                </div>
              </td>
              <td className={`${TABLA.td} text-right`}>
                <Button variant="primary" size="sm" icon={<EyeIcon size={14} />} onClick={() => onVer(c.actoFirmeId)}>
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
