import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Spinner } from './Common';
import { SearchIcon } from '../icons/Icons';

/**
 * Buscador desplegable por N° de expediente (misma UX que los buscadores de
 * Resoluciones / Recursos): al hacer clic lista TODAS las opciones y filtra
 * mientras se escribe. A diferencia de esos (búsqueda en el servidor), aquí la
 * lista completa ya viene cargada y se filtra en el cliente.
 */
export interface ComboboxExpedienteProps<T> {
  label: string;
  placeholder?: string;
  opciones: T[] | null;
  cargando?: boolean;
  error?: string | null;
  seleccionada: T | null;
  onSeleccionar: (opcion: T | null) => void;
  obtenerClave: (opcion: T) => string;
  obtenerNumeroExpediente: (opcion: T) => string;
  /** Contenido a la derecha de cada opción (estado corto, badges…). */
  renderDetalle?: (opcion: T) => React.ReactNode;
  mensajeVacio: string;
}

export function ComboboxExpediente<T>({
  label,
  placeholder = 'Haz clic para ver los expedientes, o escribe el número (ej. 000007)',
  opciones,
  cargando = false,
  error = null,
  seleccionada,
  onSeleccionar,
  obtenerClave,
  obtenerNumeroExpediente,
  renderDetalle,
  mensajeVacio,
}: ComboboxExpedienteProps<T>) {
  const [texto, setTexto] = useState('');
  const [abierta, setAbierta] = useState(false);
  const abiertaRef = useRef(abierta);
  abiertaRef.current = abierta;
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Al cambiar la selección desde fuera (p. ej. se limpia tras una acción), el texto la refleja.
  // Solo depende de `seleccionada`: los getters suelen ser funciones inline.
  const obtenerNumeroRef = useRef(obtenerNumeroExpediente);
  obtenerNumeroRef.current = obtenerNumeroExpediente;
  useEffect(() => {
    if (seleccionada) setTexto(obtenerNumeroRef.current(seleccionada));
    else setTexto((t) => (abiertaRef.current ? t : ''));
  }, [seleccionada]);

  useEffect(() => {
    if (!abierta) return;
    const alClicFuera = (ev: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(ev.target as Node)) {
        setAbierta(false);
        setTexto(seleccionada ? obtenerNumeroExpediente(seleccionada) : '');
      }
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [abierta, seleccionada, obtenerNumeroExpediente]);

  const termino = texto.trim().toLowerCase();
  const filtroActivo = !!termino && !(seleccionada && obtenerNumeroExpediente(seleccionada).toLowerCase() === termino);
  const filtradas = useMemo(
    () => (opciones ?? []).filter((o) => !filtroActivo || obtenerNumeroExpediente(o).toLowerCase().includes(termino)),
    [opciones, filtroActivo, termino, obtenerNumeroExpediente],
  );

  const elegir = (o: T) => {
    onSeleccionar(o);
    setTexto(obtenerNumeroExpediente(o));
    setAbierta(false);
  };

  const alTeclear = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setAbierta(true);
      setIndiceActivo((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setIndiceActivo((i) => Math.max(i - 1, 0));
    } else if (ev.key === 'Enter' && abierta && indiceActivo >= 0 && filtradas[indiceActivo]) {
      ev.preventDefault();
      elegir(filtradas[indiceActivo]);
    } else if (ev.key === 'Escape') {
      setAbierta(false);
    }
  };

  return (
    <div className="mb-[14px]">
      <label className="block text-[13px] font-semibold mb-[6px]">{label}</label>
      <div ref={contenedorRef} className="relative">
        <span className="absolute left-[12px] top-[21px] [transform:translateY(-50%)] text-text-muted flex pointer-events-none">
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          placeholder={placeholder}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierta(true);
            setIndiceActivo(-1);
            if (seleccionada) onSeleccionar(null);
          }}
          onFocus={() => setAbierta(true)}
          onClick={() => setAbierta(true)}
          onKeyDown={alTeclear}
          role="combobox"
          aria-expanded={abierta}
          aria-autocomplete="list"
          className={`w-full py-[10px] pr-[14px] pl-[36px] text-[14px] rounded-sm outline-none border ${abierta ? 'border-primary-600' : 'border-border'}`}
        />

        {abierta && (
          <div
            role="listbox"
            className="absolute top-[calc(100%_+_6px)] left-0 right-0 z-[50] bg-[#ffffff] border border-border rounded-sm shadow-xl max-h-[340px] overflow-y-auto"
          >
            {error ? (
              <div className="p-[12px]">
                <Alert type="error" className="mb-0!">{error}</Alert>
              </div>
            ) : cargando && opciones === null ? (
              <div className="flex items-center gap-[8px] p-[14px] text-[13px] text-text-muted">
                <Spinner size={16} /> Cargando…
              </div>
            ) : filtradas.length === 0 ? (
              <p className="p-[14px] text-[13px] text-text-muted">
                {filtroActivo ? `Ningún expediente disponible coincide con "${texto.trim()}".` : mensajeVacio}
              </p>
            ) : (
              <>
                <div className="py-[8px] px-[14px] text-[11px] font-semibold text-text-muted border-b border-b-border bg-[#f8fafc]">
                  {filtroActivo
                    ? `${filtradas.length} resultado${filtradas.length === 1 ? '' : 's'}`
                    : `Todos los expedientes disponibles (${filtradas.length}) — escribe para filtrar`}
                  {cargando && ' · actualizando…'}
                </div>
                {filtradas.map((o, i) => {
                  const activo = i === indiceActivo;
                  return (
                    <button
                      key={obtenerClave(o)}
                      type="button"
                      role="option"
                      aria-selected={activo}
                      onMouseEnter={() => setIndiceActivo(i)}
                      onClick={() => elegir(o)}
                      className={`flex items-center justify-between gap-[12px] w-full py-[10px] px-[14px] border-0 border-b border-b-border cursor-pointer text-left text-[13px] ${activo ? 'bg-primary-50' : 'bg-[#ffffff]'}`}
                    >
                      <span className="font-bold text-midnight-900">{obtenerNumeroExpediente(o)}</span>
                      {renderDetalle && <span className="flex items-center gap-[6px] flex-wrap justify-end">{renderDetalle(o)}</span>}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
