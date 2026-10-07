import React, { useCallback, useEffect, useState } from 'react';
import {
  BasesMunicipalesApi,
  DatosItse,
  DatosLicencia,
  OrigenRegistroBase,
  PaginaRegistros,
  RegistroItse,
  RegistroLicencia,
} from '../../api';
import { Alert, Badge, Button, Input, Modal, Spinner } from '../../components/common/Common';
import { PlusIcon, SearchIcon } from '../../components/icons/Icons';
import { useConfirm } from '../../context/ConfirmContext';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';

/**
 * Mantenimiento de licencias e ITSE (como el catálogo CUIS): buscar,
 * agregar, corregir y quitar registros sueltos. Lo agregado a mano se
 * conserva en las importaciones semanales; lo que vino del Excel se
 * reemplaza con la siguiente carga.
 */

type Tipo = 'licencias' | 'itse';
type Registro = RegistroLicencia | RegistroItse;

interface Campo {
  clave: string;
  etiqueta: string;
  tipo?: 'texto' | 'fecha' | 'numero' | 'opciones';
  opciones?: string[];
  ancho?: boolean; // ocupa las dos columnas
  obligatorio?: boolean;
  ayuda?: string;
}

const CAMPOS: Record<Tipo, Campo[]> = {
  licencias: [
    { clave: 'nombre', etiqueta: 'Contribuyente', obligatorio: true, ancho: true },
    { clave: 'ruc', etiqueta: 'RUC / DNI' },
    { clave: 'codigoContribuyente', etiqueta: 'Código de contribuyente' },
    { clave: 'nombreComercial', etiqueta: 'Nombre comercial' },
    { clave: 'representante', etiqueta: 'Representante legal' },
    { clave: 'numeroLicencia', etiqueta: 'N° de licencia' },
    {
      clave: 'estado',
      etiqueta: 'Estado',
      tipo: 'opciones',
      opciones: ['LICENCIA', 'TRAMITE', 'ANULADO'],
      ayuda: 'Solo "LICENCIA" sin fecha de cese cuenta como vigente.',
    },
    { clave: 'tipo', etiqueta: 'Tipo de licencia' },
    { clave: 'numeroExpediente', etiqueta: 'N° de expediente' },
    { clave: 'fechaExpediente', etiqueta: 'Fecha del expediente', tipo: 'fecha' },
    { clave: 'fechaCese', etiqueta: 'Fecha de cese', tipo: 'fecha' },
    { clave: 'horaInicio', etiqueta: 'Hora de inicio', ayuda: 'Ej. 08:00' },
    { clave: 'horaFin', etiqueta: 'Hora de fin', ayuda: 'Ej. 23:00' },
    { clave: 'giro', etiqueta: 'Giro autorizado', ancho: true },
    { clave: 'direccion', etiqueta: 'Dirección', ancho: true },
    { clave: 'sector', etiqueta: 'Sector' },
  ],
  itse: [
    { clave: 'razonSocial', etiqueta: 'Razón social', obligatorio: true, ancho: true },
    { clave: 'ruc', etiqueta: 'RUC / DNI' },
    { clave: 'representante', etiqueta: 'Representante legal' },
    { clave: 'numeroCertificado', etiqueta: 'N° de certificado' },
    { clave: 'riesgo', etiqueta: 'Riesgo', tipo: 'opciones', opciones: ['BAJO', 'MEDIO', 'ALTO', 'MUY ALTO'], ayuda: 'Define el código CUIS sugerido si no tiene ITSE vigente.' },
    { clave: 'fechaEmision', etiqueta: 'Fecha de emisión', tipo: 'fecha' },
    { clave: 'fechaCaducidad', etiqueta: 'Fecha de caducidad', tipo: 'fecha', ayuda: 'Vigente hasta esta fecha.' },
    { clave: 'fechaRenovacion', etiqueta: 'Fecha de renovación', tipo: 'fecha' },
    { clave: 'fechaInspeccion', etiqueta: 'Fecha de inspección', tipo: 'fecha' },
    { clave: 'anio', etiqueta: 'Año', tipo: 'numero' },
    { clave: 'expediente', etiqueta: 'Expediente' },
    { clave: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha' },
    { clave: 'clasificacion', etiqueta: 'Clasificación' },
    { clave: 'numeroInforme', etiqueta: 'N° de informe o acta' },
    { clave: 'numeroResolucion', etiqueta: 'N° de resolución' },
    { clave: 'area', etiqueta: 'Área' },
    { clave: 'giro', etiqueta: 'Giro', ancho: true },
    { clave: 'direccion', etiqueta: 'Dirección', ancho: true },
  ],
};

const TAMANO = 20;
const hoy = new Date().toISOString().slice(0, 10);

/** Valores del formulario (todo como texto; fechas aaaa-mm-dd). */
type Formulario = Record<string, string>;

function aFormulario(tipo: Tipo, r: Registro | null): Formulario {
  const f: Formulario = {};
  for (const c of CAMPOS[tipo]) {
    const v = r ? (r as unknown as Record<string, unknown>)[c.clave] : null;
    f[c.clave] = v == null ? '' : c.tipo === 'fecha' ? String(v).slice(0, 10) : String(v);
  }
  return f;
}

function aDatos(tipo: Tipo, f: Formulario): DatosLicencia | DatosItse {
  const d: Record<string, unknown> = {};
  for (const c of CAMPOS[tipo]) {
    const v = (f[c.clave] ?? '').trim();
    d[c.clave] = v === '' ? null : c.tipo === 'numero' ? Number(v) : v;
  }
  return d as unknown as DatosLicencia | DatosItse;
}

export const RegistrosBaseCrud: React.FC<{ onCambio?: () => void }> = ({ onCambio }) => {
  const confirm = useConfirm();
  const [tipo, setTipo] = useState<Tipo>('licencias');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [origen, setOrigen] = useState<OrigenRegistroBase | ''>('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaRegistros<Registro> | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [edicion, setEdicion] = useState<{ registro: Registro | null; form: Formulario } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const f = { q: busqueda, origen, pagina, tamano: TAMANO };
      setDatos(tipo === 'licencias' ? await BasesMunicipalesApi.listarLicencias(f) : await BasesMunicipalesApi.listarItse(f));
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo cargar el listado.' });
    } finally {
      setCargando(false);
    }
  }, [tipo, busqueda, origen, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarTipo = (t: Tipo) => {
    setTipo(t);
    setPagina(1);
    setDatos(null);
  };

  const guardar = async () => {
    if (!edicion) return;
    const obligatorio = CAMPOS[tipo].find((c) => c.obligatorio && !edicion.form[c.clave]?.trim());
    if (obligatorio) return setErrorForm(`Completa "${obligatorio.etiqueta}".`);
    setGuardando(true);
    setErrorForm(null);
    try {
      const d = aDatos(tipo, edicion.form);
      const id = edicion.registro?.id;
      if (tipo === 'licencias') {
        await (id ? BasesMunicipalesApi.actualizarLicencia(id, d as DatosLicencia) : BasesMunicipalesApi.crearLicencia(d as DatosLicencia));
      } else {
        await (id ? BasesMunicipalesApi.actualizarItse(id, d as DatosItse) : BasesMunicipalesApi.crearItse(d as DatosItse));
      }
      setMensaje({ type: 'success', text: id ? 'Registro actualizado.' : 'Registro agregado. Se conserva aunque se vuelva a importar el Excel.' });
      setEdicion(null);
      cargar();
      onCambio?.();
    } catch (err: any) {
      setErrorForm(err.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (r: Registro) => {
    const nombre = 'nombre' in r ? r.nombre : r.razonSocial;
    const ok = await confirm({
      title: 'Quitar registro',
      message:
        r.origen === 'IMPORTADO'
          ? `¿Quitar "${nombre}"? Viene del Excel: si la próxima importación lo trae, volverá a aparecer.`
          : `¿Quitar "${nombre}"? Se agregó a mano y no se puede recuperar.`,
      confirmLabel: 'Quitar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await (tipo === 'licencias' ? BasesMunicipalesApi.eliminarLicencia(r.id) : BasesMunicipalesApi.eliminarItse(r.id));
      setMensaje({ type: 'success', text: 'Registro quitado.' });
      cargar();
      onCambio?.();
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo quitar.' });
    }
  };

  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));
  const desde = total === 0 ? 0 : (pagina - 1) * TAMANO + 1;
  const hasta = Math.min(total, pagina * TAMANO);
  const th = 'py-[9px] px-[12px] text-[11px] font-semibold text-text-muted text-left whitespace-nowrap';
  const td = 'py-[9px] px-[12px] align-top';

  return (
    <div>
      {mensaje && <Alert type={mensaje.type}>{mensaje.text}</Alert>}

      {/* Pestañas + barra de herramientas */}
      <div className="flex items-center gap-[10px] flex-wrap mb-[10px]">
        <div className="inline-flex rounded-[8px] border border-border bg-bg-subtle p-[3px]">
          {(
            [
              ['licencias', 'Licencias'],
              ['itse', 'Certificados ITSE'],
            ] as const
          ).map(([t, etiqueta]) => (
            <button
              key={t}
              type="button"
              onClick={() => cambiarTipo(t)}
              className={cn(
                'py-[6px] px-[14px] rounded-[6px] text-[13px] font-semibold cursor-pointer',
                tipo === t ? 'bg-bg-card text-text-main shadow-sm' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <form
          className="flex items-center gap-[6px] h-[34px] w-[280px] rounded-[6px] border border-border bg-bg-card px-[10px] focus-within:border-primary-600"
          onSubmit={(e) => {
            e.preventDefault();
            setPagina(1);
            setBusqueda(q);
          }}
        >
          <span className="text-text-muted shrink-0">
            <SearchIcon size={14} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tipo === 'licencias' ? 'RUC, DNI, nombre, dirección o N° de licencia' : 'RUC, DNI, razón social o N° de certificado'}
            aria-label="Buscar"
            className="min-w-0 flex-1 bg-transparent outline-none text-[12px] text-text-main placeholder:text-text-light"
          />
        </form>

        <select
          value={origen}
          onChange={(e) => {
            setPagina(1);
            setOrigen(e.target.value as OrigenRegistroBase | '');
          }}
          aria-label="Origen"
          className="h-[34px] rounded-[6px] border border-border bg-bg-card px-[8px] text-[12px] text-text-secondary outline-none cursor-pointer"
        >
          <option value="">Todos</option>
          <option value="IMPORTADO">Del Excel</option>
          <option value="MANUAL">Agregados a mano</option>
        </select>

        <div className="ml-auto">
          <Button
            size="sm"
            icon={<PlusIcon size={14} />}
            onClick={() => {
              setErrorForm(null);
              setEdicion({ registro: null, form: aFormulario(tipo, null) });
            }}
          >
            {tipo === 'licencias' ? 'Agregar licencia' : 'Agregar certificado'}
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-[10px] border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px] text-text-secondary">
            <thead className="bg-bg-subtle border-b border-border">
              {tipo === 'licencias' ? (
                <tr>
                  <th className={th}>Contribuyente</th>
                  <th className={th}>RUC / DNI</th>
                  <th className={th}>N° licencia</th>
                  <th className={th}>Estado</th>
                  <th className={th}>Giro</th>
                  <th className={th}>Origen</th>
                  <th className={th} />
                </tr>
              ) : (
                <tr>
                  <th className={th}>Razón social</th>
                  <th className={th}>RUC / DNI</th>
                  <th className={th}>Certificado</th>
                  <th className={th}>Riesgo</th>
                  <th className={th}>Caduca</th>
                  <th className={th}>Origen</th>
                  <th className={th} />
                </tr>
              )}
            </thead>
            <tbody>
              {datos?.items.map((r) => (
                <tr key={r.id} className="border-b border-border-subtle last:border-b-0 hover:bg-bg-hover">
                  {'nombre' in r ? (
                    <>
                      <td className={cn(td, 'max-w-[260px]')}>
                        <div className="font-semibold text-text-main truncate" title={r.nombre}>
                          {r.nombre}
                        </div>
                        {r.nombreComercial && <div className="text-text-muted truncate">{r.nombreComercial}</div>}
                      </td>
                      <td className={cn(td, 'tabular-nums whitespace-nowrap')}>{r.ruc ?? '—'}</td>
                      <td className={cn(td, 'whitespace-nowrap')}>{r.numeroLicencia ?? '—'}</td>
                      <td className={td}>
                        <Badge variant={r.estado === 'LICENCIA' && !r.fechaCese ? 'success' : r.estado === 'ANULADO' || r.fechaCese ? 'danger' : 'neutral'}>
                          {r.fechaCese ? `Cese ${formatearFecha(r.fechaCese)}` : (r.estado ?? '—')}
                        </Badge>
                      </td>
                      <td className={cn(td, 'max-w-[220px]')}>
                        <div className="truncate" title={r.giro ?? ''}>
                          {r.giro ?? '—'}
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={cn(td, 'max-w-[260px]')}>
                        <div className="font-semibold text-text-main truncate" title={r.razonSocial}>
                          {r.razonSocial}
                        </div>
                        {r.giro && <div className="text-text-muted truncate">{r.giro}</div>}
                      </td>
                      <td className={cn(td, 'tabular-nums whitespace-nowrap')}>{r.ruc ?? '—'}</td>
                      <td className={cn(td, 'whitespace-nowrap')}>{r.numeroCertificado ?? '—'}</td>
                      <td className={td}>{r.riesgo ?? '—'}</td>
                      <td className={cn(td, 'whitespace-nowrap')}>
                        {r.fechaCaducidad ? (
                          <span className={r.fechaCaducidad.slice(0, 10) >= hoy ? 'text-success' : 'text-danger'}>{formatearFecha(r.fechaCaducidad)}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </>
                  )}
                  <td className={cn(td, 'whitespace-nowrap')}>
                    <span className={cn('text-[11px]', r.origen === 'MANUAL' ? 'text-primary-600 font-semibold' : 'text-text-muted')}>
                      {r.origen === 'MANUAL' ? 'Manual' : 'Excel'}
                    </span>
                  </td>
                  <td className={cn(td, 'whitespace-nowrap text-right')}>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorForm(null);
                        setEdicion({ registro: r, form: aFormulario(tipo, r) });
                      }}
                      className="text-primary-600 font-semibold hover:underline cursor-pointer mr-[12px]"
                    >
                      Editar
                    </button>
                    <button type="button" onClick={() => eliminar(r)} className="text-danger font-semibold hover:underline cursor-pointer">
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
              {datos && datos.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-[24px] text-center text-text-muted">
                    {busqueda || origen ? 'Sin resultados para ese filtro.' : 'No hay registros. Importa el Excel o agrega uno.'}
                  </td>
                </tr>
              )}
              {!datos && (
                <tr>
                  <td colSpan={7} className="py-[24px] text-center">
                    <Spinner size={18} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center gap-[10px] py-[8px] px-[12px] border-t border-border bg-bg-subtle text-[12px] text-text-muted">
          <span className="tabular-nums">
            {desde.toLocaleString('es-PE')}–{hasta.toLocaleString('es-PE')} de {total.toLocaleString('es-PE')}
          </span>
          {cargando && datos && <Spinner size={13} />}
          <div className="ml-auto flex items-center gap-[6px]">
            <Button size="sm" variant="outline" disabled={pagina <= 1 || cargando} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <span className="tabular-nums">
              {pagina} / {paginas.toLocaleString('es-PE')}
            </span>
            <Button size="sm" variant="outline" disabled={pagina >= paginas || cargando} onClick={() => setPagina((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {/* Alta / edición */}
      <Modal
        isOpen={!!edicion}
        onClose={() => setEdicion(null)}
        maxWidth="760px"
        title={
          edicion?.registro
            ? tipo === 'licencias'
              ? 'Editar licencia de funcionamiento'
              : 'Editar certificado ITSE'
            : tipo === 'licencias'
              ? 'Agregar licencia de funcionamiento'
              : 'Agregar certificado ITSE'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdicion(null)}>
              Cancelar
            </Button>
            <Button loading={guardando} onClick={guardar}>
              Guardar
            </Button>
          </>
        }
      >
        {edicion && (
          <>
            {edicion.registro?.origen === 'IMPORTADO' && (
              <Alert type="warning">
                Este registro viene del Excel: la corrección vale hasta la próxima importación, que trae la versión del área. Si el dato está mal en
                origen, avisa también al área que lo mantiene.
              </Alert>
            )}
            {edicion.registro?.modificadoPor && (
              <p className="text-[12px] text-text-muted mb-[10px]">
                Último cambio: {edicion.registro.modificadoPor} · {formatearFecha(edicion.registro.modificadoEn)}
              </p>
            )}
            {errorForm && <Alert type="error">{errorForm}</Alert>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[14px]">
              {CAMPOS[tipo].map((c) => {
                const valor = edicion.form[c.clave] ?? '';
                const cambiar = (v: string) => setEdicion((e) => (e ? { ...e, form: { ...e.form, [c.clave]: v } } : e));
                const etiqueta = `${c.etiqueta}${c.obligatorio ? ' *' : ''}`;
                return (
                  <div key={c.clave} className={cn(c.ancho && 'sm:col-span-2')}>
                    {c.tipo === 'opciones' ? (
                      <div className="mb-[14px]">
                        <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">{etiqueta}</label>
                        <select
                          value={valor}
                          onChange={(e) => cambiar(e.target.value)}
                          className="w-full py-[10px] px-[12px] text-[14px] rounded-sm border border-border bg-bg-card text-text-main outline-none"
                        >
                          <option value="">—</option>
                          {/* Si el Excel trae otro valor, se conserva como opción. */}
                          {[...new Set([...(c.opciones ?? []), ...(valor ? [valor] : [])])].map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                        {c.ayuda && <p className="text-[11px] text-text-muted mt-[4px]">{c.ayuda}</p>}
                      </div>
                    ) : (
                      <Input
                        label={etiqueta}
                        type={c.tipo === 'fecha' ? 'date' : c.tipo === 'numero' ? 'number' : 'text'}
                        value={valor}
                        onChange={(e) => cambiar(e.target.value)}
                        helperText={c.ayuda}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
