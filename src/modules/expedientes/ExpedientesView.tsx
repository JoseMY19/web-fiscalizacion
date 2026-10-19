import React, { useEffect, useState } from 'react';
import {
  ExpedientesApi,
  ExpedienteItem,
  IntervencionesApi,
  ActasApi,
} from '../../api';
import { ExpedientesObservadosApi, ExpedienteObservadoItem } from '../../api/expedientesObservados';
import { Button, Modal, Input, Textarea, Alert } from '../../components/common/Common';
import { Buscador, PageHeader, SegmentedTabs } from '../../components/common/PageKit';
import { TodoAlDia } from '../../components/common/TodoAlDia';
import { EsqueletoTarjetas } from '../../components/common/EsqueletoTarjetas';
import { hoyLocal } from '../../lib/fechas';
import { useConfirm } from '../../context/ConfirmContext';
import { ChecklistValidacionApi } from '../../api';
import { generarUuid } from '../../lib/uuid';
import { RefreshCwIcon, PlusIcon } from '../../components/icons/Icons';
import { ExpedienteDetallePanel } from './ExpedienteDetallePanel';
import { socket } from '../../lib/socket';
import { TarjetaObservada, TarjetaPorValidar } from './TarjetasBandeja';

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
        etiqueta="Procedimiento sancionador · Paso 2"
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
        <div className="bg-bg-card rounded-lg border border-border shadow-xs py-[32px] px-[36px] max-w-[920px] animate-aparecer">
          <button
            type="button"
            onClick={() => setActiveTab('validar')}
            className="group inline-flex items-center gap-[6px] bg-transparent border-0 p-0 mb-[20px] text-[13px] font-bold text-blue-800 cursor-pointer"
          >
            <span className="[transition:transform_200ms] group-hover:-translate-x-[3px]">←</span> Volver a la bandeja
          </button>
          <h3 className="text-[20px] font-bold text-text-main m-0">Digitalizar acta física</h3>
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
                    className="text-[12px] font-semibold text-blue-800 bg-transparent border-0 p-0 cursor-pointer hover:underline"
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
                    className="text-[12px] font-semibold text-blue-800 bg-transparent border-0 p-0 cursor-pointer hover:underline"
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
        <div className="flex flex-col gap-[16px]">
          {/* Pestañas de la bandeja, con su contador */}
          <div className="animate-aparecer [animation-delay:80ms]">
            <SegmentedTabs<Pestana>
              items={[
                { clave: 'validar', etiqueta: 'Por validar', contador: loading ? undefined : expedientes.length },
                { clave: 'observadas', etiqueta: 'Observadas', contador: observadas.length > 0 ? observadas.length : undefined, tono: 'danger' },
              ]}
              activa={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {/* Qué se está viendo y búsqueda */}
          <div className="flex items-center justify-between gap-[12px] flex-wrap py-[12px] px-[16px] rounded-lg bg-bg-card border border-border shadow-xs animate-aparecer [animation-delay:150ms]">
            <p key={activeTab} className="text-[13px] text-text-muted m-0 animate-aparecer [animation-duration:300ms]">
              {activeTab === 'observadas' ? (
                <>
                  <span className="font-bold text-text-main">Observadas:</span> corrige los datos y envíalas de nuevo a validación.
                </>
              ) : (
                <>
                  <span className="font-bold text-text-main">Por validar:</span> revisa el expediente completo y apruébalo u obsérvalo.
                </>
              )}
            </p>
            {activeTab === 'validar' && <Buscador value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por N° de expediente o fiscalizador" />}
          </div>

          {/* BANDEJA DE VALIDACIÓN */}
          {activeTab === 'validar' &&
            (loading ? (
              <EsqueletoTarjetas />
            ) : filteredExpedientes.length === 0 ? (
              <div className="rounded-lg bg-bg-card border border-dashed border-border-dark py-[24px]">
                <TodoAlDia
                  titulo={searchTerm ? 'Sin resultados' : 'Bandeja al día'}
                  descripcion={
                    searchTerm
                      ? 'Ningún expediente coincide con este filtro.'
                      : 'No hay expedientes pendientes de validación en este momento.'
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-[12px]">
                {filteredExpedientes.map((exp, i) => (
                  <TarjetaPorValidar
                    key={exp.id}
                    expediente={exp}
                    indice={i}
                    onRevisar={() =>
                      setDetalle({ intervencionId: exp.intervencionId, expedienteId: exp.id, numeroExpediente: exp.numeroExpediente, decidir: true })
                    }
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
                ))}
              </div>
            ))}

          {/* EXPEDIENTES OBSERVADOS */}
          {activeTab === 'observadas' &&
            (observadas.length === 0 ? (
              <div className="rounded-lg bg-bg-card border border-dashed border-border-dark py-[24px]">
                <TodoAlDia titulo="Sin expedientes observados" descripcion="No hay expedientes observados pendientes de corrección." />
              </div>
            ) : (
              <div className="flex flex-col gap-[12px]">
                {observadas.map((obs, i) => (
                  <TarjetaObservada
                    key={obs.id}
                    observada={obs}
                    indice={i}
                    onRevisar={() => setDetalle({ intervencionId: obs.intervencionId, expedienteId: obs.id, numeroExpediente: obs.numeroExpediente, decidir: false })}
                    onCorregido={cargar}
                    acciones={[{ etiqueta: 'Enviar a validación', deshabilitada: actionLoading, onClick: () => handleReenviarValidacion(obs) }]}
                  />
                ))}
              </div>
            ))}
        </div>
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
