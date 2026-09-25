import { apiClient, setToken, setRefreshToken, setSavedUser, getToken, getSavedUser, BASE_URL } from './client';

export * from './client';

// ============================================================================
// AUTH API
// ============================================================================
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  usuario: {
    id: string;
    dni: string;
    nombres: string;
    rol: string;
  };
}

export const AuthApi = {
  login: async (dni: string, contrasena: string): Promise<LoginResponse> => {
    const data = await apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ dni, contrasena }),
    });
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setSavedUser(data.usuario);
    return data;
  },
  logout: () => {
    setToken(null);
    setRefreshToken(null);
    setSavedUser(null);
  },
  getCurrentUser: () => getSavedUser(),
  isAuthenticated: () => !!getToken(),
  /** Para selectores (ej. "Asignar Notificador") — nunca copiar-pegar un UUID a mano. */
  getUsuariosPorRol: (rol: string) =>
    apiClient<{ id: string; dni: string; nombres: string }[]>(`/auth/usuarios?rol=${encodeURIComponent(rol)}`),
};

// ============================================================================
// EXPEDIENTES (SP2)
// ============================================================================
export interface ExpedienteItem {
  id: string;
  numeroExpediente: string;
  estado: string;
  intervencionId: string;
  fechaHoraInicioIntervencion: string;
  fiscalizadorNombre: string;
  createdAt: string;
  fechaIngresoFisico: string | null;
}

export const ExpedientesApi = {
  getPendientes: () => apiClient<ExpedienteItem[]>('/expedientes/pendientes-validacion'),
  aprobar: (id: string) => apiClient<{ ok: true }>(`/expedientes/${id}/aprobar`, { method: 'PATCH' }),
  observar: (id: string, observaciones: string) =>
    apiClient<{ ok: true }>(`/expedientes/${id}/observar`, {
      method: 'PATCH',
      body: JSON.stringify({ observaciones }),
    }),
  registrarIngresoFisico: (id: string) =>
    apiClient<{ ok: true }>(`/expedientes/${id}/ingreso-fisico`, { method: 'PATCH' }),
};

// ============================================================================
// ACTAS & CORRELATIVOS (Control Documentario Físico)
// ============================================================================
export const ActasApi = {
  verificarCorrelativo: (tipo: string, numero: string, excluirIntervencionId?: string) => {
    const params = new URLSearchParams({ tipo, numero });
    if (excluirIntervencionId) params.append('excluirIntervencionId', excluirIntervencionId);
    return apiClient<{ disponible: boolean }>(`/actas/correlativo-disponible?${params.toString()}`);
  },
};

// ============================================================================
// NOTIFICACIONES DOMICILIARIAS (SP3)
// ============================================================================
export interface NotificacionItem {
  id: string;
  notificacionCargoId: string;
  estado: string;
  notificadorId?: string | null;
  notificadorNombre?: string | null;
  fechaProgramada?: string | null;
  resultado?: string | null;
  createdAt: string;
}

export const NotificacionesApi = {
  getPendientesAsignacion: () =>
    apiClient<NotificacionItem[]>('/notificacion-domiciliaria/pendientes-asignacion'),
  getAsignadas: () =>
    apiClient<NotificacionItem[]>('/notificacion-domiciliaria/asignadas'),
  asignar: (id: string, notificadorId: string) =>
    apiClient<{ ok: true }>(`/notificacion-domiciliaria/${id}/asignar`, {
      method: 'PATCH',
      body: JSON.stringify({ notificadorId }),
    }),
  reprogramar: (id: string, resultado: string) =>
    apiClient<{ ok: true }>(`/notificacion-domiciliaria/${id}/reprogramar`, {
      method: 'PATCH',
      body: JSON.stringify({ resultado }),
    }),
  registrarEntrega: async (id: string, fechaVisita: string, fechaEntregaEfectiva: string, archivo: File) => {
    const formData = new FormData();
    formData.append('fechaVisita', fechaVisita);
    formData.append('fechaEntregaEfectiva', fechaEntregaEfectiva);
    formData.append('evidencia', archivo);
    return apiClient<{ ok: true }>(`/notificacion-domiciliaria/${id}/registrar-entrega`, {
      method: 'PATCH',
      body: formData,
    });
  },
};

// ============================================================================
// IFI - INSTRUCCIÓN (SP4)
// ============================================================================
/**
 * Forma real de GET /ifi/pendientes (ver ExpedientePendienteIfiResponseDto
 * en el backend). `ifiEstado: null` significa que el Ifi todavía no existe
 * para este expediente — ninguna acción de instrucción se ha registrado
 * todavía (ni descargo ni sanear imputación).
 */
export interface ExpedienteIfiItem {
  expedienteId: string;
  numeroExpediente: string;
  fechaNotificacion: string | null;
  ifiEstado: 'EN_ELABORACION' | 'EMITIDO' | 'NOTIFICADO' | null;
  recibioDescargo: boolean;
  imputacionCorrecta: boolean | null;
  tieneSeccionAutomatica: boolean;
  tieneAnalisis: boolean;
  recomendacion: 'SANCIONAR' | 'ARCHIVAR' | null;
  numeroInforme: string | null;
}

