import React, { useState } from 'react';
import { PrescripcionApi } from '../../api';
import { Alert, Button, Input, Modal, Textarea } from '../../components/common/Common';
import { claseFilaTramite, claseInputArchivo } from '../../components/common/PasoTramite';
import { hoyLocal } from '../../lib/fechas';

/**
 * Registrar la solicitud de prescripción (SOLO a pedido de parte). El
 * administrado puede no existir en este sistema: sus datos se escriben tal
 * como figuran en la solicitud. Las multas se agregan después, en el panel.
 */
export const RegistrarSolicitudPrescripcionModal: React.FC<{ onClose: () => void; onRegistrada: (id: string) => void }> = ({ onClose, onRegistrada }) => {
  const [nombre, setNombre] = useState('');
  const [tipoDoc, setTipoDoc] = useState('DNI');
  const [numeroDoc, setNumeroDoc] = useState('');
  const [codigoContribuyente, setCodigoContribuyente] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [fecha, setFecha] = useState('');
  const [numeroSgd, setNumeroSgd] = useState('');
  const [resumen, setResumen] = useState('');
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const hoy = hoyLocal();

  const guardar = async () => {
    if (!nombre.trim()) return setError('Ingresa el nombre o razón social del administrado.');
    if (!fecha) return setError('Ingresa la fecha real de presentación.');
    if (fecha > hoy) return setError('La fecha de presentación no puede ser futura.');
    if (!resumen.trim()) return setError('Escribe un resumen de lo que solicita.');
    setGuardando(true);
    setError(null);
    try {
      const r = await PrescripcionApi.registrar({
        administradoNombre: nombre,
        administradoTipoDocumento: numeroDoc.trim() ? tipoDoc : undefined,
        administradoNumeroDocumento: numeroDoc,
        codigoContribuyente,
        domicilio,
        fechaPresentacion: fecha,
        numeroSgd,
        resumen,
        archivos: pdfs,
      });
      onRegistrada(r.id);
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar la solicitud.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Registrar solicitud de prescripción"
      maxWidth="720px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={guardar}>
            Registrar y agregar multas
          </Button>
        </>
      }
    >
      {error && <Alert type="error">{error}</Alert>}
      <Input label="Administrado (nombre o razón social)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <div className={claseFilaTramite}>
        <div className="w-[120px]">
          <Input label="Tipo doc." value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} />
        </div>
        <div className="w-[180px]">
          <Input label="N° documento" value={numeroDoc} onChange={(e) => setNumeroDoc(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Input label="Código de contribuyente (opcional)" value={codigoContribuyente} onChange={(e) => setCodigoContribuyente(e.target.value)} />
        </div>
      </div>
      <Input label="Domicilio señalado en la solicitud (para notificar)" value={domicilio} onChange={(e) => setDomicilio(e.target.value)} />
      <div className={claseFilaTramite}>
        <div className="w-[200px]">
          <Input type="date" label="Fecha de presentación" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Input label="N° de documento SGD (ej. S-0022315-2026)" value={numeroSgd} onChange={(e) => setNumeroSgd(e.target.value)} />
        </div>
      </div>
      <Textarea label="Resumen de lo que solicita" value={resumen} onChange={(e) => setResumen(e.target.value)} className="min-h-[90px]!" />
      <input type="file" accept="application/pdf,.pdf" multiple onChange={(e) => setPdfs(Array.from(e.target.files ?? []))} className={claseInputArchivo} />
    </Modal>
  );
};
