import React, { useEffect, useState } from 'react';
import {
  ConfiguracionApi,
  UsuariosAdminApi,
  FeriadoItem,
  CuisCodigoItem,
  ParametroUitItem,
} from '../../api';
import { Card, Button, Badge, Input, Alert, EmptyState } from '../../components/common/Common';
import { formatearFecha } from '../../lib/fechas';
import { useConfirm } from '../../context/ConfirmContext';
import {
  CalendarIcon,
  ClockIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  ShieldAlertIcon,
  UserIcon,
} from '../../components/icons/Icons';

export const ConfiguracionView: React.FC = () => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'plazos' | 'feriados' | 'cuis' | 'uit' | 'seguridad'>('plazos');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados Plazos & Riesgo
  const [expedientesEnRiesgo, setExpedientesEnRiesgo] = useState<any[]>([]);

  // Estados Feriados
  const [feriados, setFeriados] = useState<FeriadoItem[]>([]);
  const [fechaFeriado, setFechaFeriado] = useState('');
  const [descripcionFeriado, setDescripcionFeriado] = useState('');

  // Estados CUIS
  const [queryCuis, setQueryCuis] = useState('');
  const [resultadosCuis, setResultadosCuis] = useState<CuisCodigoItem[]>([]);
  const [buscandoCuis, setBuscandoCuis] = useState(false);

  // Estados UIT
  const [parametrosUit, setParametrosUit] = useState<ParametroUitItem[]>([]);

  // Estados Seguridad / Usuarios Admin (HU-29)
  const [revocandoId, setRevocandoId] = useState<string | null>(null);
  const [customUserId, setCustomUserId] = useState('');

  // Lista de usuarios institucionales de desarrollo y operación
  const usuariosSistema = [
    { id: '10000001', dni: '10000001', nombres: 'Ana Torres', rol: 'FISCALIZADOR', dispositivo: 'Samsung Galaxy A54 (En campo)', activo: true },
    { id: '10000002', dni: '10000002', nombres: 'Luis Ramírez', rol: 'FISCALIZADOR', dispositivo: 'Xiaomi Redmi Note 12 (En campo)', activo: true },
    { id: '10000003', dni: '10000003', nombres: 'Carla Vega', rol: 'ADMIN', dispositivo: 'Terminal Central Web (Oficina PAS)', activo: true },
    { id: 'notificador-01', dni: '45892144', nombres: 'Marcos Mendoza', rol: 'NOTIFICADOR', dispositivo: 'Terminal Móvil Notificaciones', activo: true },
  ];

  const cargarDatos = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [riesgo, fer, uit] = await Promise.allSettled([
        ConfiguracionApi.getExpedientesEnRiesgo(),
        ConfiguracionApi.getFeriados(),
        ConfiguracionApi.getParametrosUit(),
      ]);

      if (riesgo.status === 'fulfilled') setExpedientesEnRiesgo(riesgo.value || []);
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

  const handleBuscarCuis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryCuis.trim()) return;
    setBuscandoCuis(true);
    try {
      const res = await ConfiguracionApi.buscarCuis(queryCuis.trim());
      setResultadosCuis(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al buscar en catálogo CUIS.' });
    } finally {
      setBuscandoCuis(false);
    }
  };

  const handleRevocarTokens = async (userId: string, nombre: string) => {
    const ok = await confirm({
      message: `¿Confirmas la revocación inmediata de tokens para ${nombre}? Se cerrarán todas sus sesiones activas en dispositivos móviles y web.`,
      variant: 'danger',
    });
    if (!ok) {
      return;
    }
    setRevocandoId(userId);
    try {
      await UsuariosAdminApi.revocarTokens(userId);
      setMessage({
        type: 'success',
        text: `Sesiones revocadas exitosamente para ${nombre}. Token version incrementada en la base de datos (HU-29).`,
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || `No se pudo revocar la sesión para ${nombre}. Verifique privilegios de Administrador.`,
      });
    } finally {
      setRevocandoId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-[20px]">
        <div>
          <h2 className="text-[18px] font-extrabold text-midnight-900">
            Motor de Plazos, Calendario, Catálogo CUIS, UIT & Seguridad
          </h2>
          <p className="text-[13px] text-text-muted mt-[2px]">
            Parámetros transversales para el cómputo de plazos hábiles, tipificación de infracciones y control de sesiones.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargarDatos}>
          Actualizar
        </Button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Tabs */}
      <div className="flex gap-[8px] mb-[16px] flex-wrap">
        <button
          onClick={() => setActiveTab('plazos')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'plazos' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'plazos' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'plazos' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <ClockIcon size={16} />
          Expedientes en Riesgo ({expedientesEnRiesgo.length})
        </button>

        <button
          onClick={() => setActiveTab('feriados')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'feriados' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'feriados' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'feriados' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <CalendarIcon size={16} />
          Calendario de Feriados ({feriados.length})
        </button>

        <button
          onClick={() => setActiveTab('cuis')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'cuis' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'cuis' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'cuis' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <SearchIcon size={16} />
          Catálogo CUIS (Ordenanza 464)
        </button>

        <button
          onClick={() => setActiveTab('uit')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'uit' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'uit' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'uit' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          Valores Oficiales UIT ({parametrosUit.length})
        </button>

        <button
          onClick={() => setActiveTab('seguridad')}
          className={`py-[10px] px-[18px] text-[13px] font-bold rounded-sm cursor-pointer flex items-center gap-[8px] ${activeTab === 'seguridad' ? 'border border-primary-600' : 'border border-border'} ${activeTab === 'seguridad' ? 'bg-primary-50' : 'bg-[#ffffff]'} ${activeTab === 'seguridad' ? 'text-primary-600' : 'text-text-secondary'}`}
        >
          <ShieldAlertIcon size={16} />
          Seguridad & Sesiones (Admin)
        </button>
      </div>

      {/* Tab 1: Plazos en Riesgo */}
      {activeTab === 'plazos' && (
        <Card title="Expedientes con Alerta de Vencimiento o Riesgo de Caducidad">
          {expedientesEnRiesgo.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon size={40} color="var(--color-success)" />}
              title="Sin expedientes en riesgo"
              description="Todos los expedientes administrativos del PAS se encuentran dentro de los plazos normativos vigentes."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px] text-left">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-b-border">
                    <th className="py-[12px] px-[16px]">N° Expediente</th>
                    <th className="py-[12px] px-[16px]">Fase Actual</th>
                    <th className="py-[12px] px-[16px]">Plazo Límite</th>
                    <th className="py-[12px] px-[16px]">Nivel de Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientesEnRiesgo.map((item, idx) => (
                    <tr key={idx} className="border-b border-b-border">
                      <td className="py-[12px] px-[16px] font-bold">{item.numeroExpediente || item.expedienteId || '---'}</td>
                      <td className="py-[12px] px-[16px]">{item.estado || 'En trámite'}</td>
                      <td className="py-[12px] px-[16px] text-danger">{formatearFecha(item.fechaLimite, 'Por vencer')}</td>
                      <td className="py-[12px] px-[16px]"><Badge variant="danger">ALERTA CRÍTICA</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

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
                      <strong>{formatearFecha(f.fecha)}</strong> — {f.descripcion}
                    </div>
                    <Badge variant="neutral">No Hábil</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Catálogo CUIS */}
      {activeTab === 'cuis' && (
        <Card title="Buscador Oficial del Cuadro Único de Infracciones y Sanciones (CUIS)">
          <form onSubmit={handleBuscarCuis} className="flex gap-[10px] mb-[20px]">
            <div className="flex-1">
              <Input
                placeholder="Buscar por código (ej. 7.01.01) o palabras clave (construcción, clausura, ruidos, licencia)..."
                value={queryCuis}
                onChange={(e) => setQueryCuis(e.target.value)}
              />
            </div>
            <Button variant="primary" type="submit" loading={buscandoCuis} icon={<SearchIcon size={16} />}>
              Buscar en Catálogo
            </Button>
          </form>

          {resultadosCuis.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px] text-left">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-b-border">
                    <th className="py-[10px] px-[14px]">Código</th>
                    <th className="py-[10px] px-[14px]">Descripción de la Infracción</th>
                    <th className="py-[10px] px-[14px]">Monto / Escala</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosCuis.map((c, i) => (
                    <tr key={c.id || i} className="border-b border-b-border">
                      <td className="py-[12px] px-[14px] font-bold text-primary-600 whitespace-nowrap">
                        {c.codigo || (c as any).codigo_ordenanza || (c as any).id_interno}
                      </td>
                      <td className="py-[12px] px-[14px] text-text-main">
                        {c.descripcion || (c as any).texto_completo_pdf}
                      </td>
                      <td className="py-[12px] px-[14px] whitespace-nowrap">
                        <Badge variant="info">
                          {c.escala || (c.montoUit ? `${c.montoUit} % UIT` : 'Ver detalle')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[13px] text-text-muted text-center p-[24px]">
              Ingrese un término de búsqueda para consultar las infracciones tipificadas en la Ordenanza 464-MDSJL.
            </p>
          )}
        </Card>
      )}

      {/* Tab 4: Parámetros UIT */}
      {activeTab === 'uit' && (
        <Card title="Unidad Impositiva Tributaria (UIT) por Ejercicio Fiscal">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] text-left">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-b-border">
                  <th className="py-[12px] px-[16px]">Año Fiscal</th>
                  <th className="py-[12px] px-[16px]">Valor en Soles (S/)</th>
                  <th className="py-[12px] px-[16px]">Vigente Desde</th>
                  <th className="py-[12px] px-[16px]">Estado</th>
                </tr>
              </thead>
              <tbody>
                {parametrosUit.map((p) => (
                  <tr key={p.id || p.anio} className="border-b border-b-border">
                    <td className="py-[14px] px-[16px] font-bold">{p.anio}</td>
                    <td className="py-[14px] px-[16px] font-bold text-primary-600">
                      S/ {Number(p.valorSoles).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-[14px] px-[16px] text-text-secondary">
                      {p.vigenteDesde ? p.vigenteDesde.slice(0, 10) : '---'}
                    </td>
                    <td className="py-[14px] px-[16px]">
                      {!p.vigenteHasta ? <Badge variant="success">Vigente</Badge> : <Badge variant="neutral">Cerrado</Badge>}
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
        <Card title="Auditoría de Sesiones y Control de Accesos">
          <div className="mb-[16px] py-[12px] px-[16px] bg-[#eff6ff] rounded-[8px] border border-[#bfdbfe]">
            <div className="text-[13px] font-bold text-[#1e40af] mb-[4px] flex items-center gap-[6px]">
              <ShieldAlertIcon size={16} />
              <span>Revocación Inmediata de Credenciales y Sesiones</span>
            </div>
            <p className="text-[12px] text-[#1e3a8a] m-0">
              Permite a los administradores invalidar instantáneamente todas las credenciales de refresh activas asociadas a un usuario en caso de pérdida o robo de terminales móviles de campo, o por desvinculación funcional del personal.
            </p>
          </div>

          <div className="overflow-x-auto mb-[24px]">
            <table className="w-full border-collapse text-[13px] text-left">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-b-border">
                  <th className="py-[12px] px-[16px]">Personal / Usuario</th>
                  <th className="py-[12px] px-[16px]">DNI</th>
                  <th className="py-[12px] px-[16px]">Rol Asignado</th>
                  <th className="py-[12px] px-[16px]">Dispositivo Vinculado</th>
                  <th className="py-[12px] px-[16px]">Estado</th>
                  <th className="py-[12px] px-[16px] text-right">Acción de Seguridad</th>
                </tr>
              </thead>
              <tbody>
                {usuariosSistema.map((u) => (
                  <tr key={u.id} className="border-b border-b-border">
                    <td className="py-[14px] px-[16px] font-bold text-midnight-900">
                      <div className="flex items-center gap-[8px]">
                        <UserIcon size={16} />
                        {u.nombres}
                      </div>
                    </td>
                    <td className="py-[14px] px-[16px] text-text-secondary">{u.dni}</td>
                    <td className="py-[14px] px-[16px]">
                      <Badge variant={u.rol === 'ADMIN' ? 'danger' : u.rol === 'FISCALIZADOR' ? 'info' : 'warning'}>
                        {u.rol}
                      </Badge>
                    </td>
                    <td className="py-[14px] px-[16px] text-text-secondary text-[12px]">
                      {u.dispositivo}
                    </td>
                    <td className="py-[14px] px-[16px]">
                      <Badge variant="success">Activo</Badge>
                    </td>
                    <td className="py-[14px] px-[16px] text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        loading={revocandoId === u.id}
                        onClick={() => handleRevocarTokens(u.id, u.nombres)}
                      >
                        Revocar Sesión
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-[16px] border border-dashed border-border rounded-[8px]">
            <h4 className="text-[13px] font-bold mb-[8px]">Revocar Sesión por ID Manual</h4>
            <div className="flex gap-[12px] max-w-[500px]">
              <Input
                placeholder="Ingrese UUID de usuario en Prisma..."
                value={customUserId}
                onChange={(e) => setCustomUserId(e.target.value)}
              />
              <Button
                variant="danger"
                disabled={!customUserId.trim()}
                onClick={() => handleRevocarTokens(customUserId.trim(), customUserId.trim())}
              >
                Revocar
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};