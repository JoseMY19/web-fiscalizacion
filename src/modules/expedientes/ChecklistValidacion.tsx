import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChecklistValidacion as Checklist, ChecklistValidacionApi, ItemChecklist } from '../../api';
import { AlertTriangleIcon, CheckCircleIcon, CheckIcon, ChevronRightIcon, XCircleIcon } from '../../components/icons/Icons';
import { cn } from '../../lib/cn';
import { Button } from '../../components/common/Common';
import { BotonCorregirDato } from '../correcciones/CorreccionMaterial';

/**
 * Checklist de completitud (reunión: "validar es solo revisar que esté
 * completo"). Arriba el estado y lo pendiente; lo verificado queda plegado
 * por grupos. Rojo = falta algo necesario; ámbar = revisar. La revisión
 * legal de la imputación es del IFI.
 */

const GRUPOS: Array<{ nombre: string; incluye: (clave: string) => boolean }> = [
  { nombre: 'Intervención', incluye: (c) => c === 'ubicacion' },
  { nombre: 'Administrado', incluye: (c) => c.startsWith('administrado') },
  { nombre: 'Acta e infracción', incluye: (c) => c === 'acta' || c === 'foto-acta' || c.startsWith('cuis') },
  { nombre: 'Notificación de cargo', incluye: (c) => c.startsWith('nc') || c === 'foto-nc' || c === 'firma' },
  { nombre: 'Medidas y actas adicionales', incluye: (c) => c.startsWith('mp-') || c === 'foto-adicional' },
];

const grupoDe = (clave: string) => GRUPOS.find((g) => g.incluye(clave))?.nombre ?? 'Otros';

type Nivel = 'ok' | 'aviso' | 'falta';
const nivelDe = (x: ItemChecklist): Nivel => (x.ok ? 'ok' : x.obligatorio ? 'falta' : 'aviso');

const ESTILO: Record<Nivel, { barra: string; fondo: string; texto: string }> = {
  ok: { barra: 'bg-success', fondo: 'bg-success-bg', texto: 'text-success' },
  aviso: { barra: 'bg-warning', fondo: 'bg-warning-bg', texto: 'text-warning' },
  falta: { barra: 'bg-danger', fondo: 'bg-danger-bg', texto: 'text-danger' },
};

