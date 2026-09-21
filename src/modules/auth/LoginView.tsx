import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Alert } from '../../components/common/Common';
import { UserIcon } from '../../components/icons/Icons';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [dni, setDni] = useState('10000003');
  const [contrasena, setContrasena] = useState('Admin2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(dni, contrasena);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const setTestAccount = (testDni: string, testPass: string) => {
    setDni(testDni);
    setContrasena(testPass);
  };

  return (
    <div className="login-screen">
      {/* ============================================================== */}
      {/* DECORACIONES GEOMÉTRICAS OFICIALES DE SAN JUAN DE LURIGANCHO     */}
      {/* ============================================================== */}
      <img
        src="/decor-top-left.png"
        alt="Decoración Superior SJL"
        className="login-decor-top"
      />
      <img
        src="/decor-bottom-right.png"
        alt="Decoración Inferior SJL"
        className="login-decor-bottom"
      />

      {/* ============================================================== */}
      {/* TARJETA CENTRAL DE ACCESO INSTITUCIONAL (AZUL NOCHE & BLANCO)   */}
      {/* ============================================================== */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 45px -10px rgba(16, 38, 74, 0.22), 0 0 1px 1px rgba(16, 38, 74, 0.06)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Cabecera Azul Marino Municipal con Logo Oficial */}
        <div
          style={{
            background: 'linear-gradient(180deg, #163666 0%, #10264a 100%)',
            padding: '36px 32px 28px',
            textAlign: 'center',
            color: '#ffffff',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
          }}
        >
          {/* Logo Oficial SJL en versión transparente de alta resolución */}
          <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/logo-sjl-white.png"
              alt="Municipalidad de San Juan de Lurigancho - es momento de crecer"
              style={{
                height: '84px',
                width: 'auto',
                maxWidth: '310px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.25))',
              }}
            />
          </div>

          <h2 style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.4px', color: '#ffffff', margin: 0 }}>
            SUBGERENCIA DE FISCALIZACIÓN
          </h2>
          <p style={{ fontSize: '12px', color: '#bfdbfe', marginTop: '4px', fontWeight: 500, margin: '4px 0 0' }}>
            Procedimiento Administrativo Sancionador (PAS)
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginTop: '14px',
              padding: '4px 14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#bfdbfe',
              letterSpacing: '0.4px',
            }}
          >
            Módulo Web de Fiscalización
          </div>
        </div>

        {/* Cuerpo del Formulario en Blanco Puro */}
        <div style={{ padding: '32px 32px 28px' }}>
          {error && (
            <div style={{ marginBottom: '16px' }}>
              <Alert type="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Documento Nacional de Identidad (DNI)"
              placeholder="Ej. 10000003"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              required
              maxLength={8}
            />

            <Input
              label="Contraseña de Acceso Institucional"
              type="password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />

            <div style={{ marginTop: '8px' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                style={{ width: '100%', height: '44px', fontSize: '14px', fontWeight: 700 }}
              >
                Ingresar al Sistema
              </Button>
            </div>
          </form>

          {/* Cuentas de Acceso Rápido / Demo */}
          <div
            style={{
              marginTop: '26px',
              paddingTop: '20px',
              borderTop: '1px dashed #e2e8f0',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '10px',
              }}
            >
              Perfiles de Prueba (Clic para autocompletar):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setTestAccount('10000003', 'Admin2026!')}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                  e.currentTarget.style.borderColor = '#93c5fd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#1d4ed8' }}><UserIcon size={15} /></span>
                  <span><strong>Carla Vega</strong> (Administrador PAS)</span>
                </div>
                <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '11px' }}>10000003</span>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('10000001', 'Campo2026!')}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                  e.currentTarget.style.borderColor = '#93c5fd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#0284c7' }}><UserIcon size={15} /></span>
                  <span><strong>Ana Torres</strong> (Fiscalizadora de Campo)</span>
                </div>
                <span style={{ color: '#0284c7', fontWeight: 700, fontSize: '11px' }}>10000001</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pie de Página de la Tarjeta */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            textAlign: 'center',
            fontSize: '11px',
            color: '#94a3b8',
          }}
        >
          Municipalidad Distrital de San Juan de Lurigancho • v2.0
        </div>
      </div>
    </div>
  );
};