import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Alert } from '../../components/common/Common';
import { BuildingIcon } from '../../components/icons/Icons';

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b132b',
        padding: '20px',
        backgroundImage: 'radial-gradient(circle at 50% 10%, #1c2e59 0%, #0b132b 75%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 50px -12px rgba(5, 10, 24, 0.5)',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Top Header Card */}
        <div
          style={{
            backgroundColor: '#0e1a38',
            padding: '36px 32px 28px',
            textAlign: 'center',
            color: '#ffffff',
            borderBottom: '1px solid #1c2e59',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
            }}
          >
            <BuildingIcon size={28} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
            MUNICIPALIDAD DE SJL
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Subgerencia de Fiscalización y Sanciones Administrativas
          </p>
          <div
            style={{
              display: 'inline-block',
              marginTop: '12px',
              padding: '3px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              fontSize: '11px',
              fontWeight: 700,
              color: '#38bdf8',
              letterSpacing: '0.5px',
            }}
          >
            SISTEMA PAS • MÓDULO OFICINA
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '32px' }}>
          {error && <Alert type="error">{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Input
              label="Documento Nacional de Identidad (DNI)"
              placeholder="Ej. 10000003"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              required
              maxLength={8}
            />

            <Input
              label="Contraseña Institucional"
              type="password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />

            <div style={{ marginTop: '24px' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                style={{ width: '100%' }}
              >
                Ingresar al Sistema
              </Button>
            </div>
          </form>

          {/* Quick Dev Accounts */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px dashed var(--color-border)',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Cuentas de Desarrollo (Clic para autocompletar):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setTestAccount('10000003', 'Admin2026!')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#f8fafc',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--color-text-main)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>👤 <strong>Carla Vega</strong> (Admin)</span>
                <span style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>10000003</span>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('10000001', 'Campo2026!')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#f8fafc',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--color-text-main)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>👮 <strong>Ana Torres</strong> (Fiscalizadora)</span>
                <span style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>10000001</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};