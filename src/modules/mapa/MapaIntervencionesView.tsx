import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { latLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ConsultasApi, IntervencionMapaItem } from '../../api';
import { Card, Button, Alert, EmptyState, Spinner } from '../../components/common/Common';
import { formatearFechaHora } from '../../lib/fechas';
import { RefreshCwIcon, MapPinIcon } from '../../components/icons/Icons';

// Centro aproximado de San Juan de Lurigancho — solo se usa si no hay
// puntos todavía (con puntos reales, el mapa encuadra sobre ellos).
const CENTRO_SJL: [number, number] = [-11.9721, -77.0107];

const COLOR_POR_TIPO: Record<string, string> = {
  EXHORTACION: '#0284c7',
  CONSTATACION: '#64748b',
  INICIA_PAS: '#dc2626',
};

const ETIQUETA_TIPO: Record<string, string> = {
  EXHORTACION: 'Exhortación',
  CONSTATACION: 'Constatación',
  INICIA_PAS: 'Inicia PAS',
};

/**
 * Mapa de cobertura: dónde ya estuvieron los fiscalizadores, con las
 * coordenadas GPS reales capturadas en campo — para que oficina vea de
 * un vistazo qué zonas ya se cubrieron y evitar visitas repetidas.
 * Solo entran intervenciones con GPS real (latitud/longitud nacen
 * nullable a propósito, ver CLAUDE.md) — nunca se inventa un punto.
 */
export const MapaIntervencionesView: React.FC = () => {
  const [items, setItems] = useState<IntervencionMapaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const centro: [number, number] = items.length > 0 ? [items[0].latitud, items[0].longitud] : CENTRO_SJL;
  // Con 2+ puntos distintos, encuadra el mapa para mostrarlos todos a la
  // vez — con 1 solo punto, `bounds` de un solo par de coordenadas no
  // sirve para encuadrar, ahí se usa center+zoom fijo.
  const bounds = items.length > 1 ? latLngBounds(items.map((item) => [item.latitud, item.longitud])) : undefined;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Mapa de Cobertura</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)' }}>
            Ubicación GPS real de las intervenciones ya sincronizadas — {items.length} punto{items.length === 1 ? '' : 's'} en el mapa.
          </p>
        </div>
        <Button variant="outline" icon={<RefreshCwIcon size={16} />} onClick={cargar} disabled={loading}>
          Actualizar
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Card>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<MapPinIcon size={32} />}
            title="Sin ubicaciones registradas"
            description="Ninguna intervención sincronizada tiene GPS capturado todavía."
          />
        ) : (
          <>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {Object.entries(ETIQUETA_TIPO).map(([tipo, etiqueta]) => (
                <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: COLOR_POR_TIPO[tipo],
                      display: 'inline-block',
                    }}
                  />
                  {etiqueta}
                </div>
              ))}
            </div>

            <div style={{ height: '600px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <MapContainer
                center={centro}
                zoom={13}
                bounds={bounds}
                boundsOptions={{ padding: [40, 40] }}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {items.map((item) => (
                  <CircleMarker
                    key={item.id}
                    center={[item.latitud, item.longitud]}
                    radius={9}
                    pathOptions={{
                      color: COLOR_POR_TIPO[item.tipoActuacion] ?? '#334155',
                      fillColor: COLOR_POR_TIPO[item.tipoActuacion] ?? '#334155',
                      fillOpacity: 0.55,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                        <strong>{ETIQUETA_TIPO[item.tipoActuacion] ?? item.tipoActuacion}</strong>
                        <br />
                        <strong>Fecha:</strong> {formatearFechaHora(item.fechaHoraInicio)}
                        <br />
                        <strong>Fiscalizador:</strong> {item.fiscalizadorNombre}
                        <br />
                        {item.administradoNombre && (
                          <>
                            <strong>Administrado:</strong> {item.administradoNombre}
                            <br />
                          </>
                        )}
                        {item.direccionAproximada && (
                          <>
                            <strong>Dirección:</strong> {item.direccionAproximada}
                            <br />
                          </>
                        )}
                        {item.gpsPrecisionM !== null && (
                          <span style={{ color: '#64748b' }}>Precisión GPS: ±{Math.round(item.gpsPrecisionM)} m</span>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
