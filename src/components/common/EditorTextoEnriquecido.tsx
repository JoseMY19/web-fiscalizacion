import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { aHtml, esHtml, imagenADataUri, normalizarSalida, sanitizarHtml } from '../../lib/textoEnriquecido';

/**
 * Editor del análisis "como Word": negrita, cursiva, subrayado, viñetas,
 * numeración, sangría, alineación e imágenes. El Word generado (IFI y
 * resolución) sale con el mismo formato.
 *
 * Recibe y entrega el valor guardado: texto plano si no hay formato
 * (compatible con lo escrito antes y con "Cargar texto modelo"), HTML saneado
 * si lo hay. Sin dependencias: contentEditable + execCommand.
 */

/** Estilo del contenido (editor y vista): listas, párrafos e imágenes como en el Word. */
export const CLASES_CONTENIDO_ENRIQUECIDO =
  '[&_p]:mb-[6px] [&_ul]:list-disc [&_ul]:pl-[24px] [&_ul]:mb-[6px] [&_ol]:list-decimal [&_ol]:pl-[24px] [&_ol]:mb-[6px] ' +
  '[&_ol_ol]:list-[lower-alpha] [&_ul_ul]:list-[circle] [&_li]:mb-[2px] [&_blockquote]:pl-[24px] [&_img]:max-w-full [&_img]:h-auto [&_img]:my-[6px] ' +
  '[&_strong]:font-bold [&_em]:italic [&_u]:underline';

type Comando = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList' | 'justifyLeft' | 'justifyCenter' | 'justifyFull';

interface Props {
  value: string;
  onChange: (valor: string) => void;
  label?: string;
  placeholder?: string;
  /** Alto mínimo del área de escritura. */
  alto?: 'md' | 'lg';
}

export const EditorTextoEnriquecido: React.FC<Props> = ({ value, onChange, label, placeholder, alto = 'lg' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  // Último valor emitido: si `value` cambia desde afuera (texto modelo, cancelar), se repinta.
  const ultimo = useRef<string | null>(null);
  const [vacio, setVacio] = useState(!value);
  const [activos, setActivos] = useState<Partial<Record<Comando, boolean>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current || value === ultimo.current) return;
    ref.current.innerHTML = aHtml(value);
    ultimo.current = value;
    setVacio(!value);
  }, [value]);

  const emitir = useCallback(() => {
    if (!ref.current) return;
    const salida = normalizarSalida(ref.current.innerHTML);
    ultimo.current = salida;
    setVacio(!salida);
    onChange(salida);
  }, [onChange]);

  const refrescarActivos = useCallback(() => {
    const sel = document.getSelection();
    if (!ref.current || !sel || !sel.anchorNode || !ref.current.contains(sel.anchorNode)) return;
    const estado: Partial<Record<Comando, boolean>> = {};
    for (const c of ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList', 'justifyCenter', 'justifyFull'] as Comando[]) {
      try {
        estado[c] = document.queryCommandState(c);
      } catch {
        estado[c] = false;
      }
    }
    setActivos(estado);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', refrescarActivos);
    return () => document.removeEventListener('selectionchange', refrescarActivos);
  }, [refrescarActivos]);

  const ejecutar = (comando: string, valor?: string) => {
    ref.current?.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand(comando, false, valor);
    emitir();
    refrescarActivos();
  };

  // Posición del cursor antes de abrir el selector de archivos (al volver, se inserta ahí).
  const rango = useRef<Range | null>(null);
  const guardarRango = () => {
    const sel = document.getSelection();
    rango.current = sel && sel.rangeCount && ref.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
  };

  const insertarImagen = async (archivo: Blob) => {
    setError(null);
    try {
      const src = await imagenADataUri(archivo);
      ref.current?.focus();
      if (rango.current) {
        const sel = document.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(rango.current);
        rango.current = null;
      }
      ejecutar('insertHTML', `<img src="${src}">`);
    } catch (err: any) {
      setError(err.message || 'No se pudo insertar la imagen.');
    }
  };

  const alPegar = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const imagen = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))?.getAsFile();
    const html = e.clipboardData.getData('text/html');
    if (imagen && !html) {
      e.preventDefault();
      insertarImagen(imagen);
      return;
    }
    e.preventDefault();
    // Desde Word o la web: solo el formato que el Word del sistema sabe reproducir.
    if (html) ejecutar('insertHTML', sanitizarHtml(html));
    else ejecutar('insertText', e.clipboardData.getData('text/plain'));
  };

  const boton = (titulo: string, contenido: React.ReactNode, accion: () => void, activo?: boolean) => (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={activo}
      // mousedown sin foco: no se pierde la selección del texto.
      onMouseDown={(e) => e.preventDefault()}
      onClick={accion}
      className={cn(
        'h-[30px] min-w-[30px] px-[6px] rounded-[4px] text-[13px] text-text-main flex items-center justify-center cursor-pointer hover:bg-[#e2e8f0]',
        activo ? 'bg-primary-50 text-primary-600 border border-primary-600' : 'border border-transparent',
      )}
    >
      {contenido}
    </button>
  );
  const separador = <span className="w-px h-[20px] bg-border mx-[4px]" />;

  return (
    <div className="mb-[14px] w-full">
      {label && <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">{label}</label>}
      <div className="rounded-sm border border-border bg-[#ffffff] focus-within:border-primary-600">
        <div className="flex items-center flex-wrap gap-[2px] px-[6px] py-[4px] border-b border-border bg-[#f8fafc] rounded-t-sm sticky top-0 z-[1]">
          {boton('Negrita (Ctrl+B)', <strong>B</strong>, () => ejecutar('bold'), activos.bold)}
          {boton('Cursiva (Ctrl+I)', <em className="font-serif">I</em>, () => ejecutar('italic'), activos.italic)}
          {boton('Subrayado (Ctrl+U)', <u>S</u>, () => ejecutar('underline'), activos.underline)}
          {separador}
          {boton('Viñetas', <IconoLista numerada={false} />, () => ejecutar('insertUnorderedList'), activos.insertUnorderedList)}
          {boton('Numeración', <IconoLista numerada />, () => ejecutar('insertOrderedList'), activos.insertOrderedList)}
          {boton('Disminuir sangría', <IconoSangria aumentar={false} />, () => ejecutar('outdent'))}
          {boton('Aumentar sangría', <IconoSangria aumentar />, () => ejecutar('indent'))}
          {separador}
          {boton('Alineación normal (la de la plantilla)', <IconoAlinear modo="izquierda" />, () => ejecutar('justifyLeft'))}
          {boton('Centrar', <IconoAlinear modo="centro" />, () => ejecutar('justifyCenter'), activos.justifyCenter)}
          {boton('Justificar', <IconoAlinear modo="justificado" />, () => ejecutar('justifyFull'), activos.justifyFull)}
          {separador}
          {boton('Insertar imagen (también puedes pegarla)', <IconoImagen />, () => {
            guardarRango();
            archivoRef.current?.click();
          })}
          {separador}
          {boton('Deshacer (Ctrl+Z)', <span className="text-[15px]">↶</span>, () => ejecutar('undo'))}
          {boton('Rehacer (Ctrl+Y)', <span className="text-[15px]">↷</span>, () => ejecutar('redo'))}
          <input
            ref={archivoRef}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) insertarImagen(f);
              e.target.value = '';
            }}
          />
        </div>
        <div className="relative">
          {vacio && placeholder && (
            <div className="absolute top-[10px] left-[14px] right-[14px] text-[14px] text-text-muted pointer-events-none">{placeholder}</div>
          )}
          <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={label ?? 'Análisis'}
            onInput={emitir}
            onBlur={emitir}
            onPaste={alPegar}
            onKeyUp={refrescarActivos}
            onMouseUp={refrescarActivos}
            className={cn(
              'py-[10px] px-[14px] text-[14px] leading-[1.55] text-text-main outline-none overflow-y-auto max-h-[55vh]',
              alto === 'lg' ? 'min-h-[300px]' : 'min-h-[180px]',
              CLASES_CONTENIDO_ENRIQUECIDO,
            )}
          />
        </div>
      </div>
      {error && <p className="text-[12px] text-danger mt-[4px]">{error}</p>}
      <p className="text-[11px] text-text-muted mt-[4px]">
        Viñetas, numeración, negrita e imágenes salen igual en el Word. Lo pegado desde Word conserva negritas y listas.
      </p>
    </div>
  );
};

