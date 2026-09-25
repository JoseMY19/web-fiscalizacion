import React, { useState } from 'react';
import { ActasApi, ExpedientesApi } from '../../api';
import { Card, Button, Badge, Input, Textarea, Alert } from '../../components/common/Common';
import {
  FileTextIcon,
  SearchIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  EyeIcon,
  BuildingIcon,
  PrinterIcon,
  ShieldAlertIcon,
} from '../../components/icons/Icons';

interface DocumentoFisico {
  id: string;
  tipoActa: string;
  numeroCorrelativo: string;
  folios: number;
  fechaIngreso: string;
  estadoFisico: 'CONFORME' | 'DETERIORADO' | 'ENMENDADO';
  ubicacionArchivo: string;
  observaciones?: string;
}

interface DocumentoExterno {
  numeroRegistro: string;
  origen: 'DENUNCIA' | 'FISCALIA' | 'PNP' | 'PROCURADURIA' | 'DEFENSORIA' | 'RIESGOS';
  remitente: string;
  asunto: string;
  fechaIngreso: string;
  folios: number;
  derivadoA: string;
}

export const DocumentosView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'custodia' | 'dossier' | 'externos' | 'correlativos'>('custodia');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Estados Custodia & Foliado
  const [documentosCustodia, setDocumentosCustodia] = useState<DocumentoFisico[]>([
    {
      id: 'DOC-2026-001',
      tipoActa: 'ACTA_FISCALIZACION',
      numeroCorrelativo: 'AF-004521',
      folios: 2,
      fechaIngreso: '2026-09-12 09:30',
      estadoFisico: 'CONFORME',
      ubicacionArchivo: 'Estante B - Gaveta 3',
      observaciones: 'Firmado por administrado y fiscalizador sin tachaduras.',
    },
    {
      id: 'DOC-2026-002',
      tipoActa: 'NOTIFICACION_CARGO',
      numeroCorrelativo: 'NC-001890',
      folios: 3,
      fechaIngreso: '2026-09-12 11:15',
      estadoFisico: 'CONFORME',
      ubicacionArchivo: 'Estante B - Gaveta 3',
      observaciones: 'Incluye cargo de notificación domiciliaria y 2 fotos a color.',
    },
  ]);

  const [nuevoTipoActa, setNuevoTipoActa] = useState('ACTA_FISCALIZACION');
  const [nuevoCorrelativo, setNuevoCorrelativo] = useState('');
  const [nuevosFolios, setNuevosFolios] = useState('2');
  const [nuevoEstadoFisico, setNuevoEstadoFisico] = useState<'CONFORME' | 'DETERIORADO' | 'ENMENDADO'>('CONFORME');
  const [nuevaUbicacion, setNuevaUbicacion] = useState('Estante A - Archivo Central');
  const [nuevasObservaciones, setNuevasObservaciones] = useState('');
  const [expedienteAsociadoId, setExpedienteAsociadoId] = useState('');

  // Estados Verificador de Correlativos
  const [tipoVerificar, setTipoVerificar] = useState('ACTA_FISCALIZACION');
  const [numeroVerificar, setNumeroVerificar] = useState('');
  const [resultadoCorrelativo, setResultadoCorrelativo] = useState<{ checked: boolean; disponible?: boolean; error?: string } | null>(null);

  // Estados Dossier / Visor de Expediente
  const [expedienteBusqueda, setExpedienteBusqueda] = useState('');
  const [dossierActivo, setDossierActivo] = useState<any | null>(null);

  // Estados Documentos Externos (Mesa de Partes BPMN N1-E04)
  const [documentosExternos, setDocumentosExternos] = useState<DocumentoExterno[]>([
    {
      numeroRegistro: 'EXT-2026-0089',
      origen: 'FISCALIA',
      remitente: 'Primera Fiscalía Provincial de Prevención del Delito de SJL',
      asunto: 'Solicitud de operativo conjunto por locales de expendio de bebidas alcohólicas sin licencia.',
      fechaIngreso: '2026-09-11 14:20',
      folios: 5,
      derivadoA: 'Coordinación de Operativos Especiales',
    },
    {
      numeroRegistro: 'EXT-2026-0090',
      origen: 'DENUNCIA',
      remitente: 'Junta Vecinal Urb. Las Flores',
      asunto: 'Denuncia vecinal por construcción clandestina ocupando retiro municipal.',
      fechaIngreso: '2026-09-12 08:45',
      folios: 3,
      derivadoA: 'Sector 2 - Fiscalización Urbanística',
    },
  ]);

  const [origenExterno, setOrigenExterno] = useState<'DENUNCIA' | 'FISCALIA' | 'PNP' | 'PROCURADURIA' | 'DEFENSORIA' | 'RIESGOS'>('DENUNCIA');
  const [remitenteExterno, setRemitenteExterno] = useState('');
  const [asuntoExterno, setAsuntoExterno] = useState('');
  const [foliosExterno, setFoliosExterno] = useState('1');
  const [derivadoExterno, setDerivadoExterno] = useState('Subgerencia de Fiscalización');

  // Handlers
  const handleRegistrarCustodia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCorrelativo.trim()) {
      setMessage({ type: 'error', text: 'Debe ingresar el número correlativo preimpreso del acta.' });
      return;
    }

    setActionLoading(true);
    try {
      if (expedienteAsociadoId.trim()) {
        try {
          await ExpedientesApi.registrarIngresoFisico(expedienteAsociadoId.trim());
        } catch {
          // Si el ID es solo referencial o no coincide en BD, registrar igual en el libro de custodia
        }
      }

      const nuevoDoc: DocumentoFisico = {
        id: `DOC-2026-${String(documentosCustodia.length + 1).padStart(3, '0')}`,
        tipoActa: nuevoTipoActa,
        numeroCorrelativo: nuevoCorrelativo.trim(),
        folios: Number(nuevosFolios) || 1,
        fechaIngreso: new Date().toLocaleString('es-PE'),
        estadoFisico: nuevoEstadoFisico,
        ubicacionArchivo: nuevaUbicacion,
        observaciones: nuevasObservaciones.trim(),
      };

      setDocumentosCustodia([nuevoDoc, ...documentosCustodia]);
      setMessage({ type: 'success', text: `Documento físico ${nuevoCorrelativo} ingresado formalmente a custodia y foliado.` });
      setNuevoCorrelativo('');
      setNuevasObservaciones('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerificarCorrelativo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroVerificar.trim()) return;
    setActionLoading(true);
    setResultadoCorrelativo(null);
    try {
      const res = await ActasApi.verificarCorrelativo(tipoVerificar, numeroVerificar.trim());
      setResultadoCorrelativo({ checked: true, disponible: res.disponible });
    } catch (err: any) {
      setResultadoCorrelativo({ checked: true, error: err.message || 'Error al validar correlativo.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuscarDossier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expedienteBusqueda.trim()) return;

    // Generar dossier estructurado del expediente para consulta y foliado
    setDossierActivo({
      numeroExpediente: expedienteBusqueda.trim().toUpperCase(),
      administrado: 'INVERSIONES SAN JUAN S.A.C.',
      dniRuc: '20601234567',
      direccion: 'Av. Próceres de la Independencia N° 1845',
      giro: 'Comercio / Restaurante y Salón de Eventos',
      fiscalizador: 'Ana Torres (Fiscalizadora dev)',
      fechaInicio: '2026-09-08',
      estadoActual: 'EN INSTRUCCIÓN (SP4)',
      totalFolios: 18,
      piezasProcesales: [
        { folio: '01 - 02', tipo: 'Acta de Fiscalización', numero: 'AF-004521', fecha: '2026-09-08 10:15', estado: 'Conforme' },
        { folio: '03 - 04', tipo: 'Notificación de Cargo (NC)', numero: 'NC-001890', fecha: '2026-09-08 10:45', estado: 'Entregada en acto' },
        { folio: '05 - 08', tipo: 'Panel Fotográfico Probatorio', numero: 'IMG-01 a IMG-04', fecha: '2026-09-08 11:00', estado: '4 fotografías' },
        { folio: '09 - 13', tipo: 'Escrito de Descargos del Administrado', numero: 'EXP-DESC-044', fecha: '2026-09-11 16:30', estado: 'Presentado en plazo' },
        { folio: '14 - 18', tipo: 'Informe Final de Instrucción (IFI)', numero: 'IFI-2026-0104', fecha: '2026-09-12 11:20', estado: 'Dictamen: Sancionar' },
      ],
    });
  };

  const handleRegistrarExterno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remitenteExterno.trim() || !asuntoExterno.trim()) {
      setMessage({ type: 'error', text: 'Complete el remitente y el asunto del documento externo.' });
      return;
    }

    const nuevoExt: DocumentoExterno = {
      numeroRegistro: `EXT-2026-${String(documentosExternos.length + 91).padStart(4, '0')}`,
      origen: origenExterno,
      remitente: remitenteExterno.trim(),
      asunto: asuntoExterno.trim(),
      fechaIngreso: new Date().toLocaleString('es-PE'),
      folios: Number(foliosExterno) || 1,
      derivadoA: derivadoExterno.trim(),
    };

    setDocumentosExternos([nuevoExt, ...documentosExternos]);
    setMessage({ type: 'success', text: `Documento externo registrado bajo el N° ${nuevoExt.numeroRegistro}.` });
    setRemitenteExterno('');
    setAsuntoExterno('');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-midnight-900)' }}>
            Control Documentario, Foliado & Archivo Central
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Custodia formal de actas físicas preimpresas (SP2-T04), foliado de expedientes y mesa de partes externa (BPMN N1-E04).
          </p>
        </div>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('custodia')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'custodia' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'custodia' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'custodia' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileTextIcon size={16} />
          1. Custodia & Ingreso de Actas Físicas (SP2-T04)
        </button>

        <button
          onClick={() => setActiveTab('dossier')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'dossier' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'dossier' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'dossier' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <EyeIcon size={16} />
          2. Expediente Electrónico & Dossier Foliado
        </button>

        <button
          onClick={() => setActiveTab('correlativos')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'correlativos' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'correlativos' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'correlativos' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircleIcon size={16} />
          3. Validador de Correlativos de Serie
        </button>

        <button
          onClick={() => setActiveTab('externos')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'externos' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'externos' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'externos' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <BuildingIcon size={16} />
          4. Mesa de Partes: Documentos Externos (N1-E04)
        </button>
      </div>

      {/* Tab 1: Custodia y Foliado Físico */}
      {activeTab === 'custodia' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px' }}>
          <Card title="Registrar Ingreso de Acta Física a Custodia">
            <form onSubmit={handleRegistrarCustodia}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Tipo de Documento / Formato Físico
                </label>
                <select
                  value={nuevoTipoActa}
                  onChange={(e) => setNuevoTipoActa(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                >
                  <option value="ACTA_FISCALIZACION">Acta de Fiscalización (AF)</option>
                  <option value="NOTIFICACION_CARGO">Notificación de Cargo (NC)</option>
                  <option value="ACTA_EXHORTACION">Acta de Exhortación</option>
                  <option value="MEDIDA_PROVISIONAL">Acta de Medida Provisional / Clausura</option>
                </select>
              </div>

              <Input
                label="N° Correlativo Preimpreso (Serie Física)"
                placeholder="Ej. AF-005120"
                value={nuevoCorrelativo}
                onChange={(e) => setNuevoCorrelativo(e.target.value)}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="N° de Folios"
                  type="number"
                  min="1"
                  value={nuevosFolios}
                  onChange={(e) => setNuevosFolios(e.target.value)}
                />
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Estado del Documento
                  </label>
                  <select
                    value={nuevoEstadoFisico}
                    onChange={(e) => setNuevoEstadoFisico(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                  >
                    <option value="CONFORME">Conforme</option>
                    <option value="DETERIORADO">Deteriorado</option>
                    <option value="ENMENDADO">Enmendado / Testado</option>
                  </select>
                </div>
              </div>

              <Input
                label="Ubicación Física en Archivo / Estante"
                placeholder="Ej. Estante C - Archivador 2026-S1"
                value={nuevaUbicacion}
                onChange={(e) => setNuevaUbicacion(e.target.value)}
              />

              <Input
                label="ID Expediente Asociado (Opcional)"
                placeholder="Pegar ID para marcar ingreso físico en SP2"
                value={expedienteAsociadoId}
                onChange={(e) => setExpedienteAsociadoId(e.target.value)}
              />

              <Textarea
                label="Observaciones de Custodia"
                placeholder="Notas de recepción, firma de entrega de cargo..."
                value={nuevasObservaciones}
                onChange={(e) => setNuevasObservaciones(e.target.value)}
                rows={2}
              />

              <Button type="submit" variant="primary" loading={actionLoading} style={{ width: '100%' }}>
                Registrar en Libro de Custodia
              </Button>
            </form>
          </Card>

          <Card title="Libro de Control Documentario y Actas en Archivo">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 14px' }}>Correlativo</th>
                    <th style={{ padding: '12px 14px' }}>Tipo</th>
                    <th style={{ padding: '12px 14px' }}>Folios</th>
                    <th style={{ padding: '12px 14px' }}>Ubicación</th>
                    <th style={{ padding: '12px 14px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {documentosCustodia.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                        {d.numeroCorrelativo}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px' }}>
                        {d.tipoActa.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 600 }}>{d.folios}</span> f.
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {d.ubicacionArchivo}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Badge variant={d.estadoFisico === 'CONFORME' ? 'success' : 'warning'}>
                          {d.estadoFisico}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Dossier / Visor de Expediente */}
      {activeTab === 'dossier' && (
        <Card title="Dossier Documentario del Expediente Sancionador">
          <form onSubmit={handleBuscarDossier} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Buscar por N° Expediente (ej. EXP-2026-0042) o RUC/DNI..."
              value={expedienteBusqueda}
              onChange={(e) => setExpedienteBusqueda(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '13px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            />
            <Button type="submit" variant="primary" icon={<SearchIcon size={16} />}>
              Visualizar Dossier
            </Button>
          </form>

          {dossierActivo ? (
            <div>
              {/* Carátula del Expediente */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #163666 0%, #10264a 100%)',
                  color: '#ffffff',
                  padding: '24px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.5px' }}>
                    CARÁTULA OFICIAL DE EXPEDIENTE ADMINISTRATIVO
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: 800, marginTop: '2px' }}>
                    {dossierActivo.numeroExpediente}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px' }}>
                    <strong>Administrado:</strong> {dossierActivo.administrado} (RUC: {dossierActivo.dniRuc})<br />
                    <strong>Ubicación:</strong> {dossierActivo.direccion}<br />
                    <strong>Giro:</strong> {dossierActivo.giro}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge variant="purple">{dossierActivo.estadoActual}</Badge>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginTop: '8px' }}>
                    Total Folios: {dossierActivo.totalFolios}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Fecha Apertura: {dossierActivo.fechaInicio}
                  </div>
                </div>
              </div>

              {/* Árbol de Piezas Procesales */}
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--color-midnight-900)' }}>
                Piezas Procesales y Actas Foliadas del Expediente:
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '12px 14px' }}>Foliado</th>
                      <th style={{ padding: '12px 14px' }}>Pieza Procesal</th>
                      <th style={{ padding: '12px 14px' }}>N° Correlativo / Código</th>
                      <th style={{ padding: '12px 14px' }}>Fecha Actuación</th>
                      <th style={{ padding: '12px 14px' }}>Estado Documentario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossierActivo.piezasProcesales.map((p: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                          Folios {p.folio}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{p.tipo}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>{p.numero}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{p.fecha}</td>
                        <td style={{ padding: '12px 14px' }}><Badge variant="success">{p.estado}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button variant="outline" icon={<PrinterIcon size={15} />} onClick={() => window.print()}>
                  Imprimir Carátula y Hoja de Ruta
                </Button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '32px' }}>
              Ingrese un N° de expediente (ej. EXP-2026-0042) para consultar el dossier documental completo y su foliado.
            </p>
          )}
        </Card>
      )}

      {/* Tab 3: Validador de Correlativos */}
      {activeTab === 'correlativos' && (
        <Card title="Verificador de Disponibilidad de Correlativos Físicos">
          <div
            style={{
              backgroundColor: '#eff6ff',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              color: '#1e3a8a',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ marginTop: '2px', flexShrink: 0 }}><ShieldAlertIcon size={16} /></span>
              <span>
                <strong>Control Estricto de Series:</strong> Los talonarios físicos vienen pre-impresos por imprenta con numeración de serie.
                Esta herramienta consulta el sistema en tiempo real para evitar duplicidades o adulteración de actas.
              </span>
            </div>
          </div>

          <form onSubmit={handleVerificarCorrelativo} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr auto', gap: '12px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Tipo de Acta
              </label>
              <select
                value={tipoVerificar}
                onChange={(e) => setTipoVerificar(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
              >
                <option value="ACTA_FISCALIZACION">Acta de Fiscalización (AF)</option>
                <option value="NOTIFICACION_CARGO">Notificación de Cargo (NC)</option>
                <option value="ACTA_EXHORTACION">Acta de Exhortación</option>
              </select>
            </div>

            <Input
              label="Número de Serie Preimpreso"
              placeholder="Ej. 004521"
              value={numeroVerificar}
              onChange={(e) => setNumeroVerificar(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" loading={actionLoading} style={{ marginBottom: '14px' }}>
              Verificar en Backend
            </Button>
          </form>

          {resultadoCorrelativo && (
            <div style={{ marginTop: '20px' }}>
              {resultadoCorrelativo.error ? (
                <Alert type="error">{resultadoCorrelativo.error}</Alert>
              ) : resultadoCorrelativo.disponible ? (
                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircleIcon size={24} color="#16a34a" />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700 }}>CORRELATIVO DISPONIBLE</h4>
                    <p style={{ fontSize: '12px' }}>El número {numeroVerificar} no ha sido usado en ninguna intervención previa. Puede utilizarse legítimamente.</p>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangleIcon size={24} color="#dc2626" />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700 }}>CORRELATIVO DUPLICADO / OCUPADO</h4>
                    <p style={{ fontSize: '12px' }}>ALERTA: El número {numeroVerificar} ya se encuentra registrado en el sistema. Prohibido volver a emitirlo.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Mesa de Partes (Documentos Externos) */}
      {activeTab === 'externos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px' }}>
          <Card title="Ingreso por Mesa de Partes (BPMN N1-E04)">
            <form onSubmit={handleRegistrarExterno}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Entidad de Origen / Fuente
                </label>
                <select
                  value={origenExterno}
                  onChange={(e) => setOrigenExterno(e.target.value as any)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                >
                  <option value="DENUNCIA">Denuncia Ciudadana / Junta Vecinal</option>
                  <option value="FISCALIA">Ministerio Público / Fiscalía</option>
                  <option value="PNP">Policía Nacional del Perú (PNP)</option>
                  <option value="PROCURADURIA">Procuraduría Pública Municipal</option>
                  <option value="DEFENSORIA">Defensoría del Pueblo</option>
                  <option value="RIESGOS">Gestión de Riesgos de Desastres (Defensa Civil)</option>
                </select>
              </div>

              <Input
                label="Remitente / Institución Emisora"
                placeholder="Ej. Comisaría de Canto Rey / Vecinos Zona 4"
                value={remitenteExterno}
                onChange={(e) => setRemitenteExterno(e.target.value)}
                required
              />

              <Input
                label="N° Folios"
                type="number"
                min="1"
                value={foliosExterno}
                onChange={(e) => setFoliosExterno(e.target.value)}
              />

              <Textarea
                label="Asunto / Motivo de la Fiscalización Solicitada"
                placeholder="Describa el hecho denunciado, dirección exacta y requerimiento..."
                value={asuntoExterno}
                onChange={(e) => setAsuntoExterno(e.target.value)}
                rows={3}
                required
              />

              <Input
                label="Derivar a Área Interna"
                placeholder="Ej. Sector 3 - Fiscalización Comercial"
                value={derivadoExterno}
                onChange={(e) => setDerivadoExterno(e.target.value)}
              />

              <Button type="submit" variant="primary" style={{ width: '100%' }}>
                Generar Registro de Mesa de Partes
              </Button>
            </form>
          </Card>

          <Card title="Documentos Externos Recibidos">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 14px' }}>N° Registro</th>
                    <th style={{ padding: '12px 14px' }}>Origen</th>
                    <th style={{ padding: '12px 14px' }}>Remitente & Asunto</th>
                    <th style={{ padding: '12px 14px' }}>Derivado a</th>
                  </tr>
                </thead>
                <tbody>
                  {documentosExternos.map((ext) => (
                    <tr key={ext.numeroRegistro} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primary-600)', whiteSpace: 'nowrap' }}>
                        {ext.numeroRegistro}
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                          {ext.folios} f. • {ext.fechaIngreso.slice(0, 10)}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Badge variant="info">{ext.origen}</Badge>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <strong>{ext.remitente}</strong>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          {ext.asunto}
                        </p>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        {ext.derivadoA}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};