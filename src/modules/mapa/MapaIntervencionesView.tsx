import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ConsultasApi, IntervencionMapaItem } from '../../api';
import { Alert, Button, Spinner } from '../../components/common/Common';
import { formatearFechaHora } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { RefreshCwIcon, MapPinIcon } from '../../components/icons/Icons';
import { BOUNDS_SJL, boundsDeZona, dentroDeSjl, LIMITE_SJL, ZONAS_SJL, zonaDe, ZonaSjl } from './mapaGeo';
import { iconoEtiquetaZona, iconoPin, META_TIPO, TipoActuacionMapa } from './mapaIconos';

const TIPOS = Object.keys(META_TIPO) as TipoActuacionMapa[];

// El mapa no deja salir de San Juan de Lurigancho (con un pequeño margen).
const MARGEN = 0.006;
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [BOUNDS_SJL[0][0] - MARGEN, BOUNDS_SJL[0][1] - MARGEN],
  [BOUNDS_SJL[1][0] + MARGEN, BOUNDS_SJL[1][1] + MARGEN],
];
// Todo el mundo cercano con un hueco del tamaño del distrito: oscurece lo que queda fuera.
const MASCARA: [number, number][][] = [
  [
    [-13.4, -78.4],
    [-13.4, -75.6],
    [-10.6, -75.6],
    [-10.6, -78.4],
  ],
  LIMITE_SJL,
];

/** Encuadra la zona elegida (o todo el distrito si no hay ninguna). */
const Encuadre: React.FC<{ zona: ZonaSjl | null }> = ({ zona }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(zona ? boundsDeZona(zona) : BOUNDS_SJL, { padding: [24, 24], animate: true });
  }, [map, zona]);
  return null;
};

/**
 * Mapa de cobertura: dónde estuvieron los fiscalizadores, con el GPS real de
 * cada intervención, limitado a San Juan de Lurigancho y dividido en sus
 * jurisdicciones para ver qué zonas ya se cubrieron. Solo entran
 * intervenciones con GPS real (latitud y longitud nacen nullable a propósito,
 * ver CLAUDE.md): nunca se inventa un punto.
 */
