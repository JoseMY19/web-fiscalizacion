import React, { useEffect, useState } from 'react';
import {
  ExpedientesApi,
  ExpedienteItem,
  IntervencionesApi,
  ActasApi,
} from '../../api';
import { ExpedientesObservadosApi, ExpedienteObservadoItem } from '../../api/expedientesObservados';
import { Button, Modal, Input, Textarea, Alert, EmptyState, Spinner } from '../../components/common/Common';
import { Buscador, EstadoPunto, MenuAcciones, PageHeader, PanelTabla, SegmentedTabs, TABLA } from '../../components/common/PageKit';
import { formatearFecha, formatearHora, hoyLocal } from '../../lib/fechas';
import { useConfirm } from '../../context/ConfirmContext';
import { ChecklistValidacionApi } from '../../api';
import { generarUuid } from '../../lib/uuid';
import { CheckCircleIcon, RefreshCwIcon, EyeIcon, PlusIcon } from '../../components/icons/Icons';
import { ExpedienteDetallePanel } from './ExpedienteDetallePanel';
import { socket } from '../../lib/socket';
import { BotonCorregirDato } from '../correcciones/CorreccionMaterial';

type Pestana = 'validar' | 'observadas' | 'digitalizar';

/** Expediente abierto en el panel de detalle; `decidir` = viene de la bandeja y se puede aprobar u observar desde ahí. */
interface DetalleAbierto {
  intervencionId: string;
  expedienteId: string;
  numeroExpediente: string;
  decidir: boolean;
}

