import React, { useCallback, useEffect, useState } from 'react';
import { BasesMunicipalesApi, ConsultaBasesMunicipales, EstadoBaseMunicipal, ItseItem, LicenciaItem } from '../../api';
import { Spinner } from '../../components/common/Common';
import { SearchIcon } from '../../components/icons/Icons';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';

/**
 * Ficha de licencia de funcionamiento e ITSE (bases municipales semanales):
 * ¿tiene licencia vigente?, ¿ITSE vigente y con qué riesgo? Sirve para
 * evaluar descargos y levantamientos (¿subsanó?). Solo consulta.
 */

// El estado de las bases cambia una vez por semana: se pide una sola vez por sesión.
let estadoCache: Promise<EstadoBaseMunicipal[]> | null = null;
const obtenerEstado = () => (estadoCache ??= BasesMunicipalesApi.estado().catch(() => [] as EstadoBaseMunicipal[]));
/** Tras importar un Excel, para que la ficha vea la carga nueva. */
export const invalidarEstadoBases = () => {
  estadoCache = null;
};

type Tono = 'ok' | 'mal' | 'neutro';
const PUNTO: Record<Tono, string> = { ok: 'bg-success', mal: 'bg-danger', neutro: 'bg-text-light' };

const Celda: React.FC<{ titulo: string; estado: string; tono: Tono; lineas: string[] }> = ({ titulo, estado, tono, lineas }) => (
  <div className="min-w-0 flex-1 py-[10px] px-[14px]">
    <div className="text-[11px] text-text-muted mb-[3px]">{titulo}</div>
    <div className="flex items-center gap-[7px] text-[13px] font-semibold text-text-main">
      <span className={cn('w-[7px] h-[7px] rounded-full shrink-0', PUNTO[tono])} />
      {estado}
    </div>
    {lineas.map((l, i) => (
      <div key={i} className="text-[12px] text-text-secondary mt-[2px] truncate" title={l}>
        {l}
      </div>
    ))}
  </div>
);

function celdaLicencia(ls: LicenciaItem[], max: number) {
  const vigente = ls.find((l) => l.vigente);
  const l = vigente ?? ls[0];
  if (!l) return { estado: 'No registra', tono: 'mal' as Tono, lineas: [] };
  return {
    estado: vigente ? 'Vigente' : 'No vigente',
    tono: (vigente ? 'ok' : 'mal') as Tono,
    lineas: [
      `N° ${l.numeroLicencia ?? '—'} · ${l.giro ?? 'sin giro'}`,
      l.horaInicio ? `Horario ${l.horaInicio}–${l.horaFin ?? ''}` : '',
      !vigente && l.fechaCese ? `Cese ${formatearFecha(l.fechaCese)}` : '',
      ls.length > 1 ? `${ls.length} registros${ls.length > max ? ` (se muestran ${max})` : ''}` : '',
    ].filter(Boolean),
  };
}

function celdaItse(is: ItseItem[]) {
  const vigente = is.find((x) => x.vigente);
  const x = vigente ?? is[0];
  if (!x) return { estado: 'No registra', tono: 'mal' as Tono, lineas: [] };
  return {
    estado: vigente ? 'Vigente' : 'Vencido',
    tono: (vigente ? 'ok' : 'mal') as Tono,
    lineas: [`Riesgo ${x.riesgo ?? '—'} · caduca ${formatearFecha(x.fechaCaducidad)}`, `Certificado ${x.numeroCertificado ?? '—'}`],
  };
}