/** Vista de solo lectura: HTML saneado o el texto plano de siempre. */
export const VistaTextoEnriquecido: React.FC<{ texto: string | null | undefined; className?: string }> = ({ texto, className }) => {
  if (!texto) return null;
  if (!esHtml(texto)) return <div className={className}>{texto}</div>;
  return (
    <div
      className={cn(className, 'whitespace-normal!', CLASES_CONTENIDO_ENRIQUECIDO)}
      // Saneado con la misma lista blanca que el editor: solo formato, sin scripts ni enlaces.
      dangerouslySetInnerHTML={{ __html: sanitizarHtml(texto) }}
    />
  );
};

// ─── Íconos de la barra (SVG propios, sin dependencias) ───

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    {children}
  </svg>
);

const IconoLista: React.FC<{ numerada: boolean }> = ({ numerada }) => (
  <Svg>
    {numerada ? (
      <>
        <text x="0.5" y="5.5" fontSize="5" fill="currentColor" stroke="none">1</text>
        <text x="0.5" y="13" fontSize="5" fill="currentColor" stroke="none">2</text>
      </>
    ) : (
      <>
        <circle cx="2.5" cy="4" r="1" fill="currentColor" />
        <circle cx="2.5" cy="11.5" r="1" fill="currentColor" />
      </>
    )}
    <path d="M6 4h9M6 11.5h9" />
  </Svg>
);

const IconoSangria: React.FC<{ aumentar: boolean }> = ({ aumentar }) => (
  <Svg>
    <path d="M1 2.5h14M7 6.5h8M7 9.5h8M1 13.5h14" />
    <path d={aumentar ? 'M1.5 5.5l2.5 2.5-2.5 2.5' : 'M4.5 5.5L2 8l2.5 2.5'} />
  </Svg>
);

const IconoAlinear: React.FC<{ modo: 'izquierda' | 'centro' | 'justificado' }> = ({ modo }) => (
  <Svg>
    <path
      d={
        modo === 'izquierda'
          ? 'M1 3h14M1 6.5h9M1 10h14M1 13.5h9'
          : modo === 'centro'
            ? 'M1 3h14M3.5 6.5h9M1 10h14M3.5 13.5h9'
            : 'M1 3h14M1 6.5h14M1 10h14M1 13.5h14'
      }
    />
  </Svg>
);

const IconoImagen: React.FC = () => (
  <Svg>
    <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
    <circle cx="5.5" cy="6" r="1.2" />
    <path d="M2 12l4-3.5 3 2.5 2-1.5 3 2.5" />
  </Svg>
);
