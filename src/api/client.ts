// Override con VITE_API_BASE_URL para probar desde otra PC en la red local
// (ver .env) — en desarrollo cae al backend local por defecto.
// Sin barra final: si se compila con "http://servidor:3010/", las rutas saldrían como "//auth/login" y el servidor respondería 404.
export const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

/** Mensajes técnicos del servidor ("Cannot POST /x", errores de red…) que el usuario no debe ver tal cual. */
export const MENSAJE_SIN_SERVIDOR = 'No se pudo comunicar con el servidor. Intenta de nuevo o avisa al administrador del sistema.';

export function getToken(): string | null {
  return localStorage.getItem('pas-oficina:token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('pas-oficina:token', token);
  } else {
    localStorage.removeItem('pas-oficina:token');
  }
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('pas-oficina:refreshToken');
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem('pas-oficina:refreshToken', token);
  } else {
    localStorage.removeItem('pas-oficina:refreshToken');
  }
}

export function getSavedUser(): any | null {
  const u = localStorage.getItem('pas-oficina:user');
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function setSavedUser(user: any | null) {
  if (user) {
    localStorage.setItem('pas-oficina:user', JSON.stringify(user));
  } else {
    localStorage.removeItem('pas-oficina:user');
  }
}

/**
 * El access token dura poco (JWT_ACCESS_EXPIRES_IN=15m en el backend). Sin
 * esto, cualquier sesión de oficina más larga que eso tira 401 y desloguea
 * sin avisar por qué — mismo patrón que ya resuelve
 * apps/web-campo/src/features/auth/fetch-autenticado.ts: al primer 401 se
 * intenta refrescar UNA vez con el refreshToken guardado; si eso también
 * falla, ahí sí se cierra la sesión.
 */
async function intentarRefrescarToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.accessToken) return false;
    setToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiClient<T = any>(
  path: string,
  options: RequestInit = {},
  reintentado = false
): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    // Sin red, servidor caído o dirección mal configurada: no se muestra "Failed to fetch".
    throw new Error('No hay conexión con el servidor. Revisa tu red e intenta de nuevo.');
  }

  if (!res.ok) {
    if (res.status === 401 && !reintentado) {
      const refresco = await intentarRefrescarToken();
      if (refresco) return apiClient<T>(path, options, true);
    }

    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.detalle || JSON.stringify(errJson);
    } catch {
      const errText = await res.text().catch(() => '');
      if (errText) errorMsg = errText;
    }

    if (res.status === 401) {
      setToken(null);
      setRefreshToken(null);
      setSavedUser(null);
    }

    // "Cannot POST /ruta" es la respuesta de Nest cuando la ruta no existe: es un problema de configuración, no del usuario.
    if (/^Cannot (GET|POST|PUT|PATCH|DELETE) /.test(errorMsg)) errorMsg = MENSAJE_SIN_SERVIDOR;

    throw new Error(errorMsg);
  }

  if (res.status === 204) return null as unknown as T;
  return res.json();
}

/**
 * Nombre que el servidor le puso al archivo (cabecera Content-Disposition), para
 * que el que se descarga lleve el N° de acta, el tipo de resolución, etc. Si la
 * cabecera no llega, se usa el de respaldo.
 */
export function nombreDeDescarga(res: Response, respaldo: string): string {
  const cabecera = res.headers.get('Content-Disposition') ?? '';
  const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cabecera);
  const bruto = m?.[1] ?? m?.[2];
  if (!bruto) return respaldo;
  try {
    return decodeURIComponent(bruto);
  } catch {
    return bruto;
  }
}
