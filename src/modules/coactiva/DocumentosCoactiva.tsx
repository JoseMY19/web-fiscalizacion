import React, { useCallback, useEffect, useState } from 'react';
import {
  CambiosExpediente,
  CambiosResolucion,
  CoactivaDocumentosApi,
  DatosDocumentoCoactivo,
  DatosResolucionDocumento,
  LABEL_PLANTILLA,
  PlantillaCoactiva,
  descargarDocumentoCoactivo,
} from '../../api/coactivaDocumentos';
import { ResolucionCoactivaItem } from '../../api';
import { Alert, Badge, Button, Input, Spinner, Textarea } from '../../components/common/Common';
import { claseBloqueTramite, claseFilaTramite } from '../../components/common/PasoTramite';
import { LABEL_TIPO_REC } from './coactivaUi';

interface Props {
  expedienteCoactivoId: string;
  resoluciones: ResolucionCoactivaItem[];
}

type Mensaje = { type: 'success' | 'error'; text: string };

/** Qué datos extra pide cada modelo (además de ejecutor y auxiliar, que sirven a todos). */
const PIDE: Record<PlantillaCoactiva, { monto?: boolean; deposito?: boolean; pago?: boolean }> = {
  REQUERIMIENTO: {},
  EMBARGO_RETENCION: { monto: true },
  VARIAR_DEPOSITO: { monto: true, deposito: true },
  SUSPENSION_PAGO: { pago: true },
};

const CASILLA = 'flex items-center gap-[6px] text-[13px] text-text-main mb-[14px]';

/**
 * Word de las resoluciones coactivas: lo que el sistema ya sabe lo escribe solo (obligado, sanción, montos
 * en letras, N° de REC y fechas registrados) y acá se completa lo que solo coactivo conoce. Lo que quede
 * vacío sale como renglón en blanco para llenarlo a mano en el Word.
 */
export const DocumentosCoactiva: React.FC<Props> = ({ expedienteCoactivoId, resoluciones }) => {
  const [datos, setDatos] = useState<DatosDocumentoCoactivo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [accion, setAccion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await CoactivaDocumentosApi.datos(expedienteCoactivoId));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los datos de los documentos.');
    }
  }, [expedienteCoactivoId]);

  // Se vuelve a leer cuando se registra una resolución nueva.
  useEffect(() => {
    cargar();
  }, [cargar, resoluciones.length]);

  const ejecutar = async (clave: string, fn: () => Promise<unknown>, exito: string) => {
    setAccion(clave);
    setMensaje(null);
    try {
      await fn();
      setMensaje({ type: 'success', text: exito });
      await cargar();
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.message || 'No se pudo completar la acción.' });
    } finally {
      setAccion(null);
    }
  };

  // Sin ninguna REC registrada todavía no hay Word que descargar.
  if (resoluciones.length === 0) return null;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!datos) {
    return (
      <div className="py-[12px] text-center">
        <Spinner size={20} />
      </div>
    );
  }

  return (
    <details className="mt-[12px] group">
      <summary className="cursor-pointer text-[13px] font-semibold text-primary-600 select-none">Descargar el Word de las resoluciones</summary>
      <div className="mt-[10px] flex flex-col gap-[10px]">
        <div className="text-[12px] text-text-muted">
          El Word se arma solo con lo que ya está registrado (obligado, sanción, montos, fechas). Lo que solo coactivo sabe se completa aquí:
          primero los <strong>datos del expediente</strong> (una sola vez) y luego, en la tarjeta de cada resolución, lo que pide su modelo. Todo es
          opcional: lo que dejes vacío sale como un renglón en blanco para llenarlo a mano en el Word.
        </div>
        {mensaje && (
          <Alert type={mensaje.type}>{mensaje.text}</Alert>
        )}
        <DatosDelExpediente
          datos={datos}
          guardando={accion === 'expediente'}
          onGuardar={(cambios) => ejecutar('expediente', () => CoactivaDocumentosApi.guardarExpediente(expedienteCoactivoId, cambios), 'Datos del expediente guardados.')}
        />
        <div className="font-bold text-text-main -mb-[4px]">Paso 2 · Cada resolución</div>
        {datos.resoluciones.map((d) => {
          const r = resoluciones.find((x) => x.id === d.id);
          return (
            <DocumentoDeResolucion
              key={d.id}
              d={d}
              etiqueta={r ? LABEL_TIPO_REC[r.tipo] : 'Resolución'}
              accion={accion}
              onGuardar={(cambios) => ejecutar(`res-${d.id}`, () => CoactivaDocumentosApi.guardarResolucion(expedienteCoactivoId, d.id, cambios), `Datos de la REC ${d.numeroRec} guardados.`)}
              onDescargar={() =>
                ejecutar(`doc-${d.id}`, () => descargarDocumentoCoactivo(expedienteCoactivoId, d.id, `coactiva-rec${d.numeroRec}.docx`), `Word de la REC ${d.numeroRec} descargado.`)
              }
            />
          );
        })}
      </div>
    </details>
  );
};

