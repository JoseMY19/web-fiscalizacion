import React, { useEffect, useState } from 'react';
import { RecursosApi, ReconsideracionPendienteItem, ApelacionPendienteItem } from '../../api';
import { Card, Button, Input, Textarea, Alert, Badge, EmptyState } from '../../components/common/Common';
import { formatearFecha, hoyLocal } from '../../lib/fechas';
import { ScaleIcon, FileTextIcon, PenToolIcon, CheckIcon } from '../../components/icons/Icons';

export const RecursosView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reconsideracion' | 'apelacion'>('reconsideracion');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pendientesRecon, setPendientesRecon] = useState<ReconsideracionPendienteItem[]>([]);
  const [pendientesApel, setPendientesApel] = useState<ApelacionPendienteItem[]>([]);

  const cargarBandejas = async () => {
    try {
      const [recon, apel] = await Promise.all([RecursosApi.getPendientesReconsideracion(), RecursosApi.getPendientesApelacion()]);
      setPendientesRecon(recon);
      setPendientesApel(apel);
    } catch {
      // Silencioso — las bandejas son un atajo, no bloquean el uso manual de los ids.
    }
  };

  useEffect(() => {
    cargarBandejas();
  }, []);

  // Estados Reconsideración
  const [resolucionIdRecon, setResolucionIdRecon] = useState('');
  const [reconsideracionId, setReconsideracionId] = useState('');
  const [fechaPresentacionRecon, setFechaPresentacionRecon] = useState(hoyLocal());
  const [nuevaPrueba, setNuevaPrueba] = useState(false);
  const [nuevaPruebaTexto, setNuevaPruebaTexto] = useState('');
  const [fechaSubsanacion, setFechaSubsanacion] = useState('');
  const [analisisRecon, setAnalisisRecon] = useState('');
  const [resolucionQueResuelveId, setResolucionQueResuelveId] = useState('');

  // Estados Apelación
  const [resolucionIdApel, setResolucionIdApel] = useState('');
  const [apelacionId, setApelacionId] = useState('');
  const [motivoNulidad, setMotivoNulidad] = useState('');
  const [informeGopResult, setInformeGopResult] = useState<any | null>(null);

  // Handlers Reconsideración
  const handlePresentarReconsideracion = async () => {
    if (!resolucionIdRecon.trim()) {
      setMessage({ type: 'error', text: 'Ingrese el ID de la resolución sancionadora materia de reconsideración.' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await RecursosApi.presentarReconsideracion(resolucionIdRecon.trim(), {
        fechaPresentacion: fechaPresentacionRecon,
        nuevaPrueba,
        nuevaPruebaTexto: nuevaPrueba ? nuevaPruebaTexto : undefined,
      });
      setMessage({ type: 'success', text: `Recurso de Reconsideración registrado con ID: ${res.id}` });
      if (res.id) setReconsideracionId(res.id);
      cargarBandejas();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al presentar reconsideración.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubsanar = async () => {
    if (!reconsideracionId.trim() || !fechaSubsanacion) {
      setMessage({ type: 'error', text: 'Complete el ID de reconsideración y la fecha de subsanación.' });
      return;
    }
    setActionLoading(true);
    try {
      await RecursosApi.subsanarReconsideracion(reconsideracionId.trim(), fechaSubsanacion);
      setMessage({ type: 'success', text: 'Subsanación de requisitos registrada con éxito.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrar subsanación.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEvaluarRecon = async (resultado: 'FUNDADA' | 'INFUNDADA') => {
    if (!reconsideracionId.trim() || !analisisRecon.trim()) {
      setMessage({ type: 'error', text: 'Debe especificar el ID de reconsideración y redactar el análisis de la prueba.' });
      return;
    }
    setActionLoading(true);
    try {
      await RecursosApi.evaluarReconsideracion(reconsideracionId.trim(), resultado, analisisRecon.trim());
      setMessage({ type: 'success', text: `Recurso de reconsideración evaluado como ${resultado}.` });
      cargarBandejas();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al evaluar reconsideración.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Camino recomendado (SP6-T05): crea la RSG NUEVA y la vincula en un
  // solo paso — nunca reutiliza/corrompe la resolución recurrida. Gap
  // encontrado en prueba end-to-end (2026-09-13): pegar a mano el id de
  // una resolución existente acá podía terminar vinculando la propia
  // RSGSA recurrida como si fuera "la que la resuelve".
  const handleEmitirRsg = async () => {
    if (!reconsideracionId.trim()) {
      setMessage({ type: 'error', text: 'Complete el ID de la reconsideración.' });
      return;
    }
    setActionLoading(true);
    try {
      const { resolucionId } = await RecursosApi.emitirRsgQueResuelve(reconsideracionId.trim());
      setMessage({
        type: 'success',
        text: `RSG creada y vinculada (id: ${resolucionId}). Complétala en el módulo Resoluciones (análisis, sección automática, firmar, notificar).`,
      });
      cargarBandejas();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al emitir la RSG.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVincularResolucion = async () => {
    if (!reconsideracionId.trim() || !resolucionQueResuelveId.trim()) {
      setMessage({ type: 'error', text: 'Complete ambos IDs para vincular la resolución que resuelve el recurso.' });
      return;
    }
    setActionLoading(true);
    try {
      await RecursosApi.vincularResolucionResuelve(reconsideracionId.trim(), resolucionQueResuelveId.trim());
      setMessage({ type: 'success', text: 'Resolución vinculada formalmente al recurso.' });
      cargarBandejas();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al vincular resolución.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers Apelación
  const handlePresentarApelacion = async () => {
    if (!resolucionIdApel.trim()) {
      setMessage({ type: 'error', text: 'Ingrese el ID de la resolución contra la que se apela.' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await RecursosApi.presentarApelacion(resolucionIdApel.trim());
      setMessage({ type: 'success', text: `Recurso de Apelación interpuesto con ID: ${res.id}` });
      if (res.id) setApelacionId(res.id);
      cargarBandejas();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al presentar apelación.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerarInformeGop = async () => {
    if (!apelacionId.trim()) {
      setMessage({ type: 'error', text: 'Ingrese el ID de la apelación.' });
      return;
    }
    setActionLoading(true);
    try {
      const data = await RecursosApi.generarInformeGop(apelacionId.trim());
      setInformeGopResult(data);
      setMessage({ type: 'success', text: 'Informe técnico de elevación a GOP generado automáticamente (sin opinión de fondo).' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al generar informe a GOP.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFirmarInformeGop = async () => {
    if (!apelacionId.trim()) return;
    setActionLoading(true);
    try {
      await RecursosApi.firmarInformeGop(apelacionId.trim());
      setMessage({ type: 'success', text: 'Informe de elevación a GOP firmado por el Subgerente.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al firmar informe.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecisionGop = async (decision: 'FUNDADA' | 'INFUNDADA' | 'NULIDAD') => {
    if (!apelacionId.trim()) return;
    if (decision === 'NULIDAD' && !motivoNulidad.trim()) {
      setMessage({ type: 'error', text: 'Debe indicar el motivo de la nulidad resuelta por GOP.' });
      return;
    }
    setActionLoading(true);
    try {
      await RecursosApi.registrarDecisionGop(
        apelacionId.trim(),
        decision,
        decision === 'NULIDAD' ? motivoNulidad.trim() : undefined
      );
      setMessage({ type: 'success', text: `Decisión de 2da instancia de GOP registrada como ${decision}.` });
      cargarBandejas();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrar decisión de GOP.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-[20px]">
        <h2 className="text-[18px] font-extrabold text-midnight-900">
          Recursos Administrativos Impugnativos (SP6 / SP7)
        </h2>
        <p className="text-[13px] text-text-muted mt-[2px]">
          Gestión de impugnaciones contra resoluciones sancionadoras en 1ra instancia (Reconsideración) y 2da instancia (Apelación GOP).
        </p>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Tabs */}
      <div className="flex gap-[8px] mb-[16px]">
        <button
          onClick={() => setActiveTab('reconsideracion')}
          className={`py-[10px] px-[20px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'reconsideracion' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'reconsideracion' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'reconsideracion' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <ScaleIcon size={16} />
          1. Reconsideración (SP6 - Misma Autoridad)
        </button>
        <button
          onClick={() => setActiveTab('apelacion')}
          className={`py-[10px] px-[20px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'apelacion' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'apelacion' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'apelacion' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <ScaleIcon size={16} />
          2. Apelación ante GOP (SP7 - Segunda Instancia)
        </button>
      </div>

      {/* Tab 1: Reconsideración */}
      {activeTab === 'reconsideracion' ? (
        <div className="flex flex-col gap-[20px]">
          <Card title="Bandeja: reconsideraciones pendientes (sin evaluar o sin RSG vinculada)">
            {pendientesRecon.length === 0 ? (
              <EmptyState title="Sin reconsideraciones pendientes" description="No hay recursos de reconsideración esperando acción." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px] text-left">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-b-border">
                      <th className="py-[10px] px-[12px]">N° Expediente</th>
                      <th className="py-[10px] px-[12px]">Fecha presentación</th>
                      <th className="py-[10px] px-[12px]">Nueva prueba</th>
                      <th className="py-[10px] px-[12px]">Estado</th>
                      <th className="py-[10px] px-[12px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {pendientesRecon.map((r) => (
                      <tr key={r.id} className="border-b border-b-border">
                        <td className="py-[10px] px-[12px]">{r.numeroExpediente}</td>
                        <td className="py-[10px] px-[12px]">{formatearFecha(r.fechaPresentacion)}</td>
                        <td className="py-[10px] px-[12px]">{r.nuevaPrueba ? 'Sí' : 'No'}</td>
                        <td className="py-[10px] px-[12px]">
                          {r.faltaVincularResolucion ? (
                            <Badge variant="warning">Falta vincular RSG</Badge>
                          ) : r.resultado ? (
                            <Badge variant="info">{r.resultado}</Badge>
                          ) : (
                            <Badge variant="neutral">Sin evaluar</Badge>
                          )}
                        </td>
                        <td className="py-[10px] px-[12px] text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReconsideracionId(r.id);
                              setResolucionIdRecon(r.resolucionId);
                            }}
                          >
                            Usar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Paso 1: Interposición del Recurso de Reconsideración">
            <div className="grid grid-cols-[2fr_1fr] gap-[16px]">
              <Input
                label="ID de la Resolución Sancionadora (RSGSA)"
                placeholder="Ej. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                value={resolucionIdRecon}
                onChange={(e) => setResolucionIdRecon(e.target.value)}
              />
              <Input
                type="date"
                label="Fecha de Presentación"
                value={fechaPresentacionRecon}
                onChange={(e) => setFechaPresentacionRecon(e.target.value)}
              />
            </div>

            <div className="my-[14px] mx-0 p-[12px] bg-[#f8fafc] rounded-[8px] border border-border">
              <label className="flex items-center gap-[8px] text-[13px] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={nuevaPrueba}
                  onChange={(e) => setNuevaPrueba(e.target.checked)}
                />
                El administrado adjuntó Nueva Prueba Instrumental (Requisito art. 219 TUO LPAG)
              </label>

              {nuevaPrueba && (
                <div className="mt-[10px]">
                  <Textarea
                    label="Descripción de la Nueva Prueba Aportada"
                    placeholder="Ej. Copia legalizada de Licencia de Funcionamiento N° 458-2026, plano visado o comprobante..."
                    value={nuevaPruebaTexto}
                    onChange={(e) => setNuevaPruebaTexto(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>

            <Button variant="primary" loading={actionLoading} onClick={handlePresentarReconsideracion}>
              Presentar Recurso de Reconsideración
            </Button>
          </Card>

          <Card title="Paso 2: Evaluación Jurídica y Resolución de Reconsideración">
            <Input
              label="ID del Recurso de Reconsideración en Trámite"
              placeholder="ID autogenerado en el paso 1"
              value={reconsideracionId}
              onChange={(e) => setReconsideracionId(e.target.value)}
            />

            <div className="grid grid-cols-[1fr_1fr] gap-[16px] mb-[16px]">
              <div className="bg-[#f8fafc] p-[14px] rounded-[8px] border border-border">
                <h4 className="text-[13px] font-bold mb-[8px]">Subsanación de Inadmisibilidad:</h4>
                <Input
                  type="date"
                  label="Fecha de Subsanación"
                  value={fechaSubsanacion}
                  onChange={(e) => setFechaSubsanacion(e.target.value)}
                />
                <Button size="sm" variant="secondary" loading={actionLoading} onClick={handleSubsanar}>
                  Registrar Subsanación
                </Button>
              </div>

              <div className="bg-[#f8fafc] p-[14px] rounded-[8px] border border-border">
                <h4 className="text-[13px] font-bold mb-[8px]">Emitir RSG Resolutiva (recomendado):</h4>
                <p className="text-[11px] text-text-muted mb-[8px]">
                  Crea una resolución RSG nueva para este expediente y la vincula de una vez — nunca reutiliza la RSGSA recurrida.
                </p>
                <Button size="sm" variant="primary" loading={actionLoading} onClick={handleEmitirRsg}>
                  Emitir y Vincular RSG
                </Button>
                <details className="mt-[10px]">
                  <summary className="text-[11px] cursor-pointer text-text-muted">
                    Vincular una RSG ya existente manualmente (avanzado)
                  </summary>
                  <div className="mt-[8px]">
                    <Input
                      label="ID de la RSG que Resuelve"
                      placeholder="ID de resolución que declara fundada/infundada"
                      value={resolucionQueResuelveId}
                      onChange={(e) => setResolucionQueResuelveId(e.target.value)}
                    />
                    <Button size="sm" variant="secondary" loading={actionLoading} onClick={handleVincularResolucion}>
                      Vincular RSG
                    </Button>
                  </div>
                </details>
              </div>
            </div>

            <Textarea
              label="Análisis Jurídico de la Nueva Prueba y Decisión"
              placeholder="Valoración de la prueba nueva respecto al hecho infractor sancionado..."
              value={analisisRecon}
              onChange={(e) => setAnalisisRecon(e.target.value)}
              rows={4}
            />

            <div className="flex gap-[12px] mt-[12px]">
              <Button variant="success" loading={actionLoading} onClick={() => handleEvaluarRecon('FUNDADA')}>
                Declarar FUNDADA
              </Button>
              <Button variant="danger" loading={actionLoading} onClick={() => handleEvaluarRecon('INFUNDADA')}>
                Declarar INFUNDADA
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        /* Tab 2: Apelación GOP */
        <div className="flex flex-col gap-[20px]">
          <Card title="Bandeja: apelaciones pendientes de decisión GOP">
            {pendientesApel.length === 0 ? (
              <EmptyState title="Sin apelaciones pendientes" description="No hay recursos de apelación esperando decisión de GOP." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px] text-left">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-b-border">
                      <th className="py-[10px] px-[12px]">N° Expediente</th>
                      <th className="py-[10px] px-[12px]">Informe generado</th>
                      <th className="py-[10px] px-[12px]">Informe firmado</th>
                      <th className="py-[10px] px-[12px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {pendientesApel.map((a) => (
                      <tr key={a.id} className="border-b border-b-border">
                        <td className="py-[10px] px-[12px]">{a.numeroExpediente}</td>
                        <td className="py-[10px] px-[12px]">
                          <Badge variant={a.informeGopGenerado ? 'success' : 'neutral'}>{a.informeGopGenerado ? 'Sí' : 'No'}</Badge>
                        </td>
                        <td className="py-[10px] px-[12px]">
                          <Badge variant={a.informeFirmado ? 'success' : 'neutral'}>{a.informeFirmado ? 'Sí' : 'No'}</Badge>
                        </td>
                        <td className="py-[10px] px-[12px] text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setApelacionId(a.id);
                              setResolucionIdApel(a.resolucionId);
                            }}
                          >
                            Usar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Paso 1: Interposición de Apelación ante GOP">
            <Input
              label="ID de la Resolución Sancionadora Apelada"
              placeholder="ID de la resolución de primera instancia"
              value={resolucionIdApel}
              onChange={(e) => setResolucionIdApel(e.target.value)}
            />
            <Button variant="primary" loading={actionLoading} onClick={handlePresentarApelacion}>
              Interponer Apelación
            </Button>
          </Card>

          <Card title="Paso 2: Elevación del Expediente a GOP (Segunda Instancia)">
            <Input
              label="ID del Recurso de Apelación"
              placeholder="ID de apelación registrado"
              value={apelacionId}
              onChange={(e) => setApelacionId(e.target.value)}
            />

            <div className="flex gap-[12px] mb-[16px]">
              <Button variant="secondary" icon={<FileTextIcon size={16} />} loading={actionLoading} onClick={handleGenerarInformeGop}>
                Generar Informe de Elevación GOP
              </Button>
              <Button variant="outline" icon={<PenToolIcon size={16} />} loading={actionLoading} onClick={handleFirmarInformeGop}>
                Firmar Informe
              </Button>
            </div>

            {informeGopResult && (
              <div className="bg-[#f0fdf4] p-[12px] rounded-[8px] border border-[#bbf7d0] mb-[16px]">
                <div className="flex items-center gap-[6px] text-[12px] font-semibold text-[#16a34a]">
                  <CheckIcon size={14} />
                  <span>Informe técnico generado con éxito (conforme al principio de doble instancia, sin opinión de fondo).</span>
                </div>
              </div>
            )}

            <div className="border-t border-t-border pt-[16px]">
              <h4 className="text-[14px] font-bold text-midnight-900 mb-[8px]">
                Resolución de Segunda Instancia por GOP:
              </h4>
              <Input
                label="Fundamento de Nulidad (Obligatorio solo si GOP resuelve NULIDAD)"
                placeholder="Vicio trascendente o falta de motivación legal que invalida lo actuado..."
                value={motivoNulidad}
                onChange={(e) => setMotivoNulidad(e.target.value)}
              />

              <div className="flex gap-[12px] mt-[12px]">
                <Button variant="success" loading={actionLoading} onClick={() => handleDecisionGop('FUNDADA')}>
                  GOP: FUNDADA
                </Button>
                <Button variant="danger" loading={actionLoading} onClick={() => handleDecisionGop('INFUNDADA')}>
                  GOP: INFUNDADA (Acto Firme)
                </Button>
                <Button variant="warning" loading={actionLoading} onClick={() => handleDecisionGop('NULIDAD')}>
                  GOP: NULIDAD
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};