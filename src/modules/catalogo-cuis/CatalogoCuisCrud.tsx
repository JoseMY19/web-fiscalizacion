import React, { useCallback, useEffect, useState } from 'react';
import {
  CodigoCuisDatos,
  CodigoCuisRegistro,
  CuisMantenimientoApi,
  EscalaCuis,
  EscalaCuisDatos,
  EscalaCuisRegistro,
  FiltroEstadoCuis,
  ResumenCatalogoCuis,
  TaxonomiaCuis,
} from '../../api/cuisMantenimiento';
import { Alert, Button, Input, Modal, Spinner, Textarea } from '../../components/common/Common';
import { PlusIcon, SearchIcon } from '../../components/icons/Icons';
import { useConfirm } from '../../context/ConfirmContext';
import { formatearFecha } from '../../lib/fechas';
import { cn } from '../../lib/cn';

/**
 * Mantenimiento del catálogo CUIS (Ordenanza 464), como licencias e ITSE:
 * completar la descripción depurada y las medidas (el PDF no permitió
 * separarlas), corregir escalas y agregar o desactivar códigos. Lo que se
 * guarda aquí lo ven el IFI, la resolución y la app de campo al sincronizar.
 */

const TAMANO = 20;
const ESCALAS: EscalaCuis[] = ['L', 'G', 'MG'];
const NOMBRE_ESCALA: Record<EscalaCuis, string> = { L: 'Leve', G: 'Grave', MG: 'Muy grave' };
const claseSelect = 'h-[34px] rounded-[6px] border border-border bg-bg-card px-[8px] text-[12px] text-text-secondary outline-none cursor-pointer';
const claseCampo = 'w-full py-[8px] px-[10px] text-[13px] rounded-[6px] border border-border bg-bg-card text-text-main outline-none focus:border-primary-600';

const escalaVacia = (): EscalaCuisDatos => ({ escala: 'L', condicion: null, valorPorcentaje: 0, medidaProvisional: null, medidaComplementaria: null });

const resumenEscalas = (es: EscalaCuisRegistro[]) =>
  es.length === 0 ? 'Sin escala' : es.map((e) => `${e.escala} ${e.valorPorcentaje}%`).join(' · ');

