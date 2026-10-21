import React, { useCallback, useEffect, useState } from 'react';
import { BandejaRecursos, RecursosApi } from '../../api';
import { Alert, Button } from '../../components/common/Common';
import { PagadoBadge } from '../../components/common/PagadoBadge';
import { PageHeader, SegmentedTabs } from '../../components/common/PageKit';
import { TodoAlDia } from '../../components/common/TodoAlDia';
import { EsqueletoTarjetas } from '../../components/common/EsqueletoTarjetas';
import { CHIP_ESTADO, CHIP_POR_VARIANTE } from '../../components/common/estilosBandeja';
import { BuscadorDesplegable, useBuscadorDesplegable } from '../../components/common/BuscadorDesplegable';
import { cn } from '../../lib/cn';
import { RefreshCwIcon, ScaleIcon } from '../../components/icons/Icons';
import { RecursoPanel } from './RecursoPanel';
import { LABEL_SITUACION, textoPlazoRecurso, varianteSituacion } from './recursosUi';
import { TarjetaRecurso } from './TarjetaRecurso';

type Pestana = keyof BandejaRecursos;

const PESTANAS: { clave: Pestana; titulo: string; ayuda: string; vacio: string }[] = [
  {
    clave: 'plazoAbierto',
    titulo: 'Plazo de recurso abierto',
    ayuda:
      'Resolución (o RSG de reconsideración) notificada, dentro de los 15 días hábiles y sin recurso presentado. Al vencer el plazo salen de aquí (pueden quedar firmes).',
    vacio: 'No hay resoluciones notificadas con el plazo de recurso corriendo.',
  },
  {
    clave: 'reconsideraciones',
    titulo: 'Reconsideraciones',
    ayuda: 'Reconsideraciones presentadas hasta que su RSG que las resuelve quede notificada.',
    vacio: 'No hay reconsideraciones en trámite.',
  },
  {
    clave: 'apelaciones',
    titulo: 'Apelaciones',
    ayuda: 'Apelaciones presentadas: informe a GOP, firma, elevación y decisión de GOP.',
    vacio: 'No hay apelaciones en trámite.',
  },
  {
    clave: 'resueltos',
    titulo: 'Resueltos',
    ayuda: 'Recursos ya resueltos: concluidos a favor, apelaciones infundadas, nulidades (pendientes con legal) y reconsideraciones resueltas sin apelación a tiempo.',
    vacio: 'Todavía no hay recursos resueltos.',
  },
];

const BANDEJA_VACIA: BandejaRecursos = { plazoAbierto: [], reconsideraciones: [], apelaciones: [], resueltos: [] };

/**
 * SP6 (reconsideración) y SP7 (apelación). Mismo esquema que Resoluciones:
 * pestañas, buscador por N° de expediente y un panel de pasos por
 * expediente. Nunca se piden códigos internos: todo se elige desde la lista.
 */
export const RecursosView: React.FC = () => {
  const [bandeja, setBandeja] = useState<BandejaRecursos>(BANDEJA_VACIA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('plazoAbierto');
  const [abierto, setAbierto] = useState<{ expedienteId: string; numeroExpediente: string } | null>(null);

  const buscador = useBuscadorDesplegable(RecursosApi.buscar);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await RecursosApi.getBandeja();
      setBandeja({
        plazoAbierto: data?.plazoAbierto ?? [],
        reconsideraciones: data?.reconsideraciones ?? [],
        apelaciones: data?.apelaciones ?? [],
        resueltos: data?.resueltos ?? [],
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar la bandeja de recursos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const { refrescarSiAbierta } = buscador;
  const refrescarTodo = useCallback(() => {
    cargar();
    refrescarSiAbierta();
  }, [cargar, refrescarSiAbierta]);

  const elegir = (f: { expedienteId: string; numeroExpediente: string }) =>
    setAbierto({ expedienteId: f.expedienteId, numeroExpediente: f.numeroExpediente });

  const filas = bandeja[pestana];
  const def = PESTANAS.find((p) => p.clave === pestana)!;
  // Plazo de recurso por vencer (3 días hábiles o menos): el punto de su tarjeta late.
  const plazoPorVencer = bandeja.plazoAbierto.some((f) => textoPlazoRecurso(f)?.urgente);

  return (
    <div>
      <PageHeader
        etiqueta="Procedimiento sancionador · Paso 6"
        titulo="Recursos Impugnativos"
        descripcion={
          <>
            Notificada la resolución, el administrado tiene <strong>15 días hábiles</strong> para recurrir. La{' '}
            <strong>reconsideración</strong> la resuelve esta Subgerencia con una RSG (requiere prueba nueva); la{' '}
            <strong>apelación</strong> va contra el último acto y la resuelve la Gerencia de Orden Público (GOP). Ninguno es obligatorio.
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
              // Un plazo de recurso a punto de vencer pinta su contador en rojo.
              tono: p.clave === 'plazoAbierto' && plazoPorVencer ? 'danger' : undefined,
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
          onElegir={elegir}
          textoSinResultados={(termino) =>
            termino ? `Ningún expediente con resolución notificada coincide con "${termino}".` : 'Todavía no hay expedientes con resolución notificada.'
          }
          textoTodos={(n) => `Todos los expedientes con resolución notificada (${n}) · escribe para filtrar`}
          renderOpcion={(f, activa) => (
            <>
              <span className="flex items-center gap-[8px] font-bold text-text-main">
                <span className={cn('flex', activa ? 'text-blue-800' : 'text-text-light')}>
                  <ScaleIcon size={15} />
                </span>
                <span className="font-display tabular-nums">{f.numeroExpediente}</span>
                {f.resolucion.numeroResolucion && <span className="font-medium text-[11px] text-text-muted">· Resolución N° {f.resolucion.numeroResolucion}</span>}
              </span>
              <span className="flex items-center gap-[6px] flex-wrap justify-end">
                <PagadoBadge tienePago={f.tienePago} montoPagado={f.pago?.montoPagado} fechaPago={f.pago?.fechaPago} />
                <span className={cn(CHIP_ESTADO, CHIP_POR_VARIANTE[varianteSituacion(f.situacion)])}>{LABEL_SITUACION[f.situacion]}</span>
              </span>
            </>
          )}
        />

        {/* Qué se está viendo */}
        <p key={pestana} className="text-[13px] text-text-muted m-0 px-[4px] animate-aparecer [animation-duration:300ms]">
          <span className="font-bold text-text-main">{def.titulo}:</span> {def.ayuda}
        </p>

        {/* Expedientes */}
        {loading && filas.length === 0 ? (
          <EsqueletoTarjetas alto={100} />
        ) : filas.length === 0 ? (
          <div className="rounded-lg bg-bg-card border border-dashed border-border-dark py-[24px]">
            <TodoAlDia titulo="Nada en esta pestaña" descripcion={def.vacio} />
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {filas.map((f, i) => (
              <TarjetaRecurso key={f.expedienteId} recurso={f} indice={i} onVer={() => elegir(f)} />
            ))}
          </div>
        )}
      </div>

      {abierto && (
        <RecursoPanel
          expedienteId={abierto.expedienteId}
          numeroExpediente={abierto.numeroExpediente}
          onClose={() => setAbierto(null)}
          onCambio={refrescarTodo}
        />
      )}
    </div>
  );
};
