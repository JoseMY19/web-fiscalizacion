import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tieneAccion } from '../../lib/permisos';
import { RolesApi, RolResumen } from '../../api/roles';
import { PageHeader, PanelTabla, SegmentedTabs } from '../../components/common/PageKit';
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
      <PageHeader
        titulo="Usuarios y Roles"
        descripcion="Quién entra al sistema y qué puede hacer en cada módulo. Los usuarios no se borran: se desactivan, para conservar su historial."
      />

      <PanelTabla
        barra={
          <SegmentedTabs<Tab>
            items={pestanas.filter((p) => p.visible).map((p) => ({ clave: p.id, etiqueta: p.etiqueta }))}
            activa={tab}
            onChange={setTab}
          />
        }
      >
        {tab === 'usuarios' && puedeUsuarios && <UsuariosView roles={roles} onCambio={cargarResumen} />}
        {tab === 'roles' && puedeRoles && <RolesView roles={roles} onCambio={cargarResumen} />}
      </PanelTabla>
    </div>
  );
};
