import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ControlDocumentarioApi, LABEL_ORIGEN_EXTERNO, type DocumentoControl, type OrigenExterno } from '../../api/controlDocumentario';
import { Alert, Button, EmptyState, Input, Select, Spinner, Textarea } from '../../components/common/Common';
import { Buscador, EstadoPunto, PanelDetalle, TABLA } from '../../components/common/PageKit';
import { FileTextIcon, PlusIcon } from '../../components/icons/Icons';
import { formatearFechaHora } from '../../lib/fechas';

interface FormEntrada {
  origen: string;
  numeroSgd: string;
  remitente: string;
  asunto: string;
  fechaHora: string;
  folios: string;
  derivadoA: string;
  numeroExpediente: string;
}

const FORM_VACIO: FormEntrada = {
  origen: 'DENUNCIA',
  numeroSgd: '',
  remitente: '',
  asunto: '',
  fechaHora: '',
  folios: '1',
  derivadoA: '',
  numeroExpediente: '',
};

/** Fecha y hora locales como 'AAAA-MM-DDTHH:mm' (formato de <input type="datetime-local">). */
function fechaHoraLocal(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const EntradasTab: React.FC = () => {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [items, setItems] = useState<DocumentoControl[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Panel de registro
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormEntrada>(FORM_VACIO);
  const [errorPanel, setErrorPanel] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Evita que una respuesta vieja pise la de una búsqueda más reciente.
  const pedidoActual = useRef(0);
  const primeraCarga = useRef(true);

  const cargar = useCallback(async (q: string) => {
    const pedido = ++pedidoActual.current;
    setCargando(true);
    setError(null);
    try {
      const res = await ControlDocumentarioApi.entradas(q);
      if (pedido === pedidoActual.current) setItems(Array.isArray(res) ? res : []);
    } catch (err: any) {
      if (pedido === pedidoActual.current) setError(err.message || 'No se pudieron cargar los documentos de entrada.');
    } finally {
      if (pedido === pedidoActual.current) setCargando(false);
    }
  }, []);

  // Búsqueda con espera de 350 ms tras la última tecla; la primera carga es inmediata.
  useEffect(() => {
    const demora = primeraCarga.current ? 0 : 350;
    primeraCarga.current = false;
    const id = window.setTimeout(() => cargar(busqueda), demora);
    return () => window.clearTimeout(id);
  }, [busqueda, cargar]);

  const cerrar = useCallback(() => {
    setAbierto(false);
    setForm(FORM_VACIO);
    setErrorPanel(null);
  }, []);

  const set = (k: keyof FormEntrada) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const registrar = async () => {
    const faltan = [
      !form.remitente.trim() && 'remitente',
      !form.asunto.trim() && 'asunto',
      !form.fechaHora && 'fecha y hora de ingreso',
    ].filter(Boolean);
    if (faltan.length > 0) {
      setErrorPanel(`Completa los campos obligatorios: ${faltan.join(', ')}.`);
      return;
    }

    setErrorPanel(null);
    setGuardando(true);
    try {
      let expedienteId: string | undefined;
      const numeroExpediente = form.numeroExpediente.trim();
      if (numeroExpediente) {
        const res = await ControlDocumentarioApi.expediente(numeroExpediente);
        expedienteId = res.expediente.id;
      }

      await ControlDocumentarioApi.registrarEntradaExterna({
        origen: form.origen as OrigenExterno,
        remitente: form.remitente.trim(),
        asunto: form.asunto.trim(),
        fechaHoraIngreso: new Date(form.fechaHora).toISOString(),
        numeroSgd: form.numeroSgd.trim() || undefined,
        folios: form.folios.trim() ? Number(form.folios) : undefined,
        derivadoA: form.derivadoA.trim() || undefined,
        expedienteId,
      });

      cerrar();
      setMensaje({ type: 'success', text: 'Documento externo registrado.' });
      cargar(busqueda);
    } catch (err: any) {
      setErrorPanel(err.message || 'No se pudo registrar el documento.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <div className="py-[16px] px-[24px] border-b border-border flex items-center justify-between flex-wrap gap-[14px]">
        <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por expediente, N° de documento, SGD o asunto" />
        <Button variant="primary" icon={<PlusIcon size={15} />} onClick={() => setAbierto(true)}>
          Registrar documento externo
        </Button>
      </div>

      {(mensaje || error) && (
        <div className="px-[24px] pt-[16px]">
          {mensaje && <Alert type={mensaje.type}>{mensaje.text}</Alert>}
          {error && <Alert type="error">{error}</Alert>}
        </div>
      )}

      {items === null ? (
        error ? null : (
          <div className="py-[56px] text-center">
            <Spinner size={32} />
            <p className="text-[13px] text-text-muted mt-[12px]">Cargando documentos de entrada...</p>
          </div>
        )
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileTextIcon size={40} />}
          title="Sin documentos de entrada"
          description="Aquí aparecen los escritos que llegan: descargos, solicitudes, recursos y documentos externos."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className={TABLA.tabla}>
            <thead>
              <tr className={TABLA.encabezado}>
                <th className={TABLA.th}>Documento</th>
                <th className={TABLA.th}>N°</th>
                <th className={TABLA.th}>Expediente</th>
                <th className={TABLA.th}>Recibido</th>
                <th className={`${TABLA.th} text-right`}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.clave} className={TABLA.fila}>
                  <td className={TABLA.td}>
                    <div className="text-[14px] font-bold text-midnight-900">{d.tipo}</div>
                    {d.asunto && <div className="text-[12px] text-text-muted mt-[3px] line-clamp-2 max-w-[380px]">{d.asunto}</div>}
                  </td>
                  <td className={TABLA.td}>
                    {d.numero || d.numeroSgd ? (
                      <>
                        {d.numero && <div className="text-[13px] text-text-main">{d.numero}</div>}
                        {d.numeroSgd && <div className="text-[12px] text-text-muted mt-[3px]">SGD {d.numeroSgd}</div>}
                      </>
                    ) : (
                      <span className="text-text-light">—</span>
                    )}
                  </td>
                  <td className={TABLA.td}>
                    <span className="text-[13.5px] text-text-main">{d.numeroExpediente || '—'}</span>
                  </td>
                  <td className={TABLA.td}>
                    <span className="text-[13.5px] text-text-main whitespace-nowrap">{formatearFechaHora(d.fecha)}</span>
                  </td>
                  <td className={`${TABLA.td} text-right`}>
                    <div className="inline-flex items-center gap-[12px] flex-wrap justify-end">
                      {d.estado && <EstadoPunto tono="neutro">{d.estado}</EstadoPunto>}
                      {d.modulo ? (
                        <Button variant="secondary" size="sm" onClick={() => navigate('/' + d.modulo)}>
                          Ir al módulo
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PanelDetalle
        abierto={abierto}
        onClose={cerrar}
        titulo="Registrar documento externo"
        subtitulo="Oficios, denuncias y otros escritos que llegan a Mesa de Partes"
        pie={
          <>
            <Button variant="secondary" onClick={cerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="primary" loading={guardando} onClick={registrar}>
              Registrar
            </Button>
          </>
        }
      >
        {errorPanel && <Alert type="error">{errorPanel}</Alert>}

        <Select label="Origen" value={form.origen} onChange={set('origen')}>
          {Object.entries(LABEL_ORIGEN_EXTERNO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </Select>

        <Input label="N° de SGD (opcional)" value={form.numeroSgd} onChange={set('numeroSgd')} />

        <Input label="Remitente *" value={form.remitente} onChange={set('remitente')} />

        <Textarea label="Asunto *" rows={3} value={form.asunto} onChange={set('asunto')} />

        <Input
          label="Fecha y hora de ingreso *"
          type="datetime-local"
          max={fechaHoraLocal()}
          value={form.fechaHora}
          onChange={set('fechaHora')}
        />

        <Input label="Folios" type="number" min={1} value={form.folios} onChange={set('folios')} />

        <Input label="Derivado a (opcional)" value={form.derivadoA} onChange={set('derivadoA')} />

        <Input
          label="N° de expediente (opcional)"
          value={form.numeroExpediente}
          onChange={set('numeroExpediente')}
          helperText="Si lo indicas, el documento queda enlazado al expediente."
        />
      </PanelDetalle>
    </>
  );
};