export const MapaIntervencionesView: React.FC = () => {
  const [items, setItems] = useState<IntervencionMapaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibles, setVisibles] = useState<Record<TipoActuacionMapa, boolean>>({ EXHORTACION: true, CONSTATACION: true, INICIA_PAS: true });
  const [zonaActivaId, setZonaActivaId] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ConsultasApi.getMapaIntervenciones();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las intervenciones para el mapa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // Cada punto: dentro de qué jurisdicción cae (o si cae fuera del distrito).
  const ubicados = useMemo(
    () =>
      items.map((item) => ({
        item,
        zona: zonaDe(item.latitud, item.longitud),
        enDistrito: dentroDeSjl(item.latitud, item.longitud),
      })),
    [items],
  );
  const dentro = ubicados.filter((u) => u.enDistrito);
  const fuera = ubicados.length - dentro.length;
  const sinZona = dentro.filter((u) => !u.zona).length;
  const conteoPorTipo = (tipo: string) => dentro.filter((u) => u.item.tipoActuacion === tipo).length;
  const conteoPorZona = (id: string) => dentro.filter((u) => u.zona?.id === id && visibles[u.item.tipoActuacion as TipoActuacionMapa] !== false).length;
  const maxZona = Math.max(1, ...ZONAS_SJL.map((z) => conteoPorZona(z.id)));
  const zonaActiva = ZONAS_SJL.find((z) => z.id === zonaActivaId) ?? null;
  const puntosDibujados = dentro.filter((u) => visibles[u.item.tipoActuacion as TipoActuacionMapa] !== false);

  return (
    <div>
      <div className="flex items-start justify-between gap-[16px] flex-wrap mb-[18px]">
        <div>
          <h2 className="text-[22px] font-extrabold text-text-main tracking-[-0.3px] m-0">Mapa de Cobertura</h2>
          <p className="text-[13px] text-text-muted mt-[4px] m-0">
            Dónde estuvieron los fiscalizadores en San Juan de Lurigancho, con el GPS real de cada intervención sincronizada.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={loading} onClick={cargar}>
          Actualizar
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Tipos de actuación: cada tarjeta muestra u oculta sus puntos. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[12px] mb-[16px]">
        {TIPOS.map((tipo) => {
          const meta = META_TIPO[tipo];
          const activo = visibles[tipo];
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => setVisibles({ ...visibles, [tipo]: !activo })}
              aria-pressed={activo}
              className={cn(
                'text-left flex items-center gap-[12px] rounded-[12px] border bg-white py-[10px] px-[14px] cursor-pointer shadow-xs [transition:all_150ms_ease] hover:bg-bg-subtle',
                activo ? 'border-border' : 'border-border opacity-50',
              )}
            >
              <span
                className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 text-white"
                style={{ backgroundColor: meta.color }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={meta.glifo} />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-[8px]">
                  <span className="text-[13px] font-bold text-text-main">{meta.etiqueta}</span>
                  <span className="text-[22px] font-extrabold text-text-main tabular-nums leading-none">{loading ? '–' : conteoPorTipo(tipo)}</span>
                </span>
                <span className="block text-[11.5px] text-text-muted leading-[1.3] mt-[2px]">{meta.descripcion}</span>
              </span>
            </button>
          );
        })}
      </div>

      {(fuera > 0 || sinZona > 0) && !loading && (
        <Alert type="warning">
          {fuera > 0 && (
            <span className="block">
              <strong>{fuera}</strong> intervención{fuera === 1 ? '' : 'es'} con GPS <strong>fuera de San Juan de Lurigancho</strong>: no se muestra
              {fuera === 1 ? '' : 'n'} en el mapa. Conviene revisar si el GPS estaba mal o si fue una intervención en otro distrito.
            </span>
          )}
          {sinZona > 0 && (
            <span className="block">
              <strong>{sinZona}</strong> dentro del distrito pero entre jurisdicciones (sin zona asignada).
            </span>
          )}
        </Alert>
      )}

      <div className="grid grid-cols-[1fr_300px] gap-[16px] max-lg:grid-cols-1">
        <div className="relative h-[660px] rounded-[12px] overflow-hidden border border-border bg-white shadow-xs">
          {loading && (
            <div className="absolute inset-0 z-[500] bg-white/70 flex items-center justify-center">
              <Spinner size={30} />
            </div>
          )}
          <MapContainer
            bounds={BOUNDS_SJL}
            boundsOptions={{ padding: [24, 24] }}
            maxBounds={MAX_BOUNDS}
            maxBoundsViscosity={1}
            minZoom={12}
            maxZoom={18}
            zoomSnap={0.5}
            className="h-full! w-full!"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Encuadre zona={zonaActiva} />

            {/* Lo que queda fuera del distrito se oscurece; el contorno marca el límite. */}
            <Polygon positions={MASCARA} pathOptions={{ stroke: false, fillColor: '#0f172a', fillOpacity: 0.3 }} interactive={false} />
            <Polygon positions={LIMITE_SJL} pathOptions={{ color: '#122b52', weight: 3, fill: false }} interactive={false} />

            {ZONAS_SJL.map((z) => {
              const activa = z.id === zonaActivaId;
              return (
                <React.Fragment key={z.id}>
                  <Polygon
                    positions={z.poligono}
                    pathOptions={{ color: z.color, weight: activa ? 3 : 1.5, fillColor: z.color, fillOpacity: activa ? 0.22 : 0.09, className: 'outline-none focus:outline-none' }}
                    eventHandlers={{ click: () => setZonaActivaId(activa ? null : z.id) }}
                  >
                    <Tooltip sticky>
                      {z.nombre} · {conteoPorZona(z.id)} intervención{conteoPorZona(z.id) === 1 ? '' : 'es'}
                    </Tooltip>
                  </Polygon>
                  <Marker position={z.centro} icon={iconoEtiquetaZona(z.nombre, z.color, activa)} interactive={false} keyboard={false} zIndexOffset={-500} />
                </React.Fragment>
              );
            })}

            {puntosDibujados.map(({ item, zona }) => {
              const meta = META_TIPO[item.tipoActuacion as TipoActuacionMapa];
              return (
                <Marker key={item.id} position={[item.latitud, item.longitud]} icon={iconoPin(item.tipoActuacion)}>
                  <Popup minWidth={230}>
                    <div className="text-[13px] leading-[1.5] text-text-main">
                      <div className="flex items-center gap-[6px] mb-[6px]">
                        <span className="inline-block w-[10px] h-[10px] rounded-full" style={{ backgroundColor: meta?.color ?? '#334155' }} />
                        <strong>{meta?.etiqueta ?? item.tipoActuacion}</strong>
                        {zona && <span className="ml-auto text-[11px] font-semibold text-text-muted">{zona.nombre}</span>}
                      </div>
                      <div>
                        <span className="text-text-muted">Fecha:</span> {formatearFechaHora(item.fechaHoraInicio)}
                      </div>
                      <div>
                        <span className="text-text-muted">Fiscalizador:</span> {item.fiscalizadorNombre}
                      </div>
                      {item.administradoNombre && (
                        <div>
                          <span className="text-text-muted">Administrado:</span> {item.administradoNombre}
                        </div>
                      )}
                      {item.direccionAproximada && (
                        <div>
                          <span className="text-text-muted">Dirección:</span> {item.direccionAproximada}
                        </div>
                      )}
                      {item.gpsPrecisionM !== null && <div className="text-[11.5px] text-text-muted mt-[4px]">Precisión GPS: ±{Math.round(item.gpsPrecisionM)} m</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Cobertura por jurisdicción */}
        <aside className="bg-white rounded-[12px] border border-border shadow-xs p-[14px] self-start">
          <div className="flex items-center justify-between mb-[10px]">
            <h3 className="text-[14px] font-bold text-text-main m-0">Cobertura por zona</h3>
            {zonaActivaId && (
              <button
                type="button"
                onClick={() => setZonaActivaId(null)}
                className="bg-transparent border-0 p-0 text-[12px] font-semibold text-primary-600 cursor-pointer hover:underline"
              >
                Ver todo
              </button>
            )}
          </div>
          <ul className="list-none m-0 p-0 flex flex-col gap-[4px]">
            {[...ZONAS_SJL]
              .sort((a, b) => conteoPorZona(b.id) - conteoPorZona(a.id) || a.nombre.localeCompare(b.nombre))
              .map((z) => {
                const n = conteoPorZona(z.id);
                const activa = z.id === zonaActivaId;
                return (
                  <li key={z.id}>
                    <button
                      type="button"
                      onClick={() => setZonaActivaId(activa ? null : z.id)}
                      className={cn(
                        'w-full text-left rounded-[8px] border py-[8px] px-[10px] cursor-pointer [transition:background-color_120ms]',
                        activa ? 'bg-primary-50 border-primary-500' : 'bg-white border-transparent hover:bg-bg-subtle',
                      )}
                    >
                      <span className="flex items-center gap-[8px]">
                        <span className="w-[10px] h-[10px] rounded-[3px] shrink-0" style={{ backgroundColor: z.color }} />
                        <span className="text-[13px] font-semibold text-text-main flex-1 min-w-0 truncate">{z.nombre}</span>
                        <span className={cn('text-[13px] font-bold tabular-nums', n === 0 ? 'text-text-light' : 'text-text-main')}>{n}</span>
                      </span>
                      <span className="block mt-[6px] h-[4px] rounded-full bg-bg-hover overflow-hidden">
                        <span className="block h-full rounded-full" style={{ width: `${(n / maxZona) * 100}%`, backgroundColor: z.color }} />
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
          <p className="text-[11.5px] text-text-muted mt-[12px] mb-0 leading-[1.4]">
            {ubicados.length === 0 && !loading ? (
              <span className="inline-flex items-center gap-[6px]">
                <MapPinIcon size={14} /> Aún no hay intervenciones con GPS.
              </span>
            ) : (
              'Las zonas sin intervenciones (en 0) son las que todavía no se han cubierto. Toca una zona para acercarte a ella.'
            )}
          </p>
        </aside>
      </div>
    </div>
  );
};
