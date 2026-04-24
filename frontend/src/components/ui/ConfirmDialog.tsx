import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'primary';
}

export default function ConfirmDialog({
  open, onClose, onConfirm, title = 'Confirmar ação',
  message, confirmLabel = 'Confirmar', loading, variant = 'danger',
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 rounded-full bg-red-100 dark:bg-red-900/30 p-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{message}</p>
      </div>
    </Modal>
  );
}
