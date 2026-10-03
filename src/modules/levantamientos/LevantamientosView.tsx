import React, { useCallback, useEffect, useState } from 'react';
import { BandejaLevantamientos, LevantamientosApi, SolicitudLevantamientoItem } from '../../api';
import { socket } from '../../lib/socket';
import { cn } from '../../lib/cn';
import { formatearFechaHora } from '../../lib/fechas';
import { Alert, Badge, Button, Card, EmptyState, Spinner } from '../../components/common/Common';
import { CheckCircleIcon, EyeIcon, PlusIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { RegistrarSolicitudModal } from './RegistrarSolicitudModal';
import { SolicitudPanel } from './SolicitudPanel';
import { CLASE_NIVEL, ETIQUETA_ESTADO, ETIQUETA_PASO, VARIANTE_ESTADO, cuentaRegresiva, tipoMedidaTexto, useAhora } from './levantamientoUi';

type Pestana = keyof BandejaLevantamientos;

const PESTANAS: { clave: Pestana; titulo: string; ayuda: string }[] = [
  {
    clave: 'enEvaluacion',
    titulo: 'En evaluación',
    ayuda: 'Solicitudes sin carta firmada y dentro del plazo. Clausura: 48 horas corridas; otras medidas: 30 días calendario.',
  },
  {
    clave: 'resueltas',
    titulo: 'Resueltas',
    ayuda: 'Con carta de levantamiento o denegatoria firmada dentro del plazo (incluye las que falta notificar).',
  },
  {
    clave: 'levantadasPorVencimiento',
    titulo: 'Levantadas por vencimiento',
    ayuda: 'Venció el plazo sin carta firmada a tiempo: la medida quedó sin efecto por ley. Corresponde la carta por vencimiento.',
  },
];

const BANDEJA_VACIA: BandejaLevantamientos = { enEvaluacion: [], resueltas: [], levantadasPorVencimiento: [] };

/**
 * F1 — Levantamiento de medidas provisionales (expediente incidental).
 * Mesa de Partes → registrar la solicitud → evaluar → carta Word → firma
 * del Subgerente → notificar. Si vence el plazo sin carta firmada, la
 * medida queda levantada por ley y pasa sola a "Levantadas por vencimiento".
 */
export const LevantamientosView: React.FC = () => {
  const [bandeja, setBandeja] = useState<BandejaLevantamientos>(BANDEJA_VACIA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('enEvaluacion');
  const [registrando, setRegistrando] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const ahora = useAhora(1000);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await LevantamientosApi.getBandeja();
      setBandeja({
        enEvaluacion: data?.enEvaluacion ?? [],
        resueltas: data?.resueltas ?? [],
        levantadasPorVencimiento: data?.levantadasPorVencimiento ?? [],
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar las solicitudes de levantamiento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    socket.on('levantamiento:cambio', cargar);
    return () => {
      socket.off('levantamiento:cambio', cargar);
    };
  }, [cargar]);

  // Una solicitud que vence mientras la pantalla está abierta pasa de pestaña sin esperar al backend.
  const hayVencidaEnEvaluacion = bandeja.enEvaluacion.some((s) => new Date(s.venceEn).getTime() <= ahora);
  useEffect(() => {
    if (hayVencidaEnEvaluacion) cargar();
  }, [hayVencidaEnEvaluacion, cargar]);

  const filas = bandeja[pestana];
  const urgentes = bandeja.enEvaluacion.filter((s) => cuentaRegresiva(s.venceEn, s.esClausura, ahora).nivel === 'rojo').length;
  const vencidasSinCarta = bandeja.levantadasPorVencimiento.filter((s) => !s.fechaHoraFirma).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-[20px] gap-[12px] flex-wrap">
        <div>
          <h2 className="text-[18px] font-extrabold text-midnight-900">Levantamiento de medidas provisionales</h2>
          <p className="text-[13px] text-text-muted mt-[2px] max-w-[760px]">
            Expediente incidental. <strong>Clausura</strong>: responder en <strong>48 horas corridas</strong> desde la presentación
            (Ley 28976, art. 21.6 — cuentan sábados, domingos y feriados). <strong>Otras medidas</strong>: 30 días calendario (Ord.
            464-MDSJL, art. 63.2). Si vence sin carta firmada, la medida queda levantada por ley.
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
      {urgentes > 0 && (
        <Alert type="error">
          {urgentes} solicitud{urgentes === 1 ? '' : 'es'} por vencer (menos de 24 h en clausura / 5 días en otras medidas).
        </Alert>
      )}
      {vencidasSinCarta > 0 && (
        <Alert type="warning">
          {vencidasSinCarta} medida{vencidasSinCarta === 1 ? '' : 's'} levantada{vencidasSinCarta === 1 ? '' : 's'} por vencimiento del plazo sin
          carta firmada. Ver pestaña "Levantadas por vencimiento".
        </Alert>
      )}

      <div className="flex gap-[4px] border-b border-b-border mb-0">
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
              <Badge
                variant={
                  p.clave === 'enEvaluacion' && urgentes > 0
                    ? 'danger'
                    : p.clave === 'levantadasPorVencimiento' && vencidasSinCarta > 0
                      ? 'warning'
                      : activa
                        ? 'info'
                        : 'neutral'
                }
              >
                {bandeja[p.clave].length}
              </Badge>
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
          <TablaSolicitudes filas={filas} pestana={pestana} ahora={ahora} onVer={setAbierta} />
        )}
      </Card>

      {registrando && (
        <RegistrarSolicitudModal
          onClose={() => setRegistrando(false)}
          onRegistrada={(id) => {
            setRegistrando(false);
            setPestana('enEvaluacion');
            cargar();
            setAbierta(id);
          }}
        />
      )}
      {abierta && <SolicitudPanel solicitudId={abierta} onClose={() => setAbierta(null)} onCambio={cargar} />}
    </div>
  );
};

