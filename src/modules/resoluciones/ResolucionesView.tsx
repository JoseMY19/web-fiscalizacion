import React, { useCallback, useEffect, useState } from 'react';
import { ResolucionesApi, BandejaResoluciones } from '../../api';
import { socket } from '../../lib/socket';
import { Button, Alert } from '../../components/common/Common';
import { PageHeader, SegmentedTabs } from '../../components/common/PageKit';
import { TodoAlDia } from '../../components/common/TodoAlDia';
import { EsqueletoTarjetas } from '../../components/common/EsqueletoTarjetas';
import { CHIP_ESTADO, CHIP_POR_VARIANTE } from '../../components/common/estilosBandeja';
import { BuscadorDesplegable, useBuscadorDesplegable } from '../../components/common/BuscadorDesplegable';
import { cn } from '../../lib/cn';
import { GavelIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { ResolucionPanel } from './ResolucionPanel';
import { CHIP_TIPO, labelEtapa, varianteDiasEnFirma, varianteEtapa } from './resolucionUi';
import { TarjetaResolucion } from './TarjetaResolucion';
import { PagadoBadge } from '../../components/common/PagadoBadge';

type Pestana = 'enRedaccion' | 'porFirmar' | 'firmadas';

const PESTANAS: { clave: Pestana; titulo: string; ayuda: string }[] = [
  {
    clave: 'enRedaccion',
    titulo: 'En redacción',
    ayuda: 'IFI notificado y resolución en preparación (incluye los que esperan los 5 días hábiles de descargo contra el IFI).',
  },
  {
    clave: 'porFirmar',
    titulo: 'Por firmar',
    ayuda: 'Resoluciones entregadas al Subgerente. Cuando las devuelva firmadas, registra la firma.',
  },
  {
    clave: 'firmadas',
    titulo: 'Firmadas',
    ayuda: 'Firmadas pendientes de notificar + notificadas de los últimos 30 días. Las más antiguas, con el buscador.',
  },
];

const BANDEJA_VACIA: BandejaResoluciones = { enRedaccion: [], porFirmar: [], firmadas: [] };

/**
 * SP5 — Resoluciones. Mismo espíritu que IFI: pasos claros y nada se
 * pierde. Los abogados redactan todo; el Subgerente solo firma el papel
 * (se registra "enviada a firma" y "firmada" con fechas reales).
 */
export const ResolucionesView: React.FC = () => {
  const [bandeja, setBandeja] = useState<BandejaResoluciones>(BANDEJA_VACIA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('enRedaccion');

  const buscador = useBuscadorDesplegable(ResolucionesApi.buscar);

  const [abierto, setAbierto] = useState<{ expedienteId: string; numeroExpediente: string } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ResolucionesApi.getBandeja();
      setBandeja({
        enRedaccion: data?.enRedaccion ?? [],
        porFirmar: data?.porFirmar ?? [],
        firmadas: data?.firmadas ?? [],
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar la bandeja de resoluciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const { refrescarSiAbierta } = buscador;
  const refrescarTodo = useCallback(() => {
    cargar();
    refrescarSiAbierta();
  }, [cargar, refrescarSiAbierta]);

  useEffect(() => {
    cargar();
    socket.on('resolucion:pendiente', refrescarTodo);
    return () => {
      socket.off('resolucion:pendiente', refrescarTodo);
    };
  }, [cargar, refrescarTodo]);

  const filas = bandeja[pestana];
  const ayudaPestana = PESTANAS.find((p) => p.clave === pestana)?.ayuda;
  // O5: la más antigua en firma define el color del contador de la pestaña.
  const maxDiasEnFirma = bandeja.porFirmar.reduce((m, f) => Math.max(m, f.plazos.diasEnFirma ?? 0), 0);
  // El contador "Por firmar" solo se pinta cuando hay resoluciones en firma demasiado tiempo.
  const tonoPorFirmar = varianteDiasEnFirma(maxDiasEnFirma) === 'danger' ? 'danger' : varianteDiasEnFirma(maxDiasEnFirma) === 'warning' ? 'warning' : undefined;

  return (
    <div>
      <PageHeader
        etiqueta="Procedimiento sancionador · Paso 5"
        titulo="Resolución Sancionadora"
        descripcion={
          <>
            La decisión oficial del caso. El tipo sale del IFI: si recomendó <strong>sancionar</strong> → RSGSA (multa y/o
            medida complementaria); si recomendó <strong>archivar</strong> → RSG (a favor del administrado). Se redacta,
            se entrega al Subgerente para su firma en papel, se registra la firma y se notifica.
          </>
        }
        acciones={
          <Button variant="secondary" icon={<RefreshCwIcon size={14} />} loading={loading} onClick={refrescarTodo}>
            Actualizar
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <div className="flex flex-col gap-[16px]">
        {/* Pestañas de la bandeja, con su contador */}
        <div className="animate-aparecer [animation-delay:80ms]">
          <SegmentedTabs<Pestana>
            items={PESTANAS.map((p) => ({
              clave: p.clave,
              etiqueta: p.titulo,
              contador: loading && bandeja[p.clave].length === 0 ? undefined : bandeja[p.clave].length,
              // O5: "Por firmar" se pinta ámbar o rojo cuando alguna lleva demasiado tiempo en firma.
              tono: p.clave === 'porFirmar' ? tonoPorFirmar : undefined,
            }))}
            activa={pestana}
            onChange={setPestana}
          />
        </div>

        {/* Buscador por N° de expediente: clic → lista de expedientes; escribir → filtra */}
        <BuscadorDesplegable
          estado={buscador}
          placeholder="Buscar cualquier expediente: haz clic para ver la lista o escribe el número (ej. 000007 o EXP-2026-000007)"
          claveDe={(f) => f.expedienteId}
          onElegir={(f) => setAbierto({ expedienteId: f.expedienteId, numeroExpediente: f.numeroExpediente })}
          textoSinResultados={(termino) =>
            termino
              ? `Ningún expediente con IFI notificado coincide con "${termino}". Si el IFI todavía no se notifica, el expediente está en la bandeja de IFI.`
              : 'Todavía no hay expedientes con IFI notificado.'
          }
          textoTodos={(n) => `Todos los expedientes disponibles (${n}) · escribe para filtrar`}
          renderOpcion={(f, activa) => {
            const tipo = f.tipo ?? f.tipoCorrespondiente;
            return (
              <>
                <span className="flex items-center gap-[8px] font-bold text-text-main">
                  <span className={cn('flex', activa ? 'text-blue-800' : 'text-text-light')}>
                    <GavelIcon size={15} />
                  </span>
                  <span className="font-display tabular-nums">{f.numeroExpediente}</span>
                  {f.numeroResolucion && <span className="font-medium text-[11px] text-text-muted">· Resolución N° {f.numeroResolucion}</span>}
                </span>
                <span className="flex items-center gap-[6px] flex-wrap justify-end">
                  <PagadoBadge tienePago={f.tienePago} montoPagado={f.montoPagado} fechaPago={f.fechaPago} />
                  {f.concluidaPorPago && <span className={cn(CHIP_ESTADO, 'bg-success-bg border-success-border text-success')}>Concluido por pago</span>}
                  {tipo && <span className={cn(CHIP_ESTADO, CHIP_TIPO[tipo])}>{tipo}</span>}
                  <span className={cn(CHIP_ESTADO, CHIP_POR_VARIANTE[varianteEtapa(f)])}>{labelEtapa(f)}</span>
                </span>
              </>
            );
          }}
        />

        {/* Qué se está viendo y aviso de firma pendiente */}
        {ayudaPestana && (
          <p key={pestana} className="text-[13px] text-text-muted m-0 px-[4px] animate-aparecer [animation-duration:300ms]">
            <span className="font-bold text-text-main">{PESTANAS.find((p) => p.clave === pestana)?.titulo}:</span> {ayudaPestana}
          </p>
        )}
        {pestana === 'porFirmar' && bandeja.porFirmar.length > 0 && (
          <Alert
            type={varianteDiasEnFirma(maxDiasEnFirma) === 'purple' ? 'info' : varianteDiasEnFirma(maxDiasEnFirma) === 'danger' ? 'error' : 'warning'}
            className="mb-0!"
          >
            Falta firmar: {bandeja.porFirmar.length} resoluci{bandeja.porFirmar.length === 1 ? 'ón espera' : 'ones esperan'} la firma del Subgerente
            (la más antigua hace {maxDiasEnFirma} día{maxDiasEnFirma === 1 ? '' : 's'}). La firma es obligatoria para notificar.
          </Alert>
        )}

        {/* Expedientes */}
        {loading && filas.length === 0 ? (
          <EsqueletoTarjetas alto={104} />
        ) : filas.length === 0 ? (
          <div className="rounded-lg bg-bg-card border border-dashed border-border-dark py-[24px]">
            <TodoAlDia
              titulo="Nada en esta pestaña"
              descripcion={
                pestana === 'enRedaccion'
                  ? 'Cuando se notifique un IFI, el expediente aparece aquí automáticamente.'
                  : pestana === 'porFirmar'
                    ? 'No hay resoluciones entregadas al Subgerente en este momento.'
                    : 'No hay resoluciones firmadas pendientes ni notificadas en los últimos 30 días.'
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {filas.map((f, i) => (
              <TarjetaResolucion
                key={f.expedienteId}
                resolucion={f}
                indice={i}
                onVer={() => setAbierto({ expedienteId: f.expedienteId, numeroExpediente: f.numeroExpediente })}
              />
            ))}
          </div>
        )}
      </div>

      {abierto && (
        <ResolucionPanel
          expedienteId={abierto.expedienteId}
          numeroExpediente={abierto.numeroExpediente}
          onClose={() => setAbierto(null)}
          onCambio={refrescarTodo}
        />
      )}
    </div>
  );
};
