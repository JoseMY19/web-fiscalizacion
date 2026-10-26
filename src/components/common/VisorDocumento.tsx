import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { VistaNoDisponibleError } from '../../api/vistaPreviaDocumentos';
import { Alert, Button, Spinner } from './Common';

interface Props {
  titulo: string;
  /** Documento convertido a PDF por el servidor: se ve tal como se imprimiría. Debe ser estable entre renders (useCallback o creado una vez). */
  cargarPdf: () => Promise<Blob>;
  /** Solo Word: si el servidor no puede convertir, se dibuja el .docx en el navegador (vista aproximada). */
  cargarWord?: () => Promise<Blob>;
  onCerrar: () => void;
  /** Si se da, aparece el botón "Descargar". */
  onDescargar?: () => void;
  /** Cada vez que cambia, vuelve a pedir el documento (por ejemplo, tras editar sus datos) sin vaciar lo que ya se ve. */
  version?: number;
}

type Estado = 'cargando' | 'pdf' | 'word' | 'error';

/**
 * Vista previa de un documento dentro de la pantalla (columna derecha del panel). Solo lectura.
 * Primero pide el PDF al servidor (idéntico a lo que se imprime); si no se puede y es un Word, lo dibuja
 * en el navegador con docx-preview, que respeta texto y tablas pero no siempre cuadros de texto ni tabulaciones.
 */
export const VisorDocumento: React.FC<Props> = ({ titulo, cargarPdf, cargarWord, onCerrar, onDescargar, version = 0 }) => {
  const area = useRef<HTMLDivElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [urlPdf, setUrlPdf] = useState<string | null>(null);
  const urlActual = useRef<string | null>(null);
  // Mientras se vuelve a pedir el documento (tras una edición) se sigue viendo el anterior.
  const [actualizando, setActualizando] = useState(false);
  // La hoja de Word mide ~794 px: se reduce para que quepa en la columna. Valor dinámico, no se puede expresar en Tailwind.
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    let cancelado = false;
    setError(null);
    // Primera carga: pantalla de "preparando". Al refrescar: se conserva lo que ya se ve.
    if (!urlActual.current && !hoja.current?.firstChild) setEstado('cargando');
    setActualizando(true);

    const mostrarWordAproximado = async () => {
      const blob = await cargarWord!();
      if (cancelado) return;
      // Se muestra el contenedor primero para que el Word se dibuje ya con sus medidas.
      setEstado('word');
      await new Promise((r) => requestAnimationFrame(r));
      if (cancelado || !hoja.current) return;
      hoja.current.innerHTML = '';
      await renderAsync(blob, hoja.current, undefined, { className: 'docx', inWrapper: true, breakPages: true, renderHeaders: true, renderFooters: true });
    };

    (async () => {
      try {
        const pdf = await cargarPdf();
        if (cancelado) return;
        const url = URL.createObjectURL(pdf);
        if (urlActual.current) URL.revokeObjectURL(urlActual.current);
        urlActual.current = url;
        setUrlPdf(url);
        setEstado('pdf');
      } catch (err: any) {
        if (cancelado) return;
        try {
          if (err instanceof VistaNoDisponibleError && cargarWord) await mostrarWordAproximado();
          else throw err;
        } catch (e: any) {
          if (cancelado) return;
          setError(e?.message || 'No se pudo mostrar el documento.');
          setEstado('error');
        }
      } finally {
        if (!cancelado) setActualizando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [cargarPdf, cargarWord, version]);

  // Al cerrar la vista se libera el PDF.
  useEffect(
    () => () => {
      if (urlActual.current) URL.revokeObjectURL(urlActual.current);
    },
    [],
  );

  // Vista aproximada de Word: ajusta la hoja al ancho de la columna (y de nuevo si cambia).
  useEffect(() => {
    if (estado !== 'word' || !area.current) return;
    const ajustar = () => {
      const pagina = hoja.current?.querySelector('section.docx') as HTMLElement | null;
      if (!pagina || !area.current) return;
      setEscala(Math.min(1, Math.max(0.4, (area.current.clientWidth - 24) / (pagina.offsetWidth + 60))));
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(area.current);
    // El Word termina de dibujarse un instante después de mostrarse.
    const reintento = window.setTimeout(ajustar, 400);
    return () => {
      observador.disconnect();
      window.clearTimeout(reintento);
    };
  }, [estado]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex items-center justify-between gap-[12px] py-[14px] px-[18px] border-b border-border bg-bg-card shrink-0">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-text-muted">
            Vista previa{actualizando && estado !== 'cargando' ? ' · actualizando…' : ''}
          </div>
          <h4 className="m-0 text-[14px] font-bold text-text-main truncate">{titulo}</h4>
        </div>
        <div className="flex items-center gap-[8px] shrink-0">
          {onDescargar && (
            <Button size="sm" variant="secondary" onClick={onDescargar}>
              Descargar
            </Button>
          )}
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar la vista previa"
            className="bg-transparent border-0 cursor-pointer text-text-muted p-[8px] rounded-sm flex items-center justify-center hover:bg-bg-hover"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {estado === 'word' && (
        <div className="shrink-0 py-[8px] px-[18px] text-[12px] text-[#92400e] bg-warning-bg border-b border-warning-border">
          Vista aproximada: puede diferir del Word descargado. Para verlo idéntico, el servidor necesita LibreOffice.
        </div>
      )}

      <div ref={area} className="relative flex-1 min-h-0 overflow-auto bg-bg-subtle">
        {estado === 'cargando' && (
          <div className="flex flex-col items-center justify-center py-[56px] gap-[12px]">
            <Spinner size={28} />
            <p className="text-[13px] text-text-muted m-0">Preparando el documento…</p>
          </div>
        )}
        {estado === 'error' && (
          <div className="p-[18px]">
            <Alert type="warning">
              <strong>No se pudo mostrar la vista previa:</strong> {error}
            </Alert>
          </div>
        )}
        {estado === 'pdf' && urlPdf && <iframe src={urlPdf} title={titulo} className="absolute inset-0 w-full h-full border-0 bg-white" />}
        <div ref={hoja} style={{ zoom: escala }} className={estado === 'word' ? 'block' : 'hidden'} />
      </div>
    </div>
  );
};
