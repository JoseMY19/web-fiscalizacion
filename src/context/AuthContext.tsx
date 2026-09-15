import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthApi } from '../api';
import { socket } from '../lib/socket';

interface User {
  id: string;
  dni: string;
  nombres: string;
  rol: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dni: string, contrasena: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = AuthApi.getCurrentUser();
    if (saved && AuthApi.isAuthenticated()) {
      setUser(saved);
      socket.connect();
    } else {
      AuthApi.logout();
      setUser(null);
    }
    setIsLoading(false);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
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