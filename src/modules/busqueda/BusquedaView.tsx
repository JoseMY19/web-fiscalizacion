import React, { useState } from 'react';
import { BusquedaIdentidadApi } from '../../api/busquedaIdentidad';
import { Alert, Button } from '../../components/common/Common';
import { PageHeader } from '../../components/common/PageKit';
import { CarIcon, CheckCircleIcon, IdCardIcon, SearchIcon, UserIcon } from '../../components/icons/Icons';
import { cn } from '../../lib/cn';

/**
 * Sección "Búsqueda": ficha de identidad por DNI (RENIEC) y ficha del vehículo
 * por placa. Ambas consultan el servicio del área de sistemas a través del backend.
 * Lo que el servicio no trae se muestra como "—": nunca se inventan datos.
 */

interface Campo {
  clave: string;
  etiqueta: string;
  /** Ocupa las dos columnas (ej. la dirección). */
  completo?: boolean;
}

interface Config {
  titulo: string;
  descripcion: string;
  etiquetaCampo: string;
  marcador: string;
  textoBoton: string;
  /** Caracteres que lleva el dato, sin contar el guion (contador bajo el campo). */
  largo: number;
  ayuda: string;
  iconoGrande: React.ReactNode;
  limpiar: (texto: string) => string;
  validar: (valor: string) => string | null;
  vacio: { titulo: string; descripcion: string };
  fuente: string;
  ficha: { titulo: string; icono: React.ReactNode; claveBuscada: string; foto?: { etiqueta: string; icono: React.ReactNode }; campos: Campo[] };
  /** Si existe, la búsqueda consulta el servicio; si no, la consulta todavía no está conectada. */
  consultar?: (valor: string) => Promise<Datos>;
}

const DNI: Config = {
  titulo: 'Búsqueda por DNI',
  descripcion: 'Consulta la ficha de identidad del administrado a partir de su DNI.',
  etiquetaCampo: 'Documento Nacional de Identidad',
  marcador: 'Ej. 45879632',
  textoBoton: 'Buscar DNI',
  largo: 8,
  ayuda: 'Solo números',
  iconoGrande: <IdCardIcon size={30} />,
  limpiar: (t) => t.replace(/\D/g, '').slice(0, 8),
  validar: (v) => (/^\d{8}$/.test(v) ? null : 'El DNI tiene 8 dígitos.'),
  vacio: { titulo: 'Busca un administrado', descripcion: 'Escribe el DNI arriba y presiona Buscar DNI. Aquí aparecerá su ficha de identidad.' },
  fuente: 'RENIEC',
  ficha: {
    titulo: 'Ficha de identidad',
    icono: <IdCardIcon size={18} />,
    claveBuscada: 'dni',
    foto: { etiqueta: 'Foto oficial RENIEC', icono: <UserIcon size={46} /> },
    campos: [
      { clave: 'dni', etiqueta: 'DNI' },
      { clave: 'estadoCivil', etiqueta: 'Estado civil' },
      { clave: 'primerApellido', etiqueta: 'Primer apellido' },
      { clave: 'segundoApellido', etiqueta: 'Segundo apellido' },
      { clave: 'nombres', etiqueta: 'Nombres', completo: true },
      { clave: 'direccion', etiqueta: 'Dirección completa', completo: true },
      { clave: 'distrito', etiqueta: 'Distrito' },
      { clave: 'provincia', etiqueta: 'Provincia / Depto.' },
      { clave: 'restriccion', etiqueta: 'Restricción' },
    ],
  },
  consultar: async (dni) => {
    const f = await BusquedaIdentidadApi.dni(dni);
    return {
      dni: f.dni,
      estadoCivil: f.estadoCivil,
      primerApellido: f.primerApellido,
      segundoApellido: f.segundoApellido,
      nombres: f.nombres,
      direccion: f.direccionCompleta ?? f.direccion,
      distrito: f.distrito,
      provincia: [f.provincia, f.departamento].filter(Boolean).join(' / ') || null,
      restriccion: f.restriccion,
      foto: f.foto,
    };
  },
};

