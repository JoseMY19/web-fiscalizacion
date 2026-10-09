import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tieneAccion } from '../../lib/permisos';
import { UsuariosView } from './UsuariosView';
import { RolesView } from './RolesView';

type Tab = 'usuarios' | 'roles';

export const UsuariosRolesView: React.FC = () => {
  const { user } = useAuth();
  const puedeVerUsuarios = tieneAccion(user?.permisos, 'GESTIONAR_USUARIOS');
  const puedeVerRoles = tieneAccion(user?.permisos, 'GESTIONAR_ROLES');
  const [tabActiva, setActiveTab] = useState<Tab>(puedeVerUsuarios ? 'usuarios' : 'roles');

  return (
    <div>
      <div className="mb-[20px]">
        <h1 className="text-[24px] font-extrabold text-midnight-900">Usuarios y Roles</h1>
      </div>

      {/* Pestañas */}
      <div className="border-b border-b-border mb-[24px] flex gap-[32px]">
        {puedeVerUsuarios && (
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`pb-[12px] font-semibold text-[14px] border-b-[3px] transition-colors ${
              tabActiva === 'usuarios'
                ? 'border-b-midnight-900 text-midnight-900'
                : 'border-b-transparent text-text-muted hover:text-text-main'
            }`}
          >
            Usuarios
          </button>
        )}
        {puedeVerRoles && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-[12px] font-semibold text-[14px] border-b-[3px] transition-colors ${
              tabActiva === 'roles'
                ? 'border-b-midnight-900 text-midnight-900'
                : 'border-b-transparent text-text-muted hover:text-text-main'
            }`}
          >
            Roles
          </button>
        )}
      </div>

      {/* Contenido */}
      {tabActiva === 'usuarios' && puedeVerUsuarios && <UsuariosView />}
      {tabActiva === 'roles' && puedeVerRoles && <RolesView />}
    </div>
  );
};
