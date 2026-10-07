import React, { useCallback, useEffect, useState } from 'react';
import { BasesMunicipalesApi, ConsultaBasesMunicipales } from '../../api';
import { Badge, Button, Input, Spinner } from '../../components/common/Common';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';

/**
 * Ficha de licencia de funcionamiento e ITSE (bases municipales semanales):
 * ¿tiene licencia vigente?, ¿ITSE vigente y con qué riesgo? Sirve para
 * evaluar descargos y levantamientos (¿subsanó?). Solo consulta.
 */
export const FichaBasesMunicipales: React.FC<{ documento?: string | null; expedienteId?: string | null; compacta?: boolean }> = ({ documento, expedienteId, compacta }) => {
  const [q, setQ] = useState(documento ?? '');
  const [r, setR] = useState<ConsultaBasesMunicipales | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    BasesMunicipalesApi.porExpediente(expedienteId)
      .then((x) => {
        if (x.documento) setQ(x.documento);
        setR(x.consulta);
      })
      .catch(() => undefined);
  }, [expedienteId, documento]);

  return (
    <div className={cn('rounded-[8px] border border-border bg-[#f8fafc] py-[10px] px-[12px] text-[13px]', compacta ? 'mb-[12px]' : '')}>
      <div className="flex items-end gap-[8px] flex-wrap">
        <div className="font-bold mr-auto pb-[8px]">Licencia de funcionamiento e ITSE</div>
        <div className="w-[240px]">
          <Input label="RUC, DNI, nombre o dirección" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscar(q)} />
        </div>
        <Button size="sm" variant="outline" loading={cargando} onClick={() => buscar(q)} className="mb-[14px]!">
          Consultar
        </Button>
      </div>
      {error && <div className="text-[#b91c1c] text-[12px]">{error}</div>}
      {cargando && !r && <Spinner size={18} />}
      {r && (
        <div className="flex flex-col gap-[6px]">
          <div className="flex gap-[6px] flex-wrap">
            <Badge variant={r.resumen.tieneLicenciaVigente ? 'success' : 'danger'}>Licencia: {r.resumen.tieneLicenciaVigente ? 'vigente' : r.licencias.length ? 'no vigente' : 'no registra'}</Badge>
            <Badge variant={r.resumen.tieneItseVigente ? 'success' : 'danger'}>ITSE: {r.resumen.tieneItseVigente ? 'vigente' : r.itse.length ? 'vencido' : 'no registra'}</Badge>
            {r.resumen.riesgo && <Badge variant="neutral">Riesgo {r.resumen.riesgo}</Badge>}
          </div>
          {r.resumen.sugerenciaCuis && <div className="text-[12px] text-[#9a3412]">Código sugerido si no tiene ITSE vigente: {r.resumen.sugerenciaCuis} (lo decide el fiscalizador / instructor).</div>}
          {r.licencias.slice(0, compacta ? 2 : 10).map((l, i) => (
            <div key={`l${i}`} className="text-[12px] text-text-secondary">
              <strong className="text-text-main">Licencia {l.numeroLicencia ?? '—'}</strong> ({l.estado ?? '—'}{l.vigente ? '' : l.fechaCese ? `, cese ${formatearFecha(l.fechaCese)}` : ''}) — {l.nombre} · {l.giro ?? 'sin giro'}
              {l.horaInicio ? ` · ${l.horaInicio}–${l.horaFin ?? ''}` : ''} · {l.direccion ?? ''}
            </div>
          ))}
          {r.itse.slice(0, compacta ? 2 : 10).map((x, i) => (
            <div key={`i${i}`} className="text-[12px] text-text-secondary">
              <strong className="text-text-main">ITSE {x.numeroCertificado ?? '—'}</strong> ({x.riesgo ?? 'riesgo —'}, {x.vigente ? 'vigente' : 'vencido'} — caduca {formatearFecha(x.fechaCaducidad)}) — {x.razonSocial} · {x.giro ?? ''} · {x.direccion ?? ''}
            </div>
          ))}
          {r.licencias.length === 0 && r.itse.length === 0 && <div className="text-text-muted text-[12px]">Sin coincidencias en las bases cargadas.</div>}
        </div>
      )}
    </div>
  );
};