/** Forma real de GET /ifi/:expedienteId (ver IfiDetalleResponseDto en el backend) — el Ifi completo, para prellenar el panel de detalle. */
export interface IfiDetalle {
  id: string;
  expedienteId: string;
  estado: 'EN_ELABORACION' | 'EMITIDO' | 'NOTIFICADO';
  recibioDescargo: boolean;
  fechaRecepcionDescargo: string | null;
  descargoTexto: string | null;
  imputacionCorrecta: boolean | null;
  motivoVicioTrascendente: string | null;
  recomendacion: 'SANCIONAR' | 'ARCHIVAR' | null;
  seccionAutomatica: string | null;
  analisisTexto: string | null;
  fechaEmision: string | null;
  fechaNotificacion: string | null;
  basesLegalesAdicionales: string | null;
  numeroInforme: string | null;
}

/** Forma real de POST /ifi/:expedienteId/generar-planchazo — ver SeccionAutomaticaPlanchazo en el backend (módulo ifi/domain). */
export interface PlanchazoData {
  antecedentes: string;
  marcoNormativo: string;
  transcripcionActa: string | null;
  datosHeredados: {
    numeroExpediente: string;
    administrado: {
      identificado: boolean;
      nombresRazonSocial: string | null;
      numeroDocumento: string | null;
      domicilio: string | null;
      distrito: string | null;
      giroUso: string | null;
    } | null;
    actaFiscalizacion: { numeroCorrelativo: string; observacionesAdministrado: string | null } | null;
    notificacionCargo: {
      numeroCorrelativo: string;
      baseCalculo: string;
      montoPasibleMulta: number | null;
      fechaDeteccion: string;
      fechaNotificacion: string | null;
    } | null;
    infracciones: Array<{
      codigo: string;
      descripcion: string | null;
      fuenteNormativa: string | null;
      escala: string | null;
      porcentajeAplicado: number | null;
      montoCalculado: number | null;
      medidaProvisionalAplicable: string | null;
      medidaComplementariaAplicable: string | null;
    }>;
    medidasProvisionalesRegistradas: string[];
  };
  [key: string]: any;
}

export const IfiApi = {
  getPendientes: () =>
    apiClient<{
      pendientes: ExpedienteIfiItem[];
      esperandoNotificacion: ExpedienteIfiItem[];
    }>('/ifi/pendientes'),
  getDetalle: (expedienteId: string) => apiClient<IfiDetalle>(`/ifi/${expedienteId}`),
  registrarDescargo: (expedienteId: string, descargoTexto: string, fechaRecepcionDescargo?: string) =>
    apiClient<{ ok: true }>(`/ifi/${expedienteId}/descargo`, {
      method: 'PATCH',
      body: JSON.stringify({
        recibioDescargo: true,
        fechaRecepcionDescargo: fechaRecepcionDescargo || new Date().toISOString(),
        descargoTexto,
      }),
    }),
  sanearImputacion: (expedienteId: string, imputacionCorrecta: boolean, motivoVicioTrascendente?: string) =>
    apiClient<{ ok: true }>(`/ifi/${expedienteId}/imputacion`, {
      method: 'PATCH',
      body: JSON.stringify({
        imputacionCorrecta,
        ...(imputacionCorrecta ? {} : { motivoVicioTrascendente }),
      }),
    }),
  generarPlanchazo: (expedienteId: string) =>
    apiClient<PlanchazoData>(`/ifi/${expedienteId}/generar-planchazo`, { method: 'POST' }),
  registrarAnalisis: (expedienteId: string, analisisTexto: string) =>
    apiClient<{ ok: true }>(`/ifi/${expedienteId}/analisis`, {
      method: 'PATCH',
      body: JSON.stringify({ analisisTexto }),
    }),
  definirRecomendacion: (expedienteId: string, recomendacion: 'SANCIONAR' | 'ARCHIVAR') =>
    apiClient<{ ok: true }>(`/ifi/${expedienteId}/recomendacion`, {
      method: 'PATCH',
      body: JSON.stringify({ recomendacion }),
    }),
  firmarIfi: (expedienteId: string, numeroInforme: string) =>
    apiClient<{ ok: true }>(`/ifi/${expedienteId}/firmar`, {
      method: 'PATCH',
      body: JSON.stringify({ numeroInforme }),
    }),
  notificarIfi: (expedienteId: string, fechaNotificacion: string) =>
    apiClient<{ ok: true }>(`/ifi/${expedienteId}/notificar`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaNotificacion }),
    }),
  registrarBasesLegalesAdicionales: (expedienteId: string, basesLegalesAdicionales: string) =>
    apiClient<{ ok: true }>(`/ifi/${expedienteId}/bases-legales-adicionales`, {
      method: 'PATCH',
      body: JSON.stringify({ basesLegalesAdicionales }),
    }),
  subirDocumento: (expedienteId: string, descripcion: string, archivo: File) => {
    const formData = new FormData();
    formData.append('descripcion', descripcion);
    formData.append('archivo', archivo);
    return apiClient<{ id: string }>(`/ifi/${expedienteId}/documentos`, { method: 'POST', body: formData });
  },
  getDocumentos: (expedienteId: string) => apiClient<IfiDocumentoAdjuntoItem[]>(`/ifi/${expedienteId}/documentos`),
  /** SP4-T01 — evidencia para sanear la imputación. No depende del planchazo ni del estado del IFI. */
  getEvidenciaImputacion: (expedienteId: string) =>
    apiClient<EvidenciaImputacion>(`/ifi/${expedienteId}/evidencia-imputacion`),
};

