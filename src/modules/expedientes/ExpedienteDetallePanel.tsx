import React, { useEffect, useState } from 'react';
import { IntervencionesApi, BundleIntervencion, TipoActaDocumento, abrirDocumento, descargarDocumentoWord } from '../../api';
import { verActaPdf, verActaWord } from '../../api/vistaPreviaDocumentos';
import { Alert, Button, Spinner } from '../../components/common/Common';
import { Dato, Datos, EstadoPunto, PanelDetalle, SeccionPlegable } from '../../components/common/PageKit';
import { VisorDocumento } from '../../components/common/VisorDocumento';
import { formatearFecha, formatearFechaHora } from '../../lib/fechas';
import { BotonCorregirDato, HistorialCorreccionesExpediente } from '../correcciones/CorreccionMaterial';
import { ChecklistValidacion } from './ChecklistValidacion';

interface Props {
  abierto: boolean;
  onClose: () => void;
  intervencionId: string | null;
  numeroExpediente?: string;
  /** Si se conoce, se muestra el checklist de completitud y el historial de correcciones (error material). */
  expedienteId?: string;
  /** Decisión de validación (aprobar / observar), fija abajo mientras se revisa. */
  pie?: React.ReactNode;
}

const TIPO_ACTUACION: Record<string, string> = { EXHORTACION: 'Exhortación', CONSTATACION: 'Constatación', INICIA_PAS: 'Inicia PAS' };
const ORIGEN: Record<string, string> = {
  DENUNCIA: 'Denuncia',
  INOPINADA: 'Inspección inopinada',
  ORDEN_SUPERIOR: 'Orden superior',
  DOC_EXTERNO: 'Documento externo',
  OTROS: 'Otros',
};
const UBICACION: Record<string, string> = { GPS_AUTOMATICO: 'GPS automático', DIRECCION_MANUAL: 'Dirección manual', SIN_UBICACION: 'Sin ubicación' };
const FOTO_ACTA: Record<string, string> = {
  ACTA_FISCALIZACION: 'Acta de fiscalización',
  ACTA_EXHORTACION: 'Acta de exhortación',
  NOTIFICACION_CARGO: 'Notificación de cargo',
  ACTA_MEDIDA_PROVISIONAL: 'Acta de medida provisional',
};

/** Encabezado pequeño de un bloque dentro de una sección. */
const Subtitulo: React.FC<{ children: React.ReactNode; acciones?: React.ReactNode }> = ({ children, acciones }) => (
  <div className="flex items-center justify-between gap-[12px] mb-[12px]">
    <h4 className="text-[13px] font-bold text-text-secondary m-0">{children}</h4>
    {acciones && <div className="flex items-center gap-[8px]">{acciones}</div>}
  </div>
);

/**
 * Detalle completo del expediente (intervención de campo), en un panel lateral
 * para poder revisarlo sin perder la bandeja. Arriba, lo que decide la
 * validación (el checklist de completitud); el resto en secciones plegables.
 */