export const ExpedientesView: React.FC = () => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<Pestana>('validar');
  const [expedientes, setExpedientes] = useState<ExpedienteItem[]>([]);
  const [observadas, setObservadas] = useState<ExpedienteObservadoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Panel de detalle (expediente completo)
  const [detalle, setDetalle] = useState<DetalleAbierto | null>(null);

  // Modal de Observación (SP2)
  const [observarModal, setObservarModal] = useState<{ isOpen: boolean; id: string; numero: string }>({
    isOpen: false,
    id: '',
    numero: '',
  });
  const [observacionesTexto, setObservacionesTexto] = useState('');

  // Formulario de Digitalización Manual (POST /intervenciones)
  const [digitalizarForm, setDigitalizarForm] = useState({
    numeroActaFiscalizacion: '',
    numeroNotificacionCargo: '',
    tipoActuacion: 'INICIA_PAS',
    direccionAproximada: '',
    nombresRazonSocial: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    giroUso: '',
    cuisCodigo: '',
    hechosVerificados: '',
    montoPasibleMulta: '',
  });
  const [correlativoStatus, setCorrelativoStatus] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [pendientesData, observadasData] = await Promise.allSettled([
        ExpedientesApi.getPendientes(),
        ExpedientesObservadosApi.listar(),
      ]);

      if (pendientesData.status === 'fulfilled') {
        setExpedientes(Array.isArray(pendientesData.value) ? pendientesData.value : []);
      }
      if (observadasData.status === 'fulfilled') {
        setObservadas(Array.isArray(observadasData.value) ? observadasData.value : []);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cargar expedientes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    socket.on('expediente:nuevo', cargar);
    return () => {
      socket.off('expediente:nuevo', cargar);
    };
  }, []);

  /** true si se aprobó (el panel de detalle se cierra); false si se canceló o falló. */
  const handleAprobar = async (id: string, numero: string): Promise<boolean> => {
    // Validación = revisar que esté completo: avisar qué falta antes de aprobar.
    const checklist = await ChecklistValidacionApi.obtener(id).catch(() => null);
    const faltan = checklist?.items.filter((x) => !x.ok && x.obligatorio) ?? [];
    const ok = await confirm(
      faltan.length > 0
        ? {
            title: 'Expediente incompleto',
            message: `Al expediente ${numero} le falta: ${faltan.map((x) => x.etiqueta).join('; ')}. Puedes completarlo aquí con "Corregir" o en el checklist del detalle. ¿Aprobar igual?`,
            confirmLabel: 'Aprobar igual',
            variant: 'danger',
          }
        : { message: `¿Confirmas la aprobación del expediente ${numero}? Pasará a la fase de Instrucción (SP4).` },
    );
    if (!ok) return false;
    setActionLoading(true);
    try {
      await ExpedientesApi.aprobar(id);
      setMessage({ type: 'success', text: `Expediente ${numero} aprobado exitosamente.` });
      cargar();
      return true;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'No se pudo aprobar el expediente.' });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleObservarSubmit = async () => {
    if (!observacionesTexto.trim()) {
      setMessage({ type: 'error', text: 'Debes ingresar el motivo de la observación.' });
      return;
    }
    setActionLoading(true);
    try {
      await ExpedientesApi.observar(observarModal.id, observacionesTexto.trim());
      setMessage({ type: 'success', text: `Expediente ${observarModal.numero} marcado como observado. Derivado a subsanación.` });
      setObservarModal({ isOpen: false, id: '', numero: '' });
      setObservacionesTexto('');
      setDetalle(null);
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'No se pudo observar el expediente.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleIngresoFisico = async (id: string, numero: string) => {
    setActionLoading(true);
    try {
      await ExpedientesApi.registrarIngresoFisico(id);
      setMessage({ type: 'success', text: `Ingreso físico de actas registrado para el expediente ${numero}.` });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'No se pudo registrar el ingreso físico.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReenviarValidacion = async (obs: ExpedienteObservadoItem) => {
    const ok = await confirm({
      message: `¿Confirmas el envío del expediente ${obs.numeroExpediente} a validación? Los cambios registrados quedarán trazables.`,
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await ExpedientesObservadosApi.reenviarValidacion(obs.id);
      setMessage({ type: 'success', text: `Expediente ${obs.numeroExpediente} reenviado a validación.` });
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'No se pudo reenviar el expediente.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidarCorrelativo = async (tipo: string, numero: string) => {
    if (!numero.trim()) return;
    try {
      const res = await ActasApi.verificarCorrelativo(tipo, numero.trim());
      if (res.disponible) {
        setCorrelativoStatus(`Correlativo ${numero} disponible en registro.`);
      } else {
        setCorrelativoStatus(`Alerta: El correlativo ${numero} ya existe o está duplicado.`);
      }
    } catch {
      setCorrelativoStatus('Error al validar correlativo.');
    }
  };

  const handleCrearIntervencionManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!digitalizarForm.numeroNotificacionCargo || !digitalizarForm.hechosVerificados) {
      setMessage({ type: 'error', text: 'Complete los campos obligatorios del acta preimpresa.' });
      return;
    }
    setActionLoading(true);
    try {
      const uuid = generarUuid();
      await IntervencionesApi.crear({
        id: uuid,
        fechaHoraInicio: new Date().toISOString(),
        origenUbicacion: 'DIRECCION_MANUAL',
        direccionAproximada: digitalizarForm.direccionAproximada,
        origen: 'DOC_EXTERNO',
        tipoActuacion: 'INICIA_PAS',
        versionLocal: 1,
        administrado: {
          identificado: true,
          tipoDocumento: digitalizarForm.tipoDocumento,
          numeroDocumento: digitalizarForm.numeroDocumento,
          nombresRazonSocial: digitalizarForm.nombresRazonSocial,
          giroUso: digitalizarForm.giroUso,
        },
        cuis: [],
        actaFiscalizacion: {
          numeroCorrelativo: digitalizarForm.numeroActaFiscalizacion || `AF-${Date.now().toString().slice(-4)}`,
          hechosVerificados: digitalizarForm.hechosVerificados,
        },
        notificacionCargo: {
          numeroCorrelativo: digitalizarForm.numeroNotificacionCargo,
          baseCalculo: 'UIT_FIJO',
          montoPasibleMulta: Number(digitalizarForm.montoPasibleMulta) || undefined,
          fechaDeteccion: hoyLocal(),
        },
        testigos: [],
        actasMedidaProvisional: [],
        actasValorizacionObra: [],
        actasAdicionales: [],
      });
      setMessage({ type: 'success', text: `Acta física preimpresa digitalizada e ingresada al PAS correctamente.` });
      setActiveTab('validar');
      cargar();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al digitalizar acta física.' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredExpedientes = expedientes.filter(
    (e) =>
      e.numeroExpediente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.fiscalizadorNombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const digitalizando = activeTab === 'digitalizar';

  return (
    <div>
      <PageHeader
        titulo="Validación de Expedientes"
        descripcion="Revisa que cada expediente de campo esté completo antes de pasar a Instrucción."
        acciones={
          <>
            <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={loading} onClick={cargar}>
              Actualizar
            </Button>
            {!digitalizando && (
              <Button variant="primary" icon={<PlusIcon size={15} />} onClick={() => setActiveTab('digitalizar')}>
                Digitalizar acta física
              </Button>
            )}
          </>
        }
      />

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {digitalizando ? (
        <div className="bg-bg-card rounded-md border border-border shadow-xs py-[32px] px-[36px] max-w-[920px]">
          <button
            type="button"
            onClick={() => setActiveTab('validar')}
            className="bg-transparent border-0 p-0 mb-[20px] text-[13px] font-semibold text-primary-600 cursor-pointer hover:underline"
          >
            ← Volver a la bandeja
          </button>
          <h3 className="text-[18px] font-extrabold text-midnight-900 m-0">Digitalizar acta física</h3>
          <p className="text-[13px] text-text-muted mt-[6px] mb-[28px]">
            Para actas levantadas en papel con formato preimpreso. El sistema verifica que la serie no esté repetida.
          </p>

          <form onSubmit={handleCrearIntervencionManual} className="flex flex-col gap-[32px]">
            <section>
              <h4 className="text-[13px] font-bold uppercase tracking-[0.5px] text-text-muted mb-[14px]">Series preimpresas</h4>
              <div className="grid grid-cols-3 gap-[20px] max-md:grid-cols-1">
                <div>
                  <Input
                    label="N° Notificación de Cargo *"
                    placeholder="Ej. NC-004521"
                    value={digitalizarForm.numeroNotificacionCargo}
                    onChange={(e) => setDigitalizarForm({ ...digitalizarForm, numeroNotificacionCargo: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleValidarCorrelativo('NOTIFICACION_CARGO', digitalizarForm.numeroNotificacionCargo)}
                    className="text-[12px] text-primary-600 bg-transparent border-0 p-0 cursor-pointer hover:underline"
                  >
                    Verificar serie en el sistema
                  </button>
                </div>
                <div>
                  <Input
                    label="N° Acta de Fiscalización"
                    placeholder="Ej. AF-009823"
                    value={digitalizarForm.numeroActaFiscalizacion}
                    onChange={(e) => setDigitalizarForm({ ...digitalizarForm, numeroActaFiscalizacion: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => handleValidarCorrelativo('ACTA_FISCALIZACION', digitalizarForm.numeroActaFiscalizacion)}
                    className="text-[12px] text-primary-600 bg-transparent border-0 p-0 cursor-pointer hover:underline"
                  >
                    Verificar serie en el sistema
                  </button>
                </div>
                <Input
                  label="Monto pasible de multa (S/)"
                  type="number"
                  placeholder="Ej. 2675.00"
                  value={digitalizarForm.montoPasibleMulta}
                  onChange={(e) => setDigitalizarForm({ ...digitalizarForm, montoPasibleMulta: e.target.value })}
                />
              </div>
              {correlativoStatus && <div className="mt-[4px] py-[10px] px-[14px] bg-bg-subtle rounded-sm text-[12.5px] text-text-secondary">{correlativoStatus}</div>}
            </section>

            <section>
              <h4 className="text-[13px] font-bold uppercase tracking-[0.5px] text-text-muted mb-[14px]">Predio y administrado</h4>
              <div className="grid grid-cols-[2fr_1fr] gap-[20px] max-md:grid-cols-1">
                <Input
                  label="Dirección del predio o intervención *"
                  placeholder="Ej. Av. Próceres de la Independencia 1420"
                  value={digitalizarForm.direccionAproximada}
                  onChange={(e) => setDigitalizarForm({ ...digitalizarForm, direccionAproximada: e.target.value })}
                  required
                />
                <Input
                  label="DNI o RUC"
                  placeholder="Ej. 10452367891"
                  value={digitalizarForm.numeroDocumento}
                  onChange={(e) => setDigitalizarForm({ ...digitalizarForm, numeroDocumento: e.target.value })}
                />
              </div>
              <Input
                label="Razón social o nombre del administrado"
                placeholder="Ej. Inversiones San Juan S.A.C."
                value={digitalizarForm.nombresRazonSocial}
                onChange={(e) => setDigitalizarForm({ ...digitalizarForm, nombresRazonSocial: e.target.value })}
              />
            </section>

            <section>
              <h4 className="text-[13px] font-bold uppercase tracking-[0.5px] text-text-muted mb-[14px]">Infracción</h4>
              <div className="grid grid-cols-2 gap-[20px] max-md:grid-cols-1">
                <Input
                  label="Código de infracción (CUIS)"
                  placeholder="Ej. G-010"
                  value={digitalizarForm.cuisCodigo}
                  onChange={(e) => setDigitalizarForm({ ...digitalizarForm, cuisCodigo: e.target.value })}
                />
                <Input
                  label="Giro o actividad comercial"
                  placeholder="Ej. Taller mecánico, Botica"
                  value={digitalizarForm.giroUso}
                  onChange={(e) => setDigitalizarForm({ ...digitalizarForm, giroUso: e.target.value })}
                />
              </div>
              <Textarea
                label="Hechos constatados en el acta de fiscalización *"
                placeholder="Describe las circunstancias de modo, tiempo y lugar constatadas..."
                value={digitalizarForm.hechosVerificados}
                onChange={(e) => setDigitalizarForm({ ...digitalizarForm, hechosVerificados: e.target.value })}
                rows={5}
                required
              />
            </section>

            <div className="flex justify-end gap-[10px] pt-[20px] border-t border-border">
              <Button variant="secondary" type="button" onClick={() => setActiveTab('validar')}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" loading={actionLoading}>
                Registrar acta y crear expediente
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <PanelTabla
          barra={
            <>
              <SegmentedTabs<Pestana>
                items={[
                  { clave: 'validar', etiqueta: 'Por validar', contador: expedientes.length },
                  { clave: 'observadas', etiqueta: 'Observadas', contador: observadas.length > 0 ? observadas.length : undefined, tono: 'danger' },
                ]}
                activa={activeTab}
                onChange={setActiveTab}
              />
              {activeTab === 'validar' && <Buscador value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por N° de expediente o fiscalizador" />}
            </>
          }
        >
          {/* BANDEJA DE VALIDACIÓN */}
          {activeTab === 'validar' &&
            (loading ? (
              <div className="py-[56px] text-center">
                <Spinner size={32} />
                <p className="text-[13px] text-text-muted mt-[12px]">Cargando expedientes pendientes de validación...</p>
              </div>
            ) : filteredExpedientes.length === 0 ? (
              <EmptyState
                icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
                title="Bandeja al día"
                description="No hay expedientes pendientes de validación en este momento."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className={TABLA.tabla}>
                  <thead>
                    <tr className={TABLA.encabezado}>
                      <th className={TABLA.th}>Expediente</th>
                      <th className={TABLA.th}>Fiscalizador</th>
                      <th className={TABLA.th}>Documento físico</th>
                      <th className={`${TABLA.th} text-right`}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpedientes.map((exp) => {
                      const fiscalizadorLimpio = (exp.fiscalizadorNombre || 'No asignado').replace(/\s*\(admin\s*dev\)/gi, '').trim();
                      const abrirDetalle = () =>
                        setDetalle({ intervencionId: exp.intervencionId, expedienteId: exp.id, numeroExpediente: exp.numeroExpediente, decidir: true });
                      return (
                        <tr key={exp.id} className={TABLA.fila}>
                          <td className={TABLA.td}>
                            <button
                              type="button"
                              onClick={abrirDetalle}
                              className="bg-transparent border-0 p-0 text-[14px] font-bold text-primary-700 cursor-pointer hover:underline"
                            >
                              {exp.numeroExpediente}
                            </button>
                            <div className="text-[12px] text-text-muted mt-[3px]">
                              {exp.fechaHoraInicioIntervencion
                                ? `${formatearFecha(exp.fechaHoraInicioIntervencion)} · ${formatearHora(exp.fechaHoraInicioIntervencion)} hrs`
                                : 'Sin fecha'}
                            </div>
                          </td>
                          <td className={TABLA.td}>
                            <div className="flex items-center gap-[10px]">
                              <span className="w-[30px] h-[30px] rounded-full bg-info-bg text-info font-bold text-[12px] flex items-center justify-center shrink-0">
                                {fiscalizadorLimpio.charAt(0)}
                              </span>
                              <span className="text-[13.5px] text-text-main">{fiscalizadorLimpio}</span>
                            </div>
                          </td>
                          <td className={TABLA.td}>
                            {exp.fechaIngresoFisico ? (
                              <EstadoPunto tono="ok">Recibido el {formatearFecha(exp.fechaIngresoFisico)}</EstadoPunto>
                            ) : (
                              <EstadoPunto tono="aviso">Pendiente de ingreso</EstadoPunto>
                            )}
                          </td>
                          <td className={`${TABLA.td} text-right`}>
                            <div className="inline-flex items-center gap-[8px]">
                              <Button variant="primary" size="sm" icon={<EyeIcon size={14} />} onClick={abrirDetalle}>
                                Revisar
                              </Button>
                              <MenuAcciones
                                acciones={[
                                  { etiqueta: 'Aprobar', tono: 'ok', deshabilitada: actionLoading, onClick: () => handleAprobar(exp.id, exp.numeroExpediente) },
                                  {
                                    etiqueta: 'Observar',
                                    tono: 'peligro',
                                    deshabilitada: actionLoading,
                                    onClick: () => setObservarModal({ isOpen: true, id: exp.id, numero: exp.numeroExpediente }),
                                  },
                                  ...(!exp.fechaIngresoFisico
                                    ? [{ etiqueta: 'Registrar ingreso físico', deshabilitada: actionLoading, onClick: () => handleIngresoFisico(exp.id, exp.numeroExpediente) }]
                                    : []),
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

          {/* EXPEDIENTES OBSERVADOS */}
          {activeTab === 'observadas' &&
            (observadas.length === 0 ? (
              <EmptyState
                icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
                title="Sin expedientes observados"
                description="No hay expedientes observados pendientes de corrección."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className={TABLA.tabla}>
                  <thead>
                    <tr className={TABLA.encabezado}>
                      <th className={TABLA.th}>Expediente</th>
                      <th className={TABLA.th}>Motivo de la observación</th>
                      <th className={`${TABLA.th} text-right`}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observadas.map((obs) => (
                      <tr key={obs.id} className={TABLA.fila}>
                        <td className={TABLA.td}>
                          <div className="text-[14px] font-bold text-midnight-900">{obs.numeroExpediente}</div>
                          <div className="text-[12px] text-text-muted mt-[3px]">{obs.fechaObservacion ? `Observado el ${formatearFecha(obs.fechaObservacion)}` : 'Observado recientemente'}</div>
                        </td>
                        <td className={TABLA.td}>
                          <div className="flex items-start gap-[10px] max-w-[480px]">
                            <span className="mt-[7px] w-[7px] h-[7px] rounded-full bg-danger shrink-0" />
                            <span className="text-[13px] text-text-secondary leading-[1.5]">{obs.motivo}</span>
                          </div>
                        </td>
                        <td className={`${TABLA.td} text-right`}>
                          <div className="inline-flex items-center gap-[8px]">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<EyeIcon size={14} />}
                              onClick={() => setDetalle({ intervencionId: obs.intervencionId, expedienteId: obs.id, numeroExpediente: obs.numeroExpediente, decidir: false })}
                            >
                              Revisar
                            </Button>
                            <BotonCorregirDato expedienteId={obs.id} etiqueta="Corregir" variante="primary" onCorregido={cargar} />
                            <MenuAcciones acciones={[{ etiqueta: 'Enviar a validación', deshabilitada: actionLoading, onClick: () => handleReenviarValidacion(obs) }]} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </PanelTabla>
      )}

      {/* Modal para Observar (SP2) */}
      <Modal
        isOpen={observarModal.isOpen}
        onClose={() => setObservarModal({ isOpen: false, id: '', numero: '' })}
        title={`Observar Expediente: ${observarModal.numero}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setObservarModal({ isOpen: false, id: '', numero: '' })}>
              Cancelar
            </Button>
            <Button variant="danger" loading={actionLoading} onClick={handleObservarSubmit}>
              Confirmar Observación
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-text-secondary mb-[14px]">
          Indique de forma motivada los defectos formales o materiales subsanables del acta de fiscalización:
        </p>
        <Textarea
          label="Detalle de Observaciones (Requerido)"
          placeholder="Ej. Falta firma de testigo, error en numeración de predio o datos incompletos..."
          value={observacionesTexto}
          onChange={(e) => setObservacionesTexto(e.target.value)}
          rows={4}
        />
      </Modal>

      {/* Panel de detalle: el expediente completo, con la decisión de validar a la mano */}
      <ExpedienteDetallePanel
        abierto={detalle !== null}
        onClose={() => setDetalle(null)}
        intervencionId={detalle?.intervencionId ?? null}
        numeroExpediente={detalle?.numeroExpediente}
        expedienteId={detalle?.expedienteId}
        pie={
          detalle?.decidir ? (
            <>
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={() => setObservarModal({ isOpen: true, id: detalle.expedienteId, numero: detalle.numeroExpediente })}
                className="border-danger! text-danger! hover:bg-danger-bg!"
              >
                Observar
              </Button>
              <Button
                variant="success"
                loading={actionLoading}
                onClick={async () => {
                  if (await handleAprobar(detalle.expedienteId, detalle.numeroExpediente)) setDetalle(null);
                }}
              >
                Aprobar expediente
              </Button>
            </>
          ) : undefined
        }
      />
    </div>
  );
};