// ─── Datos del expediente coactivo ─────────────────────────────────────────

const DatosDelExpediente: React.FC<{ datos: DatosDocumentoCoactivo; guardando: boolean; onGuardar: (c: CambiosExpediente) => void }> = ({
  datos,
  guardando,
  onGuardar,
}) => {
  const e = datos.expediente;
  const [ejecutor, setEjecutor] = useState(e.ejecutorNombre ?? '');
  const [encargado, setEncargado] = useState(e.ejecutorEncargado);
  const [auxiliar, setAuxiliar] = useState(e.auxiliarNombre ?? '');
  const [codigo, setCodigo] = useState(e.codigoContribuyente ?? '');
  const [constancia, setConstancia] = useState(e.numeroConstancia ?? '');
  const [infraccion, setInfraccion] = useState(e.descripcionInfraccion ?? '');
  return (
    <div className={claseBloqueTramite}>
      <div className="font-bold text-text-main mb-[2px]">Paso 1 · Datos del expediente</div>
      <div className="text-[12px] text-text-muted mb-[10px]">Se escriben una sola vez y sirven para todas las resoluciones.</div>
      <div className="grid grid-cols-2 gap-x-[12px] max-md:grid-cols-1">
        <Input label="Ejecutor coactivo" value={ejecutor} onChange={(ev) => setEjecutor(ev.target.value)} />
        <Input label="Auxiliar coactivo" value={auxiliar} onChange={(ev) => setAuxiliar(ev.target.value)} />
        <Input label="Código del obligado en el SATRIM" value={codigo} onChange={(ev) => setCodigo(ev.target.value)} />
        <Input label="N° de la constancia de exigibilidad" value={constancia} onChange={(ev) => setConstancia(ev.target.value)} />
      </div>
      <label className={CASILLA}>
        <input type="checkbox" checked={encargado} onChange={(ev) => setEncargado(ev.target.checked)} />
        El ejecutor está encargado por disposición superior, "Ejecutor Coactivo (e)"
      </label>
      <Textarea
        label={`Infracción tal como se cita en el documento${datos.infracciones.length > 0 ? ` (código ${datos.infracciones.join(', ')})` : ''}`}
        value={infraccion}
        onChange={(ev) => setInfraccion(ev.target.value)}
        placeholder="Ej.: POR NEGARSE, RESISTIRSE E IMPEDIR LA FISCALIZACION MUNICIPAL DEL ESTABLECIMIENTO."
      />
      <Button
        size="sm"
        variant="secondary"
        loading={guardando}
        onClick={() =>
          onGuardar({
            ejecutorNombre: ejecutor,
            ejecutorEncargado: encargado,
            auxiliarNombre: auxiliar,
            codigoContribuyente: codigo,
            numeroConstancia: constancia,
            descripcionInfraccion: infraccion,
          })
        }
      >
        Guardar datos del expediente
      </Button>
    </div>
  );
};

// ─── Una resolución ────────────────────────────────────────────────────────