export const ExpedienteDetallePanel: React.FC<Props> = ({ abierto, onClose, intervencionId, numeroExpediente, expedienteId, pie }) => {
  const [data, setData] = useState<BundleIntervencion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Vista previa de un Word en la columna de la derecha (null = cerrada).
  // Sube cada vez que se corrigen datos: la vista previa se vuelve a armar con lo nuevo.
  const [versionVista, setVersionVista] = useState(0);
  const [vista, setVista] = useState<{ titulo: string; cargarPdf: () => Promise<Blob>; cargarWord?: () => Promise<Blob>; descargar: () => void } | null>(null);

  useEffect(() => {
    setVista(null);
    if (!abierto || !intervencionId) {
      setData(null);
      setError(null);
      return;
    }
    let vigente = true;
    setLoading(true);
    setError(null);
    IntervencionesApi.getDetalle(intervencionId)
      .then((bundle) => vigente && setData(bundle))
      .catch((err: any) => vigente && setError(err?.message || 'No se pudo cargar el expediente.'))
      .finally(() => vigente && setLoading(false));
    return () => {
      vigente = false;
    };
  }, [abierto, intervencionId]);

  /** Tras corregir datos: se vuelve a leer el expediente y se actualiza la vista previa abierta. */
  const alCorregir = async () => {
    if (intervencionId) {
      try {
        setData(await IntervencionesApi.getDetalle(intervencionId));
      } catch {
        // si falla, se queda lo que se veía
      }
    }
    setVersionVista((v) => v + 1);
  };

  /** Vista previa en la columna de la derecha: PDF del servidor y, solo para Word, el respaldo aproximado. */
  const verDocumento = (titulo: string, tipo: TipoActaDocumento, medida?: string) => {
    if (!data) return;
    setVista({
      titulo,
      cargarPdf: () => verActaPdf(data.id, tipo, medida),
      cargarWord: tipo === 'NOTIFICACION_CARGO' ? undefined : () => verActaWord(data.id, tipo, medida),
      descargar: () => descargarDocumentoWord(data.id, tipo, medida),
    });
  };

  const fotoDe = (tipo: string) => data?.fotos?.find((f) => f.actaTipo === tipo);
  const nc = data?.notificacionCargo;
  const acta = data?.actaFiscalizacion;
  const medidas = data?.actasMedidaProvisional ?? [];
  const testigos = data?.testigos ?? [];
  const fotos = data?.fotos ?? [];

  return (
    <PanelDetalle
      abierto={abierto}
      onClose={onClose}
      titulo={`Expediente ${numeroExpediente ?? (intervencionId ? intervencionId.slice(0, 8) : '')}`}
      subtitulo={data ? `${TIPO_ACTUACION[data.tipoActuacion] ?? data.tipoActuacion} · ${formatearFechaHora(data.fechaHoraInicio)}` : undefined}
      pie={pie}
      lateral={
        vista ? (
          <VisorDocumento key={vista.titulo} version={versionVista} titulo={vista.titulo} cargarPdf={vista.cargarPdf} cargarWord={vista.cargarWord} onDescargar={vista.descargar} onCerrar={() => setVista(null)} />
        ) : undefined
      }
    >
      {loading && (
        <div className="flex flex-col items-center justify-center py-[56px] gap-[12px]">
          <Spinner size={32} />
          <p className="text-[13px] text-text-muted m-0">Cargando el expediente…</p>
        </div>
      )}

      {error && (
        <Alert type="warning">
          <strong>No se pudo abrir el detalle:</strong> {error}
        </Alert>
      )}

      {!loading && !data && !error && <p className="text-center py-[36px] text-[13px] text-text-muted">No hay datos disponibles para este expediente.</p>}

      {!loading && data && (
        <div>
          {/* Validación = revisar que esté completo (reunión). */}
          {expedienteId && <ChecklistValidacion key={versionVista} expedienteId={expedienteId} />}

          <SeccionPlegable titulo="Intervención" inicialAbierta resumen={ORIGEN[data.origen] ?? data.origen}>
            <Datos>
              <Dato etiqueta="Fecha y hora">{formatearFechaHora(data.fechaHoraInicio)}</Dato>
              <Dato etiqueta="Tipo de actuación">{TIPO_ACTUACION[data.tipoActuacion] ?? data.tipoActuacion}</Dato>
              <Dato etiqueta="Origen">{ORIGEN[data.origen] ?? data.origen}</Dato>
              <Dato etiqueta="Referencia del origen">{data.referenciaOrigen || 'Fiscalización rutinaria'}</Dato>
              <Dato etiqueta="Dirección" ancho>
                {data.direccionAproximada || 'No registrada en campo'}
              </Dato>
              <Dato etiqueta="Ubicación">
                {UBICACION[data.origenUbicacion] ?? data.origenUbicacion}
                {data.gpsPrecisionM ? ` · ±${Math.round(data.gpsPrecisionM)} m` : ''}
              </Dato>
              <Dato etiqueta="Coordenadas">{data.latitud && data.longitud ? `${data.latitud}, ${data.longitud}` : 'Sin señal GPS'}</Dato>
              <Dato etiqueta="Registrado por">
                {data.fiscalizador ? `${data.fiscalizador.nombres} · DNI ${data.fiscalizador.dni}` : 'No disponible'}
              </Dato>
              <Dato etiqueta="Medio">
                {data.deviceId ? 'App de campo' : 'Ingreso en oficina'}
                {data.deviceId && (
                  <span className="ml-[8px] text-[11px] font-normal text-text-muted" title="Código interno del celular">
                    Cód. celular {data.deviceId.slice(0, 8)}
                  </span>
                )}
              </Dato>
            </Datos>
          </SeccionPlegable>

          <SeccionPlegable titulo="Administrado" inicialAbierta resumen={data.administrado?.nombresRazonSocial ?? 'No identificado'}>
            {data.administrado ? (
              <Datos>
                <Dato etiqueta="Identificación">
                  <EstadoPunto tono={data.administrado.identificado ? 'ok' : 'aviso'}>{data.administrado.identificado ? 'Identificado' : 'No identificado'}</EstadoPunto>
                </Dato>
                <Dato etiqueta="Documento">
                  {data.administrado.tipoDocumento || 'DNI/RUC'} {data.administrado.numeroDocumento || '—'}
                </Dato>
                {!data.administrado.identificado && (
                  <Dato etiqueta="Motivo" ancho>
                    {data.administrado.motivoNoIdentificado}
                    {data.administrado.motivoNoIdentificadoDetalle && <span className="block text-text-secondary">{data.administrado.motivoNoIdentificadoDetalle}</span>}
                  </Dato>
                )}
                <Dato etiqueta="Nombres o razón social" ancho>
                  {data.administrado.nombresRazonSocial || 'No especificado'}
                </Dato>
                <Dato etiqueta="Domicilio declarado" ancho>
                  {data.administrado.domicilio}
                </Dato>
                <Dato etiqueta="Distrito">{data.administrado.distrito || 'San Juan de Lurigancho'}</Dato>
                <Dato etiqueta="Giro o actividad">{data.administrado.giroUso}</Dato>
                <Dato etiqueta="Licencia de funcionamiento">{data.administrado.numeroLicenciaFuncionamiento || 'Sin licencia'}</Dato>
              </Datos>
            ) : (
              <p className="text-[13px] text-text-muted m-0">No hay datos del administrado en esta intervención.</p>
            )}
            {expedienteId && (
              <div className="mt-[22px]">
                <Subtitulo>Correcciones de error material</Subtitulo>
                <HistorialCorreccionesExpediente expedienteId={expedienteId} />
              </div>
            )}
          </SeccionPlegable>

          <SeccionPlegable
            titulo="Actas y notificación de cargo"
            resumen={[nc && `NC N° ${nc.numeroCorrelativo}`, acta && `Acta N° ${acta.numeroCorrelativo}`].filter(Boolean).join(' · ') || undefined}
          >
            {expedienteId && (
              <div className="flex items-center justify-between gap-[12px] flex-wrap mb-[18px] py-[10px] px-[14px] rounded-md bg-bg-subtle border border-border-subtle">
                <span className="text-[12.5px] text-text-secondary">
                  ¿Un dato del administrado o de la infracción está mal? Corrígelo y la vista previa del documento se actualiza. Queda registrado quién lo cambió y por qué.
                </span>
                <BotonCorregirDato expedienteId={expedienteId} variante="secondary" onCorregido={alCorregir} />
              </div>
            )}
            <div className="flex flex-col gap-[28px]">
              {nc && (
                <div>
                  <Subtitulo
                    acciones={
                      <>
                        <Button variant="secondary" size="sm" disabled={!fotoDe('NOTIFICACION_CARGO')} onClick={() => fotoDe('NOTIFICACION_CARGO') && abrirDocumento(fotoDe('NOTIFICACION_CARGO')!.id)}>
                          Ver foto
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => verDocumento(`Notificación de Cargo · N° ${nc.numeroCorrelativo}`, 'NOTIFICACION_CARGO')}>
                          Ver Excel
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => descargarDocumentoWord(data.id, 'NOTIFICACION_CARGO')}>
                          Descargar Excel
                        </Button>
                      </>
                    }
                  >
                    Notificación de Cargo · N° {nc.numeroCorrelativo}
                  </Subtitulo>
                  <Datos columnas={3}>
                    <Dato etiqueta="Base de cálculo">{nc.baseCalculo}</Dato>
                    <Dato etiqueta="Monto pasible">{nc.montoPasibleMulta ? `S/ ${nc.montoPasibleMulta}` : 'Por liquidar'}</Dato>
                    <Dato etiqueta="Modo de notificación">{nc.modoNotificacion || 'Personal'}</Dato>
                    <Dato etiqueta="Fecha de detección">{formatearFecha(nc.fechaDeteccion)}</Dato>
                    <Dato etiqueta="Receptor">
                      {nc.receptorNombre || 'El administrado'} ({nc.receptorRelacion || 'Titular'})
                    </Dato>
                    <Dato etiqueta="Medida complementaria">{nc.medidaComplementaria || 'Ninguna'}</Dato>
                    {nc.placaRodaje && <Dato etiqueta="Placa de rodaje">{nc.placaRodaje}</Dato>}
                  </Datos>
                  {nc.seNegoFirmar && (
                    <Alert type="warning" className="mt-[14px] mb-0!">
                      <strong>Constancia de negativa:</strong> se negó a identificarse o firmar. Suministro: {nc.domicilioNumeroSuministro || 'N/A'}. Fachada: {nc.domicilioPuertas || '—'}.
                    </Alert>
                  )}
                </div>
              )}

              {acta && (
                <div>
                  <Subtitulo
                    acciones={
                      <>
                        <Button variant="secondary" size="sm" disabled={!fotoDe('ACTA_FISCALIZACION')} onClick={() => fotoDe('ACTA_FISCALIZACION') && abrirDocumento(fotoDe('ACTA_FISCALIZACION')!.id)}>
                          Ver foto
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => verDocumento(`Acta de Fiscalización · N° ${acta.numeroCorrelativo}`, 'FISCALIZACION')}>
                          Ver Word
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => descargarDocumentoWord(data.id, 'FISCALIZACION')}>
                          Descargar Word
                        </Button>
                      </>
                    }
                  >
                    Acta de Fiscalización · N° {acta.numeroCorrelativo}
                  </Subtitulo>
                  <Datos>
                    <Dato etiqueta="Hechos verificados" ancho>
                      <span className="whitespace-pre-line">{acta.hechosVerificados}</span>
                    </Dato>
                    {acta.observacionesAdministrado && (
                      <Dato etiqueta="Manifestación del administrado" ancho>
                        <span className="italic">“{acta.observacionesAdministrado}”</span>
                      </Dato>
                    )}
                  </Datos>
                </div>
              )}

              {!nc && !acta && <p className="text-[13px] text-text-muted m-0">Esta intervención no tiene acta de fiscalización ni notificación de cargo.</p>}
            </div>
          </SeccionPlegable>

          <SeccionPlegable
            titulo="Medidas y testigos"
            resumen={`${medidas.length} medida${medidas.length === 1 ? '' : 's'} · ${testigos.length} testigo${testigos.length === 1 ? '' : 's'}`}
          >
            <div className="flex flex-col gap-[24px]">
              <div>
                <Subtitulo>Medidas provisionales</Subtitulo>
                {medidas.length > 0 ? (
                  <ul className="list-none m-0 p-0 flex flex-col gap-[14px]">
                    {medidas.map((m, i) => (
                      <li key={i} className="flex items-start justify-between gap-[12px]">
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold text-text-main">
                            {m.tipoMedida} · Acta N° {m.numeroCorrelativo}
                          </div>
                          <div className="text-[12.5px] text-text-muted mt-[2px]">
                            {m.descripcion || 'Sin descripción'} · {m.lugarEjecucion || 'En el predio'}
                          </div>
                          {m.observacionesAdministrado && <div className="text-[12.5px] text-text-secondary italic mt-[2px]">“{m.observacionesAdministrado}”</div>}
                        </div>
                        <div className="flex gap-[8px] shrink-0">
                          <Button variant="secondary" size="sm" onClick={() => verDocumento(`Acta de Medida Provisional · N° ${m.numeroCorrelativo}`, 'MEDIDA_PROVISIONAL', m.numeroCorrelativo)}>
                            Ver Word
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => descargarDocumentoWord(data.id, 'MEDIDA_PROVISIONAL', m.numeroCorrelativo)}>
                            Descargar Word
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-text-muted m-0">No se adoptaron medidas provisionales en campo.</p>
                )}
              </div>
              <div>
                <Subtitulo>Testigos</Subtitulo>
                {testigos.length > 0 ? (
                  <Datos>
                    {testigos.map((t) => (
                      <Dato key={t.orden} etiqueta={`Testigo ${t.orden}`}>
                        {t.nombre}
                        <span className="block text-[12.5px] text-text-muted">Doc. {t.documento}</span>
                      </Dato>
                    ))}
                  </Datos>
                ) : (
                  <p className="text-[13px] text-text-muted m-0">No se registraron testigos.</p>
                )}
              </div>
            </div>
          </SeccionPlegable>

          <SeccionPlegable titulo="Fotos adjuntas" resumen={`${fotos.length} ${fotos.length === 1 ? 'archivo' : 'archivos'}`}>
            {fotos.length > 0 ? (
              <ul className="list-none m-0 p-0 flex flex-col">
                {fotos.map((f, i) => (
                  <li key={f.id} className="flex items-center justify-between gap-[12px] py-[10px] border-b border-border-subtle last:border-b-0">
                    <span className="text-[13px] text-text-main">{(f.actaTipo && FOTO_ACTA[f.actaTipo]) || f.actaTipo || `Foto adicional ${i + 1}`}</span>
                    <Button variant="secondary" size="sm" onClick={() => abrirDocumento(f.id)}>
                      Ver
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-text-muted m-0">No hay fotos adjuntas a este expediente.</p>
            )}
          </SeccionPlegable>
        </div>
      )}
    </PanelDetalle>
  );
};
