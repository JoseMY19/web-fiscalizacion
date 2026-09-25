import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ResolucionesApi, ExpedienteResolucionItem, BandejaResoluciones } from '../../api';
import { socket } from '../../lib/socket';
import { Card, Button, Badge, Alert, EmptyState, Spinner } from '../../components/common/Common';
import { GavelIcon, RefreshCwIcon, CheckCircleIcon, SearchIcon, EyeIcon } from '../../components/icons/Icons';
import { ResolucionPanel } from './ResolucionPanel';
import { NOMBRE_TIPO, labelEtapa, textoCaducidad, varianteEtapa } from './resolucionUi';

type Pestana = 'enRedaccion' | 'porFirmar' | 'firmadas';

const PESTANAS: { clave: Pestana; titulo: string; ayuda: string }[] = [
  {
    clave: 'enRedaccion',
    titulo: 'En redacción',
    ayuda: 'IFI notificado y resolución en preparación (incluye los que esperan los 5 días hábiles de descargo contra el IFI).',
  },
  {
    clave: 'porFirmar',
    titulo: 'Por firmar',
    ayuda: 'Resoluciones entregadas al Subgerente. Cuando las devuelva firmadas, registra la firma.',
  },
  {
    clave: 'firmadas',
    titulo: 'Firmadas',
    ayuda: 'Firmadas pendientes de notificar + notificadas de los últimos 30 días. Las más antiguas, con el buscador.',
  },
];

const BANDEJA_VACIA: BandejaResoluciones = { enRedaccion: [], porFirmar: [], firmadas: [] };

/**
 * SP5 — Resoluciones. Mismo espíritu que IFI: pasos claros y nada se
 * pierde. Los abogados redactan todo; el Subgerente solo firma el papel
 * (se registra "enviada a firma" y "firmada" con fechas reales).
 */