/** Respuesta de GET /ifi/:expedienteId/evidencia-imputacion. Todo dato ausente viene null — nunca inventado. */
export interface EvidenciaImputacion {
  expedienteId: string;
  intervencionId: string;
  numeroExpediente: string;
  intervencion: {
    fechaHoraInicio: string;
    origen: string;
    referenciaOrigen: string | null;
    direccionAproximada: string | null;
  };
  administrado: {
    identificado: boolean;
    nombresRazonSocial: string | null;
    numeroDocumento: string | null;
    domicilio: string | null;
    distrito: string | null;
    giroUso: string | null;
  } | null;
  actaFiscalizacion: {
    numeroCorrelativo: string;
    hechosVerificados: string;
    observacionesAdministrado: string | null;
  } | null;
  notificacionCargo: {
    numeroCorrelativo: string;
    baseCalculo: string;
    montoPasibleMulta: number | null;
    fechaDeteccion: string;
    fechaNotificacion: string | null;
    receptorNombre: string | null;
    receptorDocumento: string | null;
    receptorRelacion: string | null;
    modoNotificacion: 'PERSONAL_FIRMA' | 'PERSONAL_NEGATIVA' | 'DOMICILIARIA_PENDIENTE' | 'DOMICILIARIA_EFECTIVA' | null;
  } | null;
  actasMedidaProvisionalCorrelativos: string[];
  codigosCuis: Array<{
    codigoNormativo: string;
    descripcion: string | null;
    fuenteNormativa: string | null;
    escala: string | null;
    condicionEscala: string | null;
    porcentajeAplicado: number | null;
    montoCalculado: number | null;
  }>;
}

export interface IfiDocumentoAdjuntoItem {
  id: string;
  descripcion: string;
  nombreOriginal: string;
  tamanoBytes: number | null;
  subidoEn: string;
}