const DocumentoDeResolucion: React.FC<{
  d: DatosResolucionDocumento;
  etiqueta: string;
  accion: string | null;
  onGuardar: (c: CambiosResolucion) => void;
  onDescargar: () => void;
}> = ({ d, etiqueta, accion, onGuardar, onDescargar }) => {
  const [ejecutor, setEjecutor] = useState(d.ejecutorNombre ?? '');
  const [auxiliar, setAuxiliar] = useState(d.auxiliarNombre ?? '');
  const [monto, setMonto] = useState(d.montoEmbargo === null ? '' : String(d.montoEmbargo));
  const [domicilio, setDomicilio] = useState(d.domicilioMedida ?? '');
  const [oficios, setOficios] = useState(d.resultadoOficios ?? '');
  const [ordenanza, setOrdenanza] = useState(d.ordenanzaBeneficio ?? '');
  const [pago, setPago] = useState(d.referenciaPago ?? '');
  const pide: { monto?: boolean; deposito?: boolean; pago?: boolean } = d.plantilla ? PIDE[d.plantilla] : {};
  return (
    <div className={claseBloqueTramite}>
      <div className="flex items-center gap-[8px] flex-wrap mb-[6px]">
        <Badge variant="info">REC {d.numeroRec}</Badge>
        <strong>{etiqueta}</strong>
        {d.plantilla ? <Badge variant="success">{LABEL_PLANTILLA[d.plantilla]}</Badge> : <Badge variant="neutral">Sin modelo de Word</Badge>}
      </div>
      {!d.plantilla ? (
        <div className="text-[12px] text-text-muted">{d.motivoSinPlantilla}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-[12px] max-md:grid-cols-1">
            <Input label="Ejecutor de esta resolución" helperText="Vacío: el del expediente" value={ejecutor} onChange={(ev) => setEjecutor(ev.target.value)} />
            <Input label="Auxiliar de esta resolución" helperText="Vacío: el del expediente" value={auxiliar} onChange={(ev) => setAuxiliar(ev.target.value)} />
            {pide.monto && (
              <Input
                label="Monto del embargo (S/)"
                type="number"
                min="0"
                step="0.01"
                helperText="Incluye intereses, costas y gastos: no se calcula"
                value={monto}
                onChange={(ev) => setMonto(ev.target.value)}
              />
            )}
            {pide.deposito && <Input label="Domicilio donde queda el depósito" value={domicilio} onChange={(ev) => setDomicilio(ev.target.value)} />}
            {pide.pago && <Input label="Ordenanza del beneficio con el que pagó" placeholder="Ej.: Nro. 536-2026-MDSJL" value={ordenanza} onChange={(ev) => setOrdenanza(ev.target.value)} />}
          </div>
          {pide.deposito && (
            <Textarea
              label="Lo que informaron los bancos"
              placeholder="Ej.: las entidades bancarias no han comunicado si el obligado mantiene cuentas…"
              value={oficios}
              onChange={(ev) => setOficios(ev.target.value)}
            />
          )}
          {pide.pago && (
            <Textarea
              label="Pago efectuado (recibo, fecha, cheque de gerencia…)"
              placeholder="Vacío: se usa el pago registrado en el sistema"
              value={pago}
              onChange={(ev) => setPago(ev.target.value)}
            />
          )}
          <div className={claseFilaTramite}>
            <Button
              size="sm"
              variant="outline"
              loading={accion === `res-${d.id}`}
              onClick={() =>
                onGuardar({
                  ejecutorNombre: ejecutor,
                  auxiliarNombre: auxiliar,
                  ...(pide.monto ? { montoEmbargo: monto === '' ? null : Number(monto) } : {}),
                  ...(pide.deposito ? { domicilioMedida: domicilio, resultadoOficios: oficios } : {}),
                  ...(pide.pago ? { ordenanzaBeneficio: ordenanza, referenciaPago: pago } : {}),
                })
              }
            >
              Guardar datos
            </Button>
            <Button size="sm" variant="primary" loading={accion === `doc-${d.id}`} onClick={onDescargar}>
              Descargar Word
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
