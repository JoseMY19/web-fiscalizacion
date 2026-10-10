import React, { useCallback, useEffect, useState } from 'react';
import { BasesMunicipalesApi, EstadoBaseMunicipal } from '../../api';
import { Alert, Button, Card } from '../../components/common/Common';
import { formatearFechaHora } from '../../lib/fechas';
import { invalidarEstadoBases } from './FichaBasesMunicipales';
import { RegistrosBaseCrud } from './RegistrosBaseCrud';

const claseInputArchivo =
  'text-[12px] text-text-secondary file:mr-[8px] file:py-[4px] file:px-[10px] file:rounded-sm file:border file:border-border file:bg-[#ffffff] file:text-[12px] file:cursor-pointer';

const TIPOS: Array<{ clave: 'licencias' | 'itse'; tipo: 'LICENCIAS' | 'ITSE'; titulo: string }> = [
  { clave: 'licencias', tipo: 'LICENCIAS', titulo: 'Licencias de funcionamiento' },
  { clave: 'itse', tipo: 'ITSE', titulo: 'Certificados ITSE (Defensa Civil)' },
];

/** Configuración: carga semanal de los Excel de licencias e ITSE y mantenimiento de los registros (como el catálogo CUIS). */
export const BasesMunicipalesConfig: React.FC = () => {
  const [estado, setEstado] = useState<EstadoBaseMunicipal[]>([]);
  const [archivos, setArchivos] = useState<Record<string, File | null>>({});
  const [cargando, setCargando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Tras importar, el listado se vuelve a montar para mostrar la carga nueva.
  const [version, setVersion] = useState(0);

  const cargar = useCallback(() => {
    BasesMunicipalesApi.estado()
      .then(setEstado)
      .catch(() => setEstado([]));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const importar = async (clave: 'licencias' | 'itse') => {
    const archivo = archivos[clave];
    if (!archivo) return setMensaje({ type: 'error', text: 'Elige el archivo .xlsx.' });
    setCargando(clave);
    setMensaje(null);
    try {
      const r = await BasesMunicipalesApi.importar(clave, archivo);
      setMensaje({ type: 'success', text: `Importadas ${r.filas.toLocaleString('es-PE')} filas. Reemplazan a la carga anterior.` });
      setArchivos((a) => ({ ...a, [clave]: null }));
      invalidarEstadoBases();
      cargar();
      setVersion((v) => v + 1);
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo importar el Excel.' });
    } finally {
      setCargando(null);
    }
  };

  return (
    <Card title="Bases municipales: licencias e ITSE (Excel semanal)">
      <p className="text-[12px] text-text-muted mb-[10px]">
        Cada carga del Excel reemplaza a la anterior; lo agregado a mano se conserva. Se consultan desde campo (al registrar al administrado) y
        en IFI, Resolución y Levantamientos para verificar si el local tiene licencia e ITSE vigentes.
      </p>
      {mensaje && <Alert type={mensaje.type}>{mensaje.text}</Alert>}
      <div className="grid grid-cols-[1fr_1fr] gap-[12px] mb-[14px]">
        {TIPOS.map((t) => {
          const e = estado.find((x) => x?.tipo === t.tipo) ?? null;
          return (
            <div key={t.clave} className="border border-border rounded-[8px] py-[10px] px-[12px] text-[13px]">
              <div className="font-bold mb-[4px]">{t.titulo}</div>
              <div className="text-[12px] text-text-muted mb-[8px]">
                {!e
                  ? 'Todavía no se cargó.'
                  : e.fecha
                    ? `${e.filas.toLocaleString('es-PE')} registros · ${e.nombreArchivo} · ${formatearFechaHora(e.fecha)}${e.importadoPor ? ` · ${e.importadoPor}` : ''}`
                    : `${e.filas.toLocaleString('es-PE')} registros agregados a mano · sin Excel importado`}
              </div>
              <div className="flex items-center gap-[8px] flex-wrap">
                <input type="file" accept=".xlsx" onChange={(ev) => setArchivos((a) => ({ ...a, [t.clave]: ev.target.files?.[0] ?? null }))} className={claseInputArchivo} />
                <Button size="sm" loading={cargando === t.clave} disabled={!archivos[t.clave]} onClick={() => importar(t.clave)}>
                  Importar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <RegistrosBaseCrud
        key={version}
        onCambio={() => {
          invalidarEstadoBases();
          cargar();
        }}
      />
    </Card>
  );
};
