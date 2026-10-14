import React, { useCallback, useEffect, useState } from 'react';
import {
  CAMPOS_ADMINISTRADO,
  CampoAdministrado,
  CorreccionesApi,
  CorreccionMaterialItem,
  EstadoCorrecciones,
  InfraccionCorregible,
  LABEL_CAMPO_CORRECCION,
} from '../../api/correcciones';
import { CodigoCuisRegistro, CuisMantenimientoApi, EscalaCuisRegistro } from '../../api/cuisMantenimiento';
import { Alert, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { formatearFechaHora } from '../../lib/fechas';
import { cn } from '../../lib/cn';
import { PenToolIcon } from '../../components/icons/Icons';

/** "Historial de correcciones" (fecha, autor, campo, antes → después, motivo). Solo lectura. */
export const HistorialCorrecciones: React.FC<{ historial: CorreccionMaterialItem[] }> = ({ historial }) =>
  historial.length === 0 ? (
    <p className="text-[12px] text-text-muted">Sin correcciones de error material.</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="text-left text-text-muted border-b border-b-border">
            <th className="py-[6px] pr-[10px]">Fecha</th>
            <th className="py-[6px] pr-[10px]">Autor</th>
            <th className="py-[6px] pr-[10px]">Campo</th>
            <th className="py-[6px] pr-[10px]">Antes → después</th>
            <th className="py-[6px]">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((h) => (
            <tr key={h.id} className="border-b border-b-border align-top">
              <td className="py-[6px] pr-[10px] whitespace-nowrap">{formatearFechaHora(h.createdAt)}</td>
              <td className="py-[6px] pr-[10px]">{h.autor}</td>
              <td className="py-[6px] pr-[10px]">{LABEL_CAMPO_CORRECCION[h.campo]}</td>
              <td className="py-[6px] pr-[10px]">
                <span className="line-through text-text-muted">{h.valorAnterior ?? '(vacío)'}</span> → <strong>{h.valorNuevo}</strong>
              </td>
              <td className="py-[6px]">{h.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

/** Carga el historial por sí mismo (p. ej. en el detalle del expediente). */
export const HistorialCorreccionesExpediente: React.FC<{ expedienteId: string }> = ({ expedienteId }) => {
  const [historial, setHistorial] = useState<CorreccionMaterialItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    CorreccionesApi.obtener(expedienteId)
      .then((e) => setHistorial(e.historial))
      .catch((err: any) => setError(err.message || 'No se pudo cargar el historial de correcciones.'));
  }, [expedienteId]);
  if (error) return <p className="text-[12px] text-text-muted">{error}</p>;
  if (!historial) return <Spinner size={14} />;
  return <HistorialCorrecciones historial={historial} />;
};


interface Props {
  expedienteId: string;
  /** Tras corregir: el panel recarga los datos que muestra. */
  onCorregido?: () => void;
}

/**
 * "Editar datos" + historial, en Validación, IFI y Resolución. Cada cambio
 * queda trazado (antes → después, autor, motivo).
 */
export const CorreccionMaterialSeccion: React.FC<Props> = ({ expedienteId, onCorregido }) => {
  const [estado, setEstado] = useState<EstadoCorrecciones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setEstado(await CorreccionesApi.obtener(expedienteId));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar las correcciones.');
    }
  }, [expedienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="border-t border-t-border pt-[14px] mt-[4px]">
      <div className="flex items-center justify-between gap-[8px] flex-wrap mb-[8px]">
        <div>
          <div className="text-[13px] font-bold text-midnight-900">Datos del expediente</div>
          <div className="text-[11px] text-text-muted">Administrado e infracción. Lo que se corrige queda registrado.</div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<PenToolIcon size={14} />}
          disabled={!estado?.puedeCorregir}
          onClick={() => {
            setAviso(null);
            setModal(true);
          }}
        >
          Editar datos
        </Button>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {aviso && <Alert type="success">{aviso}</Alert>}
      {estado && !estado.puedeCorregir && estado.motivoNoCorregible && (
        <p className="text-[11px] text-text-muted mb-[8px]">{estado.motivoNoCorregible}</p>
      )}
      <div className="text-[12px] font-semibold text-text-secondary mb-[4px]">Historial de correcciones</div>
      {estado ? <HistorialCorrecciones historial={estado.historial} /> : !error && <Spinner size={14} />}

      {modal && estado && (
        <EditarDatosModal
          expedienteId={expedienteId}
          estado={estado}
          onClose={() => setModal(false)}
          onCorregido={async () => {
            setModal(false);
            setAviso('Datos corregidos. Si el IFI o la resolución ya tenían antecedentes generados, regenéralos para que tomen el dato nuevo.');
            await cargar();
            onCorregido?.();
          }}
        />
      )}
    </div>
  );
};