const TablaSolicitudes: React.FC<{
  filas: SolicitudLevantamientoItem[];
  pestana: Pestana;
  ahora: number;
  onVer: (id: string) => void;
}> = ({ filas, pestana, ahora, onVer }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[13px] text-left">
      <thead>
        <tr className="bg-[#f8fafc] border-b border-b-border">
          <th className="py-[10px] px-[14px] font-bold">Medida</th>
          <th className="py-[10px] px-[14px] font-bold">Administrado</th>
          <th className="py-[10px] px-[14px] font-bold">Presentada</th>
          <th className="py-[10px] px-[14px] font-bold">{pestana === 'enEvaluacion' ? 'Vence en' : 'Estado'}</th>
          <th className="py-[10px] px-[14px] font-bold">Siguiente paso</th>
          <th className="py-[10px] px-[14px]"></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((s) => {
          const plazo = cuentaRegresiva(s.venceEn, s.esClausura, ahora);
          return (
            <tr key={s.id} className={cn('border-b border-b-border', pestana === 'enEvaluacion' && plazo.nivel === 'rojo' && 'bg-[#fff1f2]')}>
              <td className="py-[12px] px-[14px]">
                <div className="font-bold text-midnight-900">
                  {tipoMedidaTexto(s.medida.tipoMedida)} — Acta N° {s.medida.numeroActa}
                </div>
                <div className="text-[11px] text-text-muted mt-[2px]">{s.medida.numeroExpediente ?? 'Sin expediente'}</div>
              </td>
              <td className="py-[12px] px-[14px]">{s.medida.administradoNombre ?? <span className="text-text-muted">No identificado</span>}</td>
              <td className="py-[12px] px-[14px] whitespace-nowrap">
                {formatearFechaHora(s.fechaHoraPresentacion)}
                <div className="text-[11px] text-text-muted">{s.plazoTexto}</div>
              </td>
              <td className="py-[12px] px-[14px] whitespace-nowrap">
                {pestana === 'enEvaluacion' ? (
                  <>
                    <span className={cn('tabular-nums', CLASE_NIVEL[plazo.nivel])}>{plazo.texto}</span>
                    <div className="text-[11px] text-text-muted">hasta {formatearFechaHora(s.venceEn)}</div>
                  </>
                ) : (
                  <>
                    <Badge variant={VARIANTE_ESTADO[s.estado]}>{ETIQUETA_ESTADO[s.estado]}</Badge>
                    {s.fechaHoraFirma && (
                      <div className={cn('text-[11px] mt-[3px]', s.atendidaDentroDelPlazo ? 'text-[#047857]' : 'text-[#be123c]')}>
                        Carta N° {s.numeroCarta} — {s.atendidaDentroDelPlazo ? 'dentro del plazo' : 'fuera del plazo'}
                      </div>
                    )}
                    {pestana === 'levantadasPorVencimiento' && (
                      <div className="text-[11px] text-text-muted mt-[3px]">venció el {formatearFechaHora(s.venceEn)}</div>
                    )}
                  </>
                )}
              </td>
              <td className="py-[12px] px-[14px]">
                <span className={s.siguientePaso === 'COMPLETO' ? 'text-text-muted' : 'font-semibold text-text-secondary'}>
                  {ETIQUETA_PASO[s.siguientePaso]}
                </span>
              </td>
              <td className="py-[12px] px-[14px] text-right">
                <Button size="sm" icon={<EyeIcon size={14} />} onClick={() => onVer(s.id)}>
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
