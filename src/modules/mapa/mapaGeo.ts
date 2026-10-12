import datos from './sjlJurisdiccion.json';

/** Par [latitud, longitud], el orden que usa Leaflet. */
export type LatLng = [number, number];

export interface ZonaSjl {
  id: string;
  nombre: string;
  color: string;
  centro: LatLng;
  poligono: LatLng[];
}

/**
 * Jurisdicciones de San Juan de Lurigancho (del archivo juridiccion.geojson,
 * simplificado a ≈ 3 m) y el contorno del distrito, que es la unión de todas.
 * El mapa de cobertura se limita a este contorno.
 */
export const ZONAS_SJL = datos.zonas as unknown as ZonaSjl[];
export const LIMITE_SJL = datos.limite as unknown as LatLng[];
export const BOUNDS_SJL = datos.bounds as unknown as [LatLng, LatLng];

/** Punto dentro de un polígono (trazado de rayos). */
export function puntoEnPoligono(lat: number, lng: number, poligono: LatLng[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [latI, lngI] = poligono[i];
    const [latJ, lngJ] = poligono[j];
    const cruza = lngI > lng !== lngJ > lng && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

export function dentroDeSjl(lat: number, lng: number): boolean {
  return puntoEnPoligono(lat, lng, LIMITE_SJL);
}

export function zonaDe(lat: number, lng: number): ZonaSjl | null {
  return ZONAS_SJL.find((z) => puntoEnPoligono(lat, lng, z.poligono)) ?? null;
}

export function boundsDeZona(z: ZonaSjl): [LatLng, LatLng] {
  const lats = z.poligono.map((p) => p[0]);
  const lngs = z.poligono.map((p) => p[1]);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}