const PLACA: Config = {
  titulo: 'Búsqueda por placas',
  descripcion: 'Consulta la ficha del vehículo y su propietario a partir de la placa de rodaje.',
  etiquetaCampo: 'Placa de rodaje',
  marcador: 'Ej. ABC-123',
  textoBoton: 'Buscar placa',
  largo: 6,
  ayuda: 'Letras y números; el guion se pone solo',
  iconoGrande: <CarIcon size={30} />,
  // Mayúsculas, solo letras y números; el guion se pone solo después del 3.er carácter.
  limpiar: (t) => {
    const s = t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    return s.length > 3 ? `${s.slice(0, 3)}-${s.slice(3)}` : s;
  },
  validar: (v) => (/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(v) ? null : 'La placa tiene 6 caracteres, por ejemplo ABC-123.'),
  vacio: { titulo: 'Busca un vehículo', descripcion: 'Escribe la placa arriba y presiona Buscar placa. Aquí aparecerá la ficha del vehículo.' },
  fuente: 'SUNARP',
  ficha: {
    titulo: 'Ficha del vehículo',
    icono: <CarIcon size={18} />,
    claveBuscada: 'placa',
    campos: [
      { clave: 'placa', etiqueta: 'Placa' },
      { clave: 'restriccion', etiqueta: 'Restricción' },
      { clave: 'marca', etiqueta: 'Marca' },
      { clave: 'modelo', etiqueta: 'Modelo' },
      { clave: 'color', etiqueta: 'Color' },
      { clave: 'documentoPropietario', etiqueta: 'DNI / RUC del propietario' },
      { clave: 'propietario', etiqueta: 'Propietario', completo: true },
      { clave: 'direccion', etiqueta: 'Dirección del propietario', completo: true },
    ],
  },
  consultar: async (placa) => {
    const f = await BusquedaIdentidadApi.placa(placa);
    return {
      placa: f.placa,
      restriccion: f.restriccion,
      marca: f.marca,
      modelo: f.modelo,
      color: f.color,
      documentoPropietario: f.documentoPropietario,
      propietario: f.propietario,
      direccion: f.direccion,
    };
  },
};

/** Datos de la ficha por clave de campo; null = la consulta todavía no los trae. */
type Datos = Record<string, string | null>;

