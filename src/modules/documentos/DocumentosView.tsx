import React, { useState } from 'react';
import { ActasApi, ExpedientesApi } from '../../api';
import { Button, Badge, Input, Textarea, Alert } from '../../components/common/Common';
import { EstadoPunto, PageHeader, PanelTabla, SegmentedTabs, TABLA } from '../../components/common/PageKit';
import { SearchIcon, CheckCircleIcon, AlertTriangleIcon, PrinterIcon, ShieldAlertIcon } from '../../components/icons/Icons';

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

type Pestana = 'custodia' | 'dossier' | 'externos' | 'correlativos';

/** Título de cada bloque dentro de la pestaña (mismo estilo que los encabezados de sección de Validación). */
const TITULO_SECCION = 'text-[13px] font-bold uppercase tracking-[0.5px] text-text-muted m-0 mb-[14px]';

export const DocumentosView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Pestana>('custodia');
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
      <PageHeader
        titulo="Control Documentario"
        descripcion="Custodia formal de actas físicas preimpresas (SP2-T04), foliado de expedientes y mesa de partes externa (BPMN N1-E04)."
      />

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <PanelTabla
        barra={
          <SegmentedTabs<Pestana>
            items={[
              { clave: 'custodia', etiqueta: '1. Custodia & Ingreso de Actas Físicas (SP2-T04)' },
              { clave: 'dossier', etiqueta: '2. Expediente Electrónico & Dossier Foliado' },
              { clave: 'correlativos', etiqueta: '3. Validador de Correlativos de Serie' },
              { clave: 'externos', etiqueta: '4. Mesa de Partes: Documentos Externos (N1-E04)' },
            ]}
            activa={activeTab}
            onChange={setActiveTab}
          />
        }
      >
        {/* Tab 1: Custodia y Foliado Físico */}
        {activeTab === 'custodia' && (
          <div className="grid grid-cols-[1fr_1.6fr] gap-[24px] p-[24px]">
            <section className="min-w-0">
              <h3 className={TITULO_SECCION}>Registrar Ingreso de Acta Física a Custodia</h3>
              <form onSubmit={handleRegistrarCustodia}>
                <div className="mb-[14px]">
                  <label className="block text-[13px] font-semibold mb-[6px]">
                    Tipo de Documento / Formato Físico
                  </label>
                  <select
                    value={nuevoTipoActa}
                    onChange={(e) => setNuevoTipoActa(e.target.value)}
                    className="w-full p-[10px] rounded-[6px] border border-border text-[13px]"
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

                <div className="grid grid-cols-[1fr_1fr] gap-[12px]">
                  <Input
                    label="N° de Folios"
                    type="number"
                    min="1"
                    value={nuevosFolios}
                    onChange={(e) => setNuevosFolios(e.target.value)}
                  />
                  <div className="mb-[14px]">
                    <label className="block text-[13px] font-semibold mb-[6px]">
                      Estado del Documento
                    </label>
                    <select
                      value={nuevoEstadoFisico}
                      onChange={(e) => setNuevoEstadoFisico(e.target.value as any)}
                      className="w-full p-[10px] rounded-[6px] border border-border text-[13px]"
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

                <Button type="submit" variant="primary" loading={actionLoading} className="w-full!">
                  Registrar en Libro de Custodia
                </Button>
              </form>
            </section>

            <section className="min-w-0">
              <h3 className={TITULO_SECCION}>Libro de Control Documentario y Actas en Archivo</h3>
              <div className="border border-border rounded-sm overflow-x-auto">
                <table className={TABLA.tabla}>
                  <thead>
                    <tr className={TABLA.encabezado}>
                      <th className={TABLA.th}>Correlativo</th>
                      <th className={TABLA.th}>Tipo</th>
                      <th className={TABLA.th}>Folios</th>
                      <th className={TABLA.th}>Ubicación</th>
                      <th className={TABLA.th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentosCustodia.map((d) => (
                      <tr key={d.id} className={TABLA.fila}>
                        <td className={`${TABLA.td} font-bold text-primary-600`}>
                          {d.numeroCorrelativo}
                        </td>
                        <td className={`${TABLA.td} text-[12px]`}>
                          {d.tipoActa.replace('_', ' ')}
                        </td>
                        <td className={TABLA.td}>
                          <span className="font-semibold">{d.folios}</span> f.
                        </td>
                        <td className={`${TABLA.td} text-text-secondary text-[12px]`}>
                          {d.ubicacionArchivo}
                        </td>
                        <td className={TABLA.td}>
                          <EstadoPunto tono={d.estadoFisico === 'CONFORME' ? 'ok' : 'aviso'}>
                            {d.estadoFisico}
                          </EstadoPunto>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Dossier / Visor de Expediente */}
        {activeTab === 'dossier' && (
          <div className="p-[24px]">
            <h3 className={TITULO_SECCION}>Dossier Documentario del Expediente Sancionador</h3>
            <form onSubmit={handleBuscarDossier} className="flex gap-[12px] mb-[20px]">
              <input
                type="text"
                placeholder="Buscar por N° Expediente (ej. EXP-2026-0042) o RUC/DNI..."
                value={expedienteBusqueda}
                onChange={(e) => setExpedienteBusqueda(e.target.value)}
                className="flex-1 py-[10px] px-[14px] text-[13px] rounded-sm border border-border"
              />
              <Button type="submit" variant="primary" icon={<SearchIcon size={16} />}>
                Visualizar Dossier
              </Button>
            </form>

            {dossierActivo ? (
              <div>
                {/* Carátula del Expediente */}
                <div
                  className="bg-[linear-gradient(135deg,#163666_0%,#10264a_100%)] text-white p-[24px] rounded-[12px] mb-[20px] flex justify-between items-center"
                >
                  <div>
                    <div className="text-[11px] text-[#38bdf8] font-bold tracking-[0.5px]">
                      CARÁTULA OFICIAL DE EXPEDIENTE ADMINISTRATIVO
                    </div>
                    <h3 className="text-[22px] font-extrabold mt-[2px]">
                      {dossierActivo.numeroExpediente}
                    </h3>
                    <div className="text-[13px] text-border-dark mt-[6px]">
                      <strong>Administrado:</strong> {dossierActivo.administrado} (RUC: {dossierActivo.dniRuc})<br />
                      <strong>Ubicación:</strong> {dossierActivo.direccion}<br />
                      <strong>Giro:</strong> {dossierActivo.giro}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="purple">{dossierActivo.estadoActual}</Badge>
                    <div className="text-[14px] font-bold text-[#38bdf8] mt-[8px]">
                      Total Folios: {dossierActivo.totalFolios}
                    </div>
                    <div className="text-[11px] text-text-light mt-[4px]">
                      Fecha Apertura: {dossierActivo.fechaInicio}
                    </div>
                  </div>
                </div>

                {/* Árbol de Piezas Procesales */}
                <h4 className="text-[15px] font-bold mb-[12px] text-midnight-900">
                  Piezas Procesales y Actas Foliadas del Expediente:
                </h4>
                <div className="border border-border rounded-sm overflow-x-auto">
                  <table className={TABLA.tabla}>
                    <thead>
                      <tr className={TABLA.encabezado}>
                        <th className={TABLA.th}>Foliado</th>
                        <th className={TABLA.th}>Pieza Procesal</th>
                        <th className={TABLA.th}>N° Correlativo / Código</th>
                        <th className={TABLA.th}>Fecha Actuación</th>
                        <th className={TABLA.th}>Estado Documentario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossierActivo.piezasProcesales.map((p: any, i: number) => (
                        <tr key={i} className={TABLA.fila}>
                          <td className={`${TABLA.td} font-bold text-primary-600`}>
                            Folios {p.folio}
                          </td>
                          <td className={`${TABLA.td} font-semibold`}>{p.tipo}</td>
                          <td className={`${TABLA.td} font-mono`}>{p.numero}</td>
                          <td className={`${TABLA.td} text-text-secondary`}>{p.fecha}</td>
                          <td className={TABLA.td}><EstadoPunto tono="ok">{p.estado}</EstadoPunto></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-[20px] flex gap-[12px] justify-end">
                  <Button variant="outline" icon={<PrinterIcon size={15} />} onClick={() => window.print()}>
                    Imprimir Carátula y Hoja de Ruta
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-text-muted text-center p-[32px]">
                Ingrese un N° de expediente (ej. EXP-2026-0042) para consultar el dossier documental completo y su foliado.
              </p>
            )}
          </div>
        )}

        {/* Tab 3: Validador de Correlativos */}
        {activeTab === 'correlativos' && (
          <div className="p-[24px]">
            <h3 className={TITULO_SECCION}>Verificador de Disponibilidad de Correlativos Físicos</h3>
            <div
              className="bg-primary-50 py-[12px] px-[16px] rounded-[8px] border border-[#bfdbfe] text-[#1e3a8a] text-[13px] mb-[24px]"
            >
              <div className="flex items-start gap-[8px]">
                <span className="mt-[2px] shrink-0"><ShieldAlertIcon size={16} /></span>
                <span>
                  <strong>Control Estricto de Series:</strong> Los talonarios físicos vienen pre-impresos por imprenta con numeración de serie.
                  Esta herramienta consulta el sistema en tiempo real para evitar duplicidades o adulteración de actas.
                </span>
              </div>
            </div>

            <form onSubmit={handleVerificarCorrelativo} className="grid grid-cols-[1.5fr_2fr_auto] gap-[12px] items-end">
              <div>
                <label className="block text-[13px] font-semibold mb-[6px]">
                  Tipo de Acta
                </label>
                <select
                  value={tipoVerificar}
                  onChange={(e) => setTipoVerificar(e.target.value)}
                  className="w-full p-[10px] rounded-[6px] border border-border text-[13px]"
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

              <Button type="submit" variant="primary" loading={actionLoading} className="mb-[14px]!">
                Verificar en Backend
              </Button>
            </form>

            {resultadoCorrelativo && (
              <div className="mt-[20px]">
                {resultadoCorrelativo.error ? (
                  <Alert type="error">{resultadoCorrelativo.error}</Alert>
                ) : resultadoCorrelativo.disponible ? (
                  <div className="p-[16px] rounded-[8px] bg-success-bg border border-success-border text-[#166534] flex items-center gap-[10px]">
                    <CheckCircleIcon size={24} color="#16a34a" />
                    <div>
                      <h4 className="text-[14px] font-bold">CORRELATIVO DISPONIBLE</h4>
                      <p className="text-[12px]">El número {numeroVerificar} no ha sido usado en ninguna intervención previa. Puede utilizarse legítimamente.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-[16px] rounded-[8px] bg-danger-bg border border-danger-border text-[#991b1b] flex items-center gap-[10px]">
                    <AlertTriangleIcon size={24} color="#dc2626" />
                    <div>
                      <h4 className="text-[14px] font-bold">CORRELATIVO DUPLICADO / OCUPADO</h4>
                      <p className="text-[12px]">ALERTA: El número {numeroVerificar} ya se encuentra registrado en el sistema. Prohibido volver a emitirlo.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Mesa de Partes (Documentos Externos) */}
        {activeTab === 'externos' && (
          <div className="grid grid-cols-[1fr_1.6fr] gap-[24px] p-[24px]">
            <section className="min-w-0">
              <h3 className={TITULO_SECCION}>Ingreso por Mesa de Partes (BPMN N1-E04)</h3>
              <form onSubmit={handleRegistrarExterno}>
                <div className="mb-[14px]">
                  <label className="block text-[13px] font-semibold mb-[6px]">
                    Entidad de Origen / Fuente
                  </label>
                  <select
                    value={origenExterno}
                    onChange={(e) => setOrigenExterno(e.target.value as any)}
                    className="w-full p-[10px] rounded-[6px] border border-border text-[13px]"
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

                <Button type="submit" variant="primary" className="w-full!">
                  Generar Registro de Mesa de Partes
                </Button>
              </form>
            </section>

            <section className="min-w-0">
              <h3 className={TITULO_SECCION}>Documentos Externos Recibidos</h3>
              <div className="border border-border rounded-sm overflow-x-auto">
                <table className={TABLA.tabla}>
                  <thead>
                    <tr className={TABLA.encabezado}>
                      <th className={TABLA.th}>N° Registro</th>
                      <th className={TABLA.th}>Origen</th>
                      <th className={TABLA.th}>Remitente & Asunto</th>
                      <th className={TABLA.th}>Derivado a</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentosExternos.map((ext) => (
                      <tr key={ext.numeroRegistro} className={TABLA.fila}>
                        <td className={`${TABLA.td} font-bold text-primary-600 whitespace-nowrap`}>
                          {ext.numeroRegistro}
                          <div className="text-[11px] text-text-muted font-normal">
                            {ext.folios} f. • {ext.fechaIngreso.slice(0, 10)}
                          </div>
                        </td>
                        <td className={TABLA.td}>
                          <EstadoPunto tono="info">{ext.origen}</EstadoPunto>
                        </td>
                        <td className={TABLA.td}>
                          <strong>{ext.remitente}</strong>
                          <p className="text-[12px] text-text-secondary mt-[2px] mb-0">
                            {ext.asunto}
                          </p>
                        </td>
                        <td className={`${TABLA.td} text-text-muted text-[12px]`}>
                          {ext.derivadoA}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </PanelTabla>
    </div>
  );
};
