import React, { useEffect, useState } from 'react';
import {
  ConfiguracionApi,
  FeriadoItem,
  ParametroUitItem,
} from '../../api';
import { Card, Button, Badge, Input, Alert, EmptyState } from '../../components/common/Common';
import { EstadoPunto, PageHeader, PanelTabla, SegmentedTabs, TABLA } from '../../components/common/PageKit';
import { formatearFecha } from '../../lib/fechas';
import { useConfirm } from '../../context/ConfirmContext';
import { CalendarIcon, RefreshCwIcon } from '../../components/icons/Icons';
import { BasesMunicipalesConfig } from '../bases-municipales/BasesMunicipalesConfig';
import { CatalogoCuisCrud } from '../catalogo-cuis/CatalogoCuisCrud';

export const ConfiguracionView: React.FC = () => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'feriados' | 'cuis' | 'uit' | 'seguridad' | 'bases'>('feriados');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados Feriados
  const [feriados, setFeriados] = useState<FeriadoItem[]>([]);
  const [fechaFeriado, setFechaFeriado] = useState('');
  const [descripcionFeriado, setDescripcionFeriado] = useState('');

  // Estados CUIS

  // Estados UIT
  const [parametrosUit, setParametrosUit] = useState<ParametroUitItem[]>([]);

  const cargarDatos = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [fer, uit] = await Promise.allSettled([
        ConfiguracionApi.getFeriados(),
        ConfiguracionApi.getParametrosUit(),
      ]);

      if (fer.status === 'fulfilled') setFeriados(fer.value || []);
      if (uit.status === 'fulfilled') setParametrosUit(uit.value || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cargar configuración.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleAgregarFeriado = async () => {
    if (!fechaFeriado || !descripcionFeriado.trim()) {
      setMessage({ type: 'error', text: 'Debe completar la fecha y el motivo del feriado o día no hábil.' });
      return;
    }
    setLoading(true);
    try {
      await ConfiguracionApi.agregarFeriado(fechaFeriado, descripcionFeriado.trim());
      setMessage({ type: 'success', text: `Feriado del ${formatearFecha(fechaFeriado)} registrado exitosamente.` });
      setFechaFeriado('');
      setDescripcionFeriado('');
      cargarDatos();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al agregar feriado.' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <PageHeader
        titulo="Configuración y Parámetros"
        descripcion="Parámetros transversales para el cómputo de plazos hábiles, tipificación de infracciones y control de sesiones."
        acciones={
          <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargarDatos}>
            Actualizar
          </Button>
        }
      />

      {message && <Alert type={message.type}>{message.text}</Alert>}

      <PanelTabla
        barra={
          <SegmentedTabs<'feriados' | 'cuis' | 'bases' | 'uit' | 'seguridad'>
            items={[
              { clave: 'feriados', etiqueta: 'Calendario de Feriados', contador: feriados.length },
              { clave: 'cuis', etiqueta: 'Catálogo CUIS (Ordenanza 464)' },
              { clave: 'bases', etiqueta: 'Licencias e ITSE' },
              { clave: 'uit', etiqueta: 'Valores Oficiales UIT', contador: parametrosUit.length },
              { clave: 'seguridad', etiqueta: 'Seguridad & Sesiones (Admin)' },
            ]}
            activa={activeTab}
            onChange={setActiveTab}
          />
        }
      >
        <div className="p-[24px]">
          {activeTab === 'bases' && <BasesMunicipalesConfig />}

          {/* Tab 2: Feriados */}
          {activeTab === 'feriados' && (
        <div className="grid grid-cols-[1fr_1fr] gap-[20px]">
          <Card title="Registrar Nuevo Día No Hábil / Feriado Municipal">
            <p className="text-[12px] text-text-muted mb-[14px]">
              Los feriados registrados se excluyen automáticamente en la función de cómputo de días hábiles del PAS.
            </p>
            <Input
              type="date"
              label="Fecha del Feriado"
              value={fechaFeriado}
              onChange={(e) => setFechaFeriado(e.target.value)}
            />
            <Input
              label="Motivo o Festividad"
              placeholder="Ej. Aniversario de San Juan de Lurigancho / Jueves Santo"
              value={descripcionFeriado}
              onChange={(e) => setDescripcionFeriado(e.target.value)}
            />
            <Button variant="primary" loading={loading} onClick={handleAgregarFeriado}>
              Agregar al Calendario
            </Button>
          </Card>

          <Card title="Feriados Registrados">
            {feriados.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon size={36} color="var(--color-text-muted)" />}
                title="Sin feriados cargados"
                description="Agregue los días inhábiles oficiales para calibrar el cómputo de plazos."
              />
            ) : (
              <div className="flex flex-col gap-[8px]">
                {feriados.map((f, i) => (
                  <div
                    key={f.id || i}
                    className="flex items-center justify-between py-[10px] px-[14px] bg-bg-subtle rounded-sm border border-border text-[13px]"
                  >
                    <div>
                      <strong>{formatearFecha(f.fecha)}</strong> - {f.descripcion}
                    </div>
                    <Badge variant="neutral">No Hábil</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Catálogo CUIS — mantenimiento (como licencias e ITSE) */}
      {activeTab === 'cuis' && (
        <Card title="Catálogo CUIS (Ordenanza 464-MDSJL)">
          <CatalogoCuisCrud />
        </Card>
      )}

      {/* Tab 4: Parámetros UIT */}
      {activeTab === 'uit' && (
        <Card title="Unidad Impositiva Tributaria (UIT) por Ejercicio Fiscal">
          <div className="overflow-x-auto">
            <table className={TABLA.tabla}>
              <thead>
                <tr className={TABLA.encabezado}>
                  <th className={TABLA.th}>Año Fiscal</th>
                  <th className={TABLA.th}>Valor en Soles (S/)</th>
                  <th className={TABLA.th}>Vigente Desde</th>
                  <th className={TABLA.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {parametrosUit.map((p) => (
                  <tr key={p.id || p.anio} className={TABLA.fila}>
                    <td className={`${TABLA.td} font-bold`}>{p.anio}</td>
                    <td className={`${TABLA.td} font-bold text-primary-600`}>
                      S/ {Number(p.valorSoles).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`${TABLA.td} text-text-secondary`}>
                      {p.vigenteDesde ? p.vigenteDesde.slice(0, 10) : '---'}
                    </td>
                    <td className={TABLA.td}>
                      {!p.vigenteHasta ? <EstadoPunto tono="ok">Vigente</EstadoPunto> : <EstadoPunto tono="neutro">Cerrado</EstadoPunto>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 5: Seguridad & Sesiones (Admin) */}
      {activeTab === 'seguridad' && (
        <Card title="Gestión de Usuarios y Sesiones">
          <div className="py-[32px] text-center">
            <p className="text-[14px] text-text-main mb-[8px]">
              Los usuarios y roles se gestionan en el módulo <strong>Usuarios y Roles</strong>.
            </p>
          </div>
        </Card>
      )}
        </div>
      </PanelTabla>
    </div>
  );
};