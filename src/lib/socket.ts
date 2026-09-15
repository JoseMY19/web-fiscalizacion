import { io, Socket } from 'socket.io-client';
import { getToken } from '../api/client';

const BASE_URL = 'http://localhost:3000';

/**
 * Canal adicional de aviso en vivo — nunca reemplaza al fetch de cada
 * bandeja, solo dispara que se vuelva a llamar. `auth` va como función (no
 * objeto fijo) para que cada intento de reconexión relea el token vigente
 * de localStorage, sobreviviendo al refresh de access token de 15 min.
 */
export const socket: Socket = io(BASE_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: getToken(), app: 'oficina' }),
});
