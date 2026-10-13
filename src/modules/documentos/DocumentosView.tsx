import React, { useState } from 'react';
import { PageHeader, PanelTabla, SegmentedTabs } from '../../components/common/PageKit';
import { EntradasTab } from './EntradasTab';
import { SalidasTab } from './SalidasTab';
import { ExpedienteFoliadoTab } from './ExpedienteFoliadoTab';

type Pestana = 'entrada' | 'salida' | 'expediente';

/**
 * Control Documentario: lo que entra a la subgerencia, lo que sale y el
 * expediente foliado. Casi todo se arma solo con lo que ya registran los demás
 * módulos; lo único que se escribe aquí son los documentos externos que llegan
 * a Mesa de Partes y el N° de SGD con el que se subió cada documento emitido
 * (no hay integración con el SGD).
 */
export const DocumentosView: React.FC = () => {
  const [pestana, setPestana] = useState<Pestana>('entrada');

  return (
    <div>
      <PageHeader
        titulo="Control Documentario"
        descripcion="Lo que entra, lo que sale (incluidas las actas de campo con su número) y el expediente foliado, con los datos reales del sistema."
      />

      <PanelTabla
        barra={
          <SegmentedTabs<Pestana>
            items={[
              { clave: 'entrada', etiqueta: 'Entrada' },
              { clave: 'salida', etiqueta: 'Salida' },
              { clave: 'expediente', etiqueta: 'Expediente foliado' },
            ]}
            activa={pestana}
            onChange={setPestana}
          />
        }
      >
        {pestana === 'entrada' && <EntradasTab />}
        {pestana === 'salida' && <SalidasTab />}
        {pestana === 'expediente' && <ExpedienteFoliadoTab />}
      </PanelTabla>
    </div>
  );
};
