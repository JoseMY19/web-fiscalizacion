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
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f6_100%)] relative overflow-hidden p-[24px]">
      {/* ============================================================== */}
      {/* DECORACIONES GEOMÉTRICAS OFICIALES DE SAN JUAN DE LURIGANCHO     */}
      {/* ============================================================== */}
      <img
        src="/decor-top-left.png"
        alt="Decoración Superior SJL"
        className="fixed top-0 left-0 w-[clamp(180px,24vw,360px)] max-w-[360px] pointer-events-none z-[1] select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.04)] max-md:w-[140px]"
      />
      <img
        src="/decor-bottom-right.png"
        alt="Decoración Inferior SJL"
        className="fixed bottom-0 right-0 w-[clamp(180px,24vw,360px)] max-w-[360px] pointer-events-none z-[1] select-none drop-shadow-[0_-4px_12px_rgba(0,0,0,0.04)] max-md:w-[140px]"
      />

      {/* ============================================================== */}
      {/* TARJETA CENTRAL DE ACCESO INSTITUCIONAL (AZUL NOCHE & BLANCO)   */}
      {/* ============================================================== */}
      <div
        className="w-full max-w-[460px] bg-[#ffffff] rounded-xl shadow-[0_20px_45px_-10px_rgba(16,38,74,0.22),0_0_1px_1px_rgba(16,38,74,0.06)] overflow-hidden border border-[#e2e8f0] relative z-[10]"
      >
        {/* Cabecera Azul Marino Municipal con Logo Oficial */}
        <div
          className="bg-[linear-gradient(180deg,#163666_0%,#10264a_100%)] pt-[36px] px-[32px] pb-[28px] text-center text-[#ffffff] border-b border-b-[rgba(255,255,255,0.1)] relative"
        >
          {/* Logo Oficial SJL en versión transparente de alta resolución */}
          <div className="mb-[18px] flex justify-center">
            <img
              src="/logo-sjl-white.png"
              alt="Municipalidad de San Juan de Lurigancho - es momento de crecer"
              className="h-[84px] w-auto max-w-[310px] object-contain [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.25))]"
            />
          </div>

          <h2 className="text-[15px] font-extrabold tracking-[0.4px] text-[#ffffff] m-0">
            SUBGERENCIA DE FISCALIZACIÓN
          </h2>
          <p className="text-[12px] text-[#bfdbfe] mt-[4px] font-medium mt-[4px] mx-0 mb-0">
            Procedimiento Administrativo Sancionador (PAS)
          </p>

          <div
            className="inline-flex items-center mt-[14px] py-[4px] px-[14px] rounded-[6px] bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.14)] text-[11px] font-semibold text-[#bfdbfe] tracking-[0.4px]"
          >
            Módulo Web de Fiscalización
          </div>
        </div>

        {/* Cuerpo del Formulario en Blanco Puro */}
        <div className="pt-[32px] px-[32px] pb-[28px]">
          {error && (
            <div className="mb-[16px]">
              <Alert type="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-[16px]">
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

            <div className="mt-[8px]">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full! h-[44px]! text-[14px]! font-bold!"
              >
                Ingresar al Sistema
              </Button>
            </div>
          </form>

          {/* Cuentas de Acceso Rápido / Demo */}
          <div
            className="mt-[26px] pt-[20px] border-t border-dashed border-t-[#e2e8f0]"
          >
            <p
              className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.5px] mb-[10px]"
            >
              Perfiles de Prueba (Clic para autocompletar):
            </p>
            <div className="flex flex-col gap-[8px]">
              <button
                type="button"
                onClick={() => setTestAccount('10000003', 'Admin2026!')}
                className="py-[9px] px-[12px] rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] text-[12px] text-left cursor-pointer text-[#0f172a] flex items-center justify-between [transition:all_150ms_ease] hover:bg-[#eff6ff] hover:border-[#93c5fd]"
              >
                <div className="flex items-center gap-[8px]">
                  <span className="text-[#1d4ed8]"><UserIcon size={15} /></span>
                  <span><strong>Carla Vega</strong> (Administrador PAS)</span>
                </div>
                <span className="text-[#1d4ed8] font-bold text-[11px]">10000003</span>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('10000001', 'Campo2026!')}
                className="py-[9px] px-[12px] rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] text-[12px] text-left cursor-pointer text-[#0f172a] flex items-center justify-between [transition:all_150ms_ease] hover:bg-[#eff6ff] hover:border-[#93c5fd]"
              >
                <div className="flex items-center gap-[8px]">
                  <span className="text-[#0284c7]"><UserIcon size={15} /></span>
                  <span><strong>Ana Torres</strong> (Fiscalizadora de Campo)</span>
                </div>
                <span className="text-[#0284c7] font-bold text-[11px]">10000001</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pie de Página de la Tarjeta */}
        <div
          className="p-[12px] bg-[#f8fafc] border-t border-t-[#f1f5f9] text-center text-[11px] text-[#94a3b8]"
        >
          Municipalidad Distrital de San Juan de Lurigancho • v2.0
        </div>
      </div>
    </div>
  );
};