export const FichaBasesMunicipales: React.FC<{ documento?: string | null; expedienteId?: string | null; compacta?: boolean }> = ({
  documento,
  expedienteId,
  compacta,
}) => {
  const [q, setQ] = useState(documento ?? '');
  const [r, setR] = useState<ConsultaBasesMunicipales | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoBaseMunicipal[] | null>(null);

  useEffect(() => {
    obtenerEstado().then(setEstado);
  }, []);

  const buscar = useCallback(async (texto: string) => {
    if (texto.trim().length < 3) return;
    setCargando(true);
    setError(null);
    try {
      setR(await BasesMunicipalesApi.consulta(texto.trim()));
    } catch (err: any) {
      setError(err.message || 'No se pudo consultar.');
      setR(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (documento) buscar(documento);
  }, [documento, buscar]);

  // Desde un expediente: el backend toma el DNI/RUC del administrado.
  useEffect(() => {
    if (!expedienteId || documento) return;
    setCargando(true);
    BasesMunicipalesApi.porExpediente(expedienteId)
      .then((x) => {
        if (x.documento) setQ(x.documento);
        setR(x.consulta);
      })
      .catch(() => undefined)
      .finally(() => setCargando(false));
  }, [expedienteId, documento]);

  const licencias = estado?.find((e) => e?.tipo === 'LICENCIAS') ?? null;
  const itse = estado?.find((e) => e?.tipo === 'ITSE') ?? null;
  const sinBases = estado !== null && !licencias && !itse;
  const ultima = [licencias?.fecha, itse?.fecha].filter((f): f is string => !!f).sort().pop() ?? null;
  const max = compacta ? 2 : 10;

  return (
    <section className={cn('rounded-[10px] border border-border bg-bg-card text-[13px]', compacta && 'mb-[12px]')}>
      <div className="flex items-center gap-[10px] flex-wrap py-[9px] px-[14px] border-b border-border-subtle">
        <div className="mr-auto">
          <div className="font-semibold text-text-main">Licencia de funcionamiento e ITSE</div>
          <div className="text-[11px] text-text-muted">
            {sinBases ? 'Bases municipales sin cargar' : ultima ? `Bases municipales · actualizadas ${formatearFecha(ultima)}` : 'Bases municipales'}
          </div>
        </div>
        <form
          className="flex items-center gap-[6px] h-[32px] w-[230px] rounded-[6px] border border-border bg-bg-subtle px-[9px] focus-within:border-primary-600 focus-within:bg-bg-card"
          onSubmit={(e) => {
            e.preventDefault();
            buscar(q);
          }}
        >
          <span className="text-text-muted shrink-0">{cargando ? <Spinner size={13} color="currentColor" /> : <SearchIcon size={14} />}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="RUC, DNI, nombre o dirección"
            aria-label="Buscar por RUC, DNI, nombre o dirección"
            className="min-w-0 flex-1 bg-transparent outline-none text-[12px] text-text-main placeholder:text-text-light"
          />
        </form>
      </div>

      {sinBases ? (
        <p className="py-[10px] px-[14px] text-[12px] text-text-secondary">
          Todavía no se importaron los Excel de licencias e ITSE. Un administrador los carga en Configuración → Licencias e ITSE; mientras tanto no se
          puede saber si el local tiene licencia.
        </p>
      ) : error ? (
        <p className="py-[10px] px-[14px] text-[12px] text-danger">{error}</p>
      ) : !r ? (
        <p className="py-[10px] px-[14px] text-[12px] text-text-muted">{cargando ? 'Consultando…' : 'Busca por RUC, DNI, razón social o dirección.'}</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:divide-x divide-border-subtle">
            {licencias ? (
              <Celda titulo="Licencia de funcionamiento" {...celdaLicencia(r.licencias, max)} />
            ) : (
              <Celda titulo="Licencia de funcionamiento" estado="Base sin cargar" tono="neutro" lineas={[]} />
            )}
            {itse ? <Celda titulo="Certificado ITSE" {...celdaItse(r.itse)} /> : <Celda titulo="Certificado ITSE" estado="Base sin cargar" tono="neutro" lineas={[]} />}
          </div>
          {r.resumen.sugerenciaCuis && (
            <p className="py-[8px] px-[14px] border-t border-border-subtle text-[12px] text-text-secondary">
              Sin ITSE vigente: el código según el riesgo sería <strong className="text-text-main">{r.resumen.sugerenciaCuis}</strong> (lo decide el
              fiscalizador o el instructor).
            </p>
          )}
          {!compacta && r.licencias.length + r.itse.length > 2 && (
            <ul className="border-t border-border-subtle py-[8px] px-[14px] flex flex-col gap-[3px] text-[12px] text-text-secondary">
              {r.licencias.slice(0, max).map((l, i) => (
                <li key={`l${i}`} className="truncate">
                  Licencia {l.numeroLicencia ?? '—'} ({l.estado ?? '—'}) — {l.nombre} · {l.giro ?? 'sin giro'} · {l.direccion ?? ''}
                </li>
              ))}
              {r.itse.slice(0, max).map((x, i) => (
                <li key={`i${i}`} className="truncate">
                  ITSE {x.numeroCertificado ?? '—'} ({x.vigente ? 'vigente' : 'vencido'}) — {x.razonSocial} · {x.direccion ?? ''}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};