const Busqueda: React.FC<{ config: Config }> = ({ config }) => {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [buscado, setBuscado] = useState<string | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const escritos = texto.replace(/-/g, '').length;

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const fallo = config.validar(texto);
    setError(fallo);
    setErrorConsulta(null);
    setDatos(null);
    if (fallo) {
      setBuscado(null);
      return;
    }
    setBuscado(texto);
    // Sin consulta conectada (placas): solo se conoce el dato buscado.
    if (!config.consultar) {
      setDatos({ [config.ficha.claveBuscada]: texto });
      return;
    }
    setCargando(true);
    try {
      setDatos(await config.consultar(texto));
    } catch (err: any) {
      setErrorConsulta(err.message || 'No se pudo consultar. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <PageHeader etiqueta="Búsqueda" titulo={config.titulo} descripcion={config.descripcion} />

      <div className="max-w-[880px] mx-auto flex flex-col gap-[20px]">
        {/* Buscador */}
        <form onSubmit={buscar} noValidate className="bg-bg-card rounded-lg border border-border shadow-sm p-[22px] animate-aparecer">
          <label htmlFor="busqueda-campo" className="block text-[13px] font-semibold text-text-secondary mb-[8px]">
            {config.etiquetaCampo}
          </label>
          <div
            className={cn(
              'flex items-center gap-[8px] p-[5px] pl-[16px] rounded-md border bg-white [transition:border-color_150ms,box-shadow_150ms]',
              error ? 'border-danger ring-4 ring-red-100' : 'border-border hover:border-border-dark focus-within:border-blue-700 focus-within:ring-4 focus-within:ring-blue-100',
            )}
          >
            <span className="flex text-text-light">
              <SearchIcon size={18} />
            </span>
            <input
              id="busqueda-campo"
              value={texto}
              onChange={(e) => {
                setTexto(config.limpiar(e.target.value));
                setError(null);
              }}
              placeholder={config.marcador}
              autoComplete="off"
              inputMode={config === DNI ? 'numeric' : 'text'}
              aria-invalid={!!error}
              className="flex-1 min-w-0 h-[42px] border-0 bg-transparent outline-none font-display text-[18px] font-semibold tracking-[1.5px] text-text-main placeholder:font-sans placeholder:text-[14px] placeholder:font-normal placeholder:tracking-normal placeholder:text-text-light"
            />
            <Button type="submit" icon={<SearchIcon size={15} />} loading={cargando} className="h-[42px] shrink-0">
              <span className="max-sm:hidden">{config.textoBoton}</span>
            </Button>
          </div>
          <div className="flex items-center justify-between gap-[12px] mt-[7px] text-[12px]">
            {error ? <span className="text-danger font-semibold">{error}</span> : <span className="text-text-muted">{config.ayuda}</span>}
            <span className={cn('tabular-nums font-semibold shrink-0', escritos === config.largo ? 'text-success' : 'text-text-light')}>
              {escritos}/{config.largo}
            </span>
          </div>
        </form>

        {/* Resultado */}
        {errorConsulta && <Alert type="error">{errorConsulta}</Alert>}
        {datos ? (
          <Ficha key={buscado} config={config} datos={datos} conectada={!!config.consultar} />
        ) : (
          <div className="flex flex-col items-center text-center py-[48px] px-[24px] rounded-lg border border-dashed border-border-dark bg-bg-subtle animate-desvanecer">
            <div className="w-[64px] h-[64px] rounded-full bg-blue-50 border border-blue-100 text-blue-800 flex items-center justify-center mb-[14px]">
              {config.iconoGrande}
            </div>
            <h3 className="m-0 mb-[4px] font-display text-[16px] font-bold text-text-main">{config.vacio.titulo}</h3>
            <p className="m-0 text-[13px] text-text-muted max-w-[380px]">{config.vacio.descripcion}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Ficha: React.FC<{ config: Config; datos: Datos; conectada: boolean }> = ({ config, datos, conectada }) => {
  const { ficha } = config;
  const encontrados = ficha.campos.some((c) => c.clave !== ficha.claveBuscada && datos[c.clave]);
  const principal = ficha.campos.find((c) => c.clave === ficha.claveBuscada)!;
  const resto = ficha.campos.filter((c) => c !== principal);

  return (
    <article className="bg-bg-card rounded-lg border border-border shadow-md overflow-hidden animate-aparecer">
      {/* Cabecera azul marino, como la del calendario */}
      <header className="flex items-center justify-between gap-[12px] flex-wrap py-[14px] px-[22px] bg-linear-to-br from-marino-900 to-marino-950 text-white">
        <div className="flex items-center gap-[12px] min-w-0">
          <span className="w-[36px] h-[36px] rounded-[10px] bg-white/10 border border-white/15 flex items-center justify-center shrink-0">{ficha.icono}</span>
          <div className="min-w-0">
            <h3 className="m-0 font-display text-[15.5px] font-bold leading-[1.25]">{ficha.titulo}</h3>
            <p className="m-0 text-[12px] text-blue-200">{config.fuente} · PIDE</p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-[6px] h-[26px] px-[11px] rounded-pill text-[12px] font-bold',
            encontrados ? 'bg-emerald-400/15 text-emerald-200 border border-emerald-300/30' : 'bg-white/10 text-blue-100 border border-white/15',
          )}
        >
          {encontrados && <CheckCircleIcon size={13} />}
          {encontrados ? 'Datos encontrados' : conectada ? 'Sin datos' : 'Consulta no conectada'}
        </span>
      </header>

      <div className="p-[22px]">
        {!encontrados && !conectada && (
          <Alert type="info" className="mb-[20px]!">
            La consulta a {config.fuente} todavía no está conectada al sistema. Cuando lo esté, esta ficha se llenará con los datos oficiales.
          </Alert>
        )}

        <div className="flex gap-[24px] max-sm:flex-col">
          {ficha.foto && (
            <figure className="m-0 shrink-0 flex flex-col items-center gap-[8px] max-sm:self-center">
              <div className="w-[128px] h-[160px] rounded-md bg-linear-to-b from-bg-subtle to-border-subtle border border-border text-text-light flex items-center justify-center overflow-hidden ring-4 ring-bg-subtle">
                {datos.foto ? (
                  <img src={datos.foto.startsWith('data:') ? datos.foto : `data:image/jpeg;base64,${datos.foto}`} alt="Foto del documento" className="w-full h-full object-cover" />
                ) : (
                  ficha.foto.icono
                )}
              </div>
              <figcaption className="text-[11.5px] text-text-muted">{ficha.foto.etiqueta}</figcaption>
            </figure>
          )}

          <div className="flex-1 min-w-0">
            {/* El dato buscado, destacado */}
            <div className="flex items-baseline gap-[10px] flex-wrap pb-[14px] mb-[14px] border-b border-border-subtle">
              <span className="text-[11px] font-bold uppercase tracking-[1px] text-text-muted">{principal.etiqueta}</span>
              <span className="font-display text-[26px] font-bold text-blue-800 tracking-[1px] leading-none">{datos[principal.clave]}</span>
            </div>

            <dl className="m-0 grid grid-cols-2 gap-[10px] max-sm:grid-cols-1">
              {resto.map((c) => {
                const valor = datos[c.clave];
                return (
                  <div key={c.clave} className={cn('min-w-0 py-[9px] px-[12px] rounded-md bg-bg-subtle border border-border-subtle', c.completo && 'col-span-2 max-sm:col-span-1')}>
                    <dt className="text-[10.5px] font-bold uppercase tracking-[0.8px] text-text-muted mb-[3px]">{c.etiqueta}</dt>
                    <dd className={cn('m-0 break-words uppercase text-[13.5px]', valor ? 'font-semibold text-text-main' : 'text-text-light')}>{valor || '—'}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </article>
  );
};

export const BusquedaDniView: React.FC = () => <Busqueda key="dni" config={DNI} />;
export const BusquedaPlacaView: React.FC = () => <Busqueda key="placa" config={PLACA} />;
