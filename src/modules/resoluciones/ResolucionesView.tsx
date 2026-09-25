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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-midnight-900)' }}>Resoluciones (SP5)</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', maxWidth: '720px' }}>
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
      <Card style={{ marginBottom: '20px', overflow: 'visible', position: 'relative', zIndex: 20 }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--color-midnight-900)' }}>
          Buscar por N° de expediente
        </label>
        <div ref={buscadorRef} style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '21px', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', display: 'flex', pointerEvents: 'none' }}>
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
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              fontSize: '14px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${listaAbierta ? 'var(--color-primary-600)' : 'var(--color-border)'}`,
              outline: 'none',
            }}
          />

          {listaAbierta && (
            <div
              role="listbox"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 50,
                backgroundColor: '#ffffff',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-xl)',
                maxHeight: '340px',
                overflowY: 'auto',
              }}
            >
              {errorBusqueda ? (
                <div style={{ padding: '12px' }}>
                  <Alert type="error">{errorBusqueda}</Alert>
                </div>
              ) : buscando && resultados === null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  <Spinner size={16} /> Buscando…
                </div>
              ) : resultados && resultados.length === 0 ? (
                <p style={{ padding: '14px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {busqueda.trim()
                    ? `Ningún expediente con IFI notificado coincide con "${busqueda.trim()}". Si el IFI todavía no se notifica, el expediente está en la bandeja de IFI.`
                    : 'Todavía no hay expedientes con IFI notificado.'}
                </p>
              ) : resultados ? (
                <>
                  <div style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          width: '100%',
                          padding: '10px 14px',
                          border: 'none',
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: activo ? 'var(--color-primary-50)' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '13px',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>
                          <GavelIcon size={15} color="var(--color-purple)" />
                          {f.numeroExpediente}
                          {f.numeroResolucion && (
                            <span style={{ fontWeight: 500, fontSize: '11px', color: 'var(--color-text-muted)' }}>· Resolución N° {f.numeroResolucion}</span>
                          )}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: '0' }}>
        {PESTANAS.map((p) => {
          const activa = p.clave === pestana;
          return (
            <button
              key={p.clave}
              onClick={() => setPestana(p.clave)}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                borderBottom: activa ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                background: 'none',
                color: activa ? 'var(--color-primary-600)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {p.titulo}
              <Badge variant={activa ? 'info' : 'neutral'}>{bandeja[p.clave].length}</Badge>
            </button>
          );
        })}
      </div>

      <Card style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
        {ayudaPestana && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>{ayudaPestana}</p>}
        {loading && filas.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spinner size={32} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '12px' }}>Cargando resoluciones…</p>
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
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
      <thead>
        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
          <th style={{ padding: '10px 14px', fontWeight: 700 }}>N° Expediente</th>
          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Tipo</th>
          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Etapa</th>
          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Plazo</th>
          <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => {
          const tipo = f.tipo ?? f.tipoCorrespondiente;
          const caducidad = textoCaducidad(f.plazos.diasParaCaducidad);
          return (
            <tr
              key={f.expedienteId}
              style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: f.plazos.alertaAmpliacion ? '#fff1f2' : undefined }}
            >
              <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GavelIcon size={16} color="var(--color-purple)" />
                  {f.numeroExpediente}
                </div>
                {f.numeroResolucion && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px', fontWeight: 500 }}>
                    Resolución N° {f.numeroResolucion}
                  </div>
                )}
              </td>
              <td style={{ padding: '12px 14px' }}>
                {tipo ? <Badge variant={tipo === 'RSGSA' ? 'danger' : 'info'}>{NOMBRE_TIPO[tipo]}</Badge> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                {f.archivoPorVicio && (
                  <div style={{ fontSize: '11px', color: '#be123c', marginTop: '3px' }}>archivo por error de fondo</div>
                )}
                {f.tipoNoCoincideConIfi && (
                  <div style={{ marginTop: '4px' }}>
                    <Badge variant="warning">Decisión distinta al IFI</Badge>
                  </div>
                )}
                {f.enParte && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>sancionar en parte</div>}
              </td>
              <td style={{ padding: '12px 14px' }}>
                <Badge variant={varianteEtapa(f)}>{labelEtapa(f)}</Badge>
              </td>
              <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                {caducidad ? (
                  <span style={{ fontWeight: 600, color: caducidad.urgente ? '#be123c' : 'var(--color-text-secondary)' }}>{caducidad.texto}</span>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                )}
                {f.plazos.ampliacionFirmada && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>plazo ampliado (+3 meses)</div>}
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                {f.plazos.alertaAmpliacion && (
                  <Button
                    variant="danger"
                    size="sm"
                    style={{ marginRight: '8px' }}
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
