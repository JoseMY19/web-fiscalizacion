import React, { useCallback, useState } from 'react';
import { VisorDocumento } from './VisorDocumento';

interface Vista {
  titulo: string;
  cargarPdf: () => Promise<Blob>;
  cargarWord?: () => Promise<Blob>;
  descargar?: () => void;
}

/**
 * Vista previa de un documento en la columna derecha de un panel (`lateral` de Modal o PanelDetalle).
 *   const vp = useVistaPrevia();
 *   <Modal lateral={vp.lateral}> … <Button onClick={() => vp.abrir('IFI N° 12', vistaDeRuta('/ifi/…/documento'), descargar)}>Ver</Button>
 * Tras guardar datos del documento se llama `vp.refrescar()` y la vista se vuelve a armar sin vaciarse.
 */
export function useVistaPrevia() {
  const [vista, setVista] = useState<Vista | null>(null);
  const [version, setVersion] = useState(0);

  const abrir = useCallback((titulo: string, fuentes: { cargarPdf: () => Promise<Blob>; cargarWord?: () => Promise<Blob> }, descargar?: () => void) => {
    setVista({ titulo, cargarPdf: fuentes.cargarPdf, cargarWord: fuentes.cargarWord, descargar });
  }, []);
  const cerrar = useCallback(() => setVista(null), []);
  const refrescar = useCallback(() => setVersion((v) => v + 1), []);

  const lateral: React.ReactNode = vista ? (
    <VisorDocumento key={vista.titulo} version={version} titulo={vista.titulo} cargarPdf={vista.cargarPdf} cargarWord={vista.cargarWord} onDescargar={vista.descargar} onCerrar={cerrar} />
  ) : undefined;

  return { abrir, cerrar, refrescar, lateral, abierta: vista !== null, tituloAbierto: vista?.titulo ?? null };
}
