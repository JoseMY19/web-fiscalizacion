import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BandejaCaducidad, CaducidadApi, CaducidadExpedienteItem } from '../../api';
import { socket } from '../../lib/socket';
import { formatearFecha } from '../../lib/fechas';
import { Alert, Badge, Button, EmptyState, Modal, Spinner } from '../../components/common/Common';
import { ComboboxExpediente } from '../../components/common/ComboboxExpediente';
import { EstadoPunto, PageHeader, PanelTabla, SegmentedTabs, TABLA, type PestanaItem, type TonoEstado } from '../../components/common/PageKit';
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
      <PageHeader
        etiqueta="Incidentes y plazos"
        titulo="Caducidad del PAS"
        descripcion={
          <>
            Art. 237-A Ley 27444: si en <strong>9 meses</strong> desde la notificación de la NC (<strong>12</strong> con RSG de ampliación firmada) no
            se notifica la resolución final, el PAS caduca. Se declara de oficio o a pedido de parte con RSG firmada por el Subgerente. No aplica
            una vez notificada la resolución (etapa recursiva).
          </>
        }
        acciones={
          <>
            <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargar}>
              Actualizar
            </Button>
            <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setEligiendo(true)}>
              Registrar solicitud del administrado
            </Button>
          </>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {sinDeclarar > 0 && (
        <Alert type="error">
          {sinDeclarar} expediente{sinDeclarar === 1 ? '' : 's'} con el plazo de caducidad vencido sin declarar. Ver pestaña "Caducados sin declarar".
        </Alert>
      )}

      <PanelTabla
        barra={
          <SegmentedTabs<Pestana>
            items={PESTANAS.map(
              (p): PestanaItem<Pestana> => ({
                clave: p.clave,
                etiqueta: p.titulo,
                contador: bandeja[p.clave].length,
                tono: p.clave === 'caducadosSinDeclarar' && sinDeclarar > 0 ? 'danger' : undefined,
              }),
            )}
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
          <EmptyState llenarPantalla icon={<CheckCircleIcon size={40} color="var(--color-success)" />} title="Nada en esta pestaña" />
        ) : (
          <TablaCaducidad filas={filas} onVer={abrir} />
        )}
      </PanelTabla>

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

type Variante = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' | 'midnight';

const TONO_ESTADO: Partial<Record<Variante, TonoEstado>> = { success: 'ok', warning: 'aviso', danger: 'peligro', info: 'info', neutral: 'neutro' };

/** Estado en celda: punto de color si hay equivalente; purple y midnight no tienen punto y se quedan como etiqueta. */
const EstadoCelda: React.FC<{ variante: Variante; children: React.ReactNode }> = ({ variante, children }) => {
  const tono = TONO_ESTADO[variante];
  return tono ? <EstadoPunto tono={tono}>{children}</EstadoPunto> : <Badge variant={variante}>{children}</Badge>;
};

const TablaCaducidad: React.FC<{ filas: CaducidadExpedienteItem[]; onVer: (id: string) => void }> = ({ filas, onVer }) => (
  <div className="overflow-x-auto">
    <table className={TABLA.tabla}>
      <thead>
        <tr className={TABLA.encabezado}>
          <th className={TABLA.th}>Expediente</th>
          <th className={TABLA.th}>Administrado</th>
          <th className={TABLA.th}>Plazo</th>
          <th className={TABLA.th}>Siguiente paso</th>
          <th className={`${TABLA.th} text-right`}></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((e) => {
          const plazo = textoPlazoCaducidad(e);
          const estado = textoResultadoCaducidad(e);
          return (
            <tr key={e.expedienteId} className={TABLA.fila}>
              <td className={TABLA.td}>
                <div className="text-[14px] font-bold text-midnight-900">{e.numeroExpediente}</div>
                {e.caducidad && <div className="text-[12px] text-text-muted mt-[3px]">{e.caducidad.origen === 'DE_OFICIO' ? 'De oficio' : 'A pedido de parte'}</div>}
                <div className="text-[12px] text-text-muted mt-[3px] whitespace-nowrap">
                  Notificada el {formatearFecha(e.ncFechaNotificacion)} · NC N° {e.numeroNotificacionCargo ?? '—'}
                </div>
              </td>
              <td className={TABLA.td}>{e.administradoNombre ?? <span className="text-text-muted">No identificado</span>}</td>
              <td className={TABLA.td}>
                <div className="flex flex-col gap-[6px] items-start">
                  <EstadoCelda variante={plazo.variante}>{plazo.texto}</EstadoCelda>
                  {estado && <EstadoCelda variante={estado.variante}>{estado.texto}</EstadoCelda>}
                </div>
              </td>
              <td className={TABLA.td}>
                <span className={e.siguientePaso === 'COMPLETO' ? 'text-text-muted' : 'font-semibold text-text-secondary'}>{ETIQUETA_PASO_CADUCIDAD[e.siguientePaso]}</span>
              </td>
              <td className={`${TABLA.td} text-right`}>
                <Button variant="primary" size="sm" icon={<EyeIcon size={14} />} onClick={() => onVer(e.expedienteId)}>
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