/**
 * Botón "Editar datos" para ponerlo donde se ven los datos (checklist de
 * validación, sanear imputación). Abre la misma pantalla de edición.
 */
export const BotonCorregirDato: React.FC<Props & { etiqueta?: string; variante?: 'ghost' | 'secondary' | 'primary' }> = ({
  expedienteId,
  onCorregido,
  etiqueta = 'Editar datos',
  variante = 'ghost',
}) => {
  const [estado, setEstado] = useState<EstadoCorrecciones | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrir = async () => {
    setCargando(true);
    setError(null);
    try {
      const e = await CorreccionesApi.obtener(expedienteId);
      setEstado(e);
      if (e.puedeCorregir) setAbierto(true);
      else setError(e.motivoNoCorregible ?? 'No se puede corregir en esta etapa.');
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar los datos.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <Button variant={variante} size="sm" icon={<PenToolIcon size={13} />} loading={cargando} onClick={abrir}>
        {etiqueta}
      </Button>
      {error && <span className="text-[11px] text-text-muted">{error}</span>}
      {abierto && estado && (
        <EditarDatosModal
          expedienteId={expedienteId}
          estado={estado}
          onClose={() => setAbierto(false)}
          onCorregido={() => {
            setAbierto(false);
            onCorregido?.();
          }}
        />
      )}
    </>
  );
};

// ─── Pantalla de edición ───

type EdicionInfraccion = { cuisCodigoId: string; codigo: string; cuisEscalaMontoId: string | null; escalas: EscalaCuisRegistro[] | null };

const claseCampo = 'w-full py-[9px] px-[12px] text-[13px] rounded-[6px] border border-border bg-bg-card text-text-main outline-none focus:border-primary-600';

/** Formulario con los datos ya escritos: se cambia lo que esté mal y se guarda con un solo motivo. */
export const EditarDatosModal: React.FC<{
  expedienteId: string;
  estado: EstadoCorrecciones;
  onClose: () => void;
  onCorregido: () => void;
}> = ({ expedienteId, estado, onClose, onCorregido }) => {
  const inicial = estado.administrado?.valores ?? null;
  const [valores, setValores] = useState<Record<CampoAdministrado, string>>(
    () => Object.fromEntries(CAMPOS_ADMINISTRADO.map((c) => [c, inicial?.[c] ?? ''])) as Record<CampoAdministrado, string>,
  );
  const [infracciones, setInfracciones] = useState<Record<string, EdicionInfraccion>>(() =>
    Object.fromEntries(
      estado.infracciones.map((i) => [i.intervencionCuisId, { cuisCodigoId: i.cuisCodigoId, codigo: i.codigo, cuisEscalaMontoId: i.cuisEscalaMontoId, escalas: null }]),
    ),
  );
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escalas de los códigos actuales (para elegir la que falta o cambiarla).
  useEffect(() => {
    estado.infracciones.forEach((i) => {
      CuisMantenimientoApi.listar({ q: i.codigo, tamano: 20 })
        .then((r) => {
          const c = r.items.find((x) => x.id === i.cuisCodigoId);
          if (c) setInfracciones((s) => ({ ...s, [i.intervencionCuisId]: { ...s[i.intervencionCuisId], escalas: c.escalas } }));
        })
        .catch(() => undefined);
    });
  }, [estado.infracciones]);

  const cambiosAdministrado = CAMPOS_ADMINISTRADO.filter((c) => valores[c].trim() !== (inicial?.[c] ?? '').trim());
  const cambiosInfraccion = estado.infracciones.filter((i) => {
    const e = infracciones[i.intervencionCuisId];
    return e && (e.cuisCodigoId !== i.cuisCodigoId || e.cuisEscalaMontoId !== i.cuisEscalaMontoId);
  });
  const hayCambios = cambiosAdministrado.length > 0 || cambiosInfraccion.length > 0;

  const guardar = async () => {
    setError(null);
    if (!hayCambios) return setError('No cambiaste ningún dato.');
    if (cambiosAdministrado.some((c) => !valores[c].trim())) return setError('No se puede dejar un dato en blanco.');
    const sinEscala = cambiosInfraccion.find((i) => {
      const e = infracciones[i.intervencionCuisId];
      return (e.escalas?.length ?? 0) > 0 && !e.cuisEscalaMontoId;
    });
    if (sinEscala) return setError(`Elige la escala del código ${infracciones[sinEscala.intervencionCuisId].codigo}.`);
    if (!motivo.trim()) return setError('Escribe el motivo de la corrección.');
    setGuardando(true);
    try {
      if (cambiosAdministrado.length > 0) {
        await CorreccionesApi.corregir(expedienteId, {
          valores: Object.fromEntries(cambiosAdministrado.map((c) => [c, valores[c].trim()])),
          motivo: motivo.trim(),
        });
      }
      for (const i of cambiosInfraccion) {
        const e = infracciones[i.intervencionCuisId];
        await CorreccionesApi.corregirInfraccion(expedienteId, {
          intervencionCuisId: i.intervencionCuisId,
          cuisCodigoId: e.cuisCodigoId,
          cuisEscalaMontoId: e.cuisEscalaMontoId,
          motivo: motivo.trim(),
        });
      }
      onCorregido();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la corrección.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Editar datos del expediente"
      maxWidth="760px"
      footer={
        <>
          <span className="mr-auto text-[12px] text-text-muted">
            {hayCambios ? `${cambiosAdministrado.length + cambiosInfraccion.length} cambio(s) por guardar` : 'Sin cambios'}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} disabled={!hayCambios} onClick={guardar}>
            Guardar cambios
          </Button>
        </>
      }
    >
      {error && <Alert type="error">{error}</Alert>}

      <div className="mb-[16px]">
        <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted pb-[8px] border-b border-b-border mb-[12px]">
          Administrado
        </div>
        {!estado.administrado ? (
          <p className="text-[12px] text-text-muted">La intervención no tiene administrado registrado.</p>
        ) : (
          <>
            {!estado.administrado.identificado && (
              <p className="text-[12px] text-text-secondary mb-[12px]">
                Figura como <strong>no identificado</strong>: si escribes su nombre o documento, pasa a identificado.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[16px] gap-y-[12px]">
              {CAMPOS_ADMINISTRADO.map((c) => {
                const cambiado = cambiosAdministrado.includes(c);
                return (
                  <div key={c} className={cn(c === 'NOMBRES_RAZON_SOCIAL' || c === 'DOMICILIO' || c === 'DOMICILIO_DNI' ? 'sm:col-span-2' : '')}>
                    <Input
                      label={LABEL_CAMPO_CORRECCION[c]}
                      value={valores[c]}
                      onChange={(e) => setValores((v) => ({ ...v, [c]: e.target.value }))}
                      helperText={cambiado ? `Antes: ${inicial?.[c] || '(vacío)'}` : undefined}
                      helperTextClassName={cambiado ? 'text-primary-600' : undefined}
                      className={cambiado ? 'border-primary-600!' : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="mb-[16px]">
        <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted pb-[8px] border-b border-b-border mb-[12px]">
          Infracción imputada
        </div>
        {estado.infracciones.length === 0 ? (
          <p className="text-[12px] text-text-muted">No hay código de infracción registrado.</p>
        ) : (
          <div className="space-y-[12px]">
            {estado.infracciones.map((i) => (
              <FilaInfraccion
                key={i.intervencionCuisId}
                actual={i}
                valor={infracciones[i.intervencionCuisId]}
                onCambio={(v) => setInfracciones((s) => ({ ...s, [i.intervencionCuisId]: v }))}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted pb-[8px] border-b border-b-border mb-[12px]">
          Motivo de la corrección
        </div>
        <p className="text-[11px] text-text-muted mb-[8px]">Obligatorio. Queda registrado junto con el antes y el después.</p>
        <Textarea
          placeholder="Ej. error de digitación en campo: el DNI del acta física dice 40123456"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
        />
      </div>
    </Modal>
  );
};

/** Código y escala de una infracción: buscar otro código y elegir su escala. */
const FilaInfraccion: React.FC<{
  actual: InfraccionCorregible;
  valor: EdicionInfraccion;
  onCambio: (v: EdicionInfraccion) => void;
}> = ({ actual, valor, onCambio }) => {
  const [buscando, setBuscando] = useState(false);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<CodigoCuisRegistro[]>([]);

  const buscar = async () => {
    if (!q.trim()) return;
    const r = await CuisMantenimientoApi.listar({ q: q.trim(), tamano: 10 }).catch(() => null);
    setResultados(r?.items.filter((c) => c.activo) ?? []);
  };

  const elegir = (c: CodigoCuisRegistro) => {
    onCambio({ cuisCodigoId: c.id, codigo: c.codigoNormativo, escalas: c.escalas, cuisEscalaMontoId: c.escalas.length === 1 ? c.escalas[0].id : null });
    setBuscando(false);
    setResultados([]);
    setQ('');
  };

  const cambiado = valor.cuisCodigoId !== actual.cuisCodigoId || valor.cuisEscalaMontoId !== actual.cuisEscalaMontoId;

  return (
    <div className={cn('rounded-[8px] border p-[14px]', cambiado ? 'border-primary-600' : 'border-border')}>
      <div className="text-[18px] font-bold text-text-main tabular-nums mb-[12px]">{valor.codigo}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[16px] gap-y-[8px] mb-[12px]">
        <div className="w-full">
          <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Escala</label>
          <select
            value={valor.cuisEscalaMontoId ?? ''}
            onChange={(e) => onCambio({ ...valor, cuisEscalaMontoId: e.target.value || null })}
            className={claseCampo}
            disabled={!valor.escalas}
          >
            <option value="">{valor.escalas === null ? 'Cargando…' : valor.escalas.length === 0 ? 'Este código no tiene escala' : '— Elegir escala —'}</option>
            {valor.escalas?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.escala} · {e.valorPorcentaje}% UIT{e.condicion ? ` · ${e.condicion}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setBuscando((b) => !b)}>
            {buscando ? 'Cancelar' : 'Cambiar código'}
          </Button>
        </div>
      </div>

      {cambiado && (
        <p className="text-[11px] text-text-muted mb-[12px]">
          Antes: {actual.codigo} · {actual.escalaTexto ?? 'sin escala'}
        </p>
      )}

      {buscando && (
        <div className="mt-[12px] pt-[12px] border-t border-t-border">
          <form
            className="flex gap-[8px] mb-[12px]"
            onSubmit={(e) => {
              e.preventDefault();
              buscar();
            }}
          >
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código (8.02.47) o palabras" className={claseCampo} autoFocus />
            <Button size="sm" type="submit">
              Buscar
            </Button>
          </form>
          {resultados.length > 0 && (
            <ul className="max-h-[220px] overflow-y-auto border border-border rounded-[6px] divide-y divide-border-subtle">
              {resultados.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => elegir(c)} className="w-full text-left py-[7px] px-[10px] text-[12px] hover:bg-bg-hover cursor-pointer">
                    <strong className="text-text-main tabular-nums">{c.idInterno}</strong>
                    <span className="text-text-secondary"> — {c.textoCompletoPdf ?? ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