/** Abre el documento adjunto del IFI en pestaña nueva — mismo patrón que abrirDocumento. */
export async function abrirDocumentoIfi(documentoId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/ifi/documentos/${documentoId}/archivo`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    alert('No se pudo abrir el documento.');
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Descarga el Word del Informe Final de Instrucción generado al vuelo
 * (GET /ifi/:expedienteId/documento). A diferencia de abrirDocumentoIfi, acá
 * se fuerza la descarga con un <a download> temporal — mismo patrón que
 * descargarDocumentoWord. Si el backend rechaza la generación (ej. faltan
 * datos del IFI todavía), se relanza el mensaje de la ConflictException en
 * vez de usar alert(), para que la vista lo muestre con su propio patrón de
 * mensajes de error.
 */
export async function descargarDocumentoIfi(expedienteId: string, numeroExpediente: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/ifi/${expedienteId}/documento`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.detalle || errorMsg;
    } catch {
      // sin body JSON — se queda con el mensaje genérico
    }
    throw new Error(errorMsg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `ifi-${numeroExpediente}.docx`;
  enlace.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// RESOLUCIONES (SP5)
// ============================================================================
export type TipoResolucion = 'RSGSA' | 'RSG';
/** Art. 43 Ordenanza 464: LEVE 50%, GRAVE 40%, MUY_GRAVE 30% de descuento. */
export type TipoInfraccion = 'LEVE' | 'GRAVE' | 'MUY_GRAVE';
export type EstadoResolucion = 'EN_ELABORACION' | 'EMITIDA' | 'NOTIFICADA';
/** "En firma" = EN_ELABORACION con fechaEnvioFirma puesta (la firma es física, la hace el Subgerente). */
export type EtapaResolucion = 'ESPERANDO_DESCARGO_IFI' | 'EN_REDACCION' | 'EN_FIRMA' | 'FIRMADA' | 'NOTIFICADA';

/** Plazos calculados por el backend (días hábiles con la tabla de feriados). Fechas ISO a medianoche UTC. */
export interface PlazosResolucion {
  /** Último día del plazo de 5 días hábiles para el descargo contra el IFI. */
  finEsperaDescargoIfi: string | null;
  /** Primer día en que se puede enviar a firma. */
  puedeEnviarAFirmaDesde: string | null;
  diasHabilesEsperaRestantes: number | null;
  esperaDescargoVencida: boolean;
  fechaCaducidad: string | null;
  /** Fin de los 9 meses originales (la ampliación solo se emite antes). */
  fechaCaducidadOriginal: string | null;
  /** Límite si se firma la ampliación (12 meses desde la NC). */
  fechaCaducidadConAmpliacion: string | null;
  ampliacionFirmada: boolean;
  /** ≤ 30 días para caducar, sin resolución final ni ampliación firmadas: rojo + "Emitir RSG de ampliación". */
  alertaAmpliacion: boolean;
  /** null si la NC no tiene fecha de notificación o la resolución ya se notificó (detiene el reloj). */
  diasParaCaducidad: number | null;
  diasEnFirma: number | null;
}

/** Forma real de las filas de GET /resoluciones/bandeja, /pendientes y /buscar (ExpedientePendienteResolucionResponseDto). */
export interface ExpedienteResolucionItem {
  expedienteId: string;
  numeroExpediente: string;
  recomendacionIfi: 'SANCIONAR' | 'ARCHIVAR' | null;
  /** El IFI archivó por vicio trascendente ("archivo por error de fondo"). */
  archivoPorVicio: boolean;
  /** Tipo que corresponde según el IFI (Sancionar → RSGSA, Archivar → RSG). */
  tipoCorrespondiente: TipoResolucion | null;
  etapa: EtapaResolucion;
  resolucionId: string | null;
  /** Tipo guardado (null = resolución todavía no iniciada). */
  tipo: TipoResolucion | null;
  estado: EstadoResolucion | null;
  tipoNoCoincideConIfi: boolean;
  enParte: boolean;
  motivoDiscrepanciaIfi: string | null;
  ampliacionEstado: EstadoResolucion | null;
  tieneSeccionAutomatica: boolean;
  tieneAnalisis: boolean;
  retiroConfirmado: boolean;
  tieneMonto: boolean;
  tieneMedidaComplementaria: boolean;
  fechaEnvioFirma: string | null;
  fechaEmision: string | null;
  numeroResolucion: string | null;
  fechaNotificacion: string | null;
  ifiFechaNotificacion: string | null;
  plazos: PlazosResolucion;
}

export interface BandejaResoluciones {
  enRedaccion: ExpedienteResolucionItem[];
  porFirmar: ExpedienteResolucionItem[];
  firmadas: ExpedienteResolucionItem[];
}

/** Forma real de GET /resoluciones/:expedienteId (ResolucionDetalleResponseDto). */
export interface ResolucionDetalle {
  expedienteId: string;
  numeroExpediente: string;
  intervencionId: string;
  administrado: {
    identificado: boolean;
    nombresRazonSocial: string | null;
    tipoDocumento: string | null;
    numeroDocumento: string | null;
    domicilio: string | null;
  } | null;
  infracciones: Array<{ codigoNormativo: string; descripcion: string | null }>;
  tieneActaFiscalizacion: boolean;
  tieneNotificacionCargo: boolean;
  medidasProvisionales: Array<{ numeroCorrelativo: string; tipoMedida: string }>;
  ifi: {
    estado: 'EN_ELABORACION' | 'EMITIDO' | 'NOTIFICADO';
    recomendacion: 'SANCIONAR' | 'ARCHIVAR' | null;
    archivoPorVicio: boolean;
    motivoVicioTrascendente: string | null;
    numeroInforme: string | null;
    fechaNotificacion: string | null;
    recibioDescargo: boolean;
    fechaRecepcionDescargo: string | null;
    descargoTexto: string | null;
  } | null;
  tipoCorrespondiente: TipoResolucion | null;
  tipoNoCoincideConIfi: boolean;
  etapa: EtapaResolucion;
  plazos: PlazosResolucion;
  /** null = la resolución de primera instancia todavía no se inició. */
  resolucion: {
    id: string;
    tipo: TipoResolucion;
    estado: EstadoResolucion;
    montoSinDescuento: number | null;
    /** Calculado por el backend, nunca a mano. */
    montoConDescuento: number | null;
    tipoInfraccion: TipoInfraccion | null;
    porcentajeDescuento: number | null;
    porcentajeUit: number | null;
    enParte: boolean;
    motivoDiscrepanciaIfi: string | null;
    descargoPosteriorTexto: string | null;
    descargoPosteriorFecha: string | null;
    medidaComplementaria: string | null;
    /** JSON: { heredadoDelIfi: PlanchazoData | null, resolucion: { tipo } }. */
    seccionAutomatica: string | null;
    analisisTexto: string | null;
    tareaRetiroEstadoCuenta: {
      responsableId: string | null;
      responsableNombre: string | null;
      confirmada: boolean;
      fechaConfirmacion: string | null;
    };
    fechaEnvioFirma: string | null;
    numeroResolucion: string | null;
    /** Fecha real de firma del Subgerente. */
    fechaEmision: string | null;
    fechaNotificacion: string | null;
  } | null;
  /** RSG de ampliación de plazo (null = no se inició). */
  ampliacion: {
    id: string;
    estado: EstadoResolucion;
    numeroResolucion: string | null;
    fechaEnvioFirma: string | null;
    fechaFirma: string | null;
    fechaNotificacion: string | null;
  } | null;
}

/** Descarga un Word generado al vuelo; relanza el mensaje del backend si lo rechaza. */
async function descargarWord(ruta: string, nombre: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${ruta}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.detalle || errorMsg;
    } catch {
      // sin body JSON
    }
    throw new Error(errorMsg);
  }
  const url = URL.createObjectURL(await res.blob());
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export const descargarDocumentoResolucion = (expedienteId: string, numeroExpediente: string) =>
  descargarWord(`/resoluciones/${expedienteId}/documento`, `resolucion-${numeroExpediente}.docx`);

