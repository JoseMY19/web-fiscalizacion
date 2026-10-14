import React from 'react';
import { CatalogoPermisos, NivelPermiso } from '../../api/roles';
import { CheckIcon } from '../../components/icons/Icons';
import { cn } from '../../lib/cn';

interface Props {
  catalogo: CatalogoPermisos;
  permisos: Record<string, NivelPermiso>;
  acciones: string[];
  onChange: (permisos: Record<string, NivelPermiso>, acciones: string[]) => void;
  soloLectura?: boolean;
}

const NIVELES: { id: NivelPermiso; etiqueta: string; ayuda: string; activo: string }[] = [
  { id: 'NINGUNO', etiqueta: 'Sin acceso', ayuda: 'No aparece en el menú', activo: 'bg-text-muted border-text-muted' },
  { id: 'VER', etiqueta: 'Ver', ayuda: 'Consulta sin modificar', activo: 'bg-primary-600 border-primary-600' },
  { id: 'EDITAR', etiqueta: 'Editar', ayuda: 'Consulta y registra', activo: 'bg-success border-success' },
];

export const MatrizPermisos: React.FC<Props> = ({ catalogo, permisos, acciones, onChange, soloLectura = false }) => {
  const nivelDe = (modulo: string): NivelPermiso => permisos[modulo] ?? 'NINGUNO';

  const setNivel = (modulo: string, nivel: NivelPermiso) => {
    if (!soloLectura) onChange({ ...permisos, [modulo]: nivel }, acciones);
  };

  const setTodos = (nivel: NivelPermiso) => {
    if (!soloLectura) onChange(Object.fromEntries(catalogo.modulos.map((m) => [m.id, nivel])) as Record<string, NivelPermiso>, acciones);
  };

  const toggleAccion = (accion: string) => {
    if (soloLectura) return;
    onChange(permisos, acciones.includes(accion) ? acciones.filter((a) => a !== accion) : [...acciones, accion]);
  };

  const conteo = (nivel: NivelPermiso) => catalogo.modulos.filter((m) => nivelDe(m.id) === nivel).length;

  return (
    <div className="flex flex-col gap-[20px]">
      <section>
        <div className="flex items-baseline justify-between gap-[12px] mb-[10px] flex-wrap">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.6px] text-text-muted m-0">Acceso por módulo</h4>
          <span className="text-[12px] text-text-muted">
            Edita <strong className="text-success">{conteo('EDITAR')}</strong> · Ve <strong className="text-primary-600">{conteo('VER')}</strong> · Sin
            acceso <strong className="text-text-secondary">{conteo('NINGUNO')}</strong>
          </span>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-bg-subtle border-b border-border">
                <th className="text-left py-[10px] px-[14px] text-[11px] uppercase tracking-[0.5px] text-text-muted font-bold">Módulo</th>
                {NIVELES.map((n) => (
                  <th key={n.id} className="w-[120px] py-[8px] px-[6px] text-center align-top">
                    <div className="text-[12px] font-bold text-text-main">{n.etiqueta}</div>
                    <div className="text-[10.5px] font-medium text-text-muted">{n.ayuda}</div>
                    {!soloLectura && (
                      <button
                        type="button"
                        onClick={() => setTodos(n.id)}
                        className="mt-[4px] text-[11px] font-semibold text-primary-600 bg-transparent border-0 cursor-pointer p-0 hover:underline"
                      >
                        Aplicar a todos
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catalogo.modulos.map((m) => {
                const actual = nivelDe(m.id);
                return (
                  <tr key={m.id} className="border-b border-border-subtle last:border-b-0 hover:bg-bg-subtle">
                    <td className={cn('py-[9px] px-[14px] font-medium', actual === 'NINGUNO' ? 'text-text-muted' : 'text-text-main')}>{m.etiqueta}</td>
                    {NIVELES.map((n) => {
                      const elegido = actual === n.id;
                      return (
                        <td key={n.id} className="text-center py-[6px]">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={elegido}
                            aria-label={`${m.etiqueta}: ${n.etiqueta}`}
                            disabled={soloLectura}
                            onClick={() => setNivel(m.id, n.id)}
                            className={cn(
                              'w-[22px] h-[22px] rounded-full border-2 inline-flex items-center justify-center [transition:all_120ms]',
                              elegido ? cn(n.activo, 'text-white') : 'bg-white border-border-dark',
                              soloLectura ? 'cursor-default' : 'cursor-pointer',
                              !soloLectura && !elegido && 'hover:border-primary-400',
                            )}
                          >
                            {elegido && <CheckIcon size={12} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.6px] text-text-muted mt-0 mb-[10px]">Acciones especiales</h4>
        <div className="grid grid-cols-2 gap-[10px] max-sm:grid-cols-1">
          {catalogo.acciones.map((a) => {
            const marcada = acciones.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                role="checkbox"
                aria-checked={marcada}
                disabled={soloLectura}
                onClick={() => toggleAccion(a.id)}
                className={cn(
                  'text-left flex items-start gap-[10px] p-[12px] rounded-sm border bg-white [transition:all_150ms]',
                  marcada ? 'border-primary-600 bg-primary-50' : 'border-border',
                  soloLectura ? 'cursor-default' : 'cursor-pointer hover:border-border-dark',
                )}
              >
                <span
                  className={cn(
                    'mt-[1px] w-[18px] h-[18px] rounded-[5px] border-2 shrink-0 inline-flex items-center justify-center',
                    marcada ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-border-dark',
                  )}
                >
                  {marcada && <CheckIcon size={11} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-text-main">{a.etiqueta}</span>
                  <span className="block text-[12px] text-text-muted leading-[1.4] mt-[2px]">{a.descripcion}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
