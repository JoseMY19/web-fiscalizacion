import React, { useState, useEffect } from 'react';
import { IntervencionesApi, BundleIntervencion, abrirDocumento, descargarDocumentoWord } from '../../api';
import { Modal, Button, Badge, Alert, Spinner } from '../../components/common/Common';
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '12px' }}>
          <Spinner size={36} color="var(--color-primary-600)" />
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Cargando bundle completo del expediente y evidencias...</p>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="warning">
            <strong>Información de acceso:</strong> {error}. Puede deberse a que el usuario autenticado tiene rol distinto al fiscalizador que creó la intervención o el ID no es accesible directamente.
          </Alert>
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
          No se encontraron datos disponibles para este expediente.
        </div>
      )}

      {!loading && data && (
        <div>
          {/* Subheader Badge Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant={data.tipoActuacion === 'INICIA_PAS' ? 'danger' : 'info'}>
                {data.tipoActuacion}
              </Badge>
              <Badge variant="neutral">Origen: {data.origen}</Badge>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                GPS: {data.latitud ? `${data.latitud}, ${data.longitud}` : 'Manual'} ({data.origenUbicacion})
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--color-midnight-800)' }}>
              <ClockIcon size={14} color="#64748b" />
              <span>{new Date(data.fechaHoraInicio).toLocaleString('es-PE')}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('resumen')}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderBottom: activeTab === 'resumen' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'resumen' ? 'var(--color-primary-700)' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'resumen' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FileTextIcon size={15} />
              Resumen y Ubicación
            </button>
            <button
              onClick={() => setActiveTab('administrado')}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderBottom: activeTab === 'administrado' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'administrado' ? 'var(--color-primary-700)' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'administrado' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <UserIcon size={15} />
              Administrado e Infractor
            </button>
            <button
              onClick={() => setActiveTab('actas')}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderBottom: activeTab === 'actas' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'actas' ? 'var(--color-primary-700)' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'actas' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ExpedienteIcon size={15} />
              Actas Físicas y Cédula
            </button>
            <button
              onClick={() => setActiveTab('medidas')}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderBottom: activeTab === 'medidas' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'medidas' ? 'var(--color-primary-700)' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'medidas' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldAlertIcon size={15} />
              Medidas y Testigos ({data.actasMedidaProvisional?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('evidencias')}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderBottom: activeTab === 'evidencias' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'evidencias' ? 'var(--color-primary-700)' : 'var(--color-text-muted)',
                fontWeight: activeTab === 'evidencias' ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CameraIcon size={15} />
              Evidencias y Firmas
            </button>
          </div>

          {/* TAB 1: RESUMEN Y UBICACIÓN */}
          {activeTab === 'resumen' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPinIcon size={16} /> Ubicación de la Intervención
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Dirección:</span>{' '}
                    <strong>{data.direccionAproximada || 'No registrada en campo'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Coordenadas GPS:</span>{' '}
                    <code>{data.latitud && data.longitud ? `${data.latitud}, ${data.longitud}` : 'Sin señal de satélite'}</code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Precisión:</span>{' '}
                    <span>{data.gpsPrecisionM ? `${data.gpsPrecisionM} metros` : 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Método de Fijación:</span>{' '}
                    <Badge variant="neutral">{data.origenUbicacion}</Badge>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockIcon size={16} /> Datos de Trámite y Origen
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Fiscalizador ID:</span>{' '}
                    <code>{data.fiscalizadorId}</code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Dispositivo Móvil:</span>{' '}
                    <span>{data.deviceId || 'Ingreso manual oficina'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Tipo de Procedimiento:</span>{' '}
                    <strong>{data.tipoActuacion}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Referencia de Origen:</span>{' '}
                    <span>{data.referenciaOrigen || 'Fiscalización rutinaria'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADMINISTRADO */}
          {activeTab === 'administrado' && (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserIcon size={18} /> Datos del Administrado
              </h4>
              {data.administrado ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Identificado:</span>{' '}
                    <Badge variant={data.administrado.identificado ? 'success' : 'warning'}>
                      {data.administrado.identificado ? 'SÍ' : 'NO IDENTIFICADO'}
                    </Badge>
                  </div>
                  {!data.administrado.identificado && (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Motivo no identificado:</span>{' '}
                      <strong>{data.administrado.motivoNoIdentificado}</strong>
                    </div>
                  )}
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Documento:</span>{' '}
                    <strong>{data.administrado.tipoDocumento || 'DNI/RUC'} {data.administrado.numeroDocumento || '---'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Razón Social / Nombres:</span>{' '}
                    <strong>{data.administrado.nombresRazonSocial || 'No especificado'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Domicilio Declarado:</span>{' '}
                    <span>{data.administrado.domicilio || '---'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Distrito:</span>{' '}
                    <span>{data.administrado.distrito || 'San Juan de Lurigancho'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Giro o Actividad:</span>{' '}
                    <span>{data.administrado.giroUso || '---'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Licencia Funcionamiento:</span>{' '}
                    <span>{data.administrado.numeroLicenciaFuncionamiento || 'SIN LICENCIA'}</span>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No hay datos registrados del administrado en esta intervención.</p>
              )}
            </div>
          )}

          {/* TAB 3: ACTAS Y CÉDULAS */}
          {activeTab === 'actas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.notificacionCargo && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileTextIcon size={15} /> Notificación de Cargo (NC)
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Base Cálculo:</span>{' '}
                      <strong>{data.notificacionCargo.baseCalculo}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Monto Pasible:</span>{' '}
                      <strong>{data.notificacionCargo.montoPasibleMulta ? `S/ ${data.notificacionCargo.montoPasibleMulta}` : 'Por liquidar'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Modo Notif.:</span>{' '}
                      <Badge variant="neutral">{data.notificacionCargo.modoNotificacion || 'PERSONAL'}</Badge>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Fecha Detección:</span>{' '}
                      <span>{new Date(data.notificacionCargo.fechaDeteccion).toLocaleDateString('es-PE')}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Receptor:</span>{' '}
                      <span>{data.notificacionCargo.receptorNombre || 'El administrado'} ({data.notificacionCargo.receptorRelacion || 'Titular'})</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Medida Accesoria:</span>{' '}
                      <span>{data.notificacionCargo.medidaComplementaria || 'Ninguna'}</span>
                    </div>
                    {data.notificacionCargo.placaRodaje && (
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Placa de Rodaje:</span>{' '}
                        <span>{data.notificacionCargo.placaRodaje}</span>
                      </div>
                    )}
                  </div>
                  {data.notificacionCargo.seNegoFirmar && (
                    <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'var(--color-warning-bg)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-warning-text)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ marginTop: '1px' }}><AlertTriangleIcon size={14} color="#d97706" /></span>
                      <span><strong>Constancia de Negativa:</strong> El infractor se negó a identificarse o firmar. Suministro: {data.notificacionCargo.domicilioNumeroSuministro || 'N/A'}. Fachada: {data.notificacionCargo.domicilioPuertas || '---'}.</span>
                    </div>
                  )}
                </div>
              )}

              {data.actaFiscalizacion && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-midnight-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileTextIcon size={15} /> Acta de Fiscalización
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Hechos Verificados:</span>
                      <p style={{ marginTop: '4px', backgroundColor: 'var(--color-bg-subtle)', padding: '10px', borderRadius: '6px', whiteSpace: 'pre-line' }}>
                        {data.actaFiscalizacion.hechosVerificados}
                      </p>
                    </div>
                    {data.actaFiscalizacion.observacionesAdministrado && (
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Manifestación del Administrado:</span>
                        <p style={{ marginTop: '4px', fontStyle: 'italic' }}>"{data.actaFiscalizacion.observacionesAdministrado}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MEDIDAS PROVISIONALES Y TESTIGOS */}
          {activeTab === 'medidas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlertIcon size={16} /> Medidas Provisionales Ejecutadas
                </h4>
                {data.actasMedidaProvisional && data.actasMedidaProvisional.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.actasMedidaProvisional.map((m, idx) => (
                      <div key={idx} style={{ padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{m.tipoMedida}</strong> — Acta N° {m.numeroCorrelativo}
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{m.descripcion || 'Sin descripción adicional'} • {m.lugarEjecucion || 'En el predio'}</div>
                          {m.observacionesAdministrado && (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                              "{m.observacionesAdministrado}"
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No se adoptaron medidas provisionales en campo.</p>
                )}
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UsersIcon size={15} /> Testigos Presenciales
                </h4>
                {data.testigos && data.testigos.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {data.testigos.map((t, idx) => (
                      <div key={idx} style={{ padding: '10px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', fontSize: '13px' }}>
                        <strong>Testigo {t.orden}:</strong> {t.nombre}
                        <div style={{ color: 'var(--color-text-muted)' }}>Doc: {t.documento}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No se registraron testigos adicionales.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: EVIDENCIAS FOTOGRÁFICAS Y FIRMAS */}
          {activeTab === 'evidencias' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-midnight-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CameraIcon size={16} /> Registro Fotográfico del Predio
                  </h4>
                  <Badge variant="neutral">Almacenamiento Seguro S3/MinIO</Badge>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                  Fotografías periciales georreferenciadas y estampadas con fecha y hora del operativo.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ height: '140px', backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    <CameraIcon size={28} />
                    <span style={{ fontSize: '11px', marginTop: '6px' }}>Fachada del local</span>
                  </div>
                  <div style={{ height: '140px', backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    <CameraIcon size={28} />
                    <span style={{ fontSize: '11px', marginTop: '6px' }}>Actividad infractora</span>
                  </div>
                  <div style={{ height: '140px', backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    <CameraIcon size={28} />
                    <span style={{ fontSize: '11px', marginTop: '6px' }}>Pegado de aviso</span>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-midnight-900)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircleIcon size={16} /> Firmas Digitales de Campo
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Firma del Inspector / Fiscalizador</div>
                    <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'italic', color: '#1d4ed8' }}>
                      [Firmado digitalmente con ID: {data.fiscalizadorId.slice(0, 10)}...]
                    </div>
                  </div>
                  <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Firma del Administrado</div>
                    <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'italic', color: '#64748b' }}>
                      {data.notificacionCargo?.seNegoFirmar ? '[Constancia de Negativa]' : '[Firma manuscrita en pantalla táctil]'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
        <Button variant="outline" onClick={onClose}>
          Cerrar Visor 360°
        </Button>
      </div>
    </Modal>
  );
};
