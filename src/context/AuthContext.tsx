import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthApi } from '../api';
import { socket } from '../lib/socket';
import { PermisosUsuario, puedeVerModulo as verificarPermisoVer, puedeEditarModulo as verificarPermisoEditar } from '../lib/permisos';

export interface User {
  id: string;
  dni: string;
  nombres: string;
  rol: string;
  rolNombre?: string;
  debeCambiarContrasena?: boolean;
  permisos?: PermisosUsuario;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dni: string, contrasena: string) => Promise<void>;
  logout: () => void;
  refrescarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar usuario desde localStorage y verificar con /auth/me
  useEffect(() => {
    const initAuth = async () => {
      const saved = AuthApi.getCurrentUser();
      if (saved && AuthApi.isAuthenticated()) {
        // Refrescar desde /auth/me para obtener los datos más recientes
        try {
          const usuarioActualizado = await AuthApi.me();
          setUser(usuarioActualizado);
          socket.connect();
        } catch {
          // Si falla /auth/me (ej. 401), cierra sesión
          AuthApi.logout();
          setUser(null);
        }
      } else {
        AuthApi.logout();
        setUser(null);
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (dni: string, contrasena: string) => {
    const res = await AuthApi.login(dni, contrasena);
    setUser(res.usuario);
    socket.connect();
  };

  const logout = () => {
    AuthApi.logout();
    setUser(null);
    socket.disconnect();
  };

  const refrescarSesion = async () => {
    try {
      const usuarioActualizado = await AuthApi.me();
      setUser(usuarioActualizado);
    } catch {
      AuthApi.logout();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refrescarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export function usePermiso(modulo: string) {
  const { user } = useAuth();
  return {
    ver: verificarPermisoVer(modulo, user?.permisos),
    editar: verificarPermisoEditar(modulo, user?.permisos),
  };
}