/** `soloSiPendiente`: en el IFI solo aparece si queda algo por completar. */
export const ChecklistValidacion: React.FC<{ expedienteId: string; soloSiPendiente?: boolean }> = ({ expedienteId, soloSiPendiente }) => {
  const [c, setC] = useState<Checklist | null>(null);
  const [verOk, setVerOk] = useState(false);

  const cargar = useCallback(() => {
    ChecklistValidacionApi.obtener(expedienteId)
      .then(setC)
      .catch(() => setC(null));
  }, [expedienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!c) return null;
  if (soloSiPendiente && c.items.every((x) => x.ok)) return null;

  const total = c.items.length;
  const verificados = c.items.filter((x) => x.ok);
  // Primero lo que falta (necesario), luego las advertencias.
  const pendientes = c.items.filter((x) => !x.ok).sort((a, b) => Number(b.obligatorio) - Number(a.obligatorio));
  const estado: Nivel = c.faltanObligatorios > 0 ? 'falta' : pendientes.length > 0 ? 'aviso' : 'ok';
  const e = ESTILO[estado];

  const titulo =
    estado === 'falta'
      ? `Incompleto: falta${c.faltanObligatorios === 1 ? '' : 'n'} ${c.faltanObligatorios} dato${c.faltanObligatorios === 1 ? '' : 's'} necesario${c.faltanObligatorios === 1 ? '' : 's'}`
      : estado === 'aviso'
        ? `Completo, con ${pendientes.length} punto${pendientes.length === 1 ? '' : 's'} por revisar`
        : 'Expediente completo';

  const gruposOk = GRUPOS.map((g) => g.nombre)
    .concat('Otros')
    .map((nombre) => ({ nombre, items: verificados.filter((x) => grupoDe(x.clave) === nombre) }))
    .filter((g) => g.items.length > 0);

  return (
    <section className="rounded-[10px] border border-border bg-bg-card mb-[16px] overflow-hidden">
      {/* Encabezado: estado + avance */}
      <div className="flex items-center gap-[12px] py-[12px] px-[16px]">
        <div className={cn('w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0', e.fondo, e.texto)}>
          {estado === 'ok' ? <CheckCircleIcon size={20} /> : estado === 'aviso' ? <AlertTriangleIcon size={20} /> : <XCircleIcon size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-text-main leading-tight">{titulo}</div>
          <div className="text-[12px] text-text-muted mt-[2px]">Validación de completitud · la revisión legal la hace el IFI</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[18px] font-bold text-text-main leading-none tabular-nums">
            {verificados.length}
            <span className="text-text-light text-[14px] font-semibold">/{total}</span>
          </div>
          <div className="text-[11px] text-text-muted mt-[3px]">verificados</div>
        </div>
      </div>

      {/* Barra segmentada: un tramo por punto revisado */}
      <div className="flex gap-[2px] px-[16px] pb-[12px]">
        {c.items.map((x) => (
          <span key={x.clave} title={x.etiqueta} className={cn('h-[5px] flex-1 rounded-full', ESTILO[nivelDe(x)].barra)} />
        ))}
      </div>

      {/* Lo pendiente, siempre visible */}
      {pendientes.length > 0 && (
        <ul className="flex flex-col gap-[6px] px-[16px] pb-[12px]">
          {pendientes.map((x) => {
            const n = nivelDe(x);
            return (
              <li key={x.clave} className={cn('flex items-start gap-[10px] rounded-[8px] py-[9px] px-[12px]', ESTILO[n].fondo)}>
                <span className={cn('mt-[1px] shrink-0', ESTILO[n].texto)}>
                  {n === 'falta' ? <XCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-[8px] flex-wrap">
                    <span className="text-[13px] font-semibold text-text-main">{x.etiqueta}</span>
                    <span className={cn('text-[10px] font-bold uppercase tracking-[0.04em]', ESTILO[n].texto)}>
                      {n === 'falta' ? 'Necesario' : 'Revisar'}
                    </span>
                  </div>
                  {x.detalle && <div className="text-[12px] text-text-secondary mt-[2px] leading-[1.45]">{x.detalle}</div>}
                </div>
                {/* Se corrige aquí mismo, en oficina (campo ya no recibe observados). */}
                {x.accion?.tipo === 'EDITAR' && (
                  <div className="shrink-0 self-center">
                    <BotonCorregirDato expedienteId={expedienteId} etiqueta="Corregir" variante="secondary" onCorregido={cargar} />
                  </div>
                )}
                {x.accion?.tipo === 'FOTO' && (
                  <div className="shrink-0 self-center">
                    <SubirFotoActa intervencionId={c.intervencionId} actaTipo={x.accion.actaTipo} onSubida={cargar} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Lo verificado, plegado por grupos */}
      {verificados.length > 0 && (
        <div className="border-t border-border-subtle">
          <button
            type="button"
            onClick={() => setVerOk((v) => !v)}
            className="w-full flex items-center gap-[6px] py-[9px] px-[16px] text-[12px] font-semibold text-text-secondary hover:bg-bg-hover cursor-pointer"
          >
            <span className={cn('inline-flex transition-transform duration-150', verOk && 'rotate-90')}>
              <ChevronRightIcon size={14} />
            </span>
            {verOk ? 'Ocultar lo verificado' : `Ver lo verificado (${verificados.length})`}
          </button>
          {verOk && (
            // Una fila por grupo: nombre a la izquierda, lo verificado en línea.
            <dl className="px-[16px] pb-[12px] text-[12px]">
              {gruposOk.map((g) => (
                <div key={g.nombre} className="flex gap-[12px] py-[6px] border-t border-border-subtle first:border-t-0">
                  <dt className="w-[150px] shrink-0 text-text-muted">{g.nombre}</dt>
                  <dd className="flex-1 min-w-0 flex flex-wrap gap-x-[14px] gap-y-[3px] text-text-secondary">
                    {g.items.map((x) => (
                      <span key={x.clave} className="inline-flex items-center gap-[5px]">
                        <span className="text-success">
                          <CheckIcon size={12} />
                        </span>
                        {x.etiqueta}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
};

/** Sube desde la PC la foto que falta de un acta (escaneada o desde el celular). */
const SubirFotoActa: React.FC<{ intervencionId: string; actaTipo: string; onSubida: () => void }> = ({ intervencionId, actaTipo, onSubida }) => {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subir = async (archivo: File) => {
    setSubiendo(true);
    setError(null);
    try {
      await ChecklistValidacionApi.subirFoto(intervencionId, actaTipo, archivo);
      onSubida();
    } catch (err: any) {
      setError(err.message || 'No se pudo subir la foto.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-[2px]">
      <Button size="sm" variant="secondary" loading={subiendo} onClick={() => input.current?.click()}>
        Subir foto
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) subir(f);
          e.target.value = '';
        }}
      />
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
};
