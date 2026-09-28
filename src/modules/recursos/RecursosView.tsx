import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BandejaRecursos, ExpedienteRecursos, RecursosApi } from '../../api';
import { Alert, Badge, Button, Card, EmptyState, Spinner } from '../../components/common/Common';
import { CheckCircleIcon, EyeIcon, RefreshCwIcon, ScaleIcon, SearchIcon } from '../../components/icons/Icons';
import { RecursoPanel } from './RecursoPanel';
import { LABEL_SITUACION, textoPlazoRecurso, textoUltimoActo, varianteSituacion } from './recursosUi';

type Pestana = keyof BandejaRecursos;

const PESTANAS: { clave: Pestana; titulo: string; ayuda: string; vacio: string }[] = [
  {
    clave: 'plazoAbierto',
    titulo: 'Plazo de recurso abierto',
    ayuda:
      'Resolución (o RSG de reconsideración) notificada, dentro de los 15 días hábiles y sin recurso presentado. Al vencer el plazo salen de aquí (pueden quedar firmes).',
    vacio: 'No hay resoluciones notificadas con el plazo de recurso corriendo.',
  },
  {
    clave: 'reconsideraciones',
    titulo: 'Reconsideraciones',
    ayuda: 'Reconsideraciones presentadas hasta que su RSG que las resuelve quede notificada.',
    vacio: 'No hay reconsideraciones en trámite.',
  },
  {
    clave: 'apelaciones',
    titulo: 'Apelaciones',
    ayuda: 'Apelaciones presentadas: informe a GOP, firma, elevación y decisión de GOP.',
    vacio: 'No hay apelaciones en trámite.',
  },
  {
    clave: 'resueltos',
    titulo: 'Resueltos',
    ayuda: 'Recursos ya resueltos: concluidos a favor, apelaciones infundadas, nulidades (pendientes con legal) y reconsideraciones resueltas sin apelación a tiempo.',
    vacio: 'Todavía no hay recursos resueltos.',
  },
];

const BANDEJA_VACIA: BandejaRecursos = { plazoAbierto: [], reconsideraciones: [], apelaciones: [], resueltos: [] };

/**
 * SP6 (reconsideración) y SP7 (apelación). Mismo esquema que Resoluciones:
 * pestañas, buscador por N° de expediente y un panel de pasos por
 * expediente. Nunca se piden códigos internos: todo se elige desde la lista.
 */
