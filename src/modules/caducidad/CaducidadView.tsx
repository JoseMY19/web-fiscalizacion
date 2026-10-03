import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BandejaCaducidad, CaducidadApi, CaducidadExpedienteItem } from '../../api';
import { socket } from '../../lib/socket';
import { cn } from '../../lib/cn';
import { formatearFecha } from '../../lib/fechas';
import { Alert, Badge, Button, Card, EmptyState, Modal, Spinner } from '../../components/common/Common';
import { ComboboxExpediente } from '../../components/common/ComboboxExpediente';
import { CheckCircleIcon, EyeIcon, PlusIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { CaducidadPanel } from './CaducidadPanel';
import { ETIQUETA_PASO_CADUCIDAD, textoPlazoCaducidad, textoResultadoCaducidad } from './caducidadUi';

type Pestana = keyof BandejaCaducidad;

const PESTANAS: { clave: Pestana; titulo: string; ayuda: string }[] = [
  { clave: 'porCaducar', titulo: 'Por caducar (≤30 días)', ayuda: 'Faltan 30 días o menos para el límite (9 meses desde la NC, 12 con ampliación firmada) y no hay resolución final notificada.' },
  { clave: 'caducadosSinDeclarar', titulo: 'Caducados sin declarar', ayuda: 'Venció el plazo sin resolución final notificada: corresponde declarar la caducidad de oficio.' },
  { clave: 'enTramite', titulo: 'Solicitudes / en trámite', ayuda: 'Solicitudes del administrado en evaluación y RSG (declara o deniega) todavía sin notificar.' },
  { clave: 'declarados', titulo: 'Declarados', ayuda: 'RSG notificada. Las declaradas cierran el expediente; también se listan las denegatorias notificadas.' },
];

const VACIA: BandejaCaducidad = { porCaducar: [], caducadosSinDeclarar: [], enTramite: [], declarados: [] };

/**
 * F2 — Caducidad del PAS (art. 237-A Ley 27444): 9 meses desde la
 * notificación de la NC (12 con ampliación) sin resolución final notificada.
 * De oficio o a pedido de parte → RSG → ¿nuevo PAS o archivo?
 */
export const CaducidadView: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [bandeja, setBandeja] = useState<BandejaCaducidad>(VACIA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('caducadosSinDeclarar');
  const [eligiendo, setEligiendo] = useState(false);
  const abierto = params.get('expediente');

  const abrir = (expedienteId: string | null) => {
    const p = new URLSearchParams(params);
    if (expedienteId) p.set('expediente', expedienteId);
    else p.delete('expediente');
    setParams(p, { replace: true });
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await CaducidadApi.getBandeja();
      setBandeja({ ...VACIA, ...d });
    } catch (err: any) {
      setError(err.message || 'Error al cargar la bandeja de caducidad.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    socket.on('caducidad:cambio', cargar);
    return () => {
      socket.off('caducidad:cambio', cargar);
    };
  }, [cargar]);

  const filas = bandeja[pestana];
  const sinDeclarar = bandeja.caducadosSinDeclarar.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-[20px] gap-[12px] flex-wrap">
        <div>
          <h2 className="text-[18px] font-extrabold text-midnight-900">Caducidad del PAS</h2>
          <p className="text-[13px] text-text-muted mt-[2px] max-w-[760px]">
            Art. 237-A Ley 27444: si en <strong>9 meses</strong> desde la notificación de la NC (<strong>12</strong> con RSG de ampliación firmada) no
            se notifica la resolución final, el PAS caduca. Se declara de oficio o a pedido de parte con RSG firmada por el Subgerente. No aplica
            una vez notificada la resolución (etapa recursiva).
          </p>
        </div>
        <div className="flex gap-[8px]">
          <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargar}>
            Actualizar
          </Button>
          <Button icon={<PlusIcon size={16} />} onClick={() => setEligiendo(true)}>
            Registrar solicitud del administrado
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {sinDeclarar > 0 && (
        <Alert type="error">
          {sinDeclarar} expediente{sinDeclarar === 1 ? '' : 's'} con el plazo de caducidad vencido sin declarar. Ver pestaña "Caducados sin declarar".
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
              <Badge variant={p.clave === 'caducadosSinDeclarar' && sinDeclarar > 0 ? 'danger' : activa ? 'info' : 'neutral'}>{bandeja[p.clave].length}</Badge>
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
          <TablaCaducidad filas={filas} onVer={abrir} />
        )}
      </Card>

      {eligiendo && (
        <ElegirExpedienteModal
          onClose={() => setEligiendo(false)}
          onElegir={(id) => {
            setEligiendo(false);
            abrir(id);
          }}
        />
      )}
      {abierto && <CaducidadPanel expedienteId={abierto} onClose={() => abrir(null)} onCambio={cargar} />}
    </div>
  );
};

