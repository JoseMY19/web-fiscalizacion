import React, { useState, useEffect } from 'react';
import { IntervencionesApi, BundleIntervencion, abrirDocumento, descargarDocumentoWord } from '../../api';
import { Modal, Button, Badge, Alert, Spinner } from '../../components/common/Common';
import { formatearFecha, formatearFechaHora } from '../../lib/fechas';
import {
  ShieldAlertIcon,
  CameraIcon,
  MapPinIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  FileTextIcon,
  ExpedienteIcon,
  AlertTriangleIcon,
  UsersIcon,
} from '../../components/icons/Icons';

interface ExpedienteDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervencionId: string | null;
  numeroExpediente?: string;
}

export const ExpedienteDetalleModal: React.FC<ExpedienteDetalleModalProps> = ({
  isOpen,
  onClose,
  intervencionId,
  numeroExpediente,
}) => {
  const [data, setData] = useState<BundleIntervencion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resumen' | 'actas' | 'administrado' | 'medidas' | 'evidencias'>('resumen');

  useEffect(() => {
    if (!isOpen || !intervencionId) {
      setData(null);
      setError(null);
      return;
    }

    const cargarDetalle = async () => {
      setLoading(true);
      setError(null);
      try {
        const bundle = await IntervencionesApi.getDetalle(intervencionId);
        setData(bundle);
      } catch (err: any) {
        setError(err?.message || 'Error al obtener el expediente 360° de la intervención');
      } finally {
        setLoading(false);
      }
    };

    cargarDetalle();
  }, [isOpen, intervencionId]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Expediente 360° • ${numeroExpediente ?? (intervencionId ? intervencionId.slice(0, 8) : 'Detalle')}`}
      maxWidth="920px"
    >
      {loading && (
        <div className="flex flex-col items-center justify-center p-[48px] gap-[12px]">
          <Spinner size={36} color="var(--color-primary-600)" />
          <p className="text-[13px] text-text-muted">Cargando bundle completo del expediente y evidencias...</p>
        </div>
      )}

      {error && (
        <div className="mb-[16px]">
          <Alert type="warning">
            <strong>Información de acceso:</strong> {error}. Puede deberse a que el usuario autenticado tiene rol distinto al fiscalizador que creó la intervención o el ID no es accesible directamente.
          </Alert>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="text-center p-[36px] text-text-muted">
          No se encontraron datos disponibles para este expediente.
        </div>
      )}

      {!loading && data && (
        <div>
          {/* Subheader Badge Bar */}
          <div
            className="flex items-center justify-between py-[12px] px-[16px] bg-bg-subtle rounded-md mb-[20px] border border-border"
          >
            <div className="flex items-center gap-[8px]">
              <Badge variant={data.tipoActuacion === 'INICIA_PAS' ? 'danger' : 'info'}>
                {data.tipoActuacion}
              </Badge>
              <Badge variant="neutral">Origen: {data.origen}</Badge>
              <span className="text-[12px] text-text-muted">
                GPS: {data.latitud ? `${data.latitud}, ${data.longitud}` : 'Manual'} ({data.origenUbicacion})
              </span>
            </div>
            <div className="flex items-center gap-[6px] text-[12px] font-semibold text-midnight-800">
              <ClockIcon size={14} color="#64748b" />
              <span>{formatearFechaHora(data.fechaHoraInicio)}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-b-border mb-[20px] gap-[8px]">
            <button
              onClick={() => setActiveTab('resumen')}
              className={`py-[8px] px-[14px] border-0 bg-transparent cursor-pointer text-[13px] flex items-center gap-[6px] ${activeTab === 'resumen' ? 'border-b-2 border-b-primary-600' : 'border-b-2 border-b-transparent'} ${activeTab === 'resumen' ? 'text-primary-700' : 'text-text-muted'} ${activeTab === 'resumen' ? 'font-bold' : 'font-medium'}`}
            >
              <FileTextIcon size={15} />
              Resumen y Ubicación
            </button>
            <button
              onClick={() => setActiveTab('administrado')}
              className={`py-[8px] px-[14px] border-0 bg-transparent cursor-pointer text-[13px] flex items-center gap-[6px] ${activeTab === 'administrado' ? 'border-b-2 border-b-primary-600' : 'border-b-2 border-b-transparent'} ${activeTab === 'administrado' ? 'text-primary-700' : 'text-text-muted'} ${activeTab === 'administrado' ? 'font-bold' : 'font-medium'}`}
            >
              <UserIcon size={15} />
              Administrado e Infractor
            </button>
            <button
              onClick={() => setActiveTab('actas')}
              className={`py-[8px] px-[14px] border-0 bg-transparent cursor-pointer text-[13px] flex items-center gap-[6px] ${activeTab === 'actas' ? 'border-b-2 border-b-primary-600' : 'border-b-2 border-b-transparent'} ${activeTab === 'actas' ? 'text-primary-700' : 'text-text-muted'} ${activeTab === 'actas' ? 'font-bold' : 'font-medium'}`}
            >
              <ExpedienteIcon size={15} />
              Actas Físicas y Cédula
            </button>
            <button
              onClick={() => setActiveTab('medidas')}
              className={`py-[8px] px-[14px] border-0 bg-transparent cursor-pointer text-[13px] flex items-center gap-[6px] ${activeTab === 'medidas' ? 'border-b-2 border-b-primary-600' : 'border-b-2 border-b-transparent'} ${activeTab === 'medidas' ? 'text-primary-700' : 'text-text-muted'} ${activeTab === 'medidas' ? 'font-bold' : 'font-medium'}`}
            >
              <ShieldAlertIcon size={15} />
              Medidas y Testigos ({data.actasMedidaProvisional?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('evidencias')}
              className={`py-[8px] px-[14px] border-0 bg-transparent cursor-pointer text-[13px] flex items-center gap-[6px] ${activeTab === 'evidencias' ? 'border-b-2 border-b-primary-600' : 'border-b-2 border-b-transparent'} ${activeTab === 'evidencias' ? 'text-primary-700' : 'text-text-muted'} ${activeTab === 'evidencias' ? 'font-bold' : 'font-medium'}`}
            >
              <CameraIcon size={15} />
              Evidencias y Firmas
            </button>
          </div>

          {/* TAB 1: RESUMEN Y UBICACIÓN */}
          {activeTab === 'resumen' && (
            <div className="grid grid-cols-[1fr_1fr] gap-[16px]">
              <div className="bg-[#ffffff] border border-border rounded-md p-[16px]">
                <h4 className="text-[13px] font-bold text-midnight-900 mb-[12px] flex items-center gap-[8px]">
                  <MapPinIcon size={16} /> Ubicación de la Intervención
                </h4>
                <div className="flex flex-col gap-[8px] text-[13px]">
                  <div>
                    <span className="text-text-muted">Dirección:</span>{' '}
                    <strong>{data.direccionAproximada || 'No registrada en campo'}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Coordenadas GPS:</span>{' '}
                    <code>{data.latitud && data.longitud ? `${data.latitud}, ${data.longitud}` : 'Sin señal de satélite'}</code>
                  </div>
                  <div>
                    <span className="text-text-muted">Precisión:</span>{' '}
                    <span>{data.gpsPrecisionM ? `${data.gpsPrecisionM} metros` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Método de Fijación:</span>{' '}
                    <Badge variant="neutral">{data.origenUbicacion}</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-[#ffffff] border border-border rounded-md p-[16px]">
                <h4 className="text-[13px] font-bold text-midnight-900 mb-[12px] flex items-center gap-[8px]">
                  <ClockIcon size={16} /> Datos de Trámite y Origen
                </h4>
                <div className="flex flex-col gap-[8px] text-[13px]">
                  <div>
                    <span className="text-text-muted">Fiscalizador ID:</span>{' '}
                    <code>{data.fiscalizadorId}</code>
                  </div>
                  <div>
                    <span className="text-text-muted">Dispositivo Móvil:</span>{' '}
                    <span>{data.deviceId || 'Ingreso manual oficina'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Tipo de Procedimiento:</span>{' '}
                    <strong>{data.tipoActuacion}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Referencia de Origen:</span>{' '}
                    <span>{data.referenciaOrigen || 'Fiscalización rutinaria'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADMINISTRADO */}
          {activeTab === 'administrado' && (
            <div className="bg-[#ffffff] border border-border rounded-md p-[20px]">
              <h4 className="text-[14px] font-bold text-midnight-900 mb-[16px] flex items-center gap-[8px]">
                <UserIcon size={18} /> Datos del Administrado
              </h4>
              {data.administrado ? (
                <div className="grid grid-cols-[repeat(2,1fr)] gap-[14px] text-[13px]">
                  <div>
                    <span className="text-text-muted">Identificado:</span>{' '}
                    <Badge variant={data.administrado.identificado ? 'success' : 'warning'}>
                      {data.administrado.identificado ? 'SÍ' : 'NO IDENTIFICADO'}
                    </Badge>
                  </div>
                  {!data.administrado.identificado && (
                    <div>
                      <span className="text-text-muted">Motivo no identificado:</span>{' '}
                      <strong>{data.administrado.motivoNoIdentificado}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-text-muted">Documento:</span>{' '}
                    <strong>{data.administrado.tipoDocumento || 'DNI/RUC'} {data.administrado.numeroDocumento || '---'}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Razón Social / Nombres:</span>{' '}
                    <strong>{data.administrado.nombresRazonSocial || 'No especificado'}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Domicilio Declarado:</span>{' '}
                    <span>{data.administrado.domicilio || '---'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Distrito:</span>{' '}
                    <span>{data.administrado.distrito || 'San Juan de Lurigancho'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Giro o Actividad:</span>{' '}
                    <span>{data.administrado.giroUso || '---'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Licencia Funcionamiento:</span>{' '}
                    <span>{data.administrado.numeroLicenciaFuncionamiento || 'SIN LICENCIA'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-text-muted text-[13px]">No hay datos registrados del administrado en esta intervención.</p>
              )}
            </div>
          )}

          {/* TAB 3: ACTAS Y CÉDULAS */}
          {activeTab === 'actas' && (
            <div className="flex flex-col gap-[16px]">
              {data.notificacionCargo && (
                <div className="bg-[#ffffff] border border-border rounded-md p-[16px]">
                  <div className="flex items-center justify-between mb-[12px]">
                    <h4 className="text-[13px] font-bold text-primary-700 flex items-center gap-[6px]">
                      <FileTextIcon size={15} /> Notificación de Cargo (NC)
                    </h4>
                    <div className="flex items-center gap-[8px]">
                      <Badge variant="info">N° {data.notificacionCargo.numeroCorrelativo}</Badge>
                      {(() => {
                        const foto = data.fotos?.find((f) => f.actaTipo === 'NOTIFICACION_CARGO');
                        return (
                          <Button variant="outline" size="sm" disabled={!foto} onClick={() => foto && abrirDocumento(foto.id)}>
                            Ver foto
                          </Button>
                        );
                      })()}
                      <Button variant="outline" size="sm" onClick={() => descargarDocumentoWord(data.id, 'NOTIFICACION_CARGO')}>
                        Descargar Excel
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(3,1fr)] gap-[10px] text-[12px]">
                    <div>
                      <span className="text-text-muted">Base Cálculo:</span>{' '}
                      <strong>{data.notificacionCargo.baseCalculo}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Monto Pasible:</span>{' '}
                      <strong>{data.notificacionCargo.montoPasibleMulta ? `S/ ${data.notificacionCargo.montoPasibleMulta}` : 'Por liquidar'}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Modo Notif.:</span>{' '}
                      <Badge variant="neutral">{data.notificacionCargo.modoNotificacion || 'PERSONAL'}</Badge>
                    </div>
                    <div>
                      <span className="text-text-muted">Fecha Detección:</span>{' '}
                      <span>{formatearFecha(data.notificacionCargo.fechaDeteccion)}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Receptor:</span>{' '}
                      <span>{data.notificacionCargo.receptorNombre || 'El administrado'} ({data.notificacionCargo.receptorRelacion || 'Titular'})</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Medida Accesoria:</span>{' '}
                      <span>{data.notificacionCargo.medidaComplementaria || 'Ninguna'}</span>
                    </div>
                    {data.notificacionCargo.placaRodaje && (
                      <div>
                        <span className="text-text-muted">Placa de Rodaje:</span>{' '}
                        <span>{data.notificacionCargo.placaRodaje}</span>
                      </div>
                    )}
                  </div>
                  {data.notificacionCargo.seNegoFirmar && (
                    <div className="mt-[12px] p-[10px] bg-warning-bg rounded-[6px] text-[12px] text-(color:--color-warning-text) flex items-start gap-[8px]">
                      <span className="mt-[1px]"><AlertTriangleIcon size={14} color="#d97706" /></span>
                      <span><strong>Constancia de Negativa:</strong> El infractor se negó a identificarse o firmar. Suministro: {data.notificacionCargo.domicilioNumeroSuministro || 'N/A'}. Fachada: {data.notificacionCargo.domicilioPuertas || '---'}.</span>
                    </div>
                  )}
                </div>
              )}

              {data.actaFiscalizacion && (
                <div className="bg-[#ffffff] border border-border rounded-md p-[16px]">
                  <div className="flex items-center justify-between mb-[12px]">
                    <h4 className="text-[13px] font-bold text-midnight-900 flex items-center gap-[6px]">
                      <FileTextIcon size={15} /> Acta de Fiscalización
                    </h4>
                    <div className="flex items-center gap-[8px]">
                      <Badge variant="neutral">N° {data.actaFiscalizacion.numeroCorrelativo}</Badge>
                      {(() => {
                        const foto = data.fotos?.find((f) => f.actaTipo === 'ACTA_FISCALIZACION');
                        return (
                          <Button variant="outline" size="sm" disabled={!foto} onClick={() => foto && abrirDocumento(foto.id)}>
                            Ver foto
                          </Button>
                        );
                      })()}
                      <Button variant="outline" size="sm" onClick={() => descargarDocumentoWord(data.id, 'FISCALIZACION')}>
                        Descargar Word
                      </Button>
                    </div>
                  </div>
                  <div className="text-[13px] flex flex-col gap-[8px]">
                    <div>
                      <span className="text-text-muted">Hechos Verificados:</span>
                      <p className="mt-[4px] bg-bg-subtle p-[10px] rounded-[6px] whitespace-pre-line">
                        {data.actaFiscalizacion.hechosVerificados}
                      </p>
                    </div>
                    {data.actaFiscalizacion.observacionesAdministrado && (
                      <div>
                        <span className="text-text-muted">Manifestación del Administrado:</span>
                        <p className="mt-[4px] italic">"{data.actaFiscalizacion.observacionesAdministrado}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MEDIDAS PROVISIONALES Y TESTIGOS */}
          {activeTab === 'medidas' && (
            <div className="flex flex-col gap-[16px]">
              <div className="bg-[#ffffff] border border-border rounded-md p-[16px]">
                <h4 className="text-[13px] font-bold text-midnight-900 mb-[12px] flex items-center gap-[8px]">
                  <ShieldAlertIcon size={16} /> Medidas Provisionales Ejecutadas
                </h4>
                {data.actasMedidaProvisional && data.actasMedidaProvisional.length > 0 ? (
                  <div className="flex flex-col gap-[8px]">
                    {data.actasMedidaProvisional.map((m, idx) => (
                      <div key={idx} className="p-[10px] border border-border rounded-[6px] flex justify-between items-center">
                        <div>
                          <strong>{m.tipoMedida}</strong> — Acta N° {m.numeroCorrelativo}
                          <div className="text-[12px] text-text-muted">{m.descripcion || 'Sin descripción adicional'} • {m.lugarEjecucion || 'En el predio'}</div>
                          {m.observacionesAdministrado && (
                            <div className="text-[12px] text-text-muted mt-[2px] italic">
                              "{m.observacionesAdministrado}"
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-[8px]">
                          <Badge variant="danger">Ejecutada</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => descargarDocumentoWord(data.id, 'MEDIDA_PROVISIONAL', m.numeroCorrelativo)}
                          >
                            Descargar Word
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-text-muted">No se adoptaron medidas provisionales en campo.</p>
                )}
              </div>

              <div className="bg-[#ffffff] border border-border rounded-md p-[16px]">
                <h4 className="text-[13px] font-bold text-midnight-900 mb-[12px] flex items-center gap-[6px]">
                  <UsersIcon size={15} /> Testigos Presenciales
                </h4>
                {data.testigos && data.testigos.length > 0 ? (
                  <div className="grid grid-cols-[1fr_1fr] gap-[10px]">
                    {data.testigos.map((t, idx) => (
                      <div key={idx} className="p-[10px] bg-bg-subtle rounded-[6px] text-[13px]">
                        <strong>Testigo {t.orden}:</strong> {t.nombre}
                        <div className="text-text-muted">Doc: {t.documento}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-text-muted">No se registraron testigos adicionales.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: EVIDENCIAS FOTOGRÁFICAS Y FIRMAS */}
          {activeTab === 'evidencias' && (
            <div className="flex flex-col gap-[16px]">
              <div className="bg-[#ffffff] border border-border rounded-md p-[16px]">
                <div className="flex items-center justify-between mb-[12px]">
                  <h4 className="text-[13px] font-bold text-midnight-900 flex items-center gap-[8px]">
                    <CameraIcon size={16} /> Registro Fotográfico del Predio
                  </h4>
                  <Badge variant="neutral">Almacenamiento Seguro S3/MinIO</Badge>
                </div>
                <p className="text-[12px] text-text-muted mb-[14px]">
                  Fotografías periciales georreferenciadas y estampadas con fecha y hora del operativo.
                </p>
                <div className="grid grid-cols-[repeat(3,1fr)] gap-[12px]">
                  <div className="h-[140px] bg-[#f1f5f9] border border-dashed border-[#cbd5e1] rounded-[8px] flex flex-col items-center justify-center text-[#64748b]">
                    <CameraIcon size={28} />
                    <span className="text-[11px] mt-[6px]">Fachada del local</span>
                  </div>
                  <div className="h-[140px] bg-[#f1f5f9] border border-dashed border-[#cbd5e1] rounded-[8px] flex flex-col items-center justify-center text-[#64748b]">
                    <CameraIcon size={28} />
                    <span className="text-[11px] mt-[6px]">Actividad infractora</span>
                  </div>
                  <div className="h-[140px] bg-[#f1f5f9] border border-dashed border-[#cbd5e1] rounded-[8px] flex flex-col items-center justify-center text-[#64748b]">
                    <CameraIcon size={28} />
                    <span className="text-[11px] mt-[6px]">Pegado de aviso</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#ffffff] border border-border rounded-md p-[16px]">
                <h4 className="text-[13px] font-bold text-midnight-900 mb-[12px] flex items-center gap-[8px]">
                  <CheckCircleIcon size={16} /> Firmas Digitales de Campo
                </h4>
                <div className="grid grid-cols-[1fr_1fr] gap-[16px]">
                  <div className="p-[12px] border border-border rounded-[6px] text-center">
                    <div className="text-[12px] font-semibold text-text-muted">Firma del Inspector / Fiscalizador</div>
                    <div className="h-[70px] flex items-center justify-center italic text-[#1d4ed8]">
                      [Firmado digitalmente con ID: {data.fiscalizadorId.slice(0, 10)}...]
                    </div>
                  </div>
                  <div className="p-[12px] border border-border rounded-[6px] text-center">
                    <div className="text-[12px] font-semibold text-text-muted">Firma del Administrado</div>
                    <div className="h-[70px] flex items-center justify-center italic text-[#64748b]">
                      {data.notificacionCargo?.seNegoFirmar ? '[Constancia de Negativa]' : '[Firma manuscrita en pantalla táctil]'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end mt-[24px] pt-[16px] border-t border-t-border">
        <Button variant="outline" onClick={onClose}>
          Cerrar Visor 360°
        </Button>
      </div>
    </Modal>
  );
};
