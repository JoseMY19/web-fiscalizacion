import { apiClient } from './client';

/** RSG de ampliación: notificar en el domicilio señalado en un documento del SGD (opcional; vacío = domicilio de la NC). */
export const AmpliacionApi = {
  domicilioNotificacion: (expedienteId: string, documentoSgd: string, domicilio: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/ampliacion/domicilio-notificacion`, {
      method: 'PATCH',
      body: JSON.stringify({ documentoSgd: documentoSgd || undefined, domicilio: domicilio || undefined }),
    }),
};
