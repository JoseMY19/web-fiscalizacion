/**
 * Texto enriquecido del análisis (IFI y resolución): HTML acotado que el
 * backend convierte a Word (src/common/texto-enriquecido en el backend).
 *
 * Compatibilidad: un análisis sin formato se guarda como TEXTO PLANO, igual
 * que antes; solo si hay negrita, listas, alineación o imágenes se guarda HTML.
 */

const ETIQUETAS_HTML = /<\/?(p|div|br|ul|ol|li|b|strong|i|em|u|img|h[1-6]|blockquote|span)\b[^>]*>/i;

export function esHtml(texto: string | null | undefined): boolean {
  return !!texto && ETIQUETAS_HTML.test(texto);
}

export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function textoPlanoAHtml(texto: string): string {
  if (!texto) return '';
  return texto
    .split(/\r?\n/)
    .map((l) => `<p>${l.trim() ? escaparHtml(l) : '<br>'}</p>`)
    .join('');
}

/** Lo que haya guardado (plano o HTML) → HTML para el editor o la vista. */
export function aHtml(texto: string | null | undefined): string {
  if (!texto) return '';
  return esHtml(texto) ? sanitizarHtml(texto) : textoPlanoAHtml(texto);
}

// ─── Saneado: solo el subconjunto que entiende el conversor a Word ───

const DESCARTAR_CON_CONTENIDO = new Set(['script', 'style', 'meta', 'title', 'head', 'xml', 'link', 'iframe', 'object', 'svg']);
const ALINEACIONES = new Set(['left', 'center', 'right', 'justify']);

function alineacion(el: HTMLElement): string {
  const a = (el.style?.textAlign || el.getAttribute('align') || '').toLowerCase();
  return ALINEACIONES.has(a) && a !== 'left' ? ` style="text-align:${a}"` : '';
}

function sanearNodo(n: Node): string {
  if (n.nodeType === Node.TEXT_NODE) return escaparHtml(n.textContent ?? '');
  if (n.nodeType !== Node.ELEMENT_NODE) return '';
  const el = n as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (DESCARTAR_CON_CONTENIDO.has(tag) || tag.includes(':')) {
    // <o:p> de Word: vacío; el resto (estilos, scripts) se descarta con su contenido.
    return '';
  }
  const hijos = () => Array.from(el.childNodes).map(sanearNodo).join('');

  switch (tag) {
    case 'br':
      return '<br>';
    case 'img': {
      const src = el.getAttribute('src') ?? '';
      if (!/^data:image\/(png|jpe?g|gif);base64,/i.test(src)) return '';
      const ancho = parseInt(el.getAttribute('width') ?? '', 10);
      return `<img src="${src}"${ancho > 0 ? ` width="${ancho}"` : ''}>`;
    }
    case 'b':
    case 'strong':
      return `<strong>${hijos()}</strong>`;
    case 'i':
    case 'em':
      return `<em>${hijos()}</em>`;
    case 'u':
      return `<u>${hijos()}</u>`;
    case 'ul':
    case 'ol':
      return `<${tag}>${hijos()}</${tag}>`;
    case 'li':
      return `<li${alineacion(el)}>${hijos()}</li>`;
    case 'blockquote':
      return `<blockquote>${hijos()}</blockquote>`;
    case 'p':
    case 'div':
      return `<p${alineacion(el)}>${hijos() || '<br>'}</p>`;
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return `<p${alineacion(el)}><strong>${hijos()}</strong></p>`;
    default: {
      // span y demás en línea: se conserva el formato que traiga en estilo (pegado de Word).
      let s = hijos();
      const st = el.style;
      if (st) {
        if (st.fontWeight === 'bold' || parseInt(st.fontWeight, 10) >= 600) s = `<strong>${s}</strong>`;
        if (st.fontStyle === 'italic') s = `<em>${s}</em>`;
        if ((st.textDecoration || st.textDecorationLine || '').includes('underline')) s = `<u>${s}</u>`;
      }
      return s;
    }
  }
}

export function sanitizarHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.body.childNodes).map(sanearNodo).join('');
}

/**
 * HTML del editor → valor a guardar: '' si está vacío, texto plano si no
 * hay formato (compatibilidad), HTML saneado si lo hay.
 */
export function normalizarSalida(html: string): string {
  const limpio = sanitizarHtml(html);
  const doc = new DOMParser().parseFromString(limpio, 'text/html');
  const tieneImagen = !!doc.body.querySelector('img');
  if (!tieneImagen && !(doc.body.textContent ?? '').trim()) return '';
  const conFormato = tieneImagen || !!doc.body.querySelector('strong,em,u,ul,ol,li,blockquote,[style]');
  if (conFormato) return limpio;
  // Solo párrafos y saltos: vuelve a texto plano, una línea por párrafo.
  const lineas: string[] = [];
  doc.body.childNodes.forEach((n) => {
    if (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === 'P') {
      const p = n as HTMLElement;
      p.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
      lineas.push((p.textContent ?? '').replace(/\n$/, ''));
    } else if (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === 'BR') {
      lineas.push('');
    } else {
      lineas.push(n.textContent ?? '');
    }
  });
  return lineas.join('\n').replace(/ /g, ' ').replace(/\s+$/, '');
}

/** Reduce una imagen (archivo o pegada) a un data URI de tamaño razonable para el Word. */
export async function imagenADataUri(archivo: Blob, anchoMaximo = 1200): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error('No se pudo leer la imagen.'));
      i.src = url;
    });
    const escala = Math.min(1, anchoMaximo / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen.');
    // PNG (capturas de pantalla, texto nítido) se mantiene; fotos van a JPEG.
    const esPng = archivo.type === 'image/png';
    if (!esPng) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return esPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
