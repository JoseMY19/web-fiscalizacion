import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tieneAccion } from '../../lib/permisos';
import { cn } from '../../lib/cn';
import { RolesApi, RolResumen } from '../../api/roles';
import { UsuariosView } from './UsuariosView';
import { RolesView } from './RolesView';

type Tab = 'usuarios' | 'roles';

export const UsuariosRolesView: React.FC = () => {
  const { user } = useAuth();
  const puedeUsuarios = tieneAccion(user?.permisos, 'GESTIONAR_USUARIOS');
  const puedeRoles = tieneAccion(user?.permisos, 'GESTIONAR_ROLES');
  const [tab, setTab] = useState<Tab>(puedeUsuarios ? 'usuarios' : 'roles');
  const [roles, setRoles] = useState<RolResumen[]>([]);

  const cargarResumen = useCallback(() => {
    RolesApi.listar()
      .then((r) => setRoles(r.roles))
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  const pestanas: { id: Tab; etiqueta: string; visible: boolean }[] = [
    { id: 'usuarios', etiqueta: 'Usuarios', visible: puedeUsuarios },
    { id: 'roles', etiqueta: 'Roles y permisos', visible: puedeRoles },
  ];

  return (
    <div>
      <div className="mb-[22px]">
        <h2 className="text-[22px] font-extrabold text-text-main tracking-[-0.3px] m-0">Usuarios y Roles</h2>
        <p className="text-[13px] text-text-muted mt-[4px] m-0">
          Quién entra al sistema y qué puede hacer en cada módulo. Los usuarios no se borran: se desactivan, para conservar su historial.
        </p>
      </div>

      <div className="bg-white rounded-[12px] border border-border shadow-xs overflow-hidden">
        <div className="py-[14px] px-[20px] border-b border-border bg-[#fafbfc]">
          <div className="inline-flex bg-bg-hover p-[4px] rounded-[8px] gap-[4px]">
            {pestanas
              .filter((p) => p.visible)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTab(p.id)}
                  className={cn(
                    'py-[7px] px-[16px] rounded-[6px] border-0 text-[13px] cursor-pointer [transition:all_150ms_ease]',
                    tab === p.id ? 'bg-white text-text-main font-bold shadow-sm' : 'bg-transparent text-text-muted font-medium hover:text-text-main',
                  )}
                >
                  {p.etiqueta}
                </button>
              ))}
          </div>
        </div>

        {tab === 'usuarios' && puedeUsuarios && <UsuariosView roles={roles} onCambio={cargarResumen} />}
        {tab === 'roles' && puedeRoles && <RolesView roles={roles} onCambio={cargarResumen} />}
      </div>
    </div>
  );
};