export const CatalogoCuisCrud: React.FC = () => {
  const [taxonomia, setTaxonomia] = useState<TaxonomiaCuis | null>(null);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState<FiltroEstadoCuis>('TODOS');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<{ items: CodigoCuisRegistro[]; total: number; resumen: ResumenCatalogoCuis } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editando, setEditando] = useState<CodigoCuisRegistro | 'nuevo' | null>(null);

  useEffect(() => {
    CuisMantenimientoApi.taxonomia()
      .then(setTaxonomia)
      .catch(() => setTaxonomia({ categorias: [] }));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await CuisMantenimientoApi.listar({ q: busqueda, categoria, estado, pagina, tamano: TAMANO }));
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo cargar el catálogo.' });
    } finally {
      setCargando(false);
    }
  }, [busqueda, categoria, estado, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));
  const r = datos?.resumen;
  const pct = (n: number) => (r && r.activos ? Math.round((n / r.activos) * 100) : 0);

  return (
    <div>
      {mensaje && <Alert type={mensaje.type}>{mensaje.text}</Alert>}

      {/* Avance de la depuración del catálogo */}
      {r && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px] mb-[14px] text-[12px]">
          {[
            { etiqueta: 'Descripción depurada', n: r.conDescripcion },
            { etiqueta: 'Con medida complementaria', n: r.conMedidaComplementaria },
          ].map((x) => (
            <div key={x.etiqueta}>
              <div className="flex justify-between mb-[4px] text-text-secondary">
                <span>{x.etiqueta}</span>
                <span className="tabular-nums">
                  {x.n.toLocaleString('es-PE')} de {r.activos.toLocaleString('es-PE')} códigos
                </span>
              </div>
              <div className="h-[5px] rounded-full bg-border-subtle overflow-hidden">
                <div className="h-full bg-primary-600 rounded-full w-(--avance)" style={{ ['--avance' as string]: `${pct(x.n)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="flex items-center gap-[8px] flex-wrap mb-[10px]">
        <form
          className="flex items-center gap-[6px] h-[34px] w-[300px] rounded-[6px] border border-border bg-bg-card px-[10px] focus-within:border-primary-600"
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
            placeholder="Código (7.01.06) o palabras (construcción, ruidos…)"
            aria-label="Buscar en el catálogo"
            className="min-w-0 flex-1 bg-transparent outline-none text-[12px] text-text-main placeholder:text-text-light"
          />
        </form>
        <select
          value={categoria}
          onChange={(e) => {
            setPagina(1);
            setCategoria(e.target.value);
          }}
          aria-label="Categoría"
          className={cn(claseSelect, 'max-w-[220px]')}
        >
          <option value="">Todas las categorías</option>
          {taxonomia?.categorias.map((c) => (
            <option key={c.numero} value={c.numero}>
              {c.numero}. {c.nombre}
            </option>
          ))}
        </select>
        <select
          value={estado}
          onChange={(e) => {
            setPagina(1);
            setEstado(e.target.value as FiltroEstadoCuis);
          }}
          aria-label="Estado"
          className={claseSelect}
        >
          <option value="TODOS">Todos</option>
          <option value="SIN_DESCRIPCION">Falta descripción</option>
          <option value="SIN_MEDIDA">Falta medida complementaria</option>
          <option value="INACTIVOS">Desactivados</option>
        </select>
        <div className="ml-auto">
          <Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setEditando('nuevo')}>
            Agregar código
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-[10px] border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px] text-text-secondary">
            <thead className="bg-bg-subtle border-b border-border">
              <tr className="text-left text-[11px] text-text-muted">
                <th className="py-[9px] px-[12px] font-semibold">Código</th>
                <th className="py-[9px] px-[12px] font-semibold">Infracción</th>
                <th className="py-[9px] px-[12px] font-semibold">Escalas</th>
                <th className="py-[9px] px-[12px] font-semibold text-right">Usos</th>
                <th className="py-[9px] px-[12px]" />
              </tr>
            </thead>
            <tbody>
              {datos?.items.map((c) => (
                <tr key={c.id} className={cn('border-b border-border-subtle last:border-b-0 hover:bg-bg-hover', !c.activo && 'opacity-60')}>
                  <td className="py-[9px] px-[12px] align-top whitespace-nowrap">
                    <div className="font-semibold text-text-main tabular-nums">{c.codigoNormativo}</div>
                    {c.idInterno !== c.codigoNormativo && <div className="text-[11px] text-text-muted">{c.idInterno}</div>}
                    {!c.activo && <div className="text-[11px] text-danger">Desactivado</div>}
                  </td>
                  <td className="py-[9px] px-[12px] align-top max-w-[520px]">
                    {c.descripcion ? (
                      <div className="text-text-main line-clamp-2">{c.descripcion}</div>
                    ) : (
                      <>
                        <div className="text-[11px] font-semibold text-warning">Falta descripción</div>
                        <div className="text-text-muted line-clamp-1" title={c.textoCompletoPdf ?? ''}>
                          {c.textoCompletoPdf ?? '—'}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="py-[9px] px-[12px] align-top whitespace-nowrap tabular-nums">{resumenEscalas(c.escalas)}</td>
                  <td className="py-[9px] px-[12px] align-top text-right tabular-nums">{c.usos || '—'}</td>
                  <td className="py-[9px] px-[12px] align-top text-right">
                    <button type="button" onClick={() => setEditando(c)} className="text-primary-600 font-semibold hover:underline cursor-pointer">
                      {c.descripcion ? 'Editar' : 'Completar'}
                    </button>
                  </td>
                </tr>
              ))}
              {datos && datos.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-[24px] text-center text-text-muted">
                    Sin resultados para ese filtro.
                  </td>
                </tr>
              )}
              {!datos && (
                <tr>
                  <td colSpan={5} className="py-[24px] text-center">
                    <Spinner size={18} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-[10px] py-[8px] px-[12px] border-t border-border bg-bg-subtle text-[12px] text-text-muted">
          <span className="tabular-nums">
            {total === 0 ? 0 : (pagina - 1) * TAMANO + 1}–{Math.min(total, pagina * TAMANO)} de {total.toLocaleString('es-PE')}
          </span>
          {cargando && datos && <Spinner size={13} />}
          <div className="ml-auto flex items-center gap-[6px]">
            <Button size="sm" variant="outline" disabled={pagina <= 1 || cargando} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <span className="tabular-nums">
              {pagina} / {paginas}
            </span>
            <Button size="sm" variant="outline" disabled={pagina >= paginas || cargando} onClick={() => setPagina((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {editando && taxonomia && (
        <EditorCodigo
          codigo={editando === 'nuevo' ? null : editando}
          taxonomia={taxonomia}
          onClose={() => setEditando(null)}
          onGuardado={(texto, actualizado) => {
            setMensaje({ type: 'success', text: texto });
            if (actualizado === undefined) setEditando(null);
            else setEditando(actualizado);
            cargar();
          }}
        />
      )}
    </div>
  );
};

// ─── Edición de un código ───

function aFormulario(c: CodigoCuisRegistro | null, taxonomia: TaxonomiaCuis): CodigoCuisDatos {
  return {
    subcategoriaId: c?.subcategoria.id ?? taxonomia.categorias[0]?.subcategorias[0]?.id ?? '',
    codigoNormativo: c?.codigoNormativo ?? '',
    descripcion: c?.descripcion ?? '',
    fuenteNormativa: c?.fuenteNormativa ?? 'Ordenanza N.° 464-MDSJL, El Peruano 28/08/2024',
    vigenteDesde: c?.vigenteDesde?.slice(0, 10) ?? '',
    vigenteHasta: c?.vigenteHasta?.slice(0, 10) ?? '',
    requiereDesambiguacion: c?.requiereDesambiguacion ?? false,
  };
}

const limpiar = (d: CodigoCuisDatos): CodigoCuisDatos => ({
  ...d,
  codigoNormativo: d.codigoNormativo.trim(),
  descripcion: d.descripcion?.trim() || null,
  fuenteNormativa: d.fuenteNormativa?.trim() || null,
  vigenteDesde: d.vigenteDesde || null,
  vigenteHasta: d.vigenteHasta || null,
});

const EditorCodigo: React.FC<{
  codigo: CodigoCuisRegistro | null;
  taxonomia: TaxonomiaCuis;
  onClose: () => void;
  /** `actualizado` = el código queda abierto (p. ej. tras guardar una escala); undefined = se cierra. */
  onGuardado: (texto: string, actualizado?: CodigoCuisRegistro) => void;
}> = ({ codigo, taxonomia, onClose, onGuardado }) => {
  const confirm = useConfirm();
  const [form, setForm] = useState<CodigoCuisDatos>(() => aFormulario(codigo, taxonomia));
  const [escalasNuevas, setEscalasNuevas] = useState<EscalaCuisDatos[]>(() => (codigo ? [] : [escalaVacia()]));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bloqueado = !!codigo && codigo.usos > 0; // número y subcategoría fijos: las actas ya lo citan

  const set = <K extends keyof CodigoCuisDatos>(k: K, v: CodigoCuisDatos[K]) => setForm((f) => ({ ...f, [k]: v }));

  const ejecutar = async (fn: () => Promise<void>) => {
    setGuardando(true);
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const guardar = () =>
    ejecutar(async () => {
      if (!form.codigoNormativo.trim()) throw new Error('Escribe el código (ej. 7.01.06).');
      if (codigo) {
        await CuisMantenimientoApi.actualizar(codigo.id, limpiar(form));
        onGuardado(`Código ${form.codigoNormativo} actualizado.`);
      } else {
        const c = await CuisMantenimientoApi.crear({ ...limpiar(form), escalas: escalasNuevas });
        onGuardado(`Código ${c.codigoNormativo} agregado${c.idInterno !== c.codigoNormativo ? ` como ${c.idInterno} (ya existía ese número)` : ''}.`);
      }
    });

  const cambiarEstado = () =>
    ejecutar(async () => {
      if (!codigo) return;
      await CuisMantenimientoApi.cambiarEstado(codigo.id, !codigo.activo);
      onGuardado(codigo.activo ? `Código ${codigo.codigoNormativo} desactivado: ya no se puede elegir en campo.` : `Código ${codigo.codigoNormativo} reactivado.`);
    });

  const eliminar = async () => {
    if (!codigo) return;
    const ok = await confirm({ title: 'Eliminar código', message: `¿Eliminar ${codigo.idInterno}? No se usó en ninguna intervención.`, confirmLabel: 'Eliminar', variant: 'danger' });
    if (!ok) return;
    ejecutar(async () => {
      await CuisMantenimientoApi.eliminar(codigo.id);
      onGuardado(`Código ${codigo.idInterno} eliminado.`);
    });
  };

  const subcategorias = taxonomia.categorias.flatMap((c) => c.subcategorias.map((s) => ({ ...s, categoria: c })));

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="1000px"
      title={codigo ? `Código ${codigo.idInterno}` : 'Agregar código al CUIS'}
      footer={
        <>
          {codigo && (
            <div className="mr-auto flex gap-[8px]">
              <Button variant="ghost" onClick={cambiarEstado} disabled={guardando}>
                {codigo.activo ? 'Desactivar' : 'Reactivar'}
              </Button>
              {codigo.usos === 0 && (
                <Button variant="ghost" onClick={eliminar} disabled={guardando} className="text-danger!">
                  Eliminar
                </Button>
              )}
            </div>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button loading={guardando} onClick={guardar}>
            {codigo ? 'Guardar datos' : 'Agregar código'}
          </Button>
        </>
      }
    >
      {error && <Alert type="error">{error}</Alert>}
      {codigo?.modificadoPor && (
        <p className="text-[12px] text-text-muted mb-[10px]">
          Último cambio: {codigo.modificadoPor} · {formatearFecha(codigo.modificadoEn)}
          {codigo.usos > 0 && ` · usado en ${codigo.usos} intervención(es)`}
        </p>
      )}

      <div className={cn('grid gap-[16px]', codigo?.textoCompletoPdf ? 'grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' : 'grid-cols-1')}>
        {/* Texto de la ordenanza: la referencia para escribir la descripción y las medidas */}
        {codigo?.textoCompletoPdf && (
          <aside>
            <div className="text-[11px] font-semibold text-text-muted mb-[4px]">Texto de la ordenanza (tal como salió del PDF)</div>
            <div className="text-[12px] leading-[1.6] text-text-secondary bg-bg-subtle border border-border rounded-[8px] p-[10px] max-h-[340px] overflow-y-auto whitespace-pre-wrap">
              {codigo.textoCompletoPdf}
            </div>
            <p className="text-[11px] text-text-light mt-[4px]">
              El PDF mezcla las columnas: aquí vienen juntas la infracción y la medida. Sepáralas en "Descripción" y en "Medida complementaria" de cada escala.
            </p>
          </aside>
        )}

        <div>
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-[12px]">
            <Input
              label="Código"
              value={form.codigoNormativo}
              onChange={(e) => set('codigoNormativo', e.target.value)}
              placeholder="7.01.06"
              disabled={bloqueado}
            />
            <div className="mb-[14px]">
              <label className="block text-[13px] font-semibold text-text-secondary mb-[6px]">Subcategoría</label>
              <select value={form.subcategoriaId} onChange={(e) => set('subcategoriaId', e.target.value)} disabled={bloqueado} className={cn(claseCampo, 'py-[10px]')}>
                {subcategorias.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.numero} · {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {bloqueado && (
            <p className="text-[11px] text-text-muted -mt-[8px] mb-[12px]">
              Ya se usó en intervenciones: el número y la subcategoría no se cambian. Si la ordenanza cambió, desactívalo y agrega uno nuevo.
            </p>
          )}
          <Textarea
            label="Descripción de la infracción"
            value={form.descripcion ?? ''}
            onChange={(e) => set('descripcion', e.target.value)}
            rows={4}
            placeholder="Texto exacto de la infracción según la ordenanza (sin la medida)."
          />
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_150px] gap-x-[12px]">
            <Input label="Fuente normativa" value={form.fuenteNormativa ?? ''} onChange={(e) => set('fuenteNormativa', e.target.value)} />
            <Input label="Vigente desde" type="date" value={form.vigenteDesde ?? ''} onChange={(e) => set('vigenteDesde', e.target.value)} />
            <Input label="Vigente hasta" type="date" value={form.vigenteHasta ?? ''} onChange={(e) => set('vigenteHasta', e.target.value)} />
          </div>
          <label className="flex items-start gap-[8px] text-[13px] text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="mt-[3px]"
              checked={form.requiereDesambiguacion}
              onChange={(e) => set('requiereDesambiguacion', e.target.checked)}
            />
            <span>
              <strong className="text-text-main">Número repetido en la ordenanza</strong> — en campo se pide elegir con cuidado entre los códigos con el
              mismo número.
            </span>
          </label>
        </div>
      </div>

      {/* Escalas */}
      <section className="mt-[18px] border-t border-border pt-[12px]">
        <div className="flex items-center justify-between mb-[8px]">
          <div>
            <div className="text-[13px] font-bold text-text-main">Escalas de multa</div>
            <div className="text-[11px] text-text-muted">% de la UIT por escala y las medidas que corresponden. El monto de casos ya registrados no cambia.</div>
          </div>
          {!codigo && (
            <Button size="sm" variant="outline" icon={<PlusIcon size={13} />} onClick={() => setEscalasNuevas((e) => [...e, escalaVacia()])}>
              Agregar escala
            </Button>
          )}
        </div>
        <div className="grid grid-cols-[70px_minmax(0,1.2fr)_76px_minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-[8px] gap-y-[6px] items-start text-[12px]">
          <span className="text-[11px] text-text-muted">Escala</span>
          <span className="text-[11px] text-text-muted">Condición (si hay varias)</span>
          <span className="text-[11px] text-text-muted">% UIT</span>
          <span className="text-[11px] text-text-muted">Medida provisional</span>
          <span className="text-[11px] text-text-muted">Medida complementaria</span>
          <span />
          {codigo
            ? codigo.escalas.map((e) => (
                <FilaEscala
                  key={e.id}
                  inicial={e}
                  usos={e.usos}
                  onGuardar={async (d) => {
                    const c = await CuisMantenimientoApi.actualizarEscala(e.id, d);
                    onGuardado('Escala actualizada.', c);
                  }}
                  onQuitar={async () => {
                    const c = await CuisMantenimientoApi.eliminarEscala(e.id);
                    onGuardado('Escala quitada.', c);
                  }}
                />
              ))
            : escalasNuevas.map((e, i) => (
                <FilaEscala
                  key={i}
                  inicial={e}
                  local
                  onCambio={(d) => setEscalasNuevas((xs) => xs.map((x, j) => (j === i ? d : x)))}
                  onQuitar={async () => setEscalasNuevas((xs) => xs.filter((_, j) => j !== i))}
                />
              ))}
          {codigo && (
            <FilaEscala
              key={`nueva-${codigo.escalas.length}`}
              inicial={escalaVacia()}
              nueva
              onGuardar={async (d) => {
                const c = await CuisMantenimientoApi.crearEscala(codigo.id, d);
                onGuardado('Escala agregada.', c);
              }}
            />
          )}
        </div>
      </section>
    </Modal>
  );
};

/** Una escala editable en línea. `local` = alta de código (se guarda con el código); `nueva` = fila para agregar. */
const FilaEscala: React.FC<{
  inicial: EscalaCuisDatos;
  usos?: number;
  local?: boolean;
  nueva?: boolean;
  onGuardar?: (d: EscalaCuisDatos) => Promise<void>;
  onCambio?: (d: EscalaCuisDatos) => void;
  onQuitar?: () => Promise<void>;
}> = ({ inicial, usos = 0, local, nueva, onGuardar, onCambio, onQuitar }) => {
  const [d, setD] = useState<EscalaCuisDatos>(inicial);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cambiado = JSON.stringify(d) !== JSON.stringify(inicial);

  const set = <K extends keyof EscalaCuisDatos>(k: K, v: EscalaCuisDatos[K]) => {
    const nuevoValor = { ...d, [k]: v };
    setD(nuevoValor);
    onCambio?.(nuevoValor);
  };

  const accion = async (fn?: () => Promise<void>) => {
    if (!fn) return;
    setEnCurso(true);
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la escala.');
    } finally {
      setEnCurso(false);
    }
  };

  const texto = (v: string | null) => v ?? '';
  const nulo = (v: string) => (v.trim() ? v : null);

  return (
    <>
      <select value={d.escala} onChange={(e) => set('escala', e.target.value as EscalaCuis)} className={claseCampo} title={NOMBRE_ESCALA[d.escala]}>
        {ESCALAS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <input value={texto(d.condicion)} onChange={(e) => set('condicion', nulo(e.target.value))} className={claseCampo} placeholder={nueva ? 'Nueva escala…' : ''} />
      <input
        type="number"
        min={0}
        step="0.01"
        value={d.valorPorcentaje}
        onChange={(e) => set('valorPorcentaje', Number(e.target.value))}
        className={cn(claseCampo, 'tabular-nums')}
      />
      <input value={texto(d.medidaProvisional)} onChange={(e) => set('medidaProvisional', nulo(e.target.value))} className={claseCampo} />
      <input value={texto(d.medidaComplementaria)} onChange={(e) => set('medidaComplementaria', nulo(e.target.value))} className={claseCampo} />
      <div className="flex items-center gap-[4px] h-[34px] whitespace-nowrap">
        {!local && (nueva || cambiado) && (
          <Button size="sm" loading={enCurso} onClick={() => accion(() => onGuardar!(d))}>
            {nueva ? 'Agregar' : 'Guardar'}
          </Button>
        )}
        {!nueva && onQuitar && (
          <button
            type="button"
            disabled={enCurso || usos > 0}
            title={usos > 0 ? `Aplicada en ${usos} intervención(es): no se puede quitar` : 'Quitar escala'}
            onClick={() => accion(onQuitar)}
            className="text-[12px] text-danger font-semibold px-[6px] cursor-pointer disabled:text-text-light disabled:cursor-not-allowed"
          >
            Quitar
          </button>
        )}
      </div>
      {error && <p className="col-span-6 text-[11px] text-danger -mt-[2px]">{error}</p>}
    </>
  );
};
