import React, { useEffect, useState } from 'react';
import { Alert, Modal, Spinner } from '../../components/common/Common';
import { AuditoriaItem, Usuario, UsuariosApi } from '../../api/usuarios';
import { ETIQUETA_ACCION_AUDITORIA, ETIQUETA_CAMPO, fechaHora } from './usuariosUi';

interface Props {
  usuario: Usuario | null;
  onCerrar: () => void;
}

const valorLegible = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

// El título del evento ya lo dice; estos campos solo agregarían ruido técnico.
const CAMPOS_OCULTOS = new Set(['id', 'rolId', 'deviceIdActual', 'debeCambiarContrasena', 'contrasenaGenerada', 'activo']);

/** Campos que cambiaron entre `antes` y `despues`. */
function cambios(item: AuditoriaItem): { campo: string; antes: string; despues: string }[] {
  const antes = item.antes ?? {};
  const despues = item.despues ?? {};
  return Array.from(new Set([...Object.keys(antes), ...Object.keys(despues)]))
    .filter((k) => !CAMPOS_OCULTOS.has(k) && valorLegible(antes[k]) !== valorLegible(despues[k]))
    .map((k) => ({ campo: ETIQUETA_CAMPO[k] ?? k, antes: valorLegible(antes[k]), despues: valorLegible(despues[k]) }));
}

export const AuditoriaUsuarioPanel: React.FC<Props> = ({ usuario, onCerrar }) => {
  const [items, setItems] = useState<AuditoriaItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    setCargando(true);
    setError(null);
    UsuariosApi.obtenerAuditoria(usuario.id)
      .then(setItems)
      .catch((err) => setError(err.message || 'No se pudo cargar el historial.'))
      .finally(() => setCargando(false));
  }, [usuario]);

  return (
    <Modal isOpen={!!usuario} onClose={onCerrar} title={`Historial de ${usuario?.nombres ?? ''}`} maxWidth="600px">
      {cargando ? (
        <div className="py-[40px] flex justify-center">
          <Spinner size={26} />
        </div>
      ) : error ? (
        <Alert type="error" className="mb-0!">
          {error}
        </Alert>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-text-muted text-center py-[30px] m-0">Todavía no hay cambios registrados.</p>
      ) : (
        <ol className="list-none m-0 p-0">
          {items.map((it, i) => {
            const lista = cambios(it);
            return (
              <li key={it.id} className="relative pl-[26px] pb-[18px] last:pb-0">
                {i < items.length - 1 && <span className="absolute left-[6px] top-[16px] bottom-0 w-[2px] bg-border" />}
                <span className="absolute left-0 top-[4px] w-[14px] h-[14px] rounded-full bg-white border-[3px] border-primary-500" />
                <div className="flex items-baseline justify-between gap-[12px] flex-wrap">
                  <span className="text-[13px] font-bold text-text-main">{ETIQUETA_ACCION_AUDITORIA[it.accion] ?? it.accion}</span>
                  <span className="text-[12px] text-text-muted">{fechaHora(it.createdAt)}</span>
                </div>
                <div className="text-[12px] text-text-muted mt-[2px]">por {it.actorNombres}</div>
                {lista.length > 0 && (
                  <div className="mt-[8px] rounded-sm border border-border-subtle bg-bg-subtle py-[6px] px-[10px]">
                    {lista.map((c) => (
                      <div key={c.campo} className="text-[12px] py-[2px] grid grid-cols-[90px_1fr] gap-[8px]">
                        <span className="font-semibold text-text-secondary">{c.campo}</span>
                        <span className="text-text-muted break-words">
                          <span className="line-through">{c.antes}</span> → <span className="text-text-main font-medium">{c.despues}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
};