const TablaCaducidad: React.FC<{ filas: CaducidadExpedienteItem[]; onVer: (id: string) => void }> = ({ filas, onVer }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[13px] text-left">
      <thead>
        <tr className="bg-[#f8fafc] border-b border-b-border">
          <th className="py-[10px] px-[14px] font-bold">Expediente</th>
          <th className="py-[10px] px-[14px] font-bold">Administrado</th>
          <th className="py-[10px] px-[14px] font-bold">NC notificada</th>
          <th className="py-[10px] px-[14px] font-bold">Plazo</th>
          <th className="py-[10px] px-[14px] font-bold">Siguiente paso</th>
          <th className="py-[10px] px-[14px]"></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((e) => {
          const plazo = textoPlazoCaducidad(e);
          const estado = textoResultadoCaducidad(e);
          return (
            <tr key={e.expedienteId} className="border-b border-b-border">
              <td className="py-[12px] px-[14px]">
                <div className="font-bold text-midnight-900">{e.numeroExpediente}</div>
                {e.caducidad && <div className="text-[11px] text-text-muted">{e.caducidad.origen === 'DE_OFICIO' ? 'De oficio' : 'A pedido de parte'}</div>}
              </td>
              <td className="py-[12px] px-[14px]">{e.administradoNombre ?? <span className="text-text-muted">No identificado</span>}</td>
              <td className="py-[12px] px-[14px] whitespace-nowrap">
                {formatearFecha(e.ncFechaNotificacion)}
                <div className="text-[11px] text-text-muted">NC N° {e.numeroNotificacionCargo ?? '—'}</div>
              </td>
              <td className="py-[12px] px-[14px]">
                <div className="flex flex-col gap-[4px] items-start">
                  <Badge variant={plazo.variante}>{plazo.texto}</Badge>
                  {estado && <Badge variant={estado.variante}>{estado.texto}</Badge>}
                </div>
              </td>
              <td className="py-[12px] px-[14px]">
                <span className={e.siguientePaso === 'COMPLETO' ? 'text-text-muted' : 'font-semibold text-text-secondary'}>{ETIQUETA_PASO_CADUCIDAD[e.siguientePaso]}</span>
              </td>
              <td className="py-[12px] px-[14px] text-right">
                <Button size="sm" icon={<EyeIcon size={14} />} onClick={() => onVer(e.expedienteId)}>
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

/** Elegir el expediente de la solicitud (en cualquier etapa); el registro se hace en el panel. */
const ElegirExpedienteModal: React.FC<{ onClose: () => void; onElegir: (expedienteId: string) => void }> = ({ onClose, onElegir }) => {
  const [opciones, setOpciones] = useState<CaducidadExpedienteItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState<CaducidadExpedienteItem | null>(null);

  useEffect(() => {
    CaducidadApi.getExpedientes()
      .then((d) => setOpciones((Array.isArray(d) ? d : []).filter((e) => e.siguientePaso === 'INICIAR')))
      .catch((err: any) => setError(err.message || 'No se pudieron cargar los expedientes.'));
  }, []);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Solicitud de caducidad del administrado"
      maxWidth="620px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!elegido} onClick={() => elegido && onElegir(elegido.expedienteId)}>
            Continuar
          </Button>
        </>
      }
    >
      <ComboboxExpediente
        label="Expediente"
        opciones={opciones}
        cargando={opciones === null}
        error={error}
        seleccionada={elegido}
        onSeleccionar={setElegido}
        obtenerClave={(e) => e.expedienteId}
        obtenerNumeroExpediente={(e) => e.numeroExpediente}
        renderDetalle={(e) => {
          const p = textoPlazoCaducidad(e);
          return <Badge variant={p.variante}>{p.texto}</Badge>;
        }}
        mensajeVacio="No hay expedientes con NC notificada sin trámite de caducidad."
      />
      <p className="text-[12px] text-text-muted">
        La solicitud se registra aunque no corresponda (p. ej. la resolución ya se notificó): en ese caso se evalúa y se emite la RSG denegatoria.
      </p>
    </Modal>
  );
};