export const ResolucionesView: React.FC = () => {
  const [bandeja, setBandeja] = useState<BandejaResoluciones>(BANDEJA_VACIA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('enRedaccion');

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ExpedienteResolucionItem[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const [abierto, setAbierto] = useState<{ expedienteId: string; numeroExpediente: string } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ResolucionesApi.getBandeja();
      setBandeja({
        enRedaccion: data?.enRedaccion ?? [],
        porFirmar: data?.porFirmar ?? [],
        firmadas: data?.firmadas ?? [],
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar la bandeja de resoluciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const busquedaRef = useRef(busqueda);
  busquedaRef.current = busqueda;
  // Lista desplegable del buscador: se abre al hacer clic (muestra los más
  // recientes sin escribir nada) y se filtra mientras se escribe.
  const [listaAbierta, setListaAbierta] = useState(false);
  const listaAbiertaRef = useRef(listaAbierta);
  listaAbiertaRef.current = listaAbierta;
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const buscadorRef = useRef<HTMLDivElement>(null);

  const ejecutarBusqueda = useCallback(async (q: string) => {
    const termino = q.trim();
    setBuscando(true);
    setErrorBusqueda(null);
    try {
      const data = await ResolucionesApi.buscar(termino);
      // Descarta respuestas de una búsqueda anterior que llegaron tarde.
      if (busquedaRef.current.trim() === termino) {
        setResultados(Array.isArray(data) ? data : []);
        setIndiceActivo(-1);
      }
    } catch (err: any) {
      setErrorBusqueda(err.message || 'Error al buscar.');
    } finally {
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    if (!listaAbierta) return;
    const t = setTimeout(() => ejecutarBusqueda(busqueda), 250);
    return () => clearTimeout(t);
  }, [busqueda, listaAbierta, ejecutarBusqueda]);

  // Cerrar la lista al hacer clic fuera del buscador.
  useEffect(() => {
    if (!listaAbierta) return;
    const alClicFuera = (ev: MouseEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(ev.target as Node)) setListaAbierta(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [listaAbierta]);

  const elegirResultado = (f: ExpedienteResolucionItem) => {
    setAbierto({ expedienteId: f.expedienteId, numeroExpediente: f.numeroExpediente });
    setListaAbierta(false);
  };

  const alTeclear = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    const lista = resultados ?? [];
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setListaAbierta(true);
      setIndiceActivo((i) => Math.min(i + 1, lista.length - 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setIndiceActivo((i) => Math.max(i - 1, 0));
    } else if (ev.key === 'Enter' && listaAbierta && indiceActivo >= 0 && lista[indiceActivo]) {
      ev.preventDefault();
      elegirResultado(lista[indiceActivo]);
    } else if (ev.key === 'Escape') {
      setListaAbierta(false);
    }
  };

  const refrescarTodo = useCallback(() => {
    cargar();
    if (listaAbiertaRef.current) ejecutarBusqueda(busquedaRef.current);
  }, [cargar, ejecutarBusqueda]);

  useEffect(() => {
    cargar();
    socket.on('resolucion:pendiente', refrescarTodo);
    return () => {
      socket.off('resolucion:pendiente', refrescarTodo);
    };
  }, [cargar, refrescarTodo]);

  const filas = bandeja[pestana];
  const ayudaPestana = PESTANAS.find((p) => p.clave === pestana)?.ayuda;

  return (
    <div>
      <div className="flex items-center justify-between mb-[20px] gap-[12px] flex-wrap">
        <div>
          <h2 className="text-[18px] font-extrabold text-midnight-900">Resoluciones (SP5)</h2>
          <p className="text-[13px] text-text-muted mt-[2px] max-w-[720px]">
            La decisión oficial del caso. El tipo sale del IFI: si recomendó <strong>sancionar</strong> → RSGSA (multa y/o
            medida complementaria); si recomendó <strong>archivar</strong> → RSG (a favor del administrado). Se redacta,
            se entrega al Subgerente para su firma en papel, se registra la firma y se notifica.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={refrescarTodo}>
          Actualizar
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Buscador por N° de expediente: clic → lista de expedientes; escribir → filtra */}
      <Card className="mb-[20px]! overflow-visible! relative! z-[20]!">
        <label className="block text-[13px] font-bold mb-[8px] text-midnight-900">
          Buscar por N° de expediente
        </label>
        <div ref={buscadorRef} className="relative">
          <span className="absolute left-[12px] top-[21px] [transform:translateY(-50%)] text-text-muted flex pointer-events-none">
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            placeholder="Haz clic para ver los expedientes, o escribe el número (ej. 000007 o EXP-2026-000007)"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setListaAbierta(true);
            }}
            onFocus={() => {
              setListaAbierta(true);
              ejecutarBusqueda(busqueda);
            }}
            onClick={() => setListaAbierta(true)}
            onKeyDown={alTeclear}
            role="combobox"
            aria-expanded={listaAbierta}
            aria-autocomplete="list"
            className={`w-full py-[10px] pr-[14px] pl-[36px] text-[14px] rounded-sm outline-none border ${listaAbierta ? 'border-primary-600' : 'border-border'}`}
          />

          {listaAbierta && (
            <div
              role="listbox"
              className="absolute top-[calc(100%_+_6px)] left-0 right-0 z-[50] bg-[#ffffff] border border-border rounded-sm shadow-xl max-h-[340px] overflow-y-auto"
            >
              {errorBusqueda ? (
                <div className="p-[12px]">
                  <Alert type="error">{errorBusqueda}</Alert>
                </div>
              ) : buscando && resultados === null ? (
                <div className="flex items-center gap-[8px] p-[14px] text-[13px] text-text-muted">
                  <Spinner size={16} /> Buscando…
                </div>
              ) : resultados && resultados.length === 0 ? (
                <p className="p-[14px] text-[13px] text-text-muted">
                  {busqueda.trim()
                    ? `Ningún expediente con IFI notificado coincide con "${busqueda.trim()}". Si el IFI todavía no se notifica, el expediente está en la bandeja de IFI.`
                    : 'Todavía no hay expedientes con IFI notificado.'}
                </p>
              ) : resultados ? (
                <>
                  <div className="py-[8px] px-[14px] text-[11px] font-semibold text-text-muted border-b border-b-border bg-[#f8fafc]">
                    {busqueda.trim()
                      ? `${resultados.length} resultado${resultados.length === 1 ? '' : 's'}`
                      : `Todos los expedientes disponibles (${resultados.length}) — escribe para filtrar`}
                    {buscando && ' · actualizando…'}
                  </div>
                  {resultados.map((f, i) => {
                    const tipo = f.tipo ?? f.tipoCorrespondiente;
                    const activo = i === indiceActivo;
                    return (
                      <button
                        key={f.expedienteId}
                        type="button"
                        role="option"
                        aria-selected={activo}
                        onMouseEnter={() => setIndiceActivo(i)}
                        onClick={() => elegirResultado(f)}
                        className={`flex items-center justify-between gap-[12px] w-full py-[10px] px-[14px] border-0 border-b border-b-border cursor-pointer text-left text-[13px] ${activo ? 'bg-primary-50' : 'bg-[#ffffff]'}`}
                      >
                        <span className="flex items-center gap-[8px] font-bold text-midnight-900">
                          <GavelIcon size={15} color="var(--color-purple)" />
                          {f.numeroExpediente}
                          {f.numeroResolucion && (
                            <span className="font-medium text-[11px] text-text-muted">· Resolución N° {f.numeroResolucion}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-[6px] flex-wrap justify-end">
                          {tipo && <Badge variant={tipo === 'RSGSA' ? 'danger' : 'info'}>{tipo}</Badge>}
                          <Badge variant={varianteEtapa(f)}>{labelEtapa(f)}</Badge>
                        </span>
                      </button>
                    );
                  })}
                </>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      {/* Pestañas */}
      <div className="flex gap-[4px] border-b border-b-border mb-0">
        {PESTANAS.map((p) => {
          const activa = p.clave === pestana;
          return (
            <button
              key={p.clave}
              onClick={() => setPestana(p.clave)}
              className={`py-[10px] px-[16px] text-[13px] font-bold border-0 bg-transparent cursor-pointer flex items-center gap-[8px] ${activa ? 'border-b-2 border-b-primary-600' : 'border-b-2 border-b-transparent'} ${activa ? 'text-primary-600' : 'text-text-muted'}`}
            >
              {p.titulo}
              <Badge variant={activa ? 'info' : 'neutral'}>{bandeja[p.clave].length}</Badge>
            </button>
          );
        })}
      </div>

      <Card className="rounded-tl-none! rounded-tr-none! border-t-0!">
        {ayudaPestana && <p className="text-[12px] text-text-muted mb-[12px]">{ayudaPestana}</p>}
        {loading && filas.length === 0 ? (
          <div className="p-[40px] text-center">
            <Spinner size={32} />
            <p className="text-[13px] text-text-muted mt-[12px]">Cargando resoluciones…</p>
          </div>
        ) : filas.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
            title="Nada en esta pestaña"
            description={
              pestana === 'enRedaccion'
                ? 'Cuando se notifique un IFI, el expediente aparece aquí automáticamente.'
                : pestana === 'porFirmar'
                ? 'No hay resoluciones entregadas al Subgerente en este momento.'
                : 'No hay resoluciones firmadas pendientes ni notificadas en los últimos 30 días.'
            }
          />
        ) : (
          <TablaResoluciones filas={filas} onVer={(f) => setAbierto(f)} />
        )}
      </Card>

      {abierto && (
        <ResolucionPanel
          expedienteId={abierto.expedienteId}
          numeroExpediente={abierto.numeroExpediente}
          onClose={() => setAbierto(null)}
          onCambio={refrescarTodo}
        />
      )}
    </div>
  );
};

const TablaResoluciones: React.FC<{
  filas: ExpedienteResolucionItem[];
  onVer: (f: { expedienteId: string; numeroExpediente: string }) => void;
}> = ({ filas, onVer }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[13px] text-left">
      <thead>
        <tr className="bg-[#f8fafc] border-b border-b-border">
          <th className="py-[10px] px-[14px] font-bold">N° Expediente</th>
          <th className="py-[10px] px-[14px] font-bold">Tipo</th>
          <th className="py-[10px] px-[14px] font-bold">Etapa</th>
          <th className="py-[10px] px-[14px] font-bold">Plazo</th>
          <th className="py-[10px] px-[14px] font-bold text-right"></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => {
          const tipo = f.tipo ?? f.tipoCorrespondiente;
          const caducidad = textoCaducidad(f.plazos.diasParaCaducidad);
          return (
            <tr
              key={f.expedienteId}
              className={`border-b border-b-border ${f.plazos.alertaAmpliacion ? 'bg-[#fff1f2]' : ''}`}
            >
              <td className="py-[12px] px-[14px] font-bold text-midnight-900">
                <div className="flex items-center gap-[8px]">
                  <GavelIcon size={16} color="var(--color-purple)" />
                  {f.numeroExpediente}
                </div>
                {f.numeroResolucion && (
                  <div className="text-[11px] text-text-muted mt-[3px] font-medium">
                    Resolución N° {f.numeroResolucion}
                  </div>
                )}
              </td>
              <td className="py-[12px] px-[14px]">
                {tipo ? <Badge variant={tipo === 'RSGSA' ? 'danger' : 'info'}>{NOMBRE_TIPO[tipo]}</Badge> : <span className="text-text-muted">—</span>}
                {f.archivoPorVicio && (
                  <div className="text-[11px] text-[#be123c] mt-[3px]">archivo por error de fondo</div>
                )}
                {f.tipoNoCoincideConIfi && (
                  <div className="mt-[4px]">
                    <Badge variant="warning">Decisión distinta al IFI</Badge>
                  </div>
                )}
                {f.enParte && <div className="text-[11px] text-text-muted mt-[3px]">sancionar en parte</div>}
              </td>
              <td className="py-[12px] px-[14px]">
                <Badge variant={varianteEtapa(f)}>{labelEtapa(f)}</Badge>
              </td>
              <td className="py-[12px] px-[14px] whitespace-nowrap">
                {caducidad ? (
                  <span className={`font-semibold ${caducidad.urgente ? 'text-[#be123c]' : 'text-text-secondary'}`}>{caducidad.texto}</span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
                {f.plazos.ampliacionFirmada && <div className="text-[11px] text-text-muted mt-[3px]">plazo ampliado (+3 meses)</div>}
              </td>
              <td className="py-[12px] px-[14px] text-right">
                {f.plazos.alertaAmpliacion && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="mr-[8px]!"
                    onClick={() => onVer({ expedienteId: f.expedienteId, numeroExpediente: f.numeroExpediente })}
                  >
                    {f.ampliacionEstado ? 'Ver RSG de ampliación' : 'Emitir RSG de ampliación'}
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  icon={<EyeIcon size={14} />}
                  onClick={() => onVer({ expedienteId: f.expedienteId, numeroExpediente: f.numeroExpediente })}
                >
                  Ver expediente
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
