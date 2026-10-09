import React from 'react';
import { Button } from '../../components/common/Common';
import { CatalogoPermisos, NivelPermiso } from '../../api/roles';
import { cn } from '../../lib/cn';

interface MatrizPermisosProps {
  catalogo: CatalogoPermisos;
  permisos: Record<string, NivelPermiso>;
  acciones: string[];
  onChange: (permisos: Record<string, NivelPermiso>, acciones: string[]) => void;
  soloLectura?: boolean;
}

export const MatrizPermisos: React.FC<MatrizPermisosProps> = ({
  catalogo,
  permisos,
  acciones,
  onChange,
  soloLectura = false,
}) => {
  const setNivel = (moduloId: string, nivel: NivelPermiso) => {
    if (soloLectura) return;
    const nuevosPermisos = { ...permisos, [moduloId]: nivel };
    onChange(nuevosPermisos, acciones);
  };

  const toggleAccion = (accionId: string) => {
    if (soloLectura) return;
    const nuevasAcciones = acciones.includes(accionId)
      ? acciones.filter((a) => a !== accionId)
      : [...acciones, accionId];
    onChange(permisos, nuevasAcciones);
  };

  const ponerTodos = (nivel: NivelPermiso) => {
    if (soloLectura) return;
    const nuevosPermisos = {} as Record<string, NivelPermiso>;
    for (const m of catalogo.modulos) {
      nuevosPermisos[m.id] = nivel;
    }
    onChange(nuevosPermisos, acciones);
  };

  const nivelActual = (moduloId: string) => permisos[moduloId] ?? 'NINGUNO';

  return (
    <div className="space-y-[20px]">
      {/* Matriz de módulos */}
      <section>
        <div className="flex items-center justify-between mb-[14px]">
          <h4 className="text-[13px] font-semibold text-text-main">Acceso por módulo</h4>
          {!soloLectura && (
            <div className="flex gap-[6px]">
              <Button size="sm" variant="ghost" onClick={() => ponerTodos('NINGUNO')}>
                Todo sin acceso
              </Button>
              <Button size="sm" variant="ghost" onClick={() => ponerTodos('VER')}>
                Todo ver
              </Button>
              <Button size="sm" variant="ghost" onClick={() => ponerTodos('EDITAR')}>
                Todo editar
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-[8px]">
          {catalogo.modulos.map((modulo) => {
            const nivel = nivelActual(modulo.id);
            return (
              <div key={modulo.id} className="flex items-center justify-between p-[12px] bg-bg-card rounded-sm border border-border">
                <span className="text-[13px] text-text-main font-medium">{modulo.etiqueta}</span>
                <div className="flex gap-[4px]">
                  {catalogo.niveles.map((n) => {
                    const isActive = nivel === n;
                    const bgClass =
                      n === 'NINGUNO' ? (isActive ? 'bg-[#e2e8f0]' : 'bg-[#f8fafc] border-border') :
                      n === 'VER' ? (isActive ? 'bg-[#0369a1] text-white' : 'bg-[#f8fafc] border-border') :
                      (isActive ? 'bg-[#16a34a] text-white' : 'bg-[#f8fafc] border-border');

                    return (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setNivel(modulo.id, n)}
                        disabled={soloLectura}
                        className={cn(
                          'px-[12px] py-[6px] text-[12px] font-semibold rounded-sm border',
                          bgClass,
                          soloLectura ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:shadow-sm'
                        )}
                      >
                        {n === 'NINGUNO' ? 'Sin acceso' : n === 'VER' ? 'Ver' : 'Editar'}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Acciones especiales */}
      <section className="border-t border-border pt-[16px]">
        <h4 className="text-[13px] font-semibold text-text-main mb-[12px]">Acciones especiales</h4>
        <div className="space-y-[8px]">
          {catalogo.acciones.map((accion) => (
            <label
              key={accion.id}
              className={cn(
                'flex items-start gap-[10px] p-[12px] bg-bg-card rounded-sm border border-border cursor-pointer',
                soloLectura ? 'opacity-75' : 'hover:bg-[#f8fafc]'
              )}
            >
              <input
                type="checkbox"
                checked={acciones.includes(accion.id)}
                onChange={() => toggleAccion(accion.id)}
                disabled={soloLectura}
                className="mt-[2px] cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-text-main">{accion.etiqueta}</div>
                <div className="text-[12px] text-text-muted">{accion.descripcion}</div>
              </div>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};
