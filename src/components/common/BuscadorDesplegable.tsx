import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Spinner } from './Common';
import { SearchIcon } from '../icons/Icons';
import { cn } from '../../lib/cn';

/**
 * Buscador por N° de expediente con lista desplegable (Resoluciones, Recursos):
 * al hacer clic muestra los más recientes sin escribir nada y se filtra
 * mientras se escribe. Se maneja con flechas, Enter y Esc; se cierra al hacer
 * clic fuera.
 */
export function useBuscadorDesplegable<T>(buscar: (termino: string) => Promise<T[]>) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<T[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const busquedaRef = useRef(busqueda);
  busquedaRef.current = busqueda;
  const abiertaRef = useRef(abierta);
  abiertaRef.current = abierta;
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  const ejecutar = useCallback(async (q: string) => {
    const termino = q.trim();
    setBuscando(true);
    setError(null);
    try {
      const data = await buscarRef.current(termino);
      // Descarta respuestas de una búsqueda anterior que llegaron tarde.
      if (busquedaRef.current.trim() === termino) {
        setResultados(Array.isArray(data) ? data : []);
        setIndiceActivo(-1);
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar.');
    } finally {
      setBuscando(false);
    }
  }, []);

  // Mientras está abierta, busca un instante después de la última tecla.
  useEffect(() => {
    if (!abierta) return;
    const t = setTimeout(() => ejecutar(busqueda), 250);
    return () => clearTimeout(t);
  }, [busqueda, abierta, ejecutar]);

  // Cerrar la lista al hacer clic fuera del buscador.
  useEffect(() => {
    if (!abierta) return;
    const alClicFuera = (ev: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(ev.target as Node)) setAbierta(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [abierta]);

  /** Vuelve a buscar si la lista está abierta (tras un cambio en la bandeja). */
  const refrescarSiAbierta = useCallback(() => {
    if (abiertaRef.current) ejecutar(busquedaRef.current);
  }, [ejecutar]);

  return {
    busqueda,
    setBusqueda,
    resultados,
    buscando,
    error,
    abierta,
    setAbierta,
    indiceActivo,
    setIndiceActivo,
    contenedorRef,
    ejecutar,
    refrescarSiAbierta,
  };
}

export type EstadoBuscador<T> = ReturnType<typeof useBuscadorDesplegable<T>>;

export function BuscadorDesplegable<T>({
  estado,
  placeholder,
  claveDe,
  onElegir,
  renderOpcion,
  textoSinResultados,
  textoTodos,
}: {
  estado: EstadoBuscador<T>;
  placeholder: string;
  claveDe: (item: T) => string;
  onElegir: (item: T) => void;
  /** Contenido de cada opción de la lista. */
  renderOpcion: (item: T, activa: boolean) => React.ReactNode;
  /** Mensaje cuando no hay resultados (recibe el término buscado, vacío si no se escribió nada). */
  textoSinResultados: (termino: string) => string;
  /** Encabezado de la lista cuando no se escribió nada (recibe la cantidad). */
  textoTodos: (cantidad: number) => string;
}) {
  const { busqueda, setBusqueda, resultados, buscando, error, abierta, setAbierta, indiceActivo, setIndiceActivo, contenedorRef, ejecutar } = estado;

  const elegir = (item: T) => {
    onElegir(item);
    setAbierta(false);
  };

  const alTeclear = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    const lista = resultados ?? [];
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setAbierta(true);
      setIndiceActivo((i) => Math.min(i + 1, lista.length - 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setIndiceActivo((i) => Math.max(i - 1, 0));
    } else if (ev.key === 'Enter' && abierta && indiceActivo >= 0 && lista[indiceActivo]) {
      ev.preventDefault();
      elegir(lista[indiceActivo]);
    } else if (ev.key === 'Escape') {
      setAbierta(false);
    }
  };

  const termino = busqueda.trim();

  return (
    <div className="relative z-[20] py-[12px] px-[16px] rounded-lg bg-bg-card border border-border shadow-xs animate-aparecer [animation-delay:150ms]">
      <div ref={contenedorRef} className="relative">
        <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-text-light flex pointer-events-none">
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          aria-label="Buscar por N° de expediente"
          placeholder={placeholder}
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setAbierta(true);
          }}
          onFocus={() => {
            setAbierta(true);
            ejecutar(busqueda);
          }}
          onClick={() => setAbierta(true)}
          onKeyDown={alTeclear}
          role="combobox"
          aria-expanded={abierta}
          aria-autocomplete="list"
          className={cn(
            'w-full h-[42px] pr-[14px] pl-[40px] text-[13.5px] rounded-pill outline-none border bg-bg-subtle text-text-main [transition:border-color_150ms,box-shadow_150ms,background-color_150ms]',
            abierta ? 'border-blue-700 ring-4 ring-blue-100 bg-white' : 'border-border hover:border-border-dark',
          )}
        />

        {abierta && (
          <div
            role="listbox"
            className="absolute top-[calc(100%_+_8px)] left-0 right-0 z-[50] bg-white border border-border rounded-lg shadow-xl max-h-[360px] overflow-y-auto animate-aparecer [animation-duration:200ms]"
          >
            {error ? (
              <div className="p-[12px]">
                <Alert type="error">{error}</Alert>
              </div>
            ) : buscando && resultados === null ? (
              <div className="flex items-center gap-[8px] p-[14px] text-[13px] text-text-muted">
                <Spinner size={16} /> Buscando…
              </div>
            ) : resultados && resultados.length === 0 ? (
              <p className="p-[14px] text-[13px] text-text-muted m-0">{textoSinResultados(termino)}</p>
            ) : resultados ? (
              <>
                <div className="py-[8px] px-[16px] text-[11px] font-bold uppercase tracking-[0.8px] text-text-light border-b border-b-border bg-bg-subtle">
                  {termino ? `${resultados.length} resultado${resultados.length === 1 ? '' : 's'}` : textoTodos(resultados.length)}
                  {buscando && ' · actualizando…'}
                </div>
                {resultados.map((item, i) => {
                  const activa = i === indiceActivo;
                  return (
                    <button
                      key={claveDe(item)}
                      type="button"
                      role="option"
                      aria-selected={activa}
                      onMouseEnter={() => setIndiceActivo(i)}
                      onClick={() => elegir(item)}
                      className={cn(
                        'flex items-center justify-between gap-[12px] w-full py-[10px] px-[16px] border-0 border-b border-b-border-subtle cursor-pointer text-left text-[13px] [transition:background-color_120ms]',
                        activa ? 'bg-blue-50' : 'bg-white',
                      )}
                    >
                      {renderOpcion(item, activa)}
                    </button>
                  );
                })}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