export const RecursosView: React.FC = () => {
  const [bandeja, setBandeja] = useState<BandejaRecursos>(BANDEJA_VACIA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('plazoAbierto');
  const [abierto, setAbierto] = useState<{ expedienteId: string; numeroExpediente: string } | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ExpedienteRecursos[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const buscadorRef = useRef<HTMLDivElement>(null);
  const busquedaRef = useRef(busqueda);
  busquedaRef.current = busqueda;
  const listaAbiertaRef = useRef(listaAbierta);
  listaAbiertaRef.current = listaAbierta;

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await RecursosApi.getBandeja();
      setBandeja({
        plazoAbierto: data?.plazoAbierto ?? [],
        reconsideraciones: data?.reconsideraciones ?? [],
        apelaciones: data?.apelaciones ?? [],
        resueltos: data?.resueltos ?? [],
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar la bandeja de recursos.');
    } finally {
      setLoading(false);
    }
  }, []);

  const ejecutarBusqueda = useCallback(async (q: string) => {
    const termino = q.trim();
    setBuscando(true);
    setErrorBusqueda(null);
    try {
      const data = await RecursosApi.buscar(termino);
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

  useEffect(() => {
    if (!listaAbierta) return;
    const alClicFuera = (ev: MouseEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(ev.target as Node)) setListaAbierta(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [listaAbierta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const refrescarTodo = useCallback(() => {
    cargar();
    if (listaAbiertaRef.current) ejecutarBusqueda(busquedaRef.current);
  }, [cargar, ejecutarBusqueda]);

  const elegir = (f: ExpedienteRecursos) => {
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
      elegir(lista[indiceActivo]);
    } else if (ev.key === 'Escape') {
      setListaAbierta(false);
    }
  };

  const filas = bandeja[pestana];
  const def = PESTANAS.find((p) => p.clave === pestana)!;

  return (
    <div>
      <div className="flex items-center justify-between mb-[20px] gap-[12px] flex-wrap">
        <div>
          <h2 className="text-[18px] font-extrabold text-midnight-900">Recursos impugnativos (SP6 y SP7)</h2>
          <p className="text-[13px] text-text-muted mt-[2px] max-w-[760px]">
            Notificada la resolución, el administrado tiene <strong>15 días hábiles</strong> para recurrir. La{' '}
            <strong>reconsideración</strong> la resuelve esta Subgerencia con una RSG (requiere prueba nueva); la{' '}
            <strong>apelación</strong> va contra el último acto y la resuelve la Gerencia de Orden Público (GOP). Ninguno es
            obligatorio.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={refrescarTodo}>
          Actualizar
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Card className="mb-[20px]! overflow-visible! relative! z-[20]!">
        <label className="block text-[13px] font-bold mb-[8px] text-midnight-900">Buscar por N° de expediente</label>
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
                    ? `Ningún expediente con resolución notificada coincide con "${busqueda.trim()}".`
                    : 'Todavía no hay expedientes con resolución notificada.'}
                </p>
              ) : resultados ? (
                <>
                  <div className="py-[8px] px-[14px] text-[11px] font-semibold text-text-muted border-b border-b-border bg-[#f8fafc]">
                    {busqueda.trim()
                      ? `${resultados.length} resultado${resultados.length === 1 ? '' : 's'}`
                      : `Todos los expedientes con resolución notificada (${resultados.length}) — escribe para filtrar`}
                    {buscando && ' · actualizando…'}
                  </div>
                  {resultados.map((f, i) => (
                    <button
                      key={f.expedienteId}
                      type="button"
                      role="option"
                      aria-selected={i === indiceActivo}
                      onMouseEnter={() => setIndiceActivo(i)}
                      onClick={() => elegir(f)}
                      className={`flex items-center justify-between gap-[12px] w-full py-[10px] px-[14px] border-0 border-b border-b-border cursor-pointer text-left text-[13px] ${i === indiceActivo ? 'bg-primary-50' : 'bg-[#ffffff]'}`}
                    >
                      <span className="flex items-center gap-[8px] font-bold text-midnight-900">
                        <ScaleIcon size={15} color="var(--color-purple)" />
                        {f.numeroExpediente}
                        {f.resolucion.numeroResolucion && (
                          <span className="font-medium text-[11px] text-text-muted">· Resolución N° {f.resolucion.numeroResolucion}</span>
                        )}
                      </span>
                      <span className="flex items-center gap-[6px] flex-wrap justify-end">
                        {f.tienePago && <Badge variant="warning">Pagó</Badge>}
                        <Badge variant={varianteSituacion(f.situacion)}>{LABEL_SITUACION[f.situacion]}</Badge>
                      </span>
                    </button>
                  ))}
                </>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-[4px] border-b border-b-border mb-0 flex-wrap">
        {PESTANAS.map((p) => {
          const activa = p.clave === pestana;
          return (
            <button
              key={p.clave}
              onClick={() => setPestana(p.clave)}
              className={`py-[10px] px-[16px] text-[13px] font-bold border-0 bg-transparent cursor-pointer flex items-center gap-[8px] border-b-2 ${activa ? 'border-b-primary-600 text-primary-600' : 'border-b-transparent text-text-muted'}`}
            >
              {p.titulo}
              <Badge variant={activa ? 'info' : 'neutral'}>{bandeja[p.clave].length}</Badge>
            </button>
          );
        })}
      </div>

      <Card className="rounded-tl-none! rounded-tr-none! border-t-0!">
        <p className="text-[12px] text-text-muted mb-[12px]">{def.ayuda}</p>
        {loading && filas.length === 0 ? (
          <div className="p-[40px] text-center">
            <Spinner size={32} />
            <p className="text-[13px] text-text-muted mt-[12px]">Cargando recursos…</p>
          </div>
        ) : filas.length === 0 ? (
          <EmptyState icon={<CheckCircleIcon size={40} color="var(--color-success)" />} title="Nada en esta pestaña" description={def.vacio} />
        ) : (
          <TablaRecursos filas={filas} onVer={elegir} />
        )}
      </Card>

      {abierto && (
        <RecursoPanel
          expedienteId={abierto.expedienteId}
          numeroExpediente={abierto.numeroExpediente}
          onClose={() => setAbierto(null)}
          onCambio={refrescarTodo}
        />
      )}
    </div>
  );
};

const TablaRecursos: React.FC<{ filas: ExpedienteRecursos[]; onVer: (f: ExpedienteRecursos) => void }> = ({ filas, onVer }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[13px] text-left">
      <thead>
        <tr className="bg-[#f8fafc] border-b border-b-border">
          <th className="py-[10px] px-[14px] font-bold">N° Expediente</th>
          <th className="py-[10px] px-[14px] font-bold">Último acto</th>
          <th className="py-[10px] px-[14px] font-bold">Situación</th>
          <th className="py-[10px] px-[14px] font-bold">Plazo</th>
          <th className="py-[10px] px-[14px] font-bold text-right"></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => {
          const plazo = f.situacion === 'PLAZO_ABIERTO' || f.situacion === 'PLAZO_VENCIDO' ? textoPlazoRecurso(f) : null;
          return (
            <tr key={f.expedienteId} className="border-b border-b-border">
              <td className="py-[12px] px-[14px] font-bold text-midnight-900">
                <div className="flex items-center gap-[8px]">
                  <ScaleIcon size={16} color="var(--color-purple)" />
                  {f.numeroExpediente}
                </div>
                {f.administrado && <div className="text-[11px] text-text-muted mt-[3px] font-medium">{f.administrado}</div>}
              </td>
              <td className="py-[12px] px-[14px] text-[12px]">{textoUltimoActo(f)}</td>
              <td className="py-[12px] px-[14px]">
                <div className="flex flex-col items-start gap-[4px]">
                  <Badge variant={varianteSituacion(f.situacion)}>{LABEL_SITUACION[f.situacion]}</Badge>
                  {f.tienePago && <Badge variant="warning">Registró pago</Badge>}
                </div>
              </td>
              <td className="py-[12px] px-[14px] whitespace-nowrap">
                {plazo ? (
                  <span className={`font-semibold ${plazo.urgente ? 'text-[#be123c]' : 'text-text-secondary'}`}>{plazo.texto}</span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </td>
              <td className="py-[12px] px-[14px] text-right">
                <Button variant="primary" size="sm" icon={<EyeIcon size={14} />} onClick={() => onVer(f)}>
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
