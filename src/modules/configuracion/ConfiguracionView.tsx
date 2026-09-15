import React, { useEffect, useState } from 'react';
import {
  ConfiguracionApi,
  UsuariosAdminApi,
  FeriadoItem,
  CuisCodigoItem,
  ParametroUitItem,
} from '../../api';
import { Card, Button, Badge, Input, Alert, EmptyState } from '../../components/common/Common';
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
      alert('Debe completar la fecha y el motivo del feriado o día no hábil.');
      return;
    }
    setLoading(true);
    try {
      await ConfiguracionApi.agregarFeriado(fechaFeriado, descripcionFeriado.trim());
      setMessage({ type: 'success', text: `Feriado del ${fechaFeriado} registrado exitosamente.` });
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
    if (!window.confirm(`¿Confirmas la revocación inmediata de tokens para ${nombre}? Se cerrarán todas sus sesiones activas en dispositivos móviles y web.`)) {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-midnight-900)' }}>
            Motor de Plazos, Calendario, Catálogo CUIS, UIT & Seguridad
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Parámetros transversales para el cómputo de plazos hábiles, tipificación de infracciones y control de sesiones.
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCwIcon size={16} />} loading={loading} onClick={cargarDatos}>
          Actualizar
        </Button>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('plazos')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'plazos' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'plazos' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'plazos' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ClockIcon size={16} />
          Expedientes en Riesgo ({expedientesEnRiesgo.length})
        </button>

        <button
          onClick={() => setActiveTab('feriados')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'feriados' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'feriados' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'feriados' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CalendarIcon size={16} />
          Calendario de Feriados ({feriados.length})
        </button>

        <button
          onClick={() => setActiveTab('cuis')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'cuis' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'cuis' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'cuis' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <SearchIcon size={16} />
          Catálogo CUIS (Ordenanza 464)
        </button>

        <button
          onClick={() => setActiveTab('uit')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'uit' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'uit' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'uit' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          Valores Oficiales UIT ({parametrosUit.length})
        </button>

        <button
          onClick={() => setActiveTab('seguridad')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'seguridad' ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
            backgroundColor: activeTab === 'seguridad' ? 'var(--color-primary-50)' : '#ffffff',
            color: activeTab === 'seguridad' ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 16px' }}>N° Expediente</th>
                    <th style={{ padding: '12px 16px' }}>Fase Actual</th>
                    <th style={{ padding: '12px 16px' }}>Plazo Límite</th>
                    <th style={{ padding: '12px 16px' }}>Nivel de Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientesEnRiesgo.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{item.numeroExpediente || item.expedienteId || '---'}</td>
                      <td style={{ padding: '12px 16px' }}>{item.estado || 'En trámite'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-danger)' }}>{item.fechaLimite || 'Por vencer'}</td>
                      <td style={{ padding: '12px 16px' }}><Badge variant="danger">ALERTA CRÍTICA</Badge></td>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Card title="Registrar Nuevo Día No Hábil / Feriado Municipal">
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {feriados.map((f, i) => (
                  <div
                    key={f.id || i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <strong>{f.fecha.slice(0, 10)}</strong> — {f.descripcion}
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
          <form onSubmit={handleBuscarCuis} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 14px' }}>Código</th>
                    <th style={{ padding: '10px 14px' }}>Descripción de la Infracción</th>
                    <th style={{ padding: '10px 14px' }}>Monto / Escala</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosCuis.map((c, i) => (
                    <tr key={c.id || i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primary-600)', whiteSpace: 'nowrap' }}>
                        {c.codigo || (c as any).codigo_ordenanza || (c as any).id_interno}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-main)' }}>
                        {c.descripcion || (c as any).texto_completo_pdf}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
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
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px' }}>
              Ingrese un término de búsqueda para consultar las infracciones tipificadas en la Ordenanza 464-MDSJL.
            </p>
          )}
        </Card>
      )}

      {/* Tab 4: Parámetros UIT */}
      {activeTab === 'uit' && (
        <Card title="Unidad Impositiva Tributaria (UIT) por Ejercicio Fiscal">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px' }}>Año Fiscal</th>
                  <th style={{ padding: '12px 16px' }}>Valor en Soles (S/)</th>
                  <th style={{ padding: '12px 16px' }}>Vigente Desde</th>
                  <th style={{ padding: '12px 16px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {parametrosUit.map((p) => (
                  <tr key={p.id || p.anio} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>{p.anio}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                      S/ {Number(p.valorSoles).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)' }}>
                      {p.vigenteDesde ? p.vigenteDesde.slice(0, 10) : '---'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {!p.vigenteHasta ? <Badge variant="success">Vigente</Badge> : <Badge variant="neutral">Cerrado</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 5: Seguridad & Sesiones (Admin - HU-29) */}
      {activeTab === 'seguridad' && (
        <Card title="Auditoría de Sesiones y Control de Accesos (HU-29)">
          <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
              🛡️ Revocación Inmediata de Tokens (POST /auth/admin/usuarios/:id/revocar)
            </div>
            <p style={{ fontSize: '12px', color: '#1e3a8a', margin: 0 }}>
              Permite a los administradores invalidar instantáneamente todas las credenciales de refresh activas asociadas a un usuario en caso de pérdida o robo de terminales móviles de campo, o por desvinculación funcional del personal.
            </p>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px' }}>Personal / Usuario</th>
                  <th style={{ padding: '12px 16px' }}>DNI</th>
                  <th style={{ padding: '12px 16px' }}>Rol Asignado</th>
                  <th style={{ padding: '12px 16px' }}>Dispositivo Vinculado</th>
                  <th style={{ padding: '12px 16px' }}>Estado</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acción de Seguridad</th>
                </tr>
              </thead>
              <tbody>
                {usuariosSistema.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserIcon size={16} />
                        {u.nombres}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)' }}>{u.dni}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant={u.rol === 'ADMIN' ? 'danger' : u.rol === 'FISCALIZADOR' ? 'info' : 'warning'}>
                        {u.rol}
                      </Badge>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      {u.dispositivo}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Badge variant="success">Activo</Badge>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
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

          <div style={{ padding: '16px', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Revocar Sesión por ID Manual</h4>
            <div style={{ display: 'flex', gap: '12px', maxWidth: '500px' }}>
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