export const descargarDocumentoAmpliacion = (expedienteId: string, numeroExpediente: string) =>
  descargarWord(`/resoluciones/${expedienteId}/ampliacion/documento`, `rsg-ampliacion-${numeroExpediente}.docx`);

export const ResolucionesApi = {
  /** En redacción + por firmar (contador del menú y Dashboard). */
  getPendientes: () => apiClient<ExpedienteResolucionItem[]>('/resoluciones/pendientes'),
  getBandeja: () => apiClient<BandejaResoluciones>('/resoluciones/bandeja'),
  buscar: (q: string) => apiClient<ExpedienteResolucionItem[]>(`/resoluciones/buscar?q=${encodeURIComponent(q)}`),
  getDetalle: (expedienteId: string) => apiClient<ResolucionDetalle>(`/resoluciones/${expedienteId}`),
  /** Decisión del abogado: sugerida por el IFI; si difiere, el motivo es obligatorio (vicio → solo RSG). */
  definirTipo: (expedienteId: string, datos: { tipo: TipoResolucion; enParte?: boolean; motivoDiscrepanciaIfi?: string }) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/tipo`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
  /** Reemplaza los tres valores (omitir = vacío). El monto con descuento lo calcula el backend. */
  guardarMontos: (
    expedienteId: string,
    datos: { tipoInfraccion: TipoInfraccion | null; porcentajeUit: number | null; montoSinDescuento: number | null },
  ) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/montos`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(datos.tipoInfraccion ? { tipoInfraccion: datos.tipoInfraccion } : {}),
        ...(datos.porcentajeUit != null ? { porcentajeUit: datos.porcentajeUit } : {}),
        ...(datos.montoSinDescuento != null ? { montoSinDescuento: datos.montoSinDescuento } : {}),
      }),
    }),
  /** Descargo presentado después del IFI. Texto vacío = quitarlo. */
  registrarDescargoPosterior: (expedienteId: string, texto: string, fecha: string | null) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/descargo-posterior`, {
      method: 'PATCH',
      body: JSON.stringify({ texto, ...(fecha ? { fecha } : {}) }),
    }),
  emitirAmpliacion: (expedienteId: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/ampliacion`, { method: 'POST' }),
  enviarAmpliacionAFirma: (expedienteId: string, fechaEnvio: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/ampliacion/enviar-a-firma`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaEnvio }),
    }),
  firmarAmpliacion: (expedienteId: string, fechaFirma: string, numeroResolucion?: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/ampliacion/firmar`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaFirma, ...(numeroResolucion ? { numeroResolucion } : {}) }),
    }),
  notificarAmpliacion: (expedienteId: string, fechaNotificacion: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/ampliacion/notificar`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaNotificacion }),
    }),
  guardarMedidaComplementaria: (expedienteId: string, medidaComplementaria: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/medida-complementaria`, {
      method: 'PATCH',
      body: JSON.stringify({ medidaComplementaria }),
    }),
  generarSeccionAutomatica: (expedienteId: string) =>
    apiClient<any>(`/resoluciones/${expedienteId}/generar-seccion-automatica`, { method: 'POST' }),
  registrarAnalisis: (expedienteId: string, analisisTexto: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/analisis`, {
      method: 'PATCH',
      body: JSON.stringify({ analisisTexto }),
    }),
  tareaRetiroEstadoCuenta: (expedienteId: string, responsableId: string, confirmada: boolean) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/tarea-retiro-estado-cuenta`, {
      method: 'PATCH',
      body: JSON.stringify({ responsableId, confirmada }),
    }),
  enviarAFirma: (expedienteId: string, fechaEnvio: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/enviar-a-firma`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaEnvio }),
    }),
  retirarDeFirma: (expedienteId: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/retirar-de-firma`, { method: 'PATCH' }),
  /** Registrar la firma física del Subgerente: fecha real + N° del documento (opcional, nunca lo genera el sistema). */
  firmar: (expedienteId: string, fechaFirma: string, numeroResolucion?: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/firmar`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaFirma, ...(numeroResolucion ? { numeroResolucion } : {}) }),
    }),
  notificar: (expedienteId: string, fechaNotificacion: string) =>
    apiClient<{ ok: true }>(`/resoluciones/${expedienteId}/notificar`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaNotificacion }),
    }),
};

// ============================================================================
// RECURSOS (SP6 RECONSIDERACIÓN & SP7 APELACIÓN)
// ============================================================================
export interface ReconsideracionPendienteItem {
  id: string;
  resolucionId: string;
  expedienteId: string;
  numeroExpediente: string;
  fechaPresentacion: string;
  nuevaPrueba: boolean;
  resultado: 'FUNDADA' | 'IMPROCEDENTE' | 'INFUNDADA' | null;
  faltaVincularResolucion: boolean;
}

export interface ApelacionPendienteItem {
  id: string;
  expedienteId: string;
  resolucionId: string;
  numeroExpediente: string;
  informeGopGenerado: boolean;
  informeFirmado: boolean;
}

export const RecursosApi = {
  // Bandejas — sin esto había que copiar ids a mano de otra pantalla.
  getPendientesReconsideracion: () => apiClient<ReconsideracionPendienteItem[]>('/reconsideraciones/pendientes'),
  getPendientesApelacion: () => apiClient<ApelacionPendienteItem[]>('/apelaciones/pendientes'),

  // Reconsideración (SP6)
  presentarReconsideracion: (resolucionId: string, data: {
    fechaPresentacion: string;
    nuevaPrueba: boolean;
    nuevaPruebaTexto?: string;
  }) =>
    apiClient<{ id: string }>(`/reconsideraciones/${resolucionId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  subsanarReconsideracion: (id: string, fechaSubsanacion: string) =>
    apiClient<{ ok: true }>(`/reconsideraciones/${id}/subsanacion`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaSubsanacion }),
    }),
  evaluarReconsideracion: (id: string, resultado: 'FUNDADA' | 'INFUNDADA', analisisTexto: string) =>
    apiClient<{ ok: true }>(`/reconsideraciones/${id}/evaluar`, {
      method: 'PATCH',
      body: JSON.stringify({ resultado, analisisTexto }),
    }),
  vincularResolucionResuelve: (id: string, resolucionQueResuelveId: string) =>
    apiClient<{ ok: true }>(`/reconsideraciones/${id}/resolucion-que-resuelve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolucionQueResuelveId }),
    }),
  /** Camino recomendado: crea la RSG nueva y la vincula en un solo paso — nunca reutiliza la resolución recurrida. */
  emitirRsgQueResuelve: (id: string) => apiClient<{ resolucionId: string }>(`/reconsideraciones/${id}/emitir-rsg`, { method: 'POST' }),

  // Apelación (SP7)
  presentarApelacion: (resolucionId: string) =>
    apiClient<{ id: string }>(`/apelaciones/${resolucionId}`, { method: 'POST' }),
  generarInformeGop: (id: string) =>
    apiClient<any>(`/apelaciones/${id}/informe-gop`, { method: 'POST' }),
  firmarInformeGop: (id: string) =>
    apiClient<{ ok: true }>(`/apelaciones/${id}/firmar-informe`, { method: 'PATCH' }),
  registrarDecisionGop: (id: string, decisionGop: 'FUNDADA' | 'INFUNDADA' | 'NULIDAD', motivoNulidad?: string) =>
    apiClient<{ ok: true }>(`/apelaciones/${id}/decision`, {
      method: 'PATCH',
      body: JSON.stringify({ decisionGop, motivoNulidad }),
    }),
};

// ============================================================================
// ACTO FIRME & PAGOS (SP8 & ES1)
// ============================================================================
export const CoactivaPagosApi = {
  declararActoFirme: (expedienteId: string, motivo: 'VENCIMIENTO_PLAZO_RECURSOS' | 'APELACION_INFUNDADA', fechaFirmeza: string) =>
    apiClient<any>(`/actos-firmes/${expedienteId}`, {
      method: 'POST',
      body: JSON.stringify({ motivo, fechaFirmeza }),
    }),
  emitirConstanciaMulta: (expedienteId: string) =>
    apiClient<{ ok: true }>(`/actos-firmes/${expedienteId}/constancia-multa`, { method: 'POST' }),
  emitirConstanciaMedida: (expedienteId: string) =>
    apiClient<{ ok: true }>(`/actos-firmes/${expedienteId}/constancia-medida-complementaria`, { method: 'POST' }),
  registrarDerivacionCoactiva: (expedienteId: string, fechaDerivacionCoactiva: string, requiereMedidaComplementaria: boolean) =>
    apiClient<{ ok: true }>(`/actos-firmes/${expedienteId}/derivacion-coactiva`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaDerivacionCoactiva, requiereMedidaComplementaria }),
    }),
  registrarPago: (resolucionId: string, montoPagado: number, fechaPago: string) =>
    apiClient<any>(`/pagos/${resolucionId}`, {
      method: 'POST',
      body: JSON.stringify({ montoPagado, fechaPago }),
    }),
};

// ============================================================================
// MEDIDAS CAUTELARES (ES2)
// ============================================================================
export interface EmitirMedidaCautelarPayload {
  situacionGravedad: string;
  resolucionCautelarTexto: string;
  vistoAntecedentes?: string;
  inicialesFirma?: string;
  relatoHechos?: string;
  tipoMedidaCautelar?: string;
  modalidadEjecucion?: string;
  direccionNotificacion?: string;
  incluyeAdvertenciaUsurpacion?: boolean;
  incluyeResguardoSerenazgo?: boolean;
}

export const CautelaresApi = {
  emitir: (intervencionId: string, payload: EmitirMedidaCautelarPayload) =>
    apiClient<any>(`/medidas-cautelares/intervencion/${intervencionId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  registrarEjecucion: (id: string, fechaEjecucion: string) =>
    apiClient<{ ok: true }>(`/medidas-cautelares/${id}/ejecucion`, {
      method: 'PATCH',
      body: JSON.stringify({ fechaEjecucion }),
    }),
  anexarAExpediente: (id: string) =>
    apiClient<{ ok: true }>(`/medidas-cautelares/${id}/anexar`, { method: 'PATCH' }),
};

/** Descarga el Word de la Resolución de Medida Cautelar generado al vuelo. */
export async function descargarDocumentoMedidaCautelar(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/medidas-cautelares/${id}/documento`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    alert('No se pudo generar el documento.');
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `medida-cautelar-${id}.docx`;
  enlace.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// CONFIGURACIÓN, PLAZOS & CATÁLOGOS
// ============================================================================
export interface CuisCodigoItem {
  id: string;
  codigo: string;
  descripcion: string;
  montoUit?: number;
  escala?: string;
  gravedad?: string;
}

export interface FeriadoItem {
  id: string;
  fecha: string;
  descripcion: string;
}

export interface ParametroUitItem {
  id: string;
  anio: number;
  valorSoles: number;
  vigenteDesde: string;
  vigenteHasta?: string | null;
}

export const ConfiguracionApi = {
  getExpedientesEnRiesgo: () => apiClient<any[]>('/plazos/expedientes-en-riesgo'),
  getFeriados: () => apiClient<FeriadoItem[]>('/plazos/feriados'),
  agregarFeriado: (fecha: string, descripcion: string) =>
    apiClient<FeriadoItem>('/plazos/feriados', {
      method: 'POST',
      body: JSON.stringify({ fecha, descripcion }),
    }),
  buscarCuis: (q: string) => apiClient<CuisCodigoItem[]>(`/cuis/codigos/buscar?q=${encodeURIComponent(q)}`),
  getCatalogoCuis: () => apiClient<CuisCodigoItem[]>('/cuis/codigos/catalogo'),
  getParametrosUit: () => apiClient<ParametroUitItem[]>('/uit/parametros'),
};

// ============================================================================
// INTERVENCIONES & ACTAS OBSERVADAS (SP1 / SP2 / V-01 / V-02)
// ============================================================================
export interface IntervencionObservadaItem {
  id: string;
  fechaHoraInicio: string;
  numeroExpediente: string;
  motivo: string;
  fechaObservacion: string | null;
}

export interface BundleIntervencion {
  id: string;
  fiscalizadorId: string;
  deviceId?: string;
  fechaHoraInicio: string;
  latitud?: number;
  longitud?: number;
  gpsPrecisionM?: number;
  origenUbicacion: 'GPS_AUTOMATICO' | 'DIRECCION_MANUAL' | 'SIN_UBICACION';
  direccionAproximada?: string;
  origen: 'DENUNCIA' | 'INOPINADA' | 'ORDEN_SUPERIOR' | 'DOC_EXTERNO' | 'OTROS';
  referenciaOrigen?: string;
  tipoActuacion: 'EXHORTACION' | 'CONSTATACION' | 'INICIA_PAS';
  versionLocal: number;
  administrado?: {
    identificado: boolean;
    motivoNoIdentificado?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    nombresRazonSocial?: string;
    domicilio?: string;
    distrito?: string;
    giroUso?: string;
    numeroLicenciaFuncionamiento?: string;
  };
  cuis: {
    cuisCodigoId: string;
    cuisEscalaMontoId?: string;
  }[];
  actaExhortacion?: {
    numeroCorrelativo: string;
    presuntaInfraccion: string;
    baseCalculo: string;
    montoPosibleDeuda?: number;
    plazoSubsanacion?: string;
    observaciones?: string;
  };
  actaFiscalizacion?: {
    numeroCorrelativo: string;
    hechosVerificados: string;
    observacionesAdministrado?: string;
  };
  notificacionCargo?: {
    numeroCorrelativo: string;
    baseCalculo: string;
    montoPasibleMulta?: number;
    medidaComplementaria?: string;
    placaRodaje?: string;
    fechaDeteccion: string;
    fechaNotificacion?: string;
    modoNotificacion?: string;
    receptorNombre?: string;
    receptorDocumento?: string;
    receptorRelacion?: string;
    seNegoIdentificarse?: boolean;
    seNegoFirmar?: boolean;
    domicilioPuertas?: string;
    domicilioPisos?: string;
    domicilioNumeroSuministro?: string;
    domicilioObservaciones?: string;
  };
  testigos: {
    orden: 1 | 2;
    nombre: string;
    documento: string;
  }[];
  actasMedidaProvisional: {
    numeroCorrelativo: string;
    tipoMedida: 'CLAUSURA' | 'PARALIZACION' | 'OTROS';
    descripcion?: string;
    lugarEjecucion?: string;
    observacionesAdministrado?: string;
  }[];
  actasValorizacionObra: {
    numeroCorrelativo: string;
    estadoObra?: string;
  }[];
  actasAdicionales: {
    tipo: 'RETENCION_VEHICULO' | 'DECOMISO';
    numeroCorrelativo: string;
    detalle?: string;
  }[];
  /** Foto del acta física firmada, para el botón "Ver documento" — ver AdjuntarFotoActa en web-campo. */
  fotos?: { id: string; actaTipo: string | null }[];
}

export interface CorregirIntervencionPayload {
  fechaHoraInicio: string;
  origenUbicacion: string;
  origen: string;
  tipoActuacion: string;
  versionLocal: number;
  direccionAproximada?: string;
  administrado?: any;
  cuis: any[];
  actaFiscalizacion?: any;
  notificacionCargo?: any;
  testigos: any[];
  actasMedidaProvisional: any[];
  actasValorizacionObra: any[];
  actasAdicionales: any[];
  comentarioCorreccion: string;
}

export interface CrearIntervencionPayload {
  id: string;
  fechaHoraInicio: string;
  origenUbicacion: string;
  origen: string;
  tipoActuacion: string;
  versionLocal: number;
  direccionAproximada?: string;
  latitud?: number;
  longitud?: number;
  administrado?: any;
  cuis: any[];
  actaExhortacion?: any;
  actaFiscalizacion?: any;
  notificacionCargo?: any;
  testigos: any[];
  actasMedidaProvisional: any[];
  actasValorizacionObra: any[];
  actasAdicionales: any[];
}

export const IntervencionesApi = {
  getObservadas: () => apiClient<IntervencionObservadaItem[]>('/intervenciones/observadas'),
  getDetalle: (id: string) => apiClient<BundleIntervencion>(`/intervenciones/${id}`),
  corregir: (id: string, payload: CorregirIntervencionPayload) =>
    apiClient<{ ok: true }>(`/intervenciones/${id}/correccion`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  crear: (payload: CrearIntervencionPayload) =>
    apiClient<{ id: string; yaExistia: boolean }>('/intervenciones', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  subirFoto: async (intervencionId: string, archivo: File) => {
    const formData = new FormData();
    formData.append('foto', archivo);
    return apiClient<{ id: string }>(`/intervenciones/${intervencionId}/fotos`, {
      method: 'POST',
      body: formData,
    });
  },
  subirFirma: async (intervencionId: string, rol: string, archivo: File) => {
    const formData = new FormData();
    formData.append('firma', archivo);
    formData.append('rol', rol);
    return apiClient<{ id: string }>(`/intervenciones/${intervencionId}/firmas`, {
      method: 'POST',
      body: formData,
    });
  },
};

// ============================================================================
// USUARIOS & SEGURIDAD (ADMIN)
// ============================================================================
export const UsuariosAdminApi = {
  revocarTokens: (usuarioId: string) =>
    apiClient<{ ok: true }>(`/auth/admin/usuarios/${usuarioId}/revocar`, {
      method: 'POST',
    }),
};

// ============================================================================
// CONSULTAS — visibilidad de solo lectura, sin bandeja de validación
// (Exhortación/Constatación nunca generan Expediente, ver CLAUDE.md)
// ============================================================================
export interface CierreCampoItem {
  id: string;
  fechaHoraInicio: string;
  tipoActuacion: 'EXHORTACION' | 'CONSTATACION';
  fiscalizadorNombre: string;
  numeroCorrelativo: string | null;
  resumen: string | null;
  fotoActaId: string | null;
}

export interface IntervencionSelectorItem {
  id: string;
  fechaHoraInicio: string;
  tipoActuacion: string;
  fiscalizadorNombre: string;
  administradoNombre: string | null;
  numeroExpediente: string | null;
}

export interface IntervencionMapaItem {
  id: string;
  latitud: number;
  longitud: number;
  gpsPrecisionM: number | null;
  fechaHoraInicio: string;
  tipoActuacion: string;
  origenUbicacion: string;
  fiscalizadorNombre: string;
  administradoNombre: string | null;
  direccionAproximada: string | null;
}

export const ConsultasApi = {
  getCierresCampo: () => apiClient<CierreCampoItem[]>('/consultas/cierres-campo'),
  getIntervencionesSelector: () => apiClient<IntervencionSelectorItem[]>('/consultas/intervenciones-selector'),
  getMapaIntervenciones: () => apiClient<IntervencionMapaItem[]>('/consultas/mapa-intervenciones'),
};

/**
 * Abre la foto de un acta física en una pestaña nueva. No se puede usar
 * directo en `<img src>` porque el endpoint exige el header Authorization
 * — se trae como blob autenticado y se genera una URL local.
 */
export async function abrirDocumento(fotoId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/intervenciones/fotos/${fotoId}/archivo`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    alert('No se pudo abrir el documento.');
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export type TipoActaDocumento = 'EXHORTACION' | 'FISCALIZACION' | 'MEDIDA_PROVISIONAL' | 'NOTIFICACION_CARGO';

/**
 * Descarga el documento real generado al vuelo por el backend (ver módulo
 * documentos-generados) — .docx para las actas, .xlsx para Notificación
 * de Cargo (su formato físico real es una cédula Excel). A diferencia de
 * `abrirDocumento`, un navegador no puede "abrir" estos formatos inline
 * como una imagen, así que se fuerza la descarga con un <a download>
 * temporal.
 */
export async function descargarDocumentoWord(
  intervencionId: string,
  tipoActa: TipoActaDocumento,
  medidaNumeroCorrelativo?: string,
): Promise<void> {
  const query = medidaNumeroCorrelativo ? `?medida=${encodeURIComponent(medidaNumeroCorrelativo)}` : '';
  const res = await fetch(`${BASE_URL}/intervenciones/${intervencionId}/documento/${tipoActa}${query}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    alert('No se pudo generar el documento.');
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const extension = tipoActa === 'NOTIFICACION_CARGO' ? 'xlsx' : 'docx';
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${tipoActa.toLowerCase()}-${intervencionId}.${extension}`;
  enlace.click();
  URL.revokeObjectURL(url